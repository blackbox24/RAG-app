import json
import boto3
from botocore.exceptions import ClientError
from config.config import get_settings

# WHY semaphore with limit=1:
# fastembed + FAISS + PDF parsing together use ~400MB peak.
# On a 1GB instance, only ONE ingest job can safely run at a time.
# A second request waits until the first finishes rather than crashing.



def _get_s3(settings):
    return boto3.client(
        "s3",
        endpoint_url=settings.spaces_endpoint,
        aws_access_key_id=settings.spaces_key,
        aws_secret_access_key=settings.spaces_secret,
        region_name=settings.spaces_region
    )

def _write_job(job_id: str, status: str, result=None, error=None):
    """
    Write job state to DO Spaces as a tiny JSON file.
    WHY Spaces: survives container restarts, redeployments, OOM crashes.
    Key format: jobs/{job_id}.json — separate from contracts/ prefix.
    """
    settings = get_settings()
    job = {"status": status, "result": result, "error": error}
    try:
        _get_s3(settings).put_object(
            Bucket=settings.spaces_bucket,
            Key=f"jobs/{job_id}.json",
            Body=json.dumps(job).encode(),
            ACL="private",
            ContentType="application/json"
        )
    except Exception as e:
        # Non-fatal — job will just not be found on next poll
        print(f"[WARNING] Could not write job {job_id} to Spaces: {e}")


def _read_job(job_id: str) -> dict | None:
    """
    Read job state from DO Spaces.
    Returns None if job doesn't exist (404 from Spaces = job not found).
    """
    settings = get_settings()
    try:
        response = _get_s3(settings).get_object(
            Bucket=settings.spaces_bucket,
            Key=f"jobs/{job_id}.json"
        )
        return json.loads(response["Body"].read().decode())
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return None   # job doesn't exist
        print(f"[WARNING] Could not read job {job_id} from Spaces: {e}")
        return None

