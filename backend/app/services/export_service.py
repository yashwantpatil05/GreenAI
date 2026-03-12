"""Export service for CSV and JSON data exports."""
import csv
import io
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunHardware, JobRunCost


def export_job_runs_to_csv(
    db: Session,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
) -> str:
    """Export job runs to CSV format."""

    # Build query with filters
    query = db.query(JobRun).filter(JobRun.organization_id == org_id)

    if project_id:
        query = query.filter(JobRun.project_id == project_id)
    if start_date:
        query = query.filter(JobRun.start_time >= start_date)
    if end_date:
        query = query.filter(JobRun.start_time <= end_date)
    if status:
        query = query.filter(JobRun.status == status)

    job_runs = query.order_by(JobRun.start_time.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Run Name",
        "Job Type",
        "Status",
        "Region",
        "Start Time",
        "End Time",
        "Duration (hours)",
        "GPU Model",
        "CPU Count",
        "RAM (GB)",
        "Energy (kWh)",
        "Carbon Emissions (kg)",
        "Compute Cost ($)",
        "Energy Cost ($)",
        "Total Cost ($)",
        "Project ID",
        "Created At",
    ])

    # Write data rows
    for run in job_runs:
        # Calculate duration
        duration = 0.0
        if run.start_time and run.end_time:
            delta = run.end_time - run.start_time
            duration = delta.total_seconds() / 3600  # Convert to hours

        # Get hardware info
        hardware = run.hardware
        gpu_model = hardware.gpu_model if hardware else ""
        cpu_count = hardware.cpu_count if hardware else ""
        ram_gb = hardware.ram_gb if hardware else 0

        # Get energy info
        energy = run.energy
        energy_kwh = energy.total_kwh if energy else 0
        emissions_kg = energy.emissions_kg if energy else 0

        # Get cost info
        costs = run.costs
        total_cost = costs.amount_usd if costs else 0

        # Extract breakdown if available
        breakdown = costs.breakdown if costs and costs.breakdown else {}
        compute_cost = breakdown.get("compute_cost", 0)
        energy_cost = breakdown.get("energy_cost", 0)

        writer.writerow([
            run.run_name,
            run.job_type,
            run.status,
            run.region or "",
            run.start_time.isoformat() if run.start_time else "",
            run.end_time.isoformat() if run.end_time else "",
            f"{duration:.2f}",
            gpu_model,
            cpu_count,
            ram_gb,
            f"{energy_kwh:.2f}",
            f"{emissions_kg:.4f}",
            f"{compute_cost:.2f}",
            f"{energy_cost:.2f}",
            f"{total_cost:.2f}",
            str(run.project_id),
            run.created_at.isoformat(),
        ])

    return output.getvalue()


