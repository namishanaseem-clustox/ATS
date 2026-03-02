from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_
from typing import List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.job import Job, JobStatus
from app.models.candidate import Candidate, JobApplication
from app.models.scheduled_activity import ScheduledActivity
from app.routers.auth import get_current_active_user

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get dashboard overview data for owner and HR roles"""
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access dashboard"
        )
    
    # Time periods for calculations
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    
    # Basic counts
    total_jobs = db.query(Job).filter(Job.is_deleted == False).count()
    total_candidates = db.query(Candidate).count()
    total_users = db.query(User).filter(User.is_deleted == False).count()
    
    # Recent counts (last 30 days)
    recent_jobs = db.query(Job).filter(
        Job.created_at >= thirty_days_ago,
        Job.is_deleted == False
    ).count()
    
    recent_candidates = db.query(Candidate).filter(
        Candidate.created_at >= thirty_days_ago
    ).count()
    
    # Active jobs count
    active_jobs = db.query(Job).filter(
        Job.status == JobStatus.PUBLISHED.value,
        Job.is_deleted == False
    ).count()
    
    # Hires in last 30 days
    hires_count = db.query(JobApplication).filter(
        JobApplication.application_status == "Hired",
        JobApplication.applied_at >= thirty_days_ago
    ).count()
    
    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "total_users": total_users,
        "active_jobs": active_jobs,
        "recent_jobs": recent_jobs,
        "recent_candidates": recent_candidates,
        "hires_count": hires_count,
        "recent_growth": {
            "jobs_growth": ((recent_jobs / max(total_jobs - recent_jobs, 1)) * 100) if total_jobs > 0 else 0,
            "candidates_growth": ((recent_candidates / max(total_candidates - recent_candidates, 1)) * 100) if total_candidates > 0 else 0
        }
    }

@router.get("/recent-activities")
def get_recent_activities(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get recent activities for dashboard"""
    if current_user.role not in [UserRole.OWNER, UserRole.HR, UserRole.HIRING_MANAGER, UserRole.INTERVIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access dashboard"
        )
    
    from sqlalchemy import or_, desc, func
    
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]
    
    # Get recent job activities (Extended to 90 days to catch mock data)
    job_query = db.query(Job).filter(Job.created_at >= datetime.utcnow() - timedelta(days=90))
    if not is_admin:
        job_query = job_query.filter(
            or_(
                Job.department_id == current_user.department_id,
                Job.hiring_manager_id == current_user.id
            )
        )
    recent_job_activities = job_query.order_by(desc(Job.created_at)).limit(10).all()
    
    activities = []
    for job in recent_job_activities:
        activities.append({
            "id": str(job.id),
            "type": "job_created",
            "title": f"New job created: {job.title}",
            "description": f"Job code: {job.job_code}",
            "timestamp": job.created_at.isoformat() if job.created_at else None,
            "user": job.hiring_manager.full_name if job.hiring_manager else "Unknown"
        })
    
    # Get recent candidate activities (Extended to 90 days)
    candidate_query = db.query(Candidate).filter(Candidate.created_at >= datetime.utcnow() - timedelta(days=90))
    if not is_admin:
        from app.models.candidate import JobApplication
        candidate_query = candidate_query.join(JobApplication).join(Job).filter(
            or_(
                Job.department_id == current_user.department_id,
                Job.hiring_manager_id == current_user.id
            )
        )
    recent_candidate_activities = candidate_query.order_by(desc(Candidate.created_at)).limit(10).all()
    
    for candidate in recent_candidate_activities:
        activities.append({
            "id": str(candidate.id),
            "type": "candidate_created",
            "title": f"New candidate: {candidate.first_name} {candidate.last_name}",
            "description": f"Email: {candidate.email}",
            "timestamp": candidate.created_at.isoformat() if candidate.created_at else None,
            "user": "Unknown"
        })
    
    recent_reqs = []
    if current_user.role != UserRole.INTERVIEWER:
        # Get recent pending requisitions
        from app.models.requisition import JobRequisition, RequisitionStatus
        
        # Base query for everyone to see recent active/updated reqs (Extended to 90 days)
        req_query = db.query(JobRequisition).filter(
            or_(
                JobRequisition.updated_at >= datetime.utcnow() - timedelta(days=90),
                JobRequisition.created_at >= datetime.utcnow() - timedelta(days=90)
            )
        )
        
        if is_admin:
            # HR sees Pending_HR, Approved (for them to create job), plus general ones
            # Owner sees Pending_Owner, Open (to know it's live), plus general ones
            admin_visible_statuses = [
                RequisitionStatus.DRAFT,
                RequisitionStatus.CANCELLED,
                RequisitionStatus.FILLED
            ]
            
            if current_user.role == UserRole.HR:
                admin_visible_statuses.extend([RequisitionStatus.PENDING_HR, RequisitionStatus.APPROVED])
            elif current_user.role == UserRole.OWNER:
                admin_visible_statuses.extend([RequisitionStatus.PENDING_OWNER, RequisitionStatus.OPEN])
                
            req_query = req_query.filter(JobRequisition.status.in_(admin_visible_statuses))
        else:
            # Hiring managers only see their own requisitions, regardless of status
            req_query = req_query.filter(JobRequisition.hiring_manager_id == current_user.id)

        recent_reqs = req_query.order_by(desc(func.coalesce(JobRequisition.updated_at, JobRequisition.created_at))).limit(10).all()
        
        for req in recent_reqs:
            status_label = "Pending Approval" if req.status in [RequisitionStatus.PENDING_HR, RequisitionStatus.PENDING_OWNER] else req.status.value
            desc_text = f"Status: {status_label}"
            
            if req.status == RequisitionStatus.DRAFT and req.rejection_reason:
                desc_text += f" - Reason: {req.rejection_reason[:50]}..." if len(req.rejection_reason) > 50 else f" - Reason: {req.rejection_reason}"

            timestamp = req.updated_at if req.updated_at else req.created_at
            activities.append({
                "id": str(req.id),
                "type": "requisition_pending",
                "title": f"Requisition update: {req.job_title}",
                "description": desc_text,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "user": req.hiring_manager.full_name if req.hiring_manager else "Unknown"
            })

    # Get recent assigned activities
    from app.models.scheduled_activity import ScheduledActivity
    activity_query = db.query(ScheduledActivity).filter(
        ScheduledActivity.created_at >= datetime.utcnow() - timedelta(days=90),
        ScheduledActivity.assignees.any(User.id == current_user.id)
    )
    recent_assigned = activity_query.order_by(desc(ScheduledActivity.created_at)).limit(10).all()
    
    for act in recent_assigned:
        activities.append({
            "id": str(act.id),
            "type": "activity_assigned",
            "title": f"New assigned {act.activity_type.lower() if act.activity_type else 'activity'}: {act.title}",
            "description": f"Scheduled for: {act.scheduled_at.strftime('%Y-%m-%d %H:%M') if act.scheduled_at else 'TBD'}",
            "timestamp": act.created_at.isoformat() if act.created_at else None,
            "user": act.creator.full_name if act.creator else "Unknown"
        })

    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    # Filter out dismissed activities
    from app.models.user import DismissedActivity
    dismissed_keys = db.query(DismissedActivity.notification_key).filter(
        DismissedActivity.user_id == current_user.id
    ).all()
    dismissed_keys_set = {key[0] for key in dismissed_keys}
    
    filtered_activities = []
    for activity in activities:
        notification_key = f"{activity['type']}_{activity['id']}"
        if notification_key not in dismissed_keys_set:
            activity['notification_key'] = notification_key
            filtered_activities.append(activity)
            
    return filtered_activities[:20]  # Return top 20 activities

