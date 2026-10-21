from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator


class BankReviewDecision(BaseModel):
    decision: Literal["approve", "reject"]
    donor_id: Optional[str] = Field(default=None, description="Required when decision is approve")
    note: Optional[str] = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_approval_donor(self):
        if self.decision == "approve" and not self.donor_id:
            raise ValueError("donor_id is required when decision is approve")
        return self
