from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from tavily import TavilyClient

from app.config import settings

BAIDU_API_URL = "https://qianfan.baidubce.com/v2/ai_search/web_search"


def search_baidu(query: str, max_results: int = 8) -> list[dict]:
    """使用百度千帆 Web Search API 搜索，返回 [{title, url, snippet, source}]。"""
    api_key = settings.baidu_appbuilder_api_key
    if not api_key:
        raise RuntimeError("BAIDU_APPBUILDER_API_KEY 未配置，请在 .env 中设置")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "messages": [{"content": query, "role": "user"}],
        "search_source": "baidu_search_v2",
        "resource_type_filter": [{"type": "web", "top_k": max_results}],
    }

    try:
        resp = requests.post(BAIDU_API_URL, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise RuntimeError(f"百度搜索 API 请求失败: {e}")

    data = resp.json()

    results = []
    for ref in data.get("references", []):
        title = (ref.get("title") or "").strip()
        url = (ref.get("url") or "").strip()
        snippet = (ref.get("content") or "")[:500]
        if title and url:
            results.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "source": "baidu",
            })

    return results


def search_tavily(query: str, max_results: int = 8) -> list[dict]:
    """使用 Tavily Search API 搜索，返回 [{title, url, snippet, source}]。"""
    api_key = settings.tavily_api_key
    if not api_key:
        return []  # 未配置时静默跳过，不阻断百度结果

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query,
            max_results=max_results,
            search_depth="basic",
            include_answer=False,
            topic="news",
        )
    except Exception:
        return []  # Tavily 失败时不影响百度结果

    results = []
    for r in response.get("results", []):
        title = (r.get("title") or "").strip()
        url = (r.get("url") or "").strip()
        snippet = (r.get("content") or "")[:500]
        if title and url:
            results.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "source": "tavily",
            })

    return results


def search_multiple_queries(queries: list[str]) -> list[dict]:
    """为多个查询分别搜索 Baidu + Tavily，去重后返回汇总结果，每条标注 source。"""
    all_results = []
    seen_urls = set()

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        for query in queries:
            futures[executor.submit(search_baidu, query, 6)] = query
            futures[executor.submit(search_tavily, query, 6)] = query

        for future in as_completed(futures):
            try:
                results = future.result()
            except Exception:
                continue
            for r in results:
                if r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    all_results.append(r)

    return all_results
