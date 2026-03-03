"""
健康检查端点。
/health — 供负载均衡器、部署脚本探活使用。
"""
from fastapi import APIRouter
from core.config import settings

router = APIRouter(tags=["infra"])


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "model": settings.llm_model,
        "db": settings.sqlite_db_path,
    }
