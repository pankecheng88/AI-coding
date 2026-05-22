# 新闻求真 — 当前架构 vs 旧架构 差异对比

> 旧架构文档: `ARCHITECTURE.md`（项目初期的设计蓝图）
> 本文档: 描述当前实际实现，逐项标注与旧架构的差异

---

## 一、目录结构对比

```
当前项目根目录 (Tencent/)                         vs 旧架构描述的 (news-truth/)
─────────────────────────────────────────────────────────────────
docker-compose.yml                                无变化
.mcp.json                    ← 新增              (不存在)
ARCHITECTURE.md              ← 旧架构文档
NEW_ARCHITECTURE.md          ← 本文档
CLAUDE.md                                         无变化
ReadMe.md                                         无变化

news-truth-backend/
├── .env                                          无变化
├── Dockerfile                                    无变化
├── requirements.txt          ← 新增依赖
│   + tavily-python>=0.7.*   (Tavily 搜索 SDK)
│   (fastmcp 已删除)
│
└── app/
    ├── main.py               ← 变更              旧: 仅 health/check 路由
    │   └── GET /api/health   (新增端点)          无此端点
    │
    ├── config.py             ← 变更              旧: 只有百度三段式密钥
    │   + tavily_api_key                          无
    │   + baidu_appbuilder_api_key                无 (用三段式)
    │   (旧的三段式字段保留但未使用)
    │
    ├── database.py                               无变化
    ├── models/task.py                            无变化
    ├── schemas/check.py                          无变化
    ├── api/check.py                              无变化
    │
    ├── workers/
    │   ├── celery_app.py                         无变化
    │   └── tasks.py           ← 重大变更         旧: 7步顺序执行
    │       ├── 8步 Pipeline                      7步
    │       ├── 5-7步并行执行                     全部顺序
    │       └── _generate_search_queries()        无 (AI生成搜索词)
    │
    ├── services/
    │   ├── scraper.py                            无变化
    │   ├── extractor.py       ← 变更             旧: qwen-plus, 直接调dashscope
    │   │   └── 统一用 call_qwen_json()
    │   ├── searcher.py        ← 重大变更          旧: 仅百度千帆搜索
    │   │   ├── search_baidu()                     ✓
    │   │   ├── search_tavily() (新增)              ✗
    │   │   └── ThreadPoolExecutor 并行            ✗
    │   ├── verifier.py        ← 变更              旧: qwen-plus, 简单prompt
    │   │   ├── prompt 大幅增强                    ✗
    │   │   └── 统一用 call_qwen_json()
    │   ├── tracer.py          ← 变更              旧: 无URL校验
    │   │   ├── _validate_urls() (新增)            ✗
    │   │   └── 统一用 call_qwen_json()
    │   ├── evaluator.py       ← 变更              旧: qwen-plus, 简单prompt
    │   │   ├── prompt 大幅增强                    ✗
    │   │   └── 统一用 call_qwen_json()
    │   └── narrative.py       ← 新增              不存在
    │       └── analyze_narrative()  事实版本分枝
    │
    └── utils/
        ├── cache.py                               无变化
        └── ai.py              ← 新增              不存在
            ├── call_qwen()        统一AI调用
            ├── call_qwen_json()   便利封装
            └── extract_json_from_response()

news-truth-frontend/src/
├── pages/
│   ├── Home.tsx                                   无变化
│   └── Result.tsx            ← 变更              旧: 6个section
│       └── + "事实版本分枝" section              无此section
│
├── components/
│   ├── ProgressBar.tsx        ← 变更              旧: 6步进度条
│   │   └── 5步 (含"综合分析")                    6步
│   ├── NarrativeTree.tsx      ← 新增              不存在
│   ├── SearchBox.tsx                              无变化
│   ├── CredibilityBadge.tsx                       无变化
│   ├── ClaimCard.tsx                              无变化
│   ├── TimelineView.tsx                           无变化
│   ├── EvidenceSummary.tsx                        无变化
│   └── Logo.tsx                                   无变化
│
├── types/index.ts            ← 新增类型          旧: 无Narrative类型
│   + NarrativeNode
│   + NarrativeBranch
│   + NarrativeTree
│
├── hooks/useTaskPolling.ts                       无变化
└── constants/index.ts                             无变化
```

---

