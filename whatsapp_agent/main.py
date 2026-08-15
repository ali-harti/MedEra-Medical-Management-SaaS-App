from fastapi import FastAPI, Form, Response, Request
from fastapi.responses import PlainTextResponse
from twilio.rest import Client as TwilioClient
from twilio.twiml.messaging_response import MessagingResponse
import uvicorn
import asyncio

import memory
import agent
import httpx
import tempfile
import os
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, BACKUP_TWILIO_ACCOUNT_SID, BACKUP_TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, GROQ_API_KEY

app = FastAPI(title="MedEra WhatsApp Agent")
twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
backup_twilio_client = TwilioClient(BACKUP_TWILIO_ACCOUNT_SID, BACKUP_TWILIO_AUTH_TOKEN)

twilio_clients = [
    twilio_client,
    backup_twilio_client
]
current_client_idx = 0

def send_twilio_message(to_phone: str, body: str, account_sid: str = None):
    if not twilio_clients:
        print(f"[SIMULATED WHATSAPP to {to_phone}] {body}")
        return True

    success = False
    last_err = None
    
    # Broadcast to ALL clients to ensure delivery regardless of which sandbox the user joined
    for i, client in enumerate(twilio_clients):
        try:
            msg = client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                to=to_phone,
                body=body
            )
            print(f"Twilio account {i} accepted message. SID: {msg.sid}")
            success = True
        except Exception as e:
            print(f"Twilio account {i} failed: {e}")
            last_err = e
            
    if not success:
        raise Exception(f"All Twilio accounts failed. Last error: {last_err}")
    return True

@app.get("/")
async def health():
    return {"status": "MedEra WhatsApp Agent is running"}

