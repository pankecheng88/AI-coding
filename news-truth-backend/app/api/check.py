import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.task import Task
from app.schemas.check import (
    CheckRequest,
    TaskResponse,
    TaskStatusResponse,
    ProgressInfo,
    CheckResult,
    CredibilityRating,
    VerdictClaim,
    TimelineEvent,
    EvidenceSummary,
)
from app.workers.tasks import run_verification

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/check", response_model=TaskResponse, status_code=202)
def submit_check(req: CheckRequest, db: Session = Depends(get_db)):
    if not req.text and not req.url:
        raise HTTPException(status_code=400, detail="请提供新闻文本或链接")

    task = Task(
        id=uuid.uuid4(),
        input_text=req.text,
        input_url=req.url,
        status="pending",
        progress={"step": "queued", "message": "已加入队列", "percent": 0},
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    run_verification.delay(str(task.id))

    return TaskResponse(task_id=task.id)


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: uuid.UUID, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return TaskStatusResponse(
        task_id=task.id,
        status=task.status,
        input_text=task.input_text,
        input_url=task.input_url,
        progress=ProgressInfo(**task.progress) if task.progress else None,
        result=CheckResult(**task.result) if task.result else None,
        error=task.error,
        created_at=task.created_at,
    )
