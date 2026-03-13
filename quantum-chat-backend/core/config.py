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

    # ── LLM Legacy（向后兼容，新代码优先用 model_presets）─────────────
    dashscope_api_key: str
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "glm-5"

    # ── 模型预设：GLM-5 ──────────────────────────────────────────────
    glm5_api_key: str = ""
    glm5_base_url: str = "https://coding.dashscope.aliyuncs.com/v1"
    glm5_model: str = "glm-5"

    # ── 模型预设：Qwen ───────────────────────────────────────────────
    qwen_api_key: str = ""
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_model: str = "qwen3.5-plus"

    # ── 模型预设：Gemini（OpenAI-compatible）────────────────────────
    gemini_api_key: str = ""
    gemini_base_url: str = "https://llm.eulerai.au"
    gemini_model: str = "gemini-3-flash-preview"

    # ── 启动时默认 preset ────────────────────────────────────────────
    active_llm: str = "glm-5"

    @property
    def model_presets(self) -> dict:
        return {
            "glm-5": {
                "api_key": self.glm5_api_key or self.dashscope_api_key,
                "base_url": self.glm5_base_url,
                "model": self.glm5_model,
                "display_name": "GLM-5",
            },
            "qwen": {
                "api_key": self.qwen_api_key or self.dashscope_api_key,
                "base_url": self.qwen_base_url,
                "model": self.qwen_model,
                "display_name": "Qwen3.5-Plus",
            },
            "gemini": {
                "api_key": self.gemini_api_key,
                "base_url": self.gemini_base_url,
                "model": self.gemini_model,
                "display_name": "Gemini Flash",
            },
        }

    # ── Tavily web search ────────────────────────────────────────────
    tavily_api_key: str = ""

    # ── 量子引擎数据 API（供 DeepAgent 工具层使用）────────────────────────
    quantum_api_base_url: str = "http://47.110.226.140:8080"
    quantum_api_key: str = "xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK"
    # 路径可覆盖：用于适配不同网关转发规则（如 /datalake/api）
    quantum_api_papers_path: str = "/papers"
    quantum_api_papers_search_path: str = "/papers/search"
    quantum_api_papers_search_method: str = "POST"
    quantum_api_papers_sort_by: str = "year"
    quantum_api_papers_sort_order: str = "desc"
    quantum_api_papers_include_stats: bool = False
    quantum_api_people_search_path: str = "/people/search"
    quantum_api_news_path: str = "/news"
    quantum_api_news_search_path: str = "/news/search"

    # ── Server ───────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8001
    cors_origins: list[str] = ["*"]

    # ── SQLite checkpointer ──────────────────────────────────────────
    sqlite_db_path: str = str(Path(__file__).parent.parent / "memory.db")


# 单例
settings = Settings()
