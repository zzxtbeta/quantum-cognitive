"""
健康检查 + 模型管理端点。
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.config import settings

router = APIRouter(tags=["infra"])


@router.get("/health")
async def health():
    from dagent.orchestrator import get_active_llm_config
    config = get_active_llm_config()
    return {
        "status": "ok",
        "model": config["model"],
        "preset": config["preset"],
        "db": settings.sqlite_db_path,
    }


@router.get("/models")
async def list_models():
    """返回所有可用模型 preset 及当前激活的 preset。"""
    from dagent.orchestrator import get_active_llm_config
    config = get_active_llm_config()
    presets = {
        name: {"display_name": p["display_name"], "model": p["model"]}
        for name, p in settings.model_presets.items()
    }
    return {
        "active": config["preset"],
        "active_model": config["model"],
        "presets": presets,
    }


class SwitchModelRequest(BaseModel):
    preset: str


@router.post("/models/switch")
async def switch_model_endpoint(body: SwitchModelRequest):
    """运行时切换模型 preset，无需重启服务。"""
    from dagent.orchestrator import switch_model
    try:
        config = await switch_model(body.preset)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "status": "ok",
        "active": config["preset"],
        "model": config["model"],
        "display_name": config["display_name"],
    }
