# 新闻求真 — 项目架构 & 技术栈文档

## 1. 项目概述

**新闻求真**是一款 AI 驱动的中文新闻事实核查工具。用户粘贴新闻文本或链接，系统自动提取事实主张、搜索证据、逐条核查、还原传播链、给出综合可信度评级。

---

## 2. 系统架构

```mermaid
graph TB
    subgraph 用户层["用户层"]
        Browser["浏览器<br/>手机/PC"]
    end

    subgraph 前端["前端 (React SPA)"]
        Home["首页<br/>粘贴文本/URL"]
        Result["结果页<br/>核查报告展示"]
        Polling["TanStack Query<br/>每 2s 轮询"]
    end

    subgraph 网关["网关层"]
        Nginx["Nginx<br/>:80 → 前端静态文件<br/>/api/ → 后端"]
    end

    subgraph 后端["后端 (FastAPI)"]
        API["API 服务<br/>POST /api/check<br/>GET /api/task/:id"]
        CeleryBeat["Celery Worker<br/>异步执行核查 Pipeline"]
    end

    subgraph 外部服务["AI & 搜索"]
        Qwen["Qwen-Plus<br/>阿里云 DashScope<br/>4 次调用/任务"]
        BaiduAPI["百度千帆 Web Search<br/>每任务 1-10 次查询"]
    end

    subgraph 数据层["数据层"]
        PG[("PostgreSQL<br/>tasks 表<br/>JSONB 存结果")]
        Redis[("Redis<br/>Celery 消息队列")]
    end

    Browser -->|"HTTPS :80"| Nginx
    Nginx -->|"/ 静态文件"| FrontStatic["Vite 构建产物<br/>index.html + JS + CSS"]
    Nginx -->|"/api/* 反向代理"| API
    API -->|"enqueue task"| Redis
    Redis -->|"consume task"| CeleryBeat
    CeleryBeat -->|"读写 task 状态"| PG
    API -->|"查询 task"| PG
    CeleryBeat -->|"AI 调用"| Qwen
    CeleryBeat -->|"搜索调用"| BaiduAPI
    Browser -->|"GET /api/task/:id<br/>轮询结果"| API
```

---

## 3. 核查 Pipeline

```mermaid
sequenceDiagram
    participant User as 用户
    participant API as FastAPI
    participant Worker as Celery Worker
    participant Qwen as Qwen-Plus
    participant Baidu as 百度千帆搜索
    participant DB as PostgreSQL

    User->>API: POST /api/check {text?, url?}
    API->>DB: INSERT task (status=pending)
    API->>Worker: enqueue run_verification(task_id)
    API-->>User: 202 {task_id}

    User->>API: GET /api/task/:id (每 2s 轮询)

    rect rgb(240, 248, 255)
        Note over Worker,DB: Celery Worker 异步执行

        Worker->>DB: 更新 progress → "抓取网页"
        Worker-->>Worker: Step 1: scrape_url()
        Note right of Worker: requests + BeautifulSoup

        Worker->>DB: 更新 progress → "提取主张"
        Worker->>Qwen: Step 2: extract_claims(原文)
        Qwen-->>Worker: [{id, text}, ...]

        Worker->>DB: 更新 progress → "搜索证据"
        Worker->>Baidu: Step 3: 为每条主张生成搜索词
        Baidu-->>Worker: [{title, url, snippet}, ...]

        Worker->>DB: 更新 progress → "核查事实"
        Worker->>Qwen: Step 4: verify_claims(主张+搜索结果)
        Qwen-->>Worker: [{verdict, confidence, evidence, sources}, ...]

        Worker->>DB: 更新 progress → "传播分析"
        Worker->>Qwen: Step 5: trace_spread(原文+搜索结果)
        Qwen-->>Worker: [{time, event, platform, url}, ...]

        Worker->>DB: 更新 progress → "综合评级"
        Worker->>Qwen: Step 6: evaluate_overall(核查结果)
        Qwen-->>Worker: {level, score, summary}

        Worker->>Worker: Step 7: 构建 evidence_summary
        Worker->>DB: UPDATE task (status=completed, result=JSON)
    end

    User->>API: GET /api/task/:id (轮询)
    API->>DB: SELECT task
    DB-->>API: status=completed, result=...
    API-->>User: 完整核查报告 JSON
```

