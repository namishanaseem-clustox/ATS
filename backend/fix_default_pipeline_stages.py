from app.database import SessionLocal
from app.models.pipeline_template import PipelineTemplate
from app.models.pipeline_stage import PipelineStage
import uuid

def fix_default_pipeline():
    db = SessionLocal()
    try:
        # 1. Find the default template
        template = db.query(PipelineTemplate).filter(PipelineTemplate.is_default == True).first()
        if not template:
            print("No default template found. Creating one...")
            template = PipelineTemplate(
                name="Standard Pipeline",
                description="Default recruiting pipeline",
                is_default=True
            )
            db.add(template)
            db.commit()
            db.refresh(template)
        
        print(f"Using template: {template.name} ({template.id})")

        # 2. Delete existing stages for this template (to restart fresh)
        # Be careful not to delete stages that might be linked to other things if we had complex constraints, 
        # but PipelineStage is specifically for a template now.
        # Wait, if we delete stages, we might break existing job logic if they referenced stage IDs directly?
        # The Current Job Pipeline stores stages as JSON locally in `pipeline_config`, so it doesn't reference these rows.
        # So it is safe to delete these template definition rows.
        
        db.query(PipelineStage).filter(PipelineStage.pipeline_template_id == template.id).delete()
        
        # 3. Define the standard stages
        default_stages = [
            {"name": "New Candidates", "id": "new", "type": "standard"},
            {"name": "Shortlisted", "id": "shortlisted", "type": "standard"},
            {"name": "Technical Review", "id": "technical_review", "type": "standard"},
            {"name": "Interview Round 1", "id": "interview_round_1", "type": "standard"},
            {"name": "Interview Round 2", "id": "interview_round_2", "type": "standard"},
            {"name": "Offer", "id": "offer", "type": "standard"},
            {"name": "Hired", "id": "hired", "type": "standard"},
            {"name": "Rejected", "id": "rejected", "type": "standard"}
        ]

        # 4. Create new stages
        for i, stage_def in enumerate(default_stages):
            new_stage = PipelineStage(
                name=stage_def["name"],
                order=i,
                color="#CCCCCC", # Default color
                is_default=True,
                pipeline_template_id=template.id
            )
            # We are not setting 'id' explicitly to match the "id": "new" strings, 
            # because PipelineStage uses UUIDs.
            # The 'job.pipeline_config' JSON uses string IDs like "new", "shortlisted".
            # This is a discrepancy.
            # If we want the template to dictate the stages, the copied JSON should probably use the UUIDs 
            # OR we keep using these semantic IDs?
            # 
            # The Frontend `JobDetail.jsx` uses hardcoded IDs in `defaultPipeline`.
            # If we switch to DB-driven stages, the IDs will be UUIDs.
            # We need to make sure the frontend handles UUIDs or that we map them.
            # 
            # If `job_service` copies the stages, it will generate a list like:
            # [{"name": "New Candidates", "id": <UUID>, ...}]
            # 
            # The frontend `JobPipeline` and `JobDetail` seem to handle arbitrary IDs as long as they are consistent for that job.
            # However, `JobDetail.jsx` has logic like:
            # `const defaultPipeline = [{ name: "New Candidates", id: "new" }, ...]`
            # And `Card` moving logic relies on `stageId`.
            
            # Key Issue: "New Candidates" stage usually has special logic (initial stage).
            # Does the system rely on `id === 'new'`?
            # Let's check `JobPipeline.jsx` or `JobDetail.jsx` for hardcoded ID checks.
            
            db.add(new_stage)
        
        db.commit()
        print("Default pipeline stages updated.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_default_pipeline()
