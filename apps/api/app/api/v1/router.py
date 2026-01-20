from fastapi import APIRouter

from app.api.v1.routes.admin_users import router as admin_users_router
from app.api.v1.routes.health import router as health_router

router = APIRouter()

router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(admin_users_router, prefix="/admin-users", tags=["admin"])
