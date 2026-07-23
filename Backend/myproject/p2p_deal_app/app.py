from flask import Flask
from flask_cors import CORS

from config import Config

from routes.auth import auth_bp
app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

app.register_blueprint(auth_bp, url_prefix="/api")


@app.route("/")
def home():
    return {"message": "P2P Backend is running"}


if __name__ == "__main__":
    app.run(debug=True, port=8000)
    