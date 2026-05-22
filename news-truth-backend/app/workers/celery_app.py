from celery import Celery

from app.config import settings

celery_app = Celery(
    "news-truth",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,
    task_soft_time_limit=540,
)

import app.workers.tasks  # noqa: E402, F401 — register tasks with Celery
