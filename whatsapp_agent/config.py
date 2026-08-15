import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MEDERA_BACKEND_URL = os.getenv("MEDERA_BACKEND_URL", "http://localhost:8000")
BOT_API_TOKEN = os.getenv("BOT_API_TOKEN", "medera-bot-secret-2026")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
BACKUP_TWILIO_ACCOUNT_SID = os.getenv("BACKUP_TWILIO_ACCOUNT_SID", "")
BACKUP_TWILIO_AUTH_TOKEN = os.getenv("BACKUP_TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "medera-internal-secret-token-dev")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:5000")
AI_INTERNAL_TOKEN = os.getenv("AI_INTERNAL_TOKEN", "medera-internal-secret-token-dev")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")