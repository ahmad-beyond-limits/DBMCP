from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import get_client_ip, rate_limit
from app.database.session import get_db
from app.forms.schemas import FormSessionResponse, FormSubmitRequest, FormSubmitResponse
from app.forms.service import FormService

router = APIRouter(prefix="/forms", tags=["Forms"])


@router.get(
    "/session",
    response_model=FormSessionResponse,
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, scope="forms_get"))],
)
async def get_form_session(
    token: str = Query(..., description="Cryptographically signed form session token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the dataset field definitions, inferred input controls, and pre-filled
    values for an AI-generated data entry form session.
    """
    return await FormService.get_session_data(db=db, token=token)


@router.post(
    "/submit",
    response_model=FormSubmitResponse,
    dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60, scope="forms_submit"))],
)
async def submit_form_data(
    req: FormSubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Validates, sanitizes (CWE-1236 anti-formula injection), and commits user-entered data
    to the target dataset file and storage backend.
    """
    client_ip = get_client_ip(request)
    return await FormService.submit_form(
        db=db,
        token=req.session_token,
        submitted_values=req.values,
        client_ip=client_ip,
    )
