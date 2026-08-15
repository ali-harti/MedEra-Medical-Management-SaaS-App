import numpy as np
import json
from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from .routes import api_bp


class MedEraJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        if isinstance(obj, (np.floating, np.float64)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def create_app():
    app = Flask(__name__, static_folder='..', static_url_path='')
    app.json = MedEraJSONProvider(app)
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    @app.route("/")
    def index():
        return app.send_static_file("test_dashboard.html")

    @app.route("/models/<path:filename>")
    def serve_models(filename):
        return app.send_static_file(f"models/{filename}")

    from .model import model_service
    model_service.load()
    
    app.register_blueprint(api_bp, url_prefix="/api")
    return app
