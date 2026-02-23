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
    
    is_admin = current_user.role in [UserRole.OWNER, UserRole.HR]
    
    # Get recent job activities
    job_query = db.query(Job).filter(Job.created_at >= datetime.utcnow() - timedelta(days=7))
    if not is_admin:
        job_query = job_query.filter(Job.department_id == current_user.department_id)
    recent_job_activities = job_query.order_by(desc(Job.created_at)).limit(10).all()
    
    activities = []
    for job in recent_job_activities:
        activities.append({
            "id": str(job.id),
            "type": "job_created",
            "title": f"New job created: {job.title}",
            "description": f"Job code: {job.job_code}",
            "timestamp": job.created_at.isoformat() if job.created_at else None,
            "user": job.hiring_manager_id or "Unknown"
        })
    
    # Get recent candidate activities
    candidate_query = db.query(Candidate).filter(Candidate.created_at >= datetime.utcnow() - timedelta(days=7))
    if not is_admin:
        from app.models.candidate import JobApplication
        candidate_query = candidate_query.join(JobApplication).join(Job).filter(Job.department_id == current_user.department_id)
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
        
        req_query = db.query(JobRequisition).filter(
            or_(
                JobRequisition.updated_at >= datetime.utcnow() - timedelta(days=7),
                JobRequisition.created_at >= datetime.utcnow() - timedelta(days=7)
            )
        )
        
        if is_admin:
            req_query = req_query.filter(
                JobRequisition.status.in_([
                    RequisitionStatus.PENDING_HR, 
                    RequisitionStatus.PENDING_OWNER,
                    RequisitionStatus.OPEN,
                    RequisitionStatus.DRAFT,
                    RequisitionStatus.CANCELLED,
                    RequisitionStatus.FILLED
                ])
            )
        else:
            req_query = req_query.filter(
                JobRequisition.hiring_manager_id == current_user.id
            )

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
                "user": req.hiring_manager_id or "Unknown"
            })

    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return activities[:20]  # Return top 20 activities

@router.get("/top-performers")
def get_top_performers(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get top performers metrics"""
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access dashboard"
        )
    
    # Top hiring managers by jobs created
    top_hiring_managers = db.query(
        Job.hiring_manager_id,
        func.count(Job.id).label('jobs_count')
    ).filter(
        Job.is_deleted == False,
        Job.hiring_manager_id.isnot(None)
    ).group_by(Job.hiring_manager_id).order_by(desc('jobs_count')).limit(5).all()
    
    # Get user details for hiring managers
    hiring_manager_data = []
    for hm_id, count in top_hiring_managers:
        hm_user = db.query(User).filter(User.id == hm_id).first()
        if hm_user:
            hiring_manager_data.append({
                "user_id": str(hm_id),
                "name": hm_user.full_name or "Unknown",
                "email": hm_user.email,
                "jobs_count": count,
                "role": "Hiring Manager"
            })
    
    # Top interviewers by activities
    top_interviewers = db.query(
        User.id,
        User.full_name,
        User.email,
        func.count(ScheduledActivity.id).label('activities_count')
    ).join(ScheduledActivity.assignees).group_by(
        User.id, User.full_name, User.email
    ).order_by(desc('activities_count')).limit(5).all()
    
    interviewer_data = []
    for user_id, name, email, count in top_interviewers:
        interviewer_data.append({
            "user_id": str(user_id),
            "name": name or "Unknown",
            "email": email,
            "activities_count": count,
            "role": "Interviewer"
        })
    
    return {
        "top_hiring_managers": hiring_manager_data,
        "top_interviewers": interviewer_data
    }

@router.get("/actions-taken")
def get_actions_taken(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get actions taken leaderboard"""
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access dashboard"
        )
    
    # This would ideally come from an activity log table
    # For now, we'll simulate with available data
    
    # Count activities per user (as a proxy for actions taken)
    user_actions = db.query(
        User.id,
        User.full_name,
        User.email,
        func.count(ScheduledActivity.id).label('actions_count')
    ).outerjoin(ScheduledActivity.assignees).group_by(
        User.id, User.full_name, User.email
    ).order_by(desc('actions_count')).limit(10).all()
    
    actions_data = []
    for user_id, name, email, count in user_actions:
        actions_data.append({
            "user_id": str(user_id),
            "name": name or "Unknown",
            "email": email,
            "actions_count": count,
            "role": "User"
        })
    
    return actions_data

@router.get("/my-performance")
def get_my_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Get current user's performance metrics"""
    if current_user.role not in [UserRole.OWNER, UserRole.HR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access dashboard"
        )
    
    # Get user's job-related metrics
    my_jobs = db.query(Job).filter(
        Job.hiring_manager_id == current_user.id,
        Job.is_deleted == False
    ).all()
    
    # Get applications to user's jobs
    my_job_ids = [job.id for job in my_jobs]
    applications = db.query(JobApplication).filter(
        JobApplication.job_id.in_(my_job_ids)
    ).all()
    
    # Calculate metrics over time
    now = datetime.utcnow()
    metrics_by_month = {}
    
    for i in range(6):  # Last 6 months
        month_start = now.replace(day=1) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=31)
        
        month_jobs = [j for j in my_jobs if j.created_at and month_start <= j.created_at < month_end]
        month_applications = [a for a in applications if a.applied_at and month_start <= a.applied_at < month_end]
        
        metrics_by_month[f"month_{i}"] = {
            "month": month_start.strftime("%b %Y"),
            "jobs_created": len(month_jobs),
            "applications_received": len(month_applications)
        }
    
    return {
        "total_jobs_created": len(my_jobs),
        "total_applications_received": len(applications),
        "metrics_by_month": metrics_by_month
    }
