from pydantic import BaseModel, UUID4
from typing import Optional

class UserPreferencesBase(BaseModel):
    notify_new_candidate: Optional[bool] = True
    notify_activity_assigned: Optional[bool] = True
    notify_feedback_submitted: Optional[bool] = True
    notify_stage_change: Optional[bool] = True
    timezone: Optional[str] = "UTC"
    date_format: Optional[str] = "DD/MM/YYYY"
    language: Optional[str] = "en"

class UserPreferencesUpdate(UserPreferencesBase):
    pass

class UserPreferencesResponse(UserPreferencesBase):
    id: UUID4
    user_id: UUID4

    class Config:
        from_attributes = True
