from typing import Optional, List
from pydantic import BaseModel, Field
from pydantic.types import UUID


class HealthcareProvider(BaseModel):
    active: Optional[bool] = True
    name: str = Field(..., min_length=2, max_length=50)
    qualification: List[str] = []
    specialty: List[str] = []
    phone: str = Field(..., regex=r"^\+[1-9]{1}[0-9]{3,14}$")       # matches international phone numbers with country code
    department: Optional[str] = None
    organization: str = Field(..., min_length=2)
    location: Optional[str] = None
    address: str = Field(..., min_length=5)


class HealthcareProviderDB(HealthcareProvider):
    providerID: UUID
