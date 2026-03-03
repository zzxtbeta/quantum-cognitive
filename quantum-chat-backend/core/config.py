"""
全局配置，通过 pydantic-settings 读取环境变量。
所有模块通过 `from core.config import settings` 取配置。
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# quantum-chat-backend/.env 的绝对路径，不受 CWD 影响
_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM ─────────────────────────────────────────────────────────
    dashscope_api_key: str
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen3.5-plus"

    # ── Tavily web search ────────────────────────────────────────────
    tavily_api_key: str = ""

    # ── Server ───────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8001
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3003"]

    # ── SQLite checkpointer ──────────────────────────────────────────
    sqlite_db_path: str = str(Path(__file__).parent.parent / "memory.db")


# 单例
settings = Settings()