## 二、Pipeline 对比（最重要的变更）

### 旧架构：7步顺序执行

```
Step1 → Step2 → Step3 → Step4 → Step5 → Step6 → Step7
 抓取    提取    搜索    核查    传播    评级    汇总
(顺序执行，总计约 60-120s)
```

### 新架构：8步，部分并行

```
Step1 → Step2 → Step3 → Step4 → ┬─ Step5 传播链   ┐
 抓取    提取    搜索    核查    ├─ Step6 评级      ├→ Step8 证据汇总
                                 └─ Step7 叙事分枝  ┘   (本地计算)
                                (ThreadPoolExecutor 并行)
```

**关键变化:**

| # | 步骤 | 旧架构 | 新架构 | 变化 |
|:-:|------|--------|--------|------|
| 1 | 抓取网页 | scrape_url() | scrape_url() | — |
| 2 | 提取主张 | AI (qwen-plus) | AI (qwen-max) | 模型升级 |
| 3 | 搜索证据 | AI生成搜索词 → 仅百度 | 本地规则生成 → 百度+Tavily 并行 | **不用AI生成搜索词; 双源搜索** |
| 4 | 核查事实 | AI (qwen-plus), 简单prompt | AI (qwen-max), **大幅增强prompt** | 模型升级+prompt质变 |
| 5 | 传播链 | 顺序执行 | 与6/7 **并行** 执行, 新增URL防幻觉校验 | 并行化+防幻觉 |
| 6 | 综合评级 | 顺序执行, 简单prompt | 与5/7 **并行** 执行, **大幅增强prompt** | 并行化+prompt质变 |
| 7 | **叙事分枝** | **不存在** | AI (qwen-max) 分析事实版本分枝 | **全新步骤** |
| 8 | 证据汇总 | 简单逻辑 | Stance分类算法 (false>true>dubious) | 逻辑增强 |

---

## 三、AI 调用基础设施变化

### 旧架构
每个 service 各自直接调用 `dashscope.Generation.call()`，没有统一的超时和重试机制。

<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjAiIHk9IjIwIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij5FeHRyYWN0b3I6IGRhc2hzY29wZS5HZW5lcmF0aW9uLmNhbGwoKTwvdGV4dD48L3N2Zz4=" />
<!-- 示意：6个文件各自重复 dashscope.api_key=settings..., dashscope.Generation.call() -->

### 新架构: `utils/ai.py` 统一封装

```python
# 每个 service 现在统一调用:
from app.utils.ai import call_qwen_json

result = call_qwen_json(
    model="qwen-max",
    system_prompt=SYSTEM_PROMPT,
    user_prompt=user_prompt,
    temperature=0.1,
    max_tokens=4096,
    json_expected_first_char="[",
)
```

**统一能力:**
| 特性 | 旧架构 | 新架构 |
|------|--------|--------|
| 超时 | 无设置 | **180秒** |
| 重试 | 无 | **指数退避, 最多2次重试** |
| JSON 提取 | 每个文件各自写正则 | `extract_json_from_response()` 统一处理 |
| 错误信息 | 简单 message | 包含尝试次数的详细错误 |

---

## 四、搜索引擎变化

| 维度 | 旧架构 | 新架构 |
|------|--------|--------|
| 搜索引擎 | 仅百度千帆 Web Search API | **百度千帆 + Tavily** 双源 |
| 并行策略 | 串行 | `ThreadPoolExecutor(max_workers=4)` |
| 搜索词生成 | AI 调用 | 本地规则 (截断+分词, 每条主张最多3个query) |
| Tavily 容错 | — | 未配置/失败时**静默跳过**, 不影响百度结果 |
| 结果去重 | 无 | 按 URL 去重, 标注 `source` 字段 |

### 搜索词生成的规则策略

旧架构用 AI 生成搜索词（额外1次 API 调用）。新架构纯规则:
1. 主张 ≤60字 → 直接作为查询词
2. 主张 >60字 → 从第一个句读处截断
3. 补充查询: 逗号分词后取 6-40 字的短语
4. 每条主张最多 3 个查询词

---

## 五、AI 调用汇总

