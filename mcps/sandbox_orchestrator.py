import uuid, time, json
from google.cloud import storage
from google.cloud import run_v2
import os, logging

logging.basicConfig(level = logging.INFO)

BUCKET = os.environ.get("BUCKET")
REGION = os.environ.get("REGION")
JOB_NAME = os.environ.get("JOB_NAME")
PROJECT = os.environ.get("PROJECT")

logging.info(f"Project: {PROJECT}, BUCKET: {BUCKET}, JOB_NAME: {JOB_NAME}, PROJECT: {PROJECT}")

def upload_file(local_path, gcs_path):
    '''
    Uploads File to GCS BUCKET 
    Args: 
        local_path: path to local python code file
        gcs_path: GCS bucket path to save the file
    Returns:
        gcs file path 
    '''
    try:
        logging.info(f"Uploading {local_path} to {gcs_path} in Progress")
        client = storage.Client(project = PROJECT)
        bucket = client.bucket(BUCKET)
        blob = bucket.blob(gcs_path)
        blob.upload_from_filename(local_path)
        cloud_path = f"gs://{BUCKET}/{gcs_path}"
        logging.info(f" File Uploaded Successfully. Path: {cloud_path}")
        return cloud_path
    except Exception as e:
        logging.error(f" Failed to Upload File: {e}")
        raise
        
def trigger_run_job(code_gs_path, data_gs_path, result_gs_path):
    try:
        logging.info(" Run Job Process Initialized")
        client = run_v2.JobsClient()
        parent = f"projects/{PROJECT}/locations/{REGION}"
        job_name = f"{parent}/jobs/{JOB_NAME}"

        job_execution = client.run_job(
            request={
                "name": job_name,
                "overrides": {
                    "container_overrides": [
                        {
                            "env": [
                                {"name": "BUCKET", "value": BUCKET},
                                {"name": "CODE_GS", "value": code_gs_path},
                                {"name": "DATA_GS", "value": data_gs_path},
                                {"name": "RESULT_GS", "value": result_gs_path}
                            ]
                        }
                    ]
                },
            }
        )
        # job_execution is a long-running operation; poll until it reaches RUNNING/COMPLETED
        logging.info(" Run Job Process Completed")
        return job_execution.result()
    except Exception as e:
        logging.error(f" Failed to Trigger Run Job: {e}")
        raise

def wait_for_result(result_blob_path, timeout=10):
    try:
        logging.info("Retrieving Results In Progress")
        client = storage.Client()
        bucket = client.bucket(BUCKET)
        blob = bucket.blob(result_blob_path)
        start = time.time()
        while time.time() - start < timeout:
            if blob.exists():
                return json.loads(blob.download_as_text())
            time.sleep(2)
        raise TimeoutError("Job result not found")
    except Exception as e:
        logging.error(f" Failed to Retrive Sandbox Results {e}")
        raise