@router.post("/recent-activities/{notification_key}/dismiss")
def dismiss_activity(
    notification_key: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    from app.models.user import DismissedActivity
    # Check if already dismissed
    exists = db.query(DismissedActivity).filter(
        DismissedActivity.user_id == current_user.id,
        DismissedActivity.notification_key == notification_key
    ).first()
    
    if not exists:
        dismissed = DismissedActivity(user_id=current_user.id, notification_key=notification_key)
        db.add(dismissed)
        db.commit()
        
    return {"message": "Notification dismissed"}

@router.get("/top-performers")
def get_top_performers(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get top performers metrics using standard ATS attribution.
    
    - Hires: Who moved candidates to Hired (hired_by_user_id), with dept fallback
    - Candidates: Who added candidates to the pipeline (added_by_user_id), with dept fallback
    - Jobs: Who opened requisitions (recruiter_id / hiring_manager_id on Job)
    - Actions: Who completed scheduled activities
    """
    from sqlalchemy import desc, func, or_
    from app.models.candidate import JobApplication
    from app.models.job import Job
    from app.models.scheduled_activity import ScheduledActivity
    from app.models.pipeline_stage import PipelineStage

    # Hiring Managers see only their own department
    is_hiring_manager = current_user.role.value == 'hiring_manager'
    dept_filter = current_user.department_id if is_hiring_manager and current_user.department_id else None

    # Hired stage detection
    hired_stage_ids = [str(r[0]) for r in db.query(PipelineStage.id).filter(
        func.lower(PipelineStage.name) == 'hired'
    ).all()]
    hired_expr = or_(
        JobApplication.current_stage.in_(hired_stage_ids),
        func.lower(JobApplication.current_stage) == 'hired'
    )

    def restrict_dept(q, job_alias=Job):
        """Apply department scope for hiring managers."""
        if dept_filter:
            q = q.filter(job_alias.department_id == dept_filter)
        return q

    # ── 1. HIRES: ranked by who moved candidate to Hired (hired_by_user_id) ──
    hires_direct = db.query(
        User.id, User.full_name, func.count(JobApplication.id).label('count')
    ).join(JobApplication, JobApplication.hired_by_user_id == User.id
    ).join(Job, Job.id == JobApplication.job_id
    ).filter(User.is_active == True, User.is_deleted.isnot(True))
    hires_direct = restrict_dept(hires_direct)
    hires_data = hires_direct.group_by(User.id, User.full_name).order_by(desc('count')).limit(10).all()

    # Fallback: if hired_by_user_id not set yet, attribute via job recruiter
    if not hires_data:
        hires_fallback = db.query(
            User.id, User.full_name, func.count(JobApplication.id).label('count')
        ).join(Job, or_(Job.recruiter_id == User.id, Job.hiring_manager_id == User.id)
        ).join(JobApplication, JobApplication.job_id == Job.id
        ).filter(hired_expr, User.is_active == True, User.is_deleted.isnot(True))
        hires_fallback = restrict_dept(hires_fallback)
        hires_data = hires_fallback.group_by(User.id, User.full_name).order_by(desc('count')).limit(10).all()

    # ── 2. CANDIDATES: ranked by who sourced the candidate (added_by_user_id) ──
    cands_direct = db.query(
        User.id, User.full_name, func.count(JobApplication.id).label('count')
    ).join(JobApplication, JobApplication.added_by_user_id == User.id
    ).join(Job, Job.id == JobApplication.job_id
    ).filter(User.is_active == True, User.is_deleted.isnot(True))
    cands_direct = restrict_dept(cands_direct)
    candidates_data = cands_direct.group_by(User.id, User.full_name).order_by(desc('count')).limit(10).all()

    # Fallback: attribute via job recruiter/hiring_manager
    if not candidates_data:
        cands_fallback = db.query(
            User.id, User.full_name, func.count(JobApplication.id).label('count')
        ).join(Job, or_(Job.recruiter_id == User.id, Job.hiring_manager_id == User.id)
        ).join(JobApplication, JobApplication.job_id == Job.id
        ).filter(User.is_active == True, User.is_deleted.isnot(True))
        cands_fallback = restrict_dept(cands_fallback)
        candidates_data = cands_fallback.group_by(User.id, User.full_name).order_by(desc('count')).limit(10).all()

    # ── 3. JOBS: who opened requisitions (recruiter_id or hiring_manager_id) ──
    jobs_q = db.query(
        User.id, User.full_name, func.count(Job.id).label('count')
    ).join(Job, or_(Job.recruiter_id == User.id, Job.hiring_manager_id == User.id)
    ).filter(Job.is_deleted == False, User.is_active == True, User.is_deleted.isnot(True))
    jobs_q = restrict_dept(jobs_q)
    jobs_data = jobs_q.group_by(User.id, User.full_name).order_by(desc('count')).limit(10).all()

    # ── 4. ACTIONS: scheduled activities assigned to users ──
    actions_q = db.query(
        User.id, User.full_name, func.count(ScheduledActivity.id).label('count')
    ).join(ScheduledActivity.assignees)
    if dept_filter:
        actions_q = actions_q.filter(User.department_id == dept_filter)
    actions_data = actions_q.group_by(User.id, User.full_name).order_by(desc('count')).limit(10).all()

    def format_list(data_tuples):
        return [{"id": str(u_id), "name": name or "Unknown", "count": count} for u_id, name, count in data_tuples]

    return {
        "hires": format_list(hires_data),
        "candidates": format_list(candidates_data),
        "jobs": format_list(jobs_data),
        "actions": format_list(actions_data)
    }


@router.get("/my-performance")
def get_my_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get current user's candidate volume over the last 5 months"""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    from app.models.candidate import JobApplication
    from sqlalchemy import func
    
    now = datetime.utcnow()
    metrics = []
    
    # We want the last 5 months including current
    for i in range(4, -1, -1):
        target_month = now - relativedelta(months=i)
        start_date = target_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + relativedelta(months=1)
        
        # Count candidates applied to jobs owned by the user in this month window
        count = db.query(JobApplication).join(Job, JobApplication.job_id == Job.id).filter(
            Job.hiring_manager_id == current_user.id,
            JobApplication.applied_at >= start_date,
            JobApplication.applied_at < end_date
        ).count()
        
        metrics.append({
            "name": start_date.strftime("%b"),
            "candidates": count
        })
        
    return metrics
