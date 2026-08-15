import json
import httpx
import os
from typing import List, Dict, Any
import tools
from config import LLM_MODEL, GROQ_API_KEY

SYSTEM_PROMPT = """You are MedEra Assistant, an intelligent healthcare assistant for MedEra clinic in Casablanca, Morocco.

CRITICAL WORKFLOW (YOU MUST FOLLOW THIS STRICTLY):
1. INITIAL CHECK: Check the "PATIENT STATUS" context provided below. DO NOT call `check_patient` manually, it is already done for you!
2. IF NOT REGISTERED (PATIENT STATUS says they don't exist):
   - YOU ARE STRICTLY FORBIDDEN from asking about symptoms, pains, or booking appointments.
   - YOU MUST ONLY say: "Bonjour, vous n'êtes pas encore inscrit. Pour pouvoir prendre rendez-vous, veuillez m'indiquer vos informations : Nom, Prénom, Email, Date de naissance (AAAA-MM-JJ) et Sexe (M/F)."
   - STOP. Do not do anything else until they provide these details. Once provided, call `register_patient`.
3. REGISTRATION: Once you have all the required details, use the `register_patient` tool to create their account.
4. CONFIRMATION & PORTAL LINK: After `register_patient` succeeds, it will return a `setup_link`. Explicitly tell the user exactly this (ensure the link has blank lines around it so it is clickable):
"Votre compte a été créé avec succès ! Voici le lien sécurisé pour configurer votre mot de passe et accéder à votre portail :

<THE ACTUAL LINK RETURNED BY THE TOOL>

"
(Do NOT literally write <THE ACTUAL LINK RETURNED BY THE TOOL>, replace it with the real URL provided by the tool output).
5. PORTAL ACCESS:
  - If the patient explicitly asks to LOGIN or CONNECT (e.g., "se connecter"): YOU MUST output the JSON to call the `get_login_url` tool. When the tool returns, reply ONLY with the login URL provided by the tool. (Example: "Voici le lien pour vous connecter : https://YOUR_URL/login")
  - If the patient asks to CONFIGURE, RESET, or FORGOT their password (e.g., "configurer mon mot de passe", "reconfigurer", "oublié"): YOU MUST output the JSON to call the `request_password_reset` tool. When the tool returns, you MUST reply with exactly the setup link provided by the tool. (Example: "Voici le lien sécurisé pour configurer votre mot de passe et accéder à votre portail : https://YOUR_URL/reset-password/...")
6. SYMPTOMS & BOOKING APPOINTMENTS: ONLY if the PATIENT STATUS shows they are registered, you can proceed with medical queries or booking. Follow these steps STRICTLY in order:
   - STEP 1 (Symptoms): Always ask the patient what their pain or reason for consultation is. When they reply, YOU MUST use the `analyze_symptoms` tool to analyze their case.
   - STEP 2 (Find Doctors): For the testing phase, MedEra is ONLY accepting appointments with "Dr. Karim Benali". YOU MUST call `get_doctors` to find his `id` (doctor_id). You CANNOT proceed without his `id`.
   - STEP 3 (Select Doctor): Explain briefly the potential conditions to the patient (do NOT mention "AI", "tool", or "analysis"). Strongly recommend booking with Dr. Karim Benali. YOU MUST STOP HERE AND WAIT FOR THEIR REPLY to confirm they want to book. YOU ARE STRICTLY FORBIDDEN from calling `get_available_slots` before the user explicitly agrees to book.
   - STEP 4 (Find Slots): Once the patient replies and explicitly confirms they want to book with Dr. Karim Benali, YOU MUST output ONLY the JSON to call the `get_available_slots` tool using his exact `doctor_id`. YOU ARE STRICTLY FORBIDDEN FROM HALLUCINATING SLOTS.
   - STEP 5 (Select Slot): Once the tool returns the slots, show them to the patient formatted cleanly (e.g. "Mardi 25 Juin à 10:00") and ask them to choose.
   - STEP 6 (Book): Once they select a slot, output the JSON to call the `request_appointment` tool.

Rules:
- To call a tool, you MUST respond ONLY with a JSON object, with NO surrounding text. Wait for the system to give you the tool result in the next message. Example: {"tool": "tool_name", "args": {"arg1": "value1"}}
- Do NOT include markdown code blocks (e.g. ```json) around the JSON.
- If you respond with JSON, do NOT include any conversational text. You cannot call a tool and reply to the user in the same message.
- Keep your conversational responses concise and NEVER exceed 1500 characters.
- STRICT BEHAVIOR: NEVER mention "l'outil d'analyse", "AI", or internal systems to the user. Speak naturally as a human medical assistant.
- STRICT BEHAVIOR: NEVER mention prices, fees, or whether a consultation is free or paid.
- STRICT BEHAVIOR: NEVER invent or state medical specialties (like "neurology") for the doctors. Just refer to them as "notre spécialiste".
- Detect the patient's language from their first message and respond in that same language.
- Clinic hours: Mon-Fri 08:00-19:00, Sat 09:00-14:00.
- NEVER hallucinate URLs. If you want to share a link to the portal, you MUST call `request_password_reset` first to get it. DO NOT output a blank or placeholder link.
- **CRITICAL LOOP PREVENTION:** If a tool returns an "error" or fails to find results, DO NOT call it again in the same turn. You MUST immediately stop calling tools and ask the user for clarification or explain the issue in plain text.

Available tools:
- check_patient: args: {"whatsapp_number": str}
- register_patient: args: {"whatsapp_number": str, "first_name": str, "last_name": str, "date_of_birth": "YYYY-MM-DD", "gender": "M"|"F"|"O", "email": str}
- request_password_reset: args: {"whatsapp_number": str}
- get_login_url: args: {"whatsapp_number": str}
- get_doctors: args: {"specialty": str, "city": str}
- get_available_slots: args: {"doctor_id": str, "days": int}
- request_appointment: args: {"patient_id": str, "doctor_id": str, "slot_datetime": "YYYY-MM-DDTHH:MM:SS", "reason": str}
- get_my_appointments: args: {"whatsapp_number": str}
- cancel_appointment: args: {"appointment_id": str}
- analyze_symptoms: args: {"text": str, "lang": str}
"""

