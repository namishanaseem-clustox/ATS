from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.pipeline_template import PipelineTemplate
from app.models.pipeline_stage import PipelineStage

def seed_pipeline_template():
    db = SessionLocal()
    try:
        # Check if default template exists
        default_template = db.query(PipelineTemplate).filter(PipelineTemplate.is_default == True).first()
        
        if not default_template:
            print("Creating default Pipeline Template...")
            default_template = PipelineTemplate(
                name="Standard Pipeline",
                description="Default hiring pipeline for all jobs.",
                is_default=True
            )
            db.add(default_template)
            db.commit()
            db.refresh(default_template)
            print(f"Created template: {default_template.name} ({default_template.id})")
        
        # Check for orphan stages and link them
        orphan_stages = db.query(PipelineStage).filter(PipelineStage.pipeline_template_id == None).all()
        
        if orphan_stages:
            print(f"Found {len(orphan_stages)} orphan stages. Linking to default template...")
            for stage in orphan_stages:
                stage.pipeline_template_id = default_template.id
            db.commit()
            print("Orphan stages linked.")
        else:
            print("No orphan stages found.")
            
    except Exception as e:
        print(f"Error seeding pipeline template: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_pipeline_template()