---

## 4. 数据模型

```mermaid
erDiagram
    Task {
        uuid id PK "任务 ID"
        text input_text "用户粘贴的新闻文本"
        varchar input_url "用户提交的新闻链接"
        varchar content_hash "SHA256 缓存键"
        varchar status "pending|processing|completed|failed"
        jsonb progress "当前步骤 & 百分比"
        jsonb result "完整核查报告"
        text scraped_content "爬虫抓取的网页正文"
        text error "错误信息"
        timestamp created_at "创建时间"
        timestamp updated_at "更新时间"
    }
```

**result 字段结构（JSONB）：**

```json
{
  "credibility_rating": {
    "level": "trusted | dubious | fake",
    "score": 0-100,
    "summary": "2-3 句话综合评价"
  },
  "claims": [{
    "id": 1,
    "text": "主张原文",
    "verdict": "true | false | dubious",
    "confidence": 0-100,
    "evidence": "核查理由",
    "sources": ["url1", "url2"]
  }],
  "timeline": [{
    "time": "2026-05-14 10:00",
    "event": "事件描述",
    "platform": "微博/微信/抖音等",
    "url": "来源链接或 null"
  }],
  "evidence_summary": {
    "supporting": [{"url": "...", "explanation": "..."}],
    "opposing": [{"url": "...", "explanation": "..."}],
    "neutral": [{"url": "...", "explanation": "..."}]
  }
}
```

---

## 5. 前端组件树

```mermaid
graph TB
    App["App<br/>React Router"]
    App --> Home["Home<br/>搜索页"]
    App --> Result["Result<br/>结果页"]

    Home --> SearchBox["SearchBox<br/>文本/URL 双模式输入"]
    Home --> Logo["Logo"]

    Result --> Logo2["Logo"]
    Result --> SearchBox2["SearchBox<br/>新核查入口"]
    Result --> ProgressBar["ProgressBar<br/>6 步进度条"]
    Result --> QuickBar["快速摘要栏<br/>评级 + 主张数 + 分数"]
    Result --> CredibilityBadge["CredibilityBadge<br/>彩色评分横幅"]
    Result --> ClaimCard["ClaimCard ×N<br/>逐条核查卡片"]
    Result --> TimelineView["TimelineView<br/>传播链时间轴"]
    Result --> EvidenceSummaryView["EvidenceSummary<br/>标签页证据汇总"]
    Result --> useTaskPolling["useTaskPolling<br/>TanStack Query 轮询"]

    style Home fill:#e8f5e9
    style Result fill:#e3f2fd
    style useTaskPolling fill:#fff3e0
```

---

## 6. AI 调用汇总

| Step | 服务 | 模型 | Temp | Max Tokens | 输入 | 输出 |
|:----:|------|------|:----:|:----------:|------|------|
| 2 | extractor | qwen-plus | 0.1 | 4096 | 新闻全文 (≤8000字) | 事实主张列表 |
| 4 | verifier | qwen-plus | 0.1 | 8192 | 主张 + 搜索结果 | 每条主张的判决 |
| 5 | tracer | qwen-plus | 0.3 | 4096 | 原文 + 搜索结果 | 传播时间线 |
| 6 | evaluator | qwen-plus | 0.2 | 2048 | 核查后的主张 | 综合评级 |

每次核查调用 4 次 Qwen API + 1-10 次百度搜索 API。

---

## 7. 技术栈速览

