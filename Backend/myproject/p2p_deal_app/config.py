import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=False)


def required_environment_value(name):
    value = os.getenv(name)

    if value is None or not value.strip():
        raise RuntimeError(
            f"Required environment variable {name} is missing."
        )

    return value.strip()


class Config:
    # Flask authentication
    SECRET_KEY = required_environment_value(
        "SECRET_KEY"
    )

    # PostgreSQL
    DB_HOST = required_environment_value("DB_HOST")
    DB_PORT = int(
        required_environment_value("DB_PORT")
    )
    DB_NAME = required_environment_value("DB_NAME")
    DB_USER = required_environment_value("DB_USER")
    DB_PASSWORD = required_environment_value(
        "DB_PASSWORD"
    )

    # Local Node KHQR generator
    BAKONG_NODE_SERVICE_URL = os.getenv(
        "BAKONG_NODE_SERVICE_URL",
        "http://localhost:3001",
    ).rstrip("/")

    # Bakong Open API
    BAKONG_API_BASE_URL = os.getenv(
        "BAKONG_API_BASE_URL",
        "https://sit-api-bakong.nbc.org.kh",
    ).rstrip("/")

    BAKONG_API_TOKEN = os.getenv(
        "BAKONG_API_TOKEN"
    )