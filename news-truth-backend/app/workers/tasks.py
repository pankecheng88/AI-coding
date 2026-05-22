from concurrent.futures import ThreadPoolExecutor, as_completed

from app.database import SessionLocal
from app.models.task import Task
from app.utils.cache import compute_hash, get_cached_result
from app.workers.celery_app import celery_app


def _update_progress(task_id: str, step: str, message: str, percent: int):
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.progress = {"step": step, "message": message, "percent": percent}
            task.status = "processing"
            db.commit()
    finally:
        db.close()


def _generate_search_queries(claim_text: str) -> list[str]:
    """根据主张文本生成搜索查询词。"""
    queries = []
    # 主查询：截断到 60 字，保留完整语义
    if len(claim_text) <= 60:
        queries.append(claim_text)
    else:
        # 从第一个逗号/句号处截断
        for sep in ["，", "。", "、", ",", "."]:
            idx = claim_text.find(sep, 30)
            if idx != -1 and idx < 70:
                queries.append(claim_text[:idx])
                break
        if len(queries) == 0:
            queries.append(claim_text[:60])
    # 补充查询：提取关键短语（引号内容、数字+单位、专有名词等）
    # 简单策略：拆分后取长度合适的片段
    parts = claim_text.replace("，", ",").replace("、", ",").replace("。", ",").split(",")
    for p in parts:
        p = p.strip()
        if 6 <= len(p) <= 40:
            queries.append(p)
    return queries[:3]


@celery_app.task(bind=True, max_retries=2)
def run_verification(self, task_id: str):
    """主核查流程：抓取 → 提取 → 搜索 → 核查 → 并行(溯源+评级+叙事) → 证据汇总。"""
    from app.services.scraper import scrape_url
    from app.services.extractor import extract_claims
    from app.services.searcher import search_multiple_queries
    from app.services.verifier import verify_claims
    from app.services.tracer import trace_spread
    from app.services.evaluator import evaluate_overall
    from app.services.narrative import analyze_narrative

    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return

        # Step 1: 抓取网页（如有URL）
        scraped_content = ""
        if task.input_url:
            _update_progress(task_id, "scraping", "正在抓取网页内容...", 5)
            try:
                scraped_content = scrape_url(task.input_url)
                task.scraped_content = scraped_content
                db.commit()
            except Exception as e:
                task.status = "failed"
                task.error = f"网页抓取失败: {str(e)}"
                db.commit()
                return

        source_text = task.input_text or scraped_content
        if not source_text.strip():
            task.status = "failed"
            task.error = "未能获取有效文本内容"
            db.commit()
            return

        # 缓存检查
        content_hash = compute_hash(task.input_text, task.input_url, scraped_content)
        task.content_hash = content_hash
        db.commit()

        cached = get_cached_result(db, content_hash)
        if cached:
            task.result = cached
            task.status = "completed"
            task.progress = {"step": "done", "message": "命中缓存，直接返回结果", "percent": 100}
            db.commit()
            return

        # Step 2: AI 提取事实主张
        _update_progress(task_id, "extracting", "正在提取事实主张...", 15)
        claims = extract_claims(source_text)
        if not claims:
            task.status = "failed"
            task.error = "未能从文本中提取到可核查的事实主张"
            db.commit()
            return

        # Step 3: 搜索证据
        _update_progress(task_id, "searching", "正在搜索相关证据...", 30)
        # 收集所有主张的关键词，统一搜索
        all_queries = []
        for claim in claims[:6]:  # 最多核查6条主张
            all_queries.extend(_generate_search_queries(claim["text"]))
        all_queries = list(dict.fromkeys(all_queries))  # 去重保序
        search_results = search_multiple_queries(all_queries[:10])

        # Step 4: AI 逐条核查
        _update_progress(task_id, "verifying", "正在逐条核查事实...", 50)
        verified = verify_claims(claims[:6], search_results)

        # Step 5-7: 并行执行传播链、评级、叙事分枝（三者互不依赖）
        _update_progress(task_id, "analyzing", "正在综合分析...", 70)

        parallel_futures = {}
        with ThreadPoolExecutor(max_workers=3) as pool:
            parallel_futures[pool.submit(trace_spread, source_text, search_results)] = "timeline"
            parallel_futures[pool.submit(evaluate_overall, verified)] = "rating"
            parallel_futures[pool.submit(analyze_narrative, source_text, verified)] = "narrative_tree"

            results: dict[str, object] = {}
            for future in as_completed(parallel_futures):
                key = parallel_futures[future]
                try:
                    results[key] = future.result()
                except Exception as e:
                    raise RuntimeError(f"并行步骤 {key} 失败: {e}") from e

        timeline = results["timeline"]
        rating = results["rating"]
        narrative_tree = results["narrative_tree"]

        # Step 8: 证据汇总（纯本地计算）
        stance_priority = {"false": 3, "true": 2, "dubious": 1}
        stance_label = {"false": "opposing", "true": "supporting", "dubious": "neutral"}
        url_map: dict[str, dict] = {}  # url -> {stance, explanation, priority}

        for claim in verified:
            verdict = claim.get("verdict", "dubious")
            priority = stance_priority.get(verdict, 1)
            stance = stance_label.get(verdict, "neutral")
            explanation = claim.get("evidence", "")
            for url in claim.get("sources", []):
                if not url:
                    continue
                existing = url_map.get(url)
                if existing is None or priority > existing["priority"]:
                    url_map[url] = {
                        "url": url,
                        "explanation": explanation,
                        "stance": stance,
                        "priority": priority,
                    }

        supporting = []
        opposing = []
        neutral = []
        for item in url_map.values():
            if item["stance"] == "supporting":
                supporting.append({"url": item["url"], "explanation": item["explanation"]})
            elif item["stance"] == "opposing":
                opposing.append({"url": item["url"], "explanation": item["explanation"]})
            else:
                neutral.append({"url": item["url"], "explanation": item["explanation"]})

        result = {
            "credibility_rating": rating,
            "claims": verified,
            "timeline": timeline,
            "narrative_tree": narrative_tree,
            "evidence_summary": {
                "supporting": supporting,
                "opposing": opposing,
                "neutral": neutral,
            },
        }

        task.result = result
        task.status = "completed"
        task.progress = {"step": "done", "message": "核查完成", "percent": 100}
        db.commit()

    except Exception as e:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "failed"
            task.error = str(e)
            db.commit()
        raise
    finally:
        db.close()
