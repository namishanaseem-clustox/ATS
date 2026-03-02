from app.database import SessionLocal
from app.routers.dashboard import get_top_performers
from app.models.user import User
from app.models.user_preferences import UserPreferences

db = SessionLocal()
u = db.query(User).first()
try:
    print(get_top_performers(db=db, current_user=u))
except Exception as e:
    import traceback
    traceback.print_exc()
