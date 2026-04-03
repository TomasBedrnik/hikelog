from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health_v1() -> dict[str, str]:
    return {"status": "ok", "service": "api", "version": "v1"}
