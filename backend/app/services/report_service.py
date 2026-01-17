"""PDF report generation."""
import io
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.job_run import JobRun, JobRunEnergy, JobRunCost
from backend.app.models.project import Project
from backend.app.models.report import Report
from backend.app.services.esg_service import generate_esg_narrative


settings = get_settings()


def _report_path(filename: str) -> str:
    base = os.path.join(os.getcwd(), "generated_reports")
    os.makedirs(base, exist_ok=True)
    return os.path.join(base, filename)


def _write_pdf(title: str, kpis: dict, hotspots: list[tuple[str, float]], narrative: dict) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle(title)
    pdf.drawString(72, 750, title)
    pdf.drawString(72, 730, f"Generated: {datetime.utcnow().isoformat()}Z")
    pdf.drawString(72, 710, f"Energy: {kpis.get('energy_kwh', 0):.2f} kWh")
    pdf.drawString(72, 690, f"Carbon: {kpis.get('emissions', 0):.2f} kg CO2e")
    pdf.drawString(72, 670, f"Cost: ${kpis.get('cost', 0):.2f}")
    pdf.drawString(72, 650, "Hotspots:")
    y = 630
    for run_name, em in hotspots:
        pdf.drawString(90, y, f"{run_name}: {em:.2f} kg CO2e")
        y -= 16
    pdf.drawString(72, y - 10, "ESG Narrative:")
    pdf.drawString(90, y - 26, narrative.get("executive_summary", ""))
    pdf.drawString(90, y - 42, "Highlights:")
    for idx, line in enumerate(narrative.get("highlights", "").splitlines()):
        pdf.drawString(110, y - 58 - (idx * 14), line)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def generate_project_report(db: Session, project: Project, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None) -> Report:
    """Generate a PDF report for a project and store locally."""
    q_runs = db.query(JobRun).filter(JobRun.project_id == project.id)
    if from_date:
        q_runs = q_runs.filter(JobRun.start_time >= from_date)
    if to_date:
        q_runs = q_runs.filter(JobRun.start_time <= to_date)
    runs = q_runs.all()

    total_kwh = (
        db.query(func.coalesce(func.sum(JobRunEnergy.total_kwh), 0))
        .join(JobRunEnergy.job_run)
        .filter(JobRun.project_id == project.id)
        .scalar()
    )
    total_emissions = (
        db.query(func.coalesce(func.sum(JobRunEnergy.emissions_kg), 0))
        .join(JobRunEnergy.job_run)
        .filter(JobRun.project_id == project.id)
        .scalar()
    )
    total_cost = (
        db.query(func.coalesce(func.sum(JobRunCost.amount_usd), 0))
        .join(JobRunCost.job_run)
        .filter(JobRun.project_id == project.id)
        .scalar()
    ) if runs else 0.0

    hotspots = (
        db.query(JobRun.run_name, JobRunEnergy.emissions_kg)
        .join(JobRunEnergy.job_run)
        .filter(JobRun.project_id == project.id)
        .order_by(JobRunEnergy.emissions_kg.desc())
        .limit(5)
        .all()
    )

    narrative = generate_esg_narrative(runs[0]) if runs else {"executive_summary": "No runs in period", "highlights": "", "next_actions": "", "generated_at": datetime.utcnow().isoformat() + "Z"}

    pdf_bytes = _write_pdf(
        title=f"GreenAI Report - {project.name}",
        kpis={"energy_kwh": total_kwh or 0.0, "emissions": total_emissions or 0.0, "cost": total_cost or 0.0},
        hotspots=hotspots,
        narrative=narrative,
    )

    filename = f"report_{project.id}_{int(datetime.utcnow().timestamp())}.pdf"
    path = _report_path(filename)
    with open(path, "wb") as f:
        f.write(pdf_bytes)

    report = Report(
        name=f"{project.name} report",
        period="custom",
        file_path=path,
        report_type="project",
        project_id=project.id,
        organization_id=project.organization_id,
        target_id=str(project.id),
        from_date=from_date,
        to_date=to_date,
    )
    db.add(report)
    db.flush()
    return report


def generate_job_run_report(db: Session, run: JobRun) -> Report:
    narrative = generate_esg_narrative(run)
    kpis = {
        "energy_kwh": run.energy.total_kwh if run.energy else 0.0,
        "emissions": run.energy.emissions_kg if run.energy else 0.0,
        "cost": run.costs.amount_usd if run.costs else 0.0,
    }
    pdf_bytes = _write_pdf(
        title=f"Run Report - {run.run_name}",
        kpis=kpis,
        hotspots=[(run.run_name, kpis["emissions"])],
        narrative=narrative,
    )
    filename = f"run_report_{run.id}.pdf"
    path = _report_path(filename)
    with open(path, "wb") as f:
        f.write(pdf_bytes)

    report = Report(
        name=f"Run report {run.run_name}",
        period="single-run",
        file_path=path,
        report_type="job_run",
        project_id=run.project_id,
        organization_id=run.organization_id,
        target_id=str(run.id),
    )
    db.add(report)
    db.flush()
    return report
