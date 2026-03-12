"""
数据代理路由：GET/POST /data/{path} → QUANTUM_API_BASE_URL/{path}

前端不再直接跨域调用数据 API，统一由后端转发（附 API Key）。
"""
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import Response

from core.config import settings

router = APIRouter(prefix="/data", tags=["data-proxy"])


@router.api_route("/{path:path}", methods=["GET", "POST"])
async def proxy(path: str, request: Request) -> Response:
    url = f"{settings.quantum_api_base_url.rstrip('/')}/{path}"
    headers = {
        "X-API-Key": settings.quantum_api_key,
        "Accept": "application/json",
    }
    params = dict(request.query_params)

    body = None
    if request.method == "POST":
        body = await request.body()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(
            request.method,
            url,
            headers=headers,
            params=params,
            content=body,
        )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )
