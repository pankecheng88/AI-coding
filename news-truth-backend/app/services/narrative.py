import json

from app.utils.ai import call_qwen_json

SYSTEM_PROMPT = """你是一个专业的新闻传播分析师。你的任务是分析一条新闻在传播过程中产生的"事实版本分枝"——即原始事实被传播者改写后衍生出的不同说法。

## 分析流程
1. 阅读原始新闻文本，提取 **根版本**：新闻最初呈现的核心事实是什么。
2. 阅读每条核查结果，关注 verdict 为 "false" 或 "dubious" 的主张——这些通常代表了传播中出现的变形版本。verdict 为 "true" 的主张属于根版本。
3. 将变形主张归纳为 **分枝版本**：相同或相似的变形合并为一个分枝（比如"3人受伤变成多人伤亡"和"多人受伤"可以合并），不同的变形各自为独立分枝。
4. 每个分枝版本，用一句话描述其事实，再用一句话描述与根版本的关键差异。

## 输出要求
- 根版本：一行中文，概括原文的核心事实
- 分枝版本：最多 5 个，每个包含 description（事实描述）和 diff（与根版本的关键差异）
- 如果所有主张均为 true（无变形），branches 返回空数组
- 用约/可能/疑似标注不确定的信息

返回 JSON：
{
  "root": {
    "description": "根版本核心事实描述",
    "sources": ["url1", "url2"]
  },
  "branches": [
    {
      "description": "变形后的说法",
      "diff": "与根版本的关键差异",
      "sources": ["url3"]
    }
  ]
}

只返回 JSON，不要其他内容。"""


def analyze_narrative(text: str, claims_verdicts: list[dict]) -> dict:
    """分析新闻传播中的事实版本分枝，返回树状结构。"""
    if not claims_verdicts:
        return {
            "root": {"description": text[:200], "sources": []},
            "branches": [],
        }

    claims_text = json.dumps(claims_verdicts, ensure_ascii=False, indent=2)
    user_prompt = (
        f"## 原始新闻\n{text[:3000]}\n\n## 各主张核查结果\n{claims_text}"
    )

    return call_qwen_json(
        model="qwen-max",
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.2,
        max_tokens=4096,
        json_expected_first_char="{",
    )
