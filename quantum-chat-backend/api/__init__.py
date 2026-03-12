# api — FastAPI 路由层
from .health import router as health_router
from .skills import router as skills_router
from .deep_research import router as deep_research_router
from .data_proxy import router as data_proxy_router

__all__ = ["health_router", "skills_router", "deep_research_router", "data_proxy_router"]
