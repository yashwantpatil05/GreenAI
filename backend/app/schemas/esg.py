"""ESG narrative schema."""
from pydantic import BaseModel


class ESGNarrative(BaseModel):
    executive_summary: str
    highlights: str
    next_actions: str
    generated_at: str
