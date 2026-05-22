from app.utils.ai import call_qwen_json

SYSTEM_PROMPT = """你是一个专业的新闻事实提取器。你的任务是从给定的新闻文本中提取所有可验证的事实主张。

要求：
1. 每个主张必须是可验证的具体事实陈述（谁、什么时候、在哪里、做了什么、数据多少等）
2. 忽略观点、评论、形容词堆砌等无法验证的内容
3. 每个主张尽量独立完整
4. 返回 JSON 数组，每个元素包含 id(序号) 和 text(主张文本)
5. 只返回 JSON，不要其他内容

示例输出格式：
[{"id": 1, "text": "2026年5月14日，上海浦东新区发生一起交通事故，造成3人受伤"}, {"id": 2, "text": "涉事车辆为特斯拉Model Y"}]
"""


def extract_claims(text: str) -> list[dict]:
    """从新闻文本中提取事实主张列表。"""
    if len(text) > 8000:
        text = text[:8000]

    return call_qwen_json(
        model="qwen-max",
        system_prompt=SYSTEM_PROMPT,
        user_prompt=text,
        temperature=0.1,
        max_tokens=4096,
        json_expected_first_char="[",
    )
