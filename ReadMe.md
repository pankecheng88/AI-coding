# 本项目为AI coding项目
# 新闻求真 — AI 驱动的事实核查平台

对中文新闻内容进行自动化事实核查：提取关键主张、搜索证据、逐条验证、追溯传播时间线、分析叙事分支，最终生成可信度报告。

## 快速开始

```bash
# 完整 Docker 部署（前端 :80，API :8000）
docker-compose up -d --build

# 前端开发模式（热重载）
docker-compose up -d --build api worker postgres redis
cd news-truth-frontend && npm run dev   # → http://localhost:5173
```

客户端访问：**http://localhost/**

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.7 | 类型安全 |
| Vite | 8 | 构建工具 |
| Tailwind CSS | 4 | 样式（通过 `@tailwindcss/vite` 插件） |
| React Router | 7 | 客户端路由 |
| TanStack Query | 5 | 数据获取与轮询 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.12 | 运行时 |
| FastAPI | 0.128+ | Web 框架 |
| Celery | 5.4 | 异步任务队列 |
| SQLAlchemy | 2.0 | ORM |
| PostgreSQL | 16 | 持久化存储 |
| Redis | 7 | 消息代理 + 结果后端 |
| DashScope | 1.20 | 阿里云 Qwen 大模型 API |
| BeautifulSoup4 | 4.12 | 网页抓取解析 |

### 基础设施

| 组件 | 用途 |
|------|------|
| Docker Compose | 5 个服务编排 |
| Nginx | 前端静态文件 + `/api/` 反向代理 |

## 架构概览

```
用户浏览器 (React SPA)
    │
    ├── /                     → Home 页面（搜索框）
    │     POST /api/check     → 提交文本/URL → 返回 task_id → 跳转 /result/:taskId
    │
    └── /result/:taskId       → Result 页面
          GET /api/task/:id   → 轮询任务状态（2s 间隔）→ 渲染报告

Nginx (:80)
    ├── /                     → 静态文件（SPA fallback）
    └── /api/                 → 反向代理 → FastAPI (:8000)

FastAPI (:8000)
    ├── POST /api/check       → 创建 Task → 入队 Celery → 返回 202
    └── GET /api/task/{id}    → 返回状态 + 进度 + 结果

Celery Worker
    └── run_verification()    → 8 步核查流水线

PostgreSQL (持久化)  ←  Redis (消息队列)
```

## 核查流水线

Celery Worker 执行 8 步流水线：

```
1. 网页抓取            → requests + BeautifulSoup 抓取新闻原文
2. 缓存检查            → SHA256(content) 匹配 24h 内已完成任务
3. AI 提取主张        → Qwen-Max 从文本中提取可验证的事实主张
4. 证据搜索            → Baidu 搜索 + Tavily 并行搜索
5. AI 逐条验证        → 每条主张对照搜索结果，输出 verdict + 证据
6-8. 并行执行：
  ├── 传播溯源        → 追踪新闻传播时间线与关键节点
  ├── 综合评级        → 整体可信度评分（可信/存疑/虚假 + 置信度）
  └── 叙事分析        → 分析同一事实的不同版本叙事分支
9. 证据汇总            → 本地立场分类算法（支持/反对/中立 证据归类）
```

所有 AI 调用统一通过 `utils/ai.py` 封装：`qwen-max` 模型，180s 超时，最多 2 次指数退避重试，自动 JSON 提取。

## 项目结构

