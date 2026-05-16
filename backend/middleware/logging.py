import json
import logging
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_var.get(""),
        }
        if record.exc_info:
            log["exc"] = self.formatException(record.exc_info)
        return json.dumps(log, ensure_ascii=False)


def configure_json_logging(log_level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, log_level.upper(), logging.INFO))


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, logger_name: str = "api.access"):
        super().__init__(app)
        self._log = logging.getLogger(logger_name)

    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        token = request_id_var.set(req_id)

        start = time.perf_counter()
        response: Response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

        self._log.info(
            "%s %s %s %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "ms": elapsed_ms,
            },
        )
        response.headers["X-Request-ID"] = req_id
        request_id_var.reset(token)
        return response
