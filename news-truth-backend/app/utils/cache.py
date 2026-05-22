import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.task import Task


def compute_hash(text: str | None, url: str | None, scraped: str | None = None) -> str:
    """计算输入内容的 SHA256 哈希用于缓存匹配。"""
    parts = [text or "", url or "", scraped or ""]
    combined = "|".join(parts)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()


def get_cached_result(
    db: Session, content_hash: str
) -> dict | None:
    """查找 24h 内相同哈希的已完成任务。"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    task = (
        db.query(Task)
        .filter(
            Task.content_hash == content_hash,
            Task.status == "completed",
            Task.updated_at >= cutoff,
        )
        .order_by(Task.updated_at.desc())
        .first()
    )
    if task:
        return task.result
    return None
