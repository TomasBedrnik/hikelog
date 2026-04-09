from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=1)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
