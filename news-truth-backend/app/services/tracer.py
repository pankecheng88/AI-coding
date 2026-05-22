from app.utils.ai import call_qwen_json

SYSTEM_PROMPT = """你是一个专业的新闻传播分析师。根据提供的新闻内容和搜索结果，还原该新闻从最初发酵到传播高峰的完整时间线。

要求：
1. 按时间顺序排列关键传播节点
2. 每个节点包含：时间、事件描述、传播平台、来源URL（如有）
3. 至少包含 3 个节点（首发 → 发酵 → 高峰），最多 8 个节点
4. 如果搜索结果不足以精确还原，用"约/可能/疑似"等措辞标注不确定性
5. **⚠️ url 字段必须从搜索结果中逐字精确复制，不得编造、修改或猜测URL。** 如果搜索结果中没有该节点的对应URL，填写 null。

返回 JSON 数组：
[
  {
    "time": "2026-05-13 08:00",
    "event": "事件描述",
    "platform": "微博/微信/抖音/新闻网站等",
    "url": "来源链接或null（必须从搜索结果精确复制）"
  }
]

只返回 JSON 数组，不要其他内容。"""


def _validate_urls(timeline: list[dict], search_results: list[dict]) -> list[dict]:
    """校验时间线中的 URL：不在搜索结果中的视为幻觉，替换为 null。"""
    valid_urls = {r["url"] for r in search_results if r.get("url")}

    for node in timeline:
        url = node.get("url")
        if url and url not in valid_urls:
            node["url"] = None

    return timeline


def trace_spread(text: str, search_results: list[dict]) -> list[dict]:
    """分析新闻传播链，返回时间线。"""
    results_text = "\n\n".join(
        f"[来源{i+1}] {r['title']}\n{r['url']}\n{r['snippet']}"
        for i, r in enumerate(search_results)
    )

    user_prompt = (
        f"## 新闻内容\n{text[:4000]}\n\n## 搜索结果\n{results_text}"
    )

    timeline = call_qwen_json(
        model="qwen-max",
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.3,
        max_tokens=4096,
        json_expected_first_char="[",
    )

    return _validate_urls(timeline, search_results)
