# api — FastAPI 路由层
from .health import router as health_router
from .chat import router as chat_router
from .skills import router as skills_router
from .deep_research import router as deep_research_router

__all__ = ["health_router", "chat_router", "skills_router", "deep_research_router"]