| Step | 服务 | 模型 | Temp | Max Tokens | 说明 |
|:----:|------|------|:----:|:----------:|------|
| 2 | extractor | qwen-max | 0.1 | 4096 | 旧为 qwen-plus |
| 4 | verifier | qwen-max | 0.1 | 8192 | **prompt 大幅增强** (疑罪从无原则, 来源可信度分层, confidence评分指南) |
| 5 | tracer | qwen-max | 0.3 | 4096 | 新增 **URL防幻觉校验** |
| 6 | evaluator | qwen-max | 0.2 | 2048 | **prompt 大幅增强** (假阳性防护, dubious权重保护) |
| 7 | narrative | qwen-max | 0.2 | 4096 | **全新步骤** — 事实版本分枝分析 |

**外部API调用次数**: 每任务 5 次 Qwen + 百度搜索 + Tavily 搜索
(旧架构: 4 次 Qwen + 搜索词生成AI调用 + 百度搜索)

---

## 六、数据模型变化

### result JSONB — 新增字段

```diff
{
  "credibility_rating": { level, score, summary },
  "claims": [{ id, text, verdict, confidence, evidence, sources }],
  "timeline": [{ time, event, platform, url }],
+ "narrative_tree": {                     ← 新增
+   "root": {
+     "description": "根版本核心事实",
+     "sources": ["url1"]
+   },
+   "branches": [
+     {
+       "description": "传播中变形后的说法",
+       "diff": "与根版本的关键差异",
+       "sources": ["url2"]
+     }
+   ]
+ },
  "evidence_summary": { supporting, opposing, neutral }
}
```

### evidence_summary 生成逻辑

旧架构: 简单的程序化逻辑。
新架构: **Stance 分类算法** — 遍历所有 claim 的 verdict, `false`→opposing(优先级3), `true`→supporting(2), `dubious`→neutral(1), 同一URL取最高优先级的stance。

---

## 七、前端变化

### 新组件: `NarrativeTree.tsx`

横向树状图, 展示事实版本分枝:
- 左: 根节点 (原始版本)
- SVG 贝塞尔曲线连线
- 右: 分枝节点 (变形版本) + 差异标注
- 无分枝时展示"无叙事分枝"空状态

### ProgressBar: 6步 → 5步

旧架构 6 个步骤图标。新架构合并后三步为"综合分析"（因为并行执行了）。

### Result 页面: 新增 section

在"传播链还原"和"证据汇总"之间, 新增 **"事实版本分枝"** 区域。

### 类型定义: 新增 3 个 interface

```typescript
NarrativeNode    { description; sources[] }
NarrativeBranch  { description; diff; sources[] }
NarrativeTree    { root; branches[] }
```

---

## 八、配置变化

| 字段 | 旧架构 | 新架构 | 说明 |
|------|--------|--------|------|
| `baidu_search_app_id` | ✓ 使用 | 保留未用 | 三段式密钥 |
| `baidu_search_api_key` | ✓ 使用 | 保留未用 | 三段式密钥 |
| `baidu_search_secret_key` | ✓ 使用 | 保留未用 | 三段式密钥 |
| `baidu_appbuilder_api_key` | ✗ | **✓ 使用** | 百度千帆新接口 |
| `tavily_api_key` | ✗ | **✓ 使用** | Tavily 国际搜索 |

---

## 九、速查总结

| 维度 | 旧架构 | 当前实现 |
|------|--------|----------|
| Pipeline 步骤 | 7步顺序 | **8步, 5-7并行** |
| AI 调用框架 | 各自直接调 dashscope | 统一 `utils/ai.py` (超时+重试+JSON提取) |
| AI 模型 | qwen-plus | **qwen-max** (全部5个服务) |
| 搜索引擎 | 百度千帆 | **百度千帆 + Tavily 双源并行** |
| 搜索词生成 | AI 生成 | **本地规则** (省1次API调用) |
| 叙事分枝分析 | 不存在 | **narrative.py + NarrativeTree.tsx** |
| URL 防幻觉 | 无 | **tracer._validate_urls()** |
| evidence_summary | 简单逻辑 | **stance 分类算法** |
| ProgressBar | 6步 | **5步 (合并"综合分析")** |
| Health check | 无 | **GET /api/health** |
| MCP 服务 | 无 | **.mcp.json 配置 Tavily 官方 MCP** |
| 前端类型 | 无 Narrative 类型 | **3个新 interface** |
| 依赖 | 无 tavily | **tavily-python** |