TOOL_MAP = {
    "check_patient": tools.check_patient,
    "register_patient": tools.register_patient,
    "request_password_reset": tools.request_password_reset,
    "get_login_url": tools.get_login_url,
    "get_doctors": tools.get_doctors,
    "get_available_slots": tools.get_available_slots,
    "request_appointment": tools.request_appointment,
    "get_my_appointments": tools.get_my_appointments,
    "cancel_appointment": tools.cancel_appointment,
    "analyze_symptoms": tools.analyze_symptoms,
}

async def call_llm(messages: List[Dict]) -> str:
    """Call Groq LLM and return the response text."""
    groq_key = GROQ_API_KEY
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 250,
            }
        )
        data = response.json()
        print(f"[DEBUG] Groq raw response: {data}")
        
        if "choices" not in data:
            error_msg = data.get("error", {}).get("message", str(data))
            raise Exception(f"Groq error: {error_msg}")
        
        return data["choices"][0]["message"]["content"]

def try_parse_tool_call(text: str) -> Dict | None:
    """Find and parse a tool call JSON object anywhere in the text, even with nested braces."""
    text = text.strip()

    # Try direct JSON first (whole message is just the tool call)
    try:
        obj = json.loads(text)
        if isinstance(obj, dict) and "tool" in obj and "args" in obj:
            return obj
    except json.JSONDecodeError:
        pass

    # Scan for a balanced JSON object (handles nested braces like "args": {...})
    for start in [i for i, c in enumerate(text) if c == '{']:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    candidate = text[start:i+1]
                    try:
                        obj = json.loads(candidate)
                        if isinstance(obj, dict) and "tool" in obj and "args" in obj:
                            return obj
                    except json.JSONDecodeError:
                        pass
                    break  # this brace group didn't parse as our tool call, try next start
    return None

async def execute_tool(tool_call: Dict) -> str:
    """Execute a tool and return its result as a string."""
    tool_name = tool_call["tool"]
    args = tool_call.get("args", {})
    
    if tool_name not in TOOL_MAP:
        return f"Error: Unknown tool '{tool_name}'"
    
    try:
        result = await TOOL_MAP[tool_name](**args)
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return f"Error calling {tool_name}: {str(e)}"

async def process_message(phone: str, user_message: str, conversation_history: List[Dict]) -> str:
    """
    Process a user message through the AI agent with tool calling loop.
    Returns the final response text to send to the patient.
    """
    # Check patient status proactively
    patient_info = await tools.check_patient(phone)
    if "error" in patient_info or not patient_info:
        patient_status_msg = "PATIENT DOES NOT EXIST. YOU ARE STRICTLY FORBIDDEN FROM BOOKING APPOINTMENTS OR ANALYZING SYMPTOMS. YOU MUST IMMEDIATELY ASK FOR REGISTRATION INFO."
    else:
        patient_status_msg = f"PATIENT IS ALREADY REGISTERED. Their info: {json.dumps(patient_info)}. You may proceed to booking and symptom analysis."

    # Build messages for LLM
    dynamic_system_prompt = SYSTEM_PROMPT + f"\n\nIMPORTANT CONTEXT:\n- The current user's whatsapp_number is '{phone}'. Use this exact string when calling tools.\n- PATIENT STATUS: {patient_status_msg}"
    messages = [{"role": "system", "content": dynamic_system_prompt}]
    messages.extend(conversation_history[-4:])
    messages.append({"role": "user", "content": user_message})
    
    # Agentic loop — max 5 iterations to allow multiple tool calls and final response
    max_iterations = 5
    for iteration in range(max_iterations):
        llm_response = await call_llm(messages)
        
        # Check if LLM wants to call a tool
        tool_call = try_parse_tool_call(llm_response)
        
        if tool_call:
            print(f"[DEBUG] Executing tool: {tool_call['tool']} with args {tool_call.get('args')}")
            # Execute the tool
            tool_result = await execute_tool(tool_call)
            print(f"[DEBUG] Tool result: {tool_result}")
            
            # Add tool interaction to messages
            messages.append({"role": "assistant", "content": llm_response})
            messages.append({"role": "user", "content": f"Tool result for {tool_call['tool']}: {tool_result}"})
            
            # Continue loop to get final response
            continue
        else:
            # No tool call — this is the final response to the patient
            return llm_response
    
    return "I'm sorry, I encountered an issue processing your request. Please try again."