import os
import sys
import importlib.util

# 1. Search for database.py starting from the project directory
target_file = "database.py"
db_path = None

search_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

for root, dirs, files in os.walk(search_dir):
    if target_file in files:
        db_path = os.path.join(root, target_file)
        break

if not db_path:
    print("❌ Could not find database.py file!")
    sys.exit(1)

print(f"📍 Found database.py at: {db_path}")

# 2. Dynamically load the database module
spec = importlib.util.spec_from_file_location("database", db_path)
database = importlib.util.module_from_spec(spec)
spec.loader.exec_module(database)

# 3. Execute the PostgreSQL sequence reset query
try:
    conn = database.get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT setval(
            pg_get_serial_sequence('user_login', 'user_id'), 
            COALESCE((SELECT MAX(user_id) FROM user_login), 1)
        );
    """)

    conn.commit()
    print("✅ Successfully reset user_id sequence!")

    cur.close()
    conn.close()

except Exception as e:
    print("❌ Query execution error:", e)