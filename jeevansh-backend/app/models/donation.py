from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class BankLoginRequest(BaseModel):
    bank_id: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class DonationVerifyRequest(BaseModel):
    token: str = Field(..., min_length=10)
    bank_id: Optional[str] = None  # Optional for demo


class DonationResponse(BaseModel):
    success: bool
    message: str
    donor_name: Optional[str] = None
    blood_type: Optional[str] = None
    request_id: Optional[str] = None
    verified_at: Optional[datetime] = None
    donor_id: Optional[str] = None
    stage: Optional[str] = None

class BankDecisionRequest(BaseModel):
    decision: Literal["approve", "reject"]
    donor_id: Optional[str] = None
    request_id: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=500)
