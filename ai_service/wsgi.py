from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.model import model_service

app = create_app()

with app.app_context():
    model_service.load()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
