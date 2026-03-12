"""Export endpoints for CSV and JSON data."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.services.export_service import (
    export_job_runs_to_csv,
    export_analytics_to_json,
    export_job_runs_to_json,
)

router = APIRouter()


@router.get("/job-runs/csv")
def export_job_runs_csv(
    project_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Export job runs to CSV format."""
    csv_data = export_job_runs_to_csv(
        db=db,
        org_id=user.organization_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )

    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"greenai_job_runs_{timestamp}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/job-runs/json")
def export_job_runs_json(
    project_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Export job runs to JSON format."""
    json_data = export_job_runs_to_json(
        db=db,
        org_id=user.organization_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )

    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"greenai_job_runs_{timestamp}.json"

    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/analytics")
def export_analytics(
    project_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Export analytics summary as JSON (returns data directly)."""
    from backend.app.services.export_service import get_analytics_export_data

    data = get_analytics_export_data(
        db=db,
        org_id=user.organization_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )
    return data


@router.get("/analytics/json")
def export_analytics_json(
    project_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Export analytics summary to JSON format (as download)."""
    json_data = export_analytics_to_json(
        db=db,
        org_id=user.organization_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
    )

    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"greenai_analytics_{timestamp}.json"

    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
