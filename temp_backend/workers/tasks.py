from celery import shared_task
from core.models import Job
from time import sleep


@shared_task(bind=True)
def extract_job(self, job_id):
    try:
        job = Job.objects.get(id=job_id)
        job.status = 'processing'
        job.save()

        # Placeholder: simulate work
        for i in range(1, 6):
            job.progress_percent = i * 20
            job.save()
            sleep(1)

        # Simulated extraction result
        job.extraction_result = {
            'data': {
                'fin': 'SIMULATED-FIN-1234567890',
                'name_en': 'Simulated User',
            },
            'confidences': {
                'fin': 0.95,
                'name_en': 0.9,
            }
        }
        job.status = 'completed'
        job.progress_percent = 100
        job.save()
        return job.extraction_result
    except Job.DoesNotExist:
        return None


@shared_task
def cleanup_old_jobs():
    # Placeholder for cleanup
    return True
