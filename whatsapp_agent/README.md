# MedEra WhatsApp AI Agent

Standalone WhatsApp AI agent for MedEra clinic.

## Setup

1. Install dependencies:
   pip install -r requirements.txt

2. Copy and fill environment variables:
   cp .env.example .env

3. Get Twilio credentials:
   - Go to twilio.com and create a free account
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow the sandbox setup (send "join <word>" to +1 415 523 8886)
   - Copy Account SID and Auth Token from the console

4. Get OpenRouter API key:
   - Go to openrouter.ai and create account
   - Create a key at openrouter.ai/keys

5. Start the agent:
   python main.py

6. Expose to internet (for Twilio webhook):
   ngrok http 8001
   
7. Set Twilio webhook URL:
   - Go to Twilio Console > Messaging > Settings > WhatsApp Sandbox Settings
   - Set "When a message comes in" to: https://your-ngrok-url.ngrok.io/webhook
   - Method: POST

8. Make sure MedEra Django backend is running on port 8000

## Testing without WhatsApp
Run the backend and test the bot API directly:
   curl -X GET "http://localhost:8000/api/bot/patient/?whatsapp=+212600000000" \
     -H "X-Bot-Token: medera-bot-secret-2026"