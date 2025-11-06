import uuid
from sandbox_orchestrator import upload_file, trigger_run_job, wait_for_result
import logging, json

logging.basicConfig(level=logging.INFO)

async def sandbox_executor(local_script_path, local_data_path, strategy_name):
    try:
        uid = uuid.uuid4().hex[:8]
        code_gs = local_script_path
        data_gs = upload_file(local_data_path, f"data/{strategy_name}_{uid}.parquet")
        result_gs = f"results/{strategy_name}_{uid}.json"

        # Trigger job and pass env overrides
        trigger_run_job(code_gs, data_gs, result_gs)

        metrics = wait_for_result(result_gs, timeout=10)
        return metrics
    except Exception as e:
        logging.error(f"Error Executing Sandbox: {e}")
        return json.dumps({"error": f"Sandbox error: {str(e)}"})