```mermaid
graph LR
    subgraph 前端
        React["React 19"]
        TS["TypeScript"]
        Tailwind["Tailwind CSS"]
        TanStack["TanStack Query"]
        Vite["Vite 8"]
    end

    subgraph 后端
        FastAPI["FastAPI"]
        Celery["Celery"]
        Pydantic["Pydantic"]
        SQLAlchemy["SQLAlchemy"]
    end

    subgraph 基础设施
        Postgres["PostgreSQL<br/>JSONB 存储"]
        Redis["Redis<br/>消息队列"]
        Nginx["Nginx<br/>反向代理"]
        Docker["Docker<br/>容器化部署"]
    end

    subgraph AI 服务
        Qwen["Qwen-Plus<br/>阿里云 DashScope"]
        BaiduSearch["百度千帆<br/>Web Search API"]
    end

    FastAPI --> Celery
    Celery --> Qwen
    Celery --> BaiduSearch
    FastAPI --> Postgres
    FastAPI --> Redis
    React --> FastAPI
    Nginx --> React
    Nginx --> FastAPI
```

### 选型依据

| 选择 | 原因 |
|------|------|
| **FastAPI** | Pydantic 深度集成、自动 Swagger 文档、原生 async 适合 I/O 密集场景 |
| **Celery + Redis** | 核查询 pipeline 耗时 30-90s，必须异步；Celery 提供重试、持久化、并发控制 |
| **PostgreSQL** | JSONB 字段存 AI 输出的半结构化结果，支持索引，未来可扩展 pgvector |
| **Qwen-Plus** | 中文原生理解、国内合规、成本低（比 GPT-4o 便宜 3-5x） |
| **千帆搜索 API** | 百度官方接口，返回权威性评分 + 时间信息，比 HTML 爬虫稳定可靠 |
| **React + Tailwind** | 结果页精细 UI 定制需求（色条、渐变、折叠卡片）需要原子化 CSS |
| **TanStack Query** | 内置轮询 + 缓存 + 条件停止，比手写 useEffect 健壮 |
| **Vite** | 2024+ 事实标准，冷启动 <1s，HMR 即时 |
| **Web 应用** | 零安装、URL 可分享、链接可点击、复制粘贴无摩擦 |

---

## 8. 项目目录结构

```
news-truth/
├── docker-compose.yml              # 一键启动全部服务
├── news-truth-backend/
│   ├── .env                        # API 密钥配置
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI 入口
│       ├── config.py               # Pydantic Settings
│       ├── database.py             # SQLAlchemy engine（唯一来源）
│       ├── models/
│       │   └── task.py             # Task ORM 模型
│       ├── schemas/
│       │   └── check.py            # 请求/响应 Pydantic 模型
│       ├── api/
│       │   └── check.py            # /api/check + /api/task/:id
│       ├── workers/
│       │   ├── celery_app.py       # Celery 配置
│       │   └── tasks.py            # 7 步核查 Pipeline
│       ├── services/
│       │   ├── scraper.py          # 网页抓取
│       │   ├── extractor.py        # AI 提取主张
│       │   ├── searcher.py         # 百度千帆搜索
│       │   ├── verifier.py         # AI 逐条核查
│       │   ├── tracer.py           # AI 传播链分析
│       │   └── evaluator.py        # AI 综合评级
│       └── utils/
│           └── cache.py            # 24h SHA256 缓存
└── news-truth-frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── main.tsx                # React 入口
        ├── pages/
        │   ├── Home.tsx            # 搜索页
        │   └── Result.tsx          # 结果页
        ├── components/
        │   ├── SearchBox.tsx       # 输入组件
        │   ├── ProgressBar.tsx     # 进度条
        │   ├── CredibilityBadge.tsx # 评级横幅
        │   ├── ClaimCard.tsx       # 主张卡片
        │   ├── TimelineView.tsx    # 时间轴
        │   └── EvidenceSummary.tsx # 证据汇总
        ├── hooks/
        │   └── useTaskPolling.ts   # 轮询 Hook
        ├── types/
        │   └── index.ts            # TypeScript 类型
        └── constants/
            └── index.ts            # API 地址配置
```
