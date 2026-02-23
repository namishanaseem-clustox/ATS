from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum
import uuid
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

class RequisitionStatus(str, enum.Enum):
    DRAFT = "Draft"
    PENDING_HR = "Pending_HR"
    PENDING_OWNER = "Pending_Owner"
    OPEN = "Open"
    FILLED = "Filled"
    CANCELLED = "Cancelled"

class JobRequisition(Base):
    __tablename__ = "job_requisitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    req_code = Column(String, unique=True, index=True, nullable=False) # e.g. REQ-001

    # Basic Info
    job_title = Column(String, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    location = Column(String, nullable=False)
    employment_type = Column(String, nullable=False)

    # Sensitive / Compensation
    min_salary = Column(Float, nullable=True)
    max_salary = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    has_equity_bonus = Column(Boolean, default=False)
    budget_code = Column(String, nullable=True)

    # Business Case
    justification = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Actors & Status
    status = Column(SAEnum(RequisitionStatus), default=RequisitionStatus.DRAFT)
    hiring_manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    department = relationship("Department")
    hiring_manager = relationship("User", foreign_keys=[hiring_manager_id])
    audit_logs = relationship("RequisitionLog", back_populates="requisition", cascade="all, delete-orphan")


class RequisitionLog(Base):
    __tablename__ = "requisition_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requisition_id = Column(UUID(as_uuid=True), ForeignKey("job_requisitions.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) # User who performed it
    action = Column(String, nullable=False) # "Created", "Approved by HR", "Rejected by Owner"
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    requisition = relationship("JobRequisition", back_populates="audit_logs")
    user = relationship("User")
