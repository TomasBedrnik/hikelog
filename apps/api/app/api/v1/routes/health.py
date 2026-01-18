from fastapi import APIRouter

router = APIRouter()


@router.get("")
def health_v1():
    return {"status": "ok", "service": "api", "version": "v1"}
