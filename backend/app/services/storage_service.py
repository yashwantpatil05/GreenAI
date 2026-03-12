"""Cloud storage service with local file fallback for testing."""
import os
from typing import Optional
from datetime import datetime, timedelta
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Local storage mode (set to False to use GCS)
USE_LOCAL_STORAGE = os.getenv("GCS_LOCAL_MODE", "true").lower() == "true"

# GCS Configuration (placeholders - user will add later)
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "greenai-reports")
GCS_CREDENTIALS_PATH = os.getenv("GCS_CREDENTIALS_PATH", "")  # Path to service account JSON
GCS_PROJECT_ID = os.getenv("GCS_PROJECT_ID", "")  # GCP project ID

# Local storage directory
LOCAL_STORAGE_PATH = Path(__file__).parent.parent.parent / "storage" / "reports"


class StorageService:
    """Cloud storage service with local fallback for testing."""

    def __init__(self):
        self.local_mode = USE_LOCAL_STORAGE
        self.bucket_name = GCS_BUCKET_NAME

        if not self.local_mode:
            # Import GCS only if not in local mode
            try:
                from google.cloud import storage

                if not GCS_CREDENTIALS_PATH or not os.path.exists(GCS_CREDENTIALS_PATH):
                    logger.warning("⚠️  GCS credentials not found. Using local storage mode.")
                    self.local_mode = True
                else:
                    # Initialize GCS client with credentials
                    self.client = storage.Client.from_service_account_json(
                        GCS_CREDENTIALS_PATH,
                        project=GCS_PROJECT_ID
                    )
                    self.bucket = self.client.bucket(self.bucket_name)
                    logger.info(f"✅ GCS client initialized. Bucket: {self.bucket_name}")
            except ImportError:
                logger.warning("⚠️  google-cloud-storage not installed. Using local storage mode.")
                self.local_mode = True
            except Exception as e:
                logger.warning(f"⚠️  Failed to initialize GCS client: {e}. Using local storage mode.")
                self.local_mode = True

        if self.local_mode:
            # Ensure local storage directory exists
            LOCAL_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
            logger.info(f"📁 Local storage mode enabled. Path: {LOCAL_STORAGE_PATH}")

    def upload_file(
        self,
        file_path: str,
        destination_blob_name: str,
        content_type: str = "application/pdf",
    ) -> str:
        """
        Upload a file to cloud storage.

        Args:
            file_path: Local path to the file to upload
            destination_blob_name: Destination path in storage (e.g., "org_id/report_id.pdf")
            content_type: MIME type of the file

        Returns:
            Storage path (GCS path or local path)
        """
        if self.local_mode:
            # Local storage: copy file to storage directory
            local_dest = LOCAL_STORAGE_PATH / destination_blob_name
            local_dest.parent.mkdir(parents=True, exist_ok=True)

            # Copy file
            import shutil
            shutil.copy2(file_path, local_dest)

            logger.info(f"📁 Stored locally: {local_dest}")
            return f"local://{destination_blob_name}"

        # GCS storage
        try:
            blob = self.bucket.blob(destination_blob_name)
            blob.upload_from_filename(file_path, content_type=content_type)

            gcs_path = f"gs://{self.bucket_name}/{destination_blob_name}"
            logger.info(f"☁️  Uploaded to GCS: {gcs_path}")
            return gcs_path
        except Exception as e:
            logger.error(f"❌ Failed to upload to GCS: {e}")
            raise

    def generate_signed_url(
        self,
        blob_name: str,
        expiration_minutes: int = 60,
    ) -> str:
        """
        Generate a signed URL for secure file download.

        Args:
            blob_name: Storage blob name (e.g., "org_id/report_id.pdf")
            expiration_minutes: URL expiration time in minutes (default: 60)

        Returns:
            Signed URL (or local file URL in local mode)
        """
        if self.local_mode:
            # Local mode: return backend API URL for file download
            # Frontend will call backend endpoint which serves the file
            return f"/api/storage/download/{blob_name}"

        # GCS signed URL
        try:
            blob = self.bucket.blob(blob_name)
            expiration = datetime.utcnow() + timedelta(minutes=expiration_minutes)

            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=expiration,
                method="GET",
            )

            logger.info(f"🔗 Generated signed URL for: {blob_name} (expires in {expiration_minutes}min)")
            return signed_url
        except Exception as e:
            logger.error(f"❌ Failed to generate signed URL: {e}")
            raise

    def delete_file(self, blob_name: str) -> bool:
        """
        Delete a file from storage.

        Args:
            blob_name: Storage blob name to delete

        Returns:
            True if successful, False otherwise
        """
        if self.local_mode:
            # Local storage: delete file
            local_path = LOCAL_STORAGE_PATH / blob_name
            if local_path.exists():
                local_path.unlink()
                logger.info(f"🗑️  Deleted local file: {local_path}")
                return True
            logger.warning(f"⚠️  Local file not found: {local_path}")
            return False

        # GCS storage
        try:
            blob = self.bucket.blob(blob_name)
            blob.delete()
            logger.info(f"🗑️  Deleted from GCS: {blob_name}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete from GCS: {e}")
            return False

    def file_exists(self, blob_name: str) -> bool:
        """
        Check if a file exists in storage.

        Args:
            blob_name: Storage blob name to check

        Returns:
            True if file exists, False otherwise
        """
        if self.local_mode:
            local_path = LOCAL_STORAGE_PATH / blob_name
            return local_path.exists()

        # GCS storage
        try:
            blob = self.bucket.blob(blob_name)
            return blob.exists()
        except Exception as e:
            logger.error(f"❌ Failed to check file existence: {e}")
            return False

    def get_file_path(self, blob_name: str) -> Optional[str]:
        """
        Get local file path (for local storage mode).

        Args:
            blob_name: Storage blob name

        Returns:
            Local file path if in local mode and file exists, None otherwise
        """
        if self.local_mode:
            local_path = LOCAL_STORAGE_PATH / blob_name
            if local_path.exists():
                return str(local_path)
        return None


# Singleton instance
storage_service = StorageService()
