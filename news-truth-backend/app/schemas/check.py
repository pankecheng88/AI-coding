import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CheckRequest(BaseModel):
    text: str | None = Field(None, description="新闻文本")
    url: str | None = Field(None, description="新闻链接")


class TaskResponse(BaseModel):
    task_id: uuid.UUID


class ProgressInfo(BaseModel):
    step: str
    message: str
    percent: int


class VerdictClaim(BaseModel):
    id: int
    text: str
    verdict: str  # "true" | "false" | "dubious"
    confidence: int
    evidence: str
    sources: list[str]


class CredibilityRating(BaseModel):
    level: str  # "trusted" | "dubious" | "fake"
    score: int
    summary: str


class TimelineEvent(BaseModel):
    time: str
    event: str
    platform: str
    url: str | None = None


class EvidenceItem(BaseModel):
    url: str
    explanation: str


class EvidenceSummary(BaseModel):
    supporting: list[EvidenceItem]
    opposing: list[EvidenceItem]
    neutral: list[EvidenceItem]


class NarrativeNode(BaseModel):
    description: str
    sources: list[str]


class NarrativeBranch(BaseModel):
    description: str
    diff: str
    sources: list[str]


class NarrativeTree(BaseModel):
    root: NarrativeNode
    branches: list[NarrativeBranch]


class CheckResult(BaseModel):
    credibility_rating: CredibilityRating
    claims: list[VerdictClaim]
    timeline: list[TimelineEvent]
    narrative_tree: NarrativeTree | None = None
    evidence_summary: EvidenceSummary


class TaskStatusResponse(BaseModel):
    task_id: uuid.UUID
    status: str  # "pending" | "processing" | "completed" | "failed"
    input_text: str | None = None
    input_url: str | None = None
    progress: ProgressInfo | None = None
    result: CheckResult | None = None
    error: str | None = None
    created_at: datetime | None = None