def get_analytics_export_data(
    db: Session,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict:
    """Get analytics export data as a dictionary."""
    # Build query with filters
    query = db.query(JobRun).filter(JobRun.organization_id == org_id)

    if project_id:
        query = query.filter(JobRun.project_id == project_id)
    if start_date:
        query = query.filter(JobRun.start_time >= start_date)
    if end_date:
        query = query.filter(JobRun.start_time <= end_date)

    job_runs = query.all()

    # Calculate summary statistics
    total_runs = len(job_runs)
    total_energy_kwh = 0.0
    total_carbon_kg = 0.0
    total_cost = 0.0
    total_duration_hours = 0.0

    status_counts = {"completed": 0, "failed": 0, "running": 0, "canceled": 0}
    job_type_counts = {}
    region_counts = {}

    for run in job_runs:
        # Energy and carbon
        if run.energy:
            total_energy_kwh += run.energy.total_kwh or 0
            total_carbon_kg += run.energy.emissions_kg or 0

        # Cost
        if run.costs:
            total_cost += run.costs.amount_usd or 0

        # Duration
        if run.start_time and run.end_time:
            delta = run.end_time - run.start_time
            total_duration_hours += delta.total_seconds() / 3600

        # Status counts
        if run.status in status_counts:
            status_counts[run.status] += 1

        # Job type counts
        job_type = run.job_type or "unknown"
        job_type_counts[job_type] = job_type_counts.get(job_type, 0) + 1

        # Region counts
        region = run.region or "unknown"
        region_counts[region] = region_counts.get(region, 0) + 1

    # Build analytics object
    totals_summary = {
        "total_energy_kwh": round(total_energy_kwh, 2),
        "total_carbon_kg": round(total_carbon_kg, 4),
        "total_cost_usd": round(total_cost, 2),
        "total_duration_hours": round(total_duration_hours, 2),
        "average_energy_per_run_kwh": round(total_energy_kwh / total_runs, 2) if total_runs > 0 else 0,
        "average_carbon_per_run_kg": round(total_carbon_kg / total_runs, 4) if total_runs > 0 else 0,
        "average_cost_per_run_usd": round(total_cost / total_runs, 2) if total_runs > 0 else 0,
    }

    return {
        "export_metadata": {
            "organization_id": str(org_id),
            "project_id": str(project_id) if project_id else None,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "exported_at": datetime.utcnow().isoformat(),
            "total_job_runs": total_runs,
        },
        "summary": totals_summary,
        "totals": totals_summary,  # Alias for backward compatibility
        "breakdown": {
            "by_status": status_counts,
            "by_job_type": job_type_counts,
            "by_region": region_counts,
        },
    }


def export_analytics_to_json(
    db: Session,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> str:
    """Export analytics summary to JSON format."""
    analytics = get_analytics_export_data(db, org_id, project_id, start_date, end_date)
    return json.dumps(analytics, indent=2)

    if project_id:
        query = query.filter(JobRun.project_id == project_id)
    if start_date:
        query = query.filter(JobRun.start_time >= start_date)
    if end_date:
        query = query.filter(JobRun.start_time <= end_date)

    job_runs = query.all()

    # Calculate summary statistics
    total_runs = len(job_runs)
    total_energy_kwh = 0.0
    total_carbon_kg = 0.0
    total_cost = 0.0
    total_duration_hours = 0.0

    status_counts = {"completed": 0, "failed": 0, "running": 0, "canceled": 0}
    job_type_counts = {}
    region_counts = {}

    for run in job_runs:
        # Energy and carbon
        if run.energy:
            total_energy_kwh += run.energy.total_kwh or 0
            total_carbon_kg += run.energy.emissions_kg or 0

        # Cost
        if run.costs:
            total_cost += run.costs.amount_usd or 0

        # Duration
        if run.start_time and run.end_time:
            delta = run.end_time - run.start_time
            total_duration_hours += delta.total_seconds() / 3600

        # Status counts
        if run.status in status_counts:
            status_counts[run.status] += 1

        # Job type counts
        job_type = run.job_type or "unknown"
        job_type_counts[job_type] = job_type_counts.get(job_type, 0) + 1

        # Region counts
        region = run.region or "unknown"
        region_counts[region] = region_counts.get(region, 0) + 1

    # Build analytics object
    totals_summary = {
        "total_energy_kwh": round(total_energy_kwh, 2),
        "total_carbon_kg": round(total_carbon_kg, 4),
        "total_cost_usd": round(total_cost, 2),
        "total_duration_hours": round(total_duration_hours, 2),
        "average_energy_per_run_kwh": round(total_energy_kwh / total_runs, 2) if total_runs > 0 else 0,
        "average_carbon_per_run_kg": round(total_carbon_kg / total_runs, 4) if total_runs > 0 else 0,
        "average_cost_per_run_usd": round(total_cost / total_runs, 2) if total_runs > 0 else 0,
    }

    analytics = {
        "export_metadata": {
            "organization_id": str(org_id),
            "project_id": str(project_id) if project_id else None,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "exported_at": datetime.utcnow().isoformat(),
            "total_job_runs": total_runs,
        },
        "summary": totals_summary,
        "totals": totals_summary,  # Alias for backward compatibility
        "breakdown": {
            "by_status": status_counts,
            "by_job_type": job_type_counts,
            "by_region": region_counts,
        },
    }

    return json.dumps(analytics, indent=2)


def export_job_runs_to_json(
    db: Session,
    org_id: UUID,
    project_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
) -> str:
    """Export detailed job runs to JSON format."""

    # Build query with filters
    query = db.query(JobRun).filter(JobRun.organization_id == org_id)

    if project_id:
        query = query.filter(JobRun.project_id == project_id)
    if start_date:
        query = query.filter(JobRun.start_time >= start_date)
    if end_date:
        query = query.filter(JobRun.start_time <= end_date)
    if status:
        query = query.filter(JobRun.status == status)

    job_runs = query.order_by(JobRun.start_time.desc()).all()

    # Build job runs list
    runs_data = []
    for run in job_runs:
        run_data = {
            "id": str(run.id),
            "run_name": run.run_name,
            "job_type": run.job_type,
            "status": run.status,
            "region": run.region,
            "start_time": run.start_time.isoformat() if run.start_time else None,
            "end_time": run.end_time.isoformat() if run.end_time else None,
            "project_id": str(run.project_id),
            "created_at": run.created_at.isoformat(),
        }

        # Add hardware info
        if run.hardware:
            run_data["hardware"] = {
                "gpu_model": run.hardware.gpu_model,
                "cpu_count": run.hardware.cpu_count,
                "ram_gb": run.hardware.ram_gb,
            }

        # Add energy info
        if run.energy:
            run_data["energy"] = {
                "total_kwh": run.energy.total_kwh,
                "emissions_kg": run.energy.emissions_kg,
                "cpu_kwh": run.energy.cpu_kwh,
                "gpu_kwh": run.energy.gpu_kwh,
                "ram_kwh": run.energy.ram_kwh,
            }

        # Add cost info
        if run.costs:
            run_data["costs"] = {
                "amount_usd": run.costs.amount_usd,
                "currency": run.costs.currency,
                "breakdown": run.costs.breakdown,
            }

        runs_data.append(run_data)

    export_data = {
        "export_metadata": {
            "organization_id": str(org_id),
            "project_id": str(project_id) if project_id else None,
            "exported_at": datetime.utcnow().isoformat(),
            "total_records": len(runs_data),
        },
        "job_runs": runs_data,
    }

    return json.dumps(export_data, indent=2)
