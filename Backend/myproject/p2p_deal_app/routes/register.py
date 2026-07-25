conn = get_db()
cursor = conn.cursor()

cursor.execute("SELECT current_database(), current_schema(), version();")
print(cursor.fetchone())