from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.schemas.candidate import CandidateCreate, CandidateResponse, CandidateUpdate
from app.services.candidate_service import candidate_service

router = APIRouter(
    prefix="/candidates",
    tags=["candidates"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[CandidateResponse])
def read_candidates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    candidates = candidate_service.get_candidates(db, skip=skip, limit=limit)
    return candidates

@router.post("/", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    return candidate_service.create_candidate(db=db, candidate=candidate)

@router.get("/{candidate_id}", response_model=CandidateResponse)
def read_candidate(candidate_id: UUID, db: Session = Depends(get_db)):
    db_candidate = candidate_service.get_candidate(db, candidate_id=candidate_id)
    if db_candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return db_candidate

@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: UUID, candidate: CandidateUpdate, db: Session = Depends(get_db)):
    db_candidate = candidate_service.update_candidate(db, candidate_id, candidate)
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return db_candidate

@router.delete("/{candidate_id}", response_model=CandidateResponse)
def delete_candidate(candidate_id: UUID, db: Session = Depends(get_db)):
    db_candidate = candidate_service.delete_candidate(db, candidate_id)
    if not db_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return db_candidate

from app.services.parser_service import parser_service

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...), 
    job_id: Optional[UUID] = Form(None),
    db: Session = Depends(get_db)
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
