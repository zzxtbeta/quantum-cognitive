"""
FastAPI 入口文件。
职责：挂载路由、CORS、全局日志。业务逻辑一律在 api/ 和 agent/ 下。

启动方式（三选一）：
    # 方式 1：直接运行（推荐，自动 reload）
    python main.py

    # 方式 2：双击批处理（Windows）
    start.bat

    # 方式 3：手动 uvicorn
    uvicorn main:app --reload --port 8001
"""
import logging
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from api import health_router, chat_router, skills_router, deep_research_router
from agent import init_agent
from dagent import init_deep_agent

# ─── 日志：每次启动写入 logs/YYYY-MM-DD_HH-MM-SS.log ──────────────────────────
_LOGS_DIR = Path(__file__).parent / "logs"
_LOGS_DIR.mkdir(exist_ok=True)

_log_file = _LOGS_DIR / f"{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log"
_fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")

_file_handler = logging.FileHandler(_log_file, encoding="utf-8")
_file_handler.setFormatter(_fmt)

_console_handler = logging.StreamHandler()
_console_handler.setFormatter(_fmt)

logging.basicConfig(
    level=logging.INFO,
    handlers=[_file_handler, _console_handler],
)
logging.getLogger("app").info("日志文件：%s", _log_file)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：startup 时初始化 agent，shutdown 时清理。"""
    await init_agent()        # 简单对话 Agent（原有）
    await init_deep_agent()   # DeepAgent 多子Agent 研究引擎（新增）
    yield
    # 可在此处清理资源


app = FastAPI(
    lifespan=lifespan,
    title="Quantum Chat Backend × DeepAgent",
    description=(
        "量子科技赛道认知引擎\n\n"
        "• POST /chat/stream — 馬勤/对话模式（原有）\n"
        "• POST /deep/stream — DeepAgent 深度研究模式（新）"
    ),
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(skills_router)
app.include_router(deep_research_router)  # DeepAgent 深度研究模式


@app.exception_handler(Exception)
async def _global_exc_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logging.getLogger("uvicorn.error").error("Unhandled exception:\n%s", tb)
    return JSONResponse(status_code=500, content={"detail": tb})


@app.get("/")
async def root():
    return {"service": "quantum-chat-backend", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )
