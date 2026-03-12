"""Region emission factor reference data."""
from sqlalchemy import Column, String, Float, UniqueConstraint

from backend.app.core.database import Base
from backend.app.models.base import UUIDMixin, TimestampMixin


class RegionEmissionFactor(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "region_emission_factors"
    __table_args__ = (UniqueConstraint("region", "version", name="ux_region_factor_region_version"),)

    region = Column(String, nullable=False)
    factor_kg_co2e_per_kwh = Column(Float, nullable=False)
    source = Column(String, nullable=True)
    version = Column(String, nullable=False, default="v1")
