import os
import json
import subprocess
import tempfile
from google.cloud import storage
import logging
import sys
from dotenv import load_dotenv

load_dotenv()

storage_client = storage.Client()

BUCKET = os.environ.get("BUCKET")
CODE_GS = os.environ.get("CODE_GS")  # e.g. gs://bucket/uploads/scripts/abc.py
DATA_GS = os.environ.get("DATA_GS")
RESULT_GS = os.environ.get("RESULT_GS")  # e.g. results/<id>.json

logger = logging.getLogger("runner")
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

def download_gs(gs_uri, local_path):
    bucket_name, blob_path = gs_uri.replace("gs://", "").split("/", 1)
    bucket = storage_client.bucket(bucket_name)
    bucket.blob(blob_path).download_to_filename(local_path)
    logger.info(f"Downloaded {gs_uri} to {local_path}")

def upload_gs(local_path, gs_uri):
    bucket = storage_client.bucket(BUCKET)
    bucket.blob(gs_uri).upload_from_filename(local_path)
    logger.info(f"Uploaded {local_path} to {gs_uri}")

def run():
    tmpdir = tempfile.mkdtemp()
    local_code = os.path.join(tmpdir, "script.py")
    local_data = os.path.join(tmpdir, "data.parquet")
    local_result = os.path.join(tmpdir, "result.json")

    download_gs(CODE_GS, local_code)
    download_gs(DATA_GS, local_data)

    # Validate the script: require a safe entrypoint signature
    # e.g., script must have a top-level function `def run_backtest(data_path) -> dict`
    # For safety, we run in a subprocess and pass the data path as argv
    try:
        proc = subprocess.run(
            ["python", "-I", local_code, local_data],
            capture_output=True, text=True, timeout=120
        )
    except subprocess.TimeoutExpired:
        result = {"status": "error", "error": "timeout"}
        with open(local_result, "w") as f:
            json.dump(result, f)
        upload_gs(local_result, RESULT_GS)
        return

    if proc.returncode != 0:
        result = {"status": "error", "stderr": proc.stderr}
    else:
        # Expect the script to print JSON metrics to stdout (or write result file)
        try:
            metrics = json.loads(proc.stdout)
        except Exception:
            # fallback: capture stdout as 'raw_output'
            metrics = {"status": "ok", "raw_output": proc.stdout}
        result = {"status": "ok", "metrics": metrics}

    with open(local_result, "w") as f:
        json.dump(result, f)

    upload_gs(local_result, RESULT_GS)

if __name__ == "__main__":
    run()

