# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

新闻求真 — a Chinese news fact-checking web app. Users paste news text or a URL, the system extracts factual claims, searches for evidence via Baidu, and produces a credibility report with claim-by-claim verdicts, a spread timeline, and an overall rating.
 
## Repo structure

```
Tencent/
├── docker-compose.yml          # orchestrates all services
├── news-truth-backend/         # Python FastAPI + Celery
└── news-truth-frontend/        # React + TypeScript + Tailwind + TanStack Query
```

## Starting the project

```bash
# Full Docker stack (frontend on :80, api on :8000)
docker-compose up -d --build

# Dev mode: backend in Docker, frontend with hot reload
docker-compose up -d --build api worker postgres redis
cd news-truth-frontend && npm run dev    # → localhost:5173
```

`news-truth-backend/.env` holds API keys (Qwen DashScope, Baidu Search).

## Backend architecture

**API layer** (`app/api/check.py`):
- `POST /api/check` — accepts `{text?, url?}`, inserts a Task row, enqueues `run_verification.delay(task_id)`, returns 202 with `task_id`.
- `GET /api/task/{task_id}` — returns task status, progress, and result. Frontend polls this every 2s via TanStack Query.

**Verification pipeline** (`app/workers/tasks.py` → `run_verification`):
1. Check 24h cache (SHA256 of input_text + scraped_content)
2. If URL provided → scrape with requests + BeautifulSoup
3. AI extract factual claims (Qwen3-Plus, extractor.py)
4. Generate search queries → Baidu search (searcher.py)
5. AI verify each claim against search results (verifier.py)
6. AI trace spread timeline (tracer.py)
7. AI overall credibility rating (evaluator.py)

All AI calls go through `dashscope.Generation.call(model="qwen-plus", ...)`. Each service (`app/services/*.py`) has its own system prompt.

**Caching**: `app/utils/cache.py` — SHA256 hash of `input_text|url|scraped_content`, matches completed tasks within 24h.

**Database**: Single `tasks` table (`app/models/task.py`) — stores input, progress JSONB, result JSONB. No user table (no login). `app/database.py` is the single source of truth for `engine` and `SessionLocal`. Alembic included in requirements but not configured; table creation uses `Base.metadata.create_all` in the FastAPI lifespan.

## Frontend architecture

Two routes (React Router):
- `/` → `Home.tsx` — search box (text/URL tab toggle) + submit
- `/result/:taskId` → `Result.tsx` — polls task status, renders report sections

**State flow**: `SearchBox` calls `onSubmit(text, url)` → `Home.handleSubmit` POSTs to `/api/check` → navigates to `/result/:taskId` → `useTaskPolling` hook polls `GET /api/task/:id` every 2s, stops when status is `completed` or `failed`.

**API base URL** (`src/constants/index.ts`): defaults to `/api` (nginx reverse proxy in Docker). Dev mode override via `VITE_API_BASE_URL=http://localhost:8000/api` in `news-truth-frontend/.env`.

## Key gotchas

- **CORS**: `allow_credentials=False` is required because origins use `*`. Don't change one without the other.
- **nginx proxy**: `location /api/` proxies to `http://api:8000` preserving the full URI. FastAPI routes are also under `/api/`, so the path passes through unchanged.
- **Circular imports**: `app/database.py` is the single source for `engine` and `SessionLocal`. Never import from `app.main` — it would create a cycle (`main` → `api/check` → `main`). The Celery worker uses its own import of `SessionLocal` from `app.database` (same DATABASE_URL, separate process).
- **Module-level Qwen key**: Each service file sets `dashscope.api_key = settings.qwen_api_key` at import time. This works because the Celery worker loads all service modules at startup.
- **Chinese-focused**: All system prompts are in Chinese, Qwen model is `qwen-plus`, search targets Baidu. Changing any of these would require prompt rewrites.
