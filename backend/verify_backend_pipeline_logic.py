from app.database import SessionLocal
from app.services.job_service import job_service
from app.schemas.job import JobCreate
from app.models.pipeline_template import PipelineTemplate
import uuid

def verify_backend_logic():
    db = SessionLocal()
    try:
        # 1. Get the default template
        template = db.query(PipelineTemplate).filter(PipelineTemplate.is_default == True).first()
        if not template:
            print("FAIL: No default template found.")
            return

        print(f"Testing with template: {template.name} ({template.id})")

        # 2. Create a dummy job with this template
        job_data = JobCreate(
            title="Backend logic test job",
            department_id=uuid.uuid4(), # Dummy ID, might fail if FK constraint check? 
            # Wait, department_id usually requires a valid department.
            # Let's pick a valid department first.
            location="Remote",
            employment_type="Full-time",
            pipeline_template_id=template.id
        )

        # Need a valid department
        from app.models.department import Department
        dept = db.query(Department).first()
        if not dept:
            # Create a dummy dept if none exists
            print("No department found. Creating dummy one.")
            from app.models.department import Department
            # Assuming Department exists, but if not we might fail unless we mock.
            # But the user likely has departments.
            # If not, let's create one.
            new_dept_id = uuid.uuid4()
            # For simplicity, let's assume one exists or just catch error.
            print("Trying to find any department...")
            dept = db.query(Department).first()
            if not dept:
                 print("Cannot run test without a department. Please ensure DB seeded.")
                 return
        
        if dept:
            # Ensure job_data uses the correct UUID format if needed
            job_data.department_id = dept.id
            job_data.pipeline_template_id = template.id 
            # PyDantic models cast automatically usually.

        else:
             print("FAIL: No department available to link job to.")
             return

        # 3. Create the job
        print("Creating job...")
        # We need a user_id for logging, can be dummy if nullable or handled
        # Service handles user_id=None
        
        created_job = job_service.create_job(db, job_data)
        
        # 4. Verify pipeline_config
        print(f"Job created: {created_job.title} ({created_job.id})")
        print("Pipeline Config:", created_job.pipeline_config)
        
        if not created_job.pipeline_config:
             print("FAIL: pipeline_config is empty!")
        else:
             names = [s['name'] for s in created_job.pipeline_config]
             print("Stages:", names)
             expected = ["New Candidates", "Shortlisted", "Technical Review", "Interview Round 1", "Interview Round 2", "Offer", "Hired", "Rejected"]
             if names == expected:
                 print("SUCCESS: Pipeline config matches default template stages.")
             else:
                 print(f"FAIL: Stages do not match expected. Got: {names}")
        
        # Cleanup
        job_service.delete_job(db, created_job.id)
        print("Test job deleted.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_backend_logic()
