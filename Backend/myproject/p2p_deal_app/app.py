from flask import Flask, send_from_directory
from flask_cors import CORS

from config import Config
from routes.auth import auth_bp
from routes.profile import profile_bp

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

# Register all blueprints
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(profile_bp, url_prefix="/api")


@app.route("/")
def home():
    return {"message": "P2P Backend is running"}

@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory("uploads", filename)
if __name__ == "__main__":
    app.run(debug=True, port=8000)