@app.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(default=""),
    NumMedia: str = Form(default="0"),
    AccountSid: str = Form(default=None),
):
    """
    Receives incoming WhatsApp messages from Twilio.
    Processes them through the AI agent and sends a reply.
    """
    # Parse form data properly since some fields are optional
    form_data = await request.form()
    
    phone = From  # e.g. "whatsapp:+212600000000"
    # Fix URL encoding issue where '+' might become ' '
    phone = phone.replace(" ", "+")
    clean_phone = phone.replace("whatsapp:", "")
    user_message = Body.strip()
    
    # Handle voice messages
    if int(NumMedia) > 0:
        media_type = form_data.get("MediaContentType0", "")
        media_url = form_data.get("MediaUrl0", "")
        
        if media_url and media_type.startswith("audio/"):
            print(f"[{phone}] Received audio message: {media_url}")
            try:
                # 1. Download audio from Twilio using Basic Auth
                async with httpx.AsyncClient() as client:
                    auth_creds = [
                        (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                        (BACKUP_TWILIO_ACCOUNT_SID, BACKUP_TWILIO_AUTH_TOKEN)
                    ]
                    global current_client_idx
                    
                    audio_res = None
                    for attempt in range(len(auth_creds)):
                        idx = (current_client_idx + attempt) % len(auth_creds)
                        audio_res = await client.get(
                            media_url, 
                            auth=auth_creds[idx]
                        )
                        if audio_res.status_code == 200:
                            current_client_idx = idx
                            break
                        print(f"Twilio account {idx} audio download failed, trying next...")
                    
                    if audio_res.status_code == 200:
                        # 2. Save to temp file
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp_file:
                            tmp_file.write(audio_res.content)
                            tmp_file_path = tmp_file.name
                        
                        # 3. Transcribe with Groq Whisper
                        groq_url = "https://api.groq.com/openai/v1/audio/transcriptions"
                        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
                        
                        with open(tmp_file_path, "rb") as f:
                            files = {"file": (os.path.basename(tmp_file_path), f, "audio/ogg")}
                            data = {"model": "whisper-large-v3", "language": "fr"}
                            
                            async with httpx.AsyncClient() as g_client:
                                g_res = await g_client.post(
                                    groq_url, headers=headers, files=files, data=data, timeout=30
                                )
                                
                                if g_res.status_code == 200:
                                    transcript = g_res.json().get("text", "")
                                    user_message = f"[Audio Transcription] {transcript}"
                                    print(f"[{phone}] Transcription: {user_message}")
                                else:
                                    print(f"Groq error: {g_res.text}")
                                    user_message = "[Message vocal non transcrit]"
                        
                        # Cleanup temp file
                        os.unlink(tmp_file_path)
                    else:
                        print(f"Twilio audio download failed: {audio_res.status_code}")
            except Exception as e:
                print(f"Transcription error: {e}")
                user_message = "[Erreur de transcription audio]"
    
    # Reset command check
    if user_message.strip().lower() in ["reset", "restart", "réinitialiser"]:
        memory.clear_session(phone)
        response_text = "Conversation réinitialisée. Vous pouvez recommencer — bonjour !"
        send_twilio_message(phone, response_text)
        return PlainTextResponse("", media_type="text/xml")
    
    print(f"\n[{phone}] Patient: {user_message}")
    
    # Get conversation history
    history = memory.get_messages(phone)
    
    # Process through AI agent
    try:
        response_text = await agent.process_message(clean_phone, user_message, history)
    except Exception as e:
        print(f"Agent error: {e}")
        response_text = "Sorry, I encountered an error. Please try again in a moment."
        send_twilio_message(phone, response_text, account_sid=AccountSid)
        return Response(content="", media_type="text/xml")
    
    # Save to memory
    memory.add_message(phone, "user", user_message)
    memory.add_message(phone, "assistant", response_text)
    
    print(f"[{phone}] Bot: {response_text[:100]}...")
    
    if len(response_text) > 1590:
        response_text = response_text[:1590] + "..."
    
    # Send reply via Twilio
    send_twilio_message(phone, response_text, account_sid=AccountSid)
    
    # Return empty TwiML (we already sent the reply above)
    return PlainTextResponse("", media_type="text/xml")

@app.post("/send-notification")
async def send_notification(request: Request):
    """
    Called by MedEra Django backend to send proactive notifications.
    Body: { "whatsapp_number": "+212...", "event": "appointment_confirmed|rejected|prescription_ready", ... }
    """
    data = await request.json()
    whatsapp_number = data.get("whatsapp_number")
    event = data.get("event")
    
    if not whatsapp_number:
        return {"error": "whatsapp_number required"}
    
    # Build message based on event
    if event == "appointment_confirmed":
        apt_datetime = data.get("appointment_datetime", "")
        doctor_name = data.get("doctor_name", "Dr. Alaoui")
        message = (
            f"✅ Votre rendez-vous a été confirmé !\n"
            f"📅 {apt_datetime} avec {doctor_name}\n"
            f"📍 Casablanca, Maroc\n\n"
            f"Je vous enverrai un rappel 24h avant. À bientôt !"
        )
    elif event == "appointment_rejected":
        reason = data.get("rejection_reason", "")
        apt_datetime = data.get("appointment_datetime", "")
        message = (
            f"Malheureusement, votre demande de rendez-vous pour le {apt_datetime} n'a pas pu être confirmée.\n"
            f"Raison : {reason}\n\n"
            f"Souhaitez-vous choisir un autre créneau ? Répondez à ce message et je vous aiderai."
        )
    elif event == "prescription_ready":
        prescription_url = data.get("prescription_url", "")
        doctor_name = data.get("doctor_name", "Dr. Alaoui")
        message = (
            f"📋 Votre ordonnance de la consultation avec {doctor_name} est prête.\n"
            f"Téléchargez-la ici : {prescription_url}"
        )
    elif event == "reminder_24h":
        apt_datetime = data.get("appointment_datetime", "")
        doctor_name = data.get("doctor_name", "Dr. Alaoui")
        message = (
            f"⏰ Rappel : Vous avez un rendez-vous demain !\n"
            f"📅 {apt_datetime} avec {doctor_name}\n"
            f"📍 Casablanca, Maroc\n\n"
            f"Si vous ne pouvez pas venir, répondez 'annuler' et je libérerai votre créneau."
        )
    elif event == "reminder_1h":
        apt_datetime = data.get("appointment_datetime", "")
        doctor_name = data.get("doctor_name", "Dr. Alaoui")
        message = (
            f"⏰ Rappel final : Votre rendez-vous est dans 1 heure.\n"
            f"📅 {apt_datetime} avec {doctor_name}\n\n"
            f"À tout à l'heure ! Si vous ne pouvez pas venir, répondez 'annuler'."
        )
    else:
        message = data.get("message", "Notification de MedEra.")
    
    # Send via Twilio
    try:
        send_twilio_message(f"whatsapp:{whatsapp_number}", message)
        return {"sent": True}
    except Exception as e:
        return {"sent": False, "error": str(e)}

@app.post("/test-chat")
async def test_chat(request: Request):
    """
    Test endpoint to bypass Twilio rate limits.
    Send a JSON payload: {"phone": "0658810677", "message": "bonjour"}
    """
    data = await request.json()
    phone = data.get("phone", "test_user")
    user_message = data.get("message", "")
    
    if user_message.strip().lower() in ["reset", "restart", "réinitialiser"]:
        memory.clear_session(phone)
        return {"response": "Conversation réinitialisée. Vous pouvez recommencer — bonjour !"}
        
    history = memory.get_messages(phone)
    history.append({"role": "user", "content": user_message})
    memory.add_message(phone, "user", user_message)
    
    response_text = await agent.process_message(phone, user_message, history)
    memory.add_message(phone, "assistant", response_text)
    
    return {"response": response_text}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)