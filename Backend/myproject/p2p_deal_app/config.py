import os

class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key")

    # PostgreSQL
    DB_NAME = "p2p_deal_db"
    DB_USER = "postgres"
    DB_PASSWORD = "123456789"
    DB_HOST = "localhost"
    DB_PORT = "5432"