from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.schemas.candidate import CandidateCreate, CandidateResponse, CandidateUpdate, CandidateBasicResponse
from app.services.candidate_service import candidate_service
from app.models.user import UserRole, User
from app.dependencies import RoleChecker
from app.routers.auth import get_current_active_user

router = APIRouter(
    prefix="/candidates",
    tags=["candidates"],
)
@router.get("/")
def read_candidates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Query without defer options, trusting manual serialization to pick fields
    from app.models.candidate import Candidate
    
    filter_by_owner_id = None
    filter_by_department_id = None
    
    if current_user.role == UserRole.HIRING_MANAGER:
        filter_by_owner_id = current_user.id
        
    elif current_user.role == UserRole.INTERVIEWER:
        if current_user.department_id:
            filter_by_department_id = current_user.department_id
        else:
            return []

    # Pass filter to service (which we need to update to support it)
    # candidates = db.query(Candidate).offset(skip).limit(limit).all()
    candidates = candidate_service.get_candidates(db, skip=skip, limit=limit, filter_by_owner_id=filter_by_owner_id, filter_by_department_id=filter_by_department_id)
    
    # Manually construction response to bypass Pydantic serialization hang
    results = []
    for c in candidates:
        try:
            # Basic fields
            c_dict = {
                "id": str(c.id),
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "location": c.location,
                "current_company": c.current_company,
                "current_position": c.current_position,
                "experience_years": c.experience_years,
                "nationality": c.nationality,
                "notice_period": c.notice_period,
                "skills": c.skills or [],
                "education": c.education or [],
                "experience_history": c.experience_history or [],
                "social_links": c.social_links or {},
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "resume_file_path": c.resume_file_path,
                "parsed_at": c.parsed_at.isoformat() if c.parsed_at else None,
            }
            
            # Redact salary for Interviewers
            if current_user.role == UserRole.INTERVIEWER:
                c_dict["current_salary"] = None
                c_dict["expected_salary"] = None
            else:
                c_dict["current_salary"] = c.current_salary
                c_dict["expected_salary"] = c.expected_salary

            results.append(c_dict)
        except Exception as e:
            # Skip invalid records but don't crash the whole list
            continue
            
    return results

@router.post("/", response_model=CandidateResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    return candidate_service.create_candidate(db=db, candidate=candidate)

@router.get("/{candidate_id}", response_model=CandidateResponse)
def read_candidate(candidate_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_candidate = candidate_service.get_candidate(db, candidate_id=candidate_id)
    if db_candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Redact salary for Interviewers
    if current_user.role == UserRole.INTERVIEWER:
        # We need to be careful not to mutate the DB object directly if it's attached to session
        # But for response serialization it might be okay. 
        # Safer to just set the attributes on the object before return, 
        # as long as we don't commit.
        db_candidate.current_salary = None
        db_candidate.expected_salary = None

    return db_candidate

@router.put("/{candidate_id}", response_model=CandidateResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))])
def update_candidate(candidate_id: UUID, candidate: CandidateUpdate, db: Session = Depends(get_db)):
    db_candidate = candidate_service.update_candidate(db, candidate_id, candidate)
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return db_candidate

@router.delete("/{candidate_id}", response_model=CandidateResponse, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER]))])
def delete_candidate(candidate_id: UUID, db: Session = Depends(get_db)):
    db_candidate = candidate_service.delete_candidate(db, candidate_id)
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return db_candidate

@router.delete("/{candidate_id}/jobs/{job_id}", status_code=204, dependencies=[Depends(RoleChecker([UserRole.HR, UserRole.OWNER]))])
def remove_job_application(candidate_id: UUID, job_id: UUID, db: Session = Depends(get_db)):
    success = candidate_service.remove_job_application(db, candidate_id, job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job application not found")
    return

from app.services.parser_service import parser_service

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...), 
    job_id: Optional[UUID] = Form(None),
    db: Session = Depends(get_db),
    _: User = Depends(RoleChecker([UserRole.HR, UserRole.OWNER, UserRole.HIRING_MANAGER]))
):
    # 1. Read file content
    content = await file.read()
    
    # 2. Extract text based on file type
    text = ""
    if file.filename.lower().endswith(".pdf"):
        text = parser_service.extract_text_from_pdf(content)
    elif file.filename.lower().endswith(".docx"):
        text = parser_service.extract_text_from_docx(content)
        
    # 3. Parse with LLM
    parsed_data = None
    if text:
        print(f"\n[DEBUG] Extracted Text Preview:\n{text[:200]}...\n")
        parsed_data = parser_service.parse_with_llm(text)
        
        if parsed_data:
            print(f"\n[DEBUG] Parsed Data from LLM:\n{parsed_data.model_dump_json(indent=2)}\n")
        else:
            print("\n[DEBUG] LLM Parsing returned None\n")
        
    # 4. Reset file cursor for saving
    await file.seek(0)
    
    # 5. Save and Create Candidate
    return candidate_service.upload_resume(db, file, job_id, parsed_data)