```
Tencent/
├── docker-compose.yml              # 顶层编排（5 个服务）
├── news-truth-backend/
│   ├── .env.example                # 配置模板
│   ├── Dockerfile                  # python:3.12-slim
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI 入口 + lifespan
│       ├── config.py               # Pydantic Settings（读取 .env）
│       ├── database.py             # SQLAlchemy engine / SessionLocal
│       ├── api/
│       │   └── check.py            # POST /api/check, GET /api/task/{id}
│       ├── models/
│       │   └── task.py             # Task ORM（UUID PK + JSONB）
│       ├── schemas/
│       │   └── check.py            # Pydantic 请求/响应模型
│       ├── services/
│       │   ├── scraper.py          # 网页抓取
│       │   ├── extractor.py        # AI 提取主张
│       │   ├── searcher.py         # Baidu + Tavily 双源搜索
│       │   ├── verifier.py         # AI 逐条验证
│       │   ├── tracer.py           # AI 传播溯源
│       │   ├── evaluator.py        # AI 综合评级
│       │   └── narrative.py        # AI 叙事分支分析
│       ├── utils/
│       │   ├── ai.py               # 统一 Qwen API 封装
│       │   └── cache.py            # 24h SHA256 缓存
│       └── workers/
│           ├── celery_app.py       # Celery 配置
│           └── tasks.py            # 核查流水线主任务
│
└── news-truth-frontend/
    ├── Dockerfile                  # 多阶段构建（node 构建 → nginx 服务）
    ├── nginx.conf                  # SPA fallback + /api/ 代理
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    ├── index.html                  # lang="zh-CN"
    └── src/
        ├── main.tsx                # React 入口
        ├── App.tsx                 # 路由：/ → Home, /result/:taskId → Result
        ├── index.css               # @import "tailwindcss"
        ├── constants/
        │   └── index.ts            # API_BASE_URL
        ├── types/
        │   └── index.ts            # 完整 TypeScript 类型定义
        ├── hooks/
        │   └── useTaskPolling.ts   # TanStack Query 2s 轮询
        ├── components/
        │   ├── SearchBox.tsx       # 文本/URL 双模式输入框
        │   ├── ProgressBar.tsx     # 5 步进度条
        │   ├── CredibilityBadge.tsx# 可信度评分徽章
        │   ├── ClaimCard.tsx       # 主张判定卡片（可展开）
        │   ├── TimelineView.tsx    # 传播时间线
        │   ├── NarrativeTree.tsx   # 叙事分支树状图
        │   ├── EvidenceSummary.tsx # 证据汇总（Tab 切换）
        │   └── Logo.tsx            # SVG Logo
        └── pages/
            ├── Home.tsx            # 首页
            └── Result.tsx          # 报告页
```

## 配置说明

后端通过 `news-truth-backend/.env` 配置（参考 `.env.example`）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `REDIS_URL` | Redis 连接串 |
| `QWEN_API_KEY` | 阿里云 DashScope API Key |
| `BAIDU_SEARCH_APP_ID` | 百度搜索应用 ID |
| `BAIDU_SEARCH_API_KEY` | 百度搜索 API Key |
| `BAIDU_SEARCH_SECRET_KEY` | 百度搜索 Secret Key |
| `TAVILY_API_KEY` | Tavily 搜索 API Key |
| `APP_ENV` | 运行环境（development/production） |

前端开发环境可通过 `news-truth-frontend/.env` 覆盖 API 地址：

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## API 接口

### POST /api/check

提交核查请求。

```json
// Request
{
  "text": "新闻内容...",   // 文本输入（与 url 二选一）
  "url": "https://..."     // URL 输入（与 text 二选一）
}

// Response (202)
{
  "task_id": "uuid-string"
}
```

### GET /api/task/{task_id}

查询任务状态与结果。

```json
// Response（进行中）
{
  "task_id": "uuid",
  "status": "processing",
  "progress": { "step": "extracting_claims", "percent": 40 },
  "result": null
}

// Response（完成）
{
  "task_id": "uuid",
  "status": "completed",
  "progress": { "step": "done", "percent": 100 },
  "result": {
    "credibility_rating": { "level": "trusted", "score": 85 },
    "claims": [ ... ],
    "timeline": [ ... ],
    "narrative_tree": { ... },
    "evidence_summary": { ... }
  }
}
```

## 关键设计决策

- **中文优先**：所有系统提示为中文，模型使用 `qwen-max`，搜索引擎以百度为主
- **无用户系统**：无需登录，表结构不含用户表
- **24h 缓存**：基于输入内容的 SHA256 哈希匹配，减少重复 AI 调用
- **并行优化**：Baidu + Tavily 双源并行搜索；传播溯源、综合评级、叙事分析三步并行执行
- **URL 幻觉防护**：传播溯源 prompt 中强调仅使用搜索结果中的 URL，不编造链接
