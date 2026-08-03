import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from routes.faq import faq_bp
from socketio_instance import socketio
from admin import admin_bp
from admin.verification import verification_bp
from admin.users import users_bp
from config import Config
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.room import room_bp
from routes.transaction import transaction_bp
from routes.deal import deal_bp
from routes.fee import fee_bp
from routes.bakong import bakong_bp
from routes.wallet import wallet_bp
from routes.message import message_bp

app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

socketio.init_app(
    app,
    cors_allowed_origins="*"
)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")


@app.route("/")
def home():
    return {"message": "P2P Backend is running"}


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# Register all blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(profile_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(verification_bp, url_prefix="/api/admin")
app.register_blueprint(users_bp, url_prefix="/api/admin")
app.register_blueprint(room_bp, url_prefix="/api")
app.register_blueprint(faq_bp)
app.register_blueprint(deal_bp, url_prefix="/api")
app.register_blueprint(fee_bp, url_prefix="/api")
app.register_blueprint(wallet_bp,url_prefix="/api",)
app.register_blueprint(bakong_bp,url_prefix="/api",)
app.register_blueprint( message_bp, url_prefix="/api",)





print("Socket.IO async mode:", socketio.async_mode)
if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=8000,
        debug=True,
        use_reloader=True,
        allow_unsafe_werkzeug=True,
    )