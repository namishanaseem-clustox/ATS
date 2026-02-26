from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:postgres@localhost:5432/clustox_ats")
with engine.connect() as conn:
    res = conn.execute(text("SELECT id, google_access_token, google_refresh_token FROM users WHERE email='namisha.naseem@clustox.com'")).fetchone()
    if res:
        user_id, access_token, refresh_token = res
        print(f"User ID: {user_id}")
        print(f"Access Token: {'YES' if access_token else 'NO'}")
        print(f"Refresh Token: {'YES' if refresh_token else 'NO'}")
    else:
        print("User not found")
