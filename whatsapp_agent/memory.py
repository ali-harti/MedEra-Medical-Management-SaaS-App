import json
import redis
from typing import List, Dict, Any
from datetime import datetime
from config import REDIS_URL

# Connect to Redis
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

def _get_session_key(phone: str) -> str:
    return f"medera:session:{phone}"

def _load_session(phone: str) -> Dict:
    key = _get_session_key(phone)
    data = redis_client.get(key)
    if data:
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            pass
            
    return {
        "messages": [],
        "patient_id": None,
        "last_active": datetime.now().isoformat()
    }

def _save_session(phone: str, session: Dict):
    key = _get_session_key(phone)
    session["last_active"] = datetime.now().isoformat()
    # Keep session for 30 days (2592000 seconds)
    redis_client.setex(key, 2592000, json.dumps(session))

def get_session(phone: str) -> Dict:
    return _load_session(phone)

def add_message(phone: str, role: str, content: str):
    session = _load_session(phone)
    session["messages"].append({"role": role, "content": content})
    # Keep only last 20 messages to avoid context overflow
    if len(session["messages"]) > 20:
        session["messages"] = session["messages"][-20:]
    _save_session(phone, session)

def get_messages(phone: str) -> List[Dict]:
    return _load_session(phone)["messages"]

def set_patient_id(phone: str, patient_id: str):
    session = _load_session(phone)
    session["patient_id"] = patient_id
    _save_session(phone, session)

def get_patient_id(phone: str) -> str | None:
    return _load_session(phone).get("patient_id")

def clear_session(phone: str):
    key = _get_session_key(phone)
    redis_client.delete(key)