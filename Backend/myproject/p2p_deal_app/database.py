import os
import psycopg2
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "3319"),
        dbname=os.getenv("DB_NAME", "p2p_deal_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD")
    )