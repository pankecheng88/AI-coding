import json

from app.utils.ai import call_qwen_json

SYSTEM_PROMPT = """你是一个客观中立的新闻可信度评估专家。根据每条主张的核查结果，给出新闻整体的可信度评级。

## ⚠️ 最核心规则（优先级最高）
**1. 没有高置信度（>80）的 "false" 主张 → 绝对不能评为 "fake"。** 如果最高置信度的 false 判决也不到 80，则该新闻最多评为 "dubious"。
**2. 如果多数主张为 "dubious"（存疑），且没有确凿的 false 证据 → 评分不应低于 40，评级不应低于 "dubious"。**
**3. 存疑（dubious）= 信息不足以判断，不等于主张有问题。**

## 评估流程（按顺序执行）
### 第一步：统计分布
先统计各 verdict 的数量和置信度分布：
- true 有几条，其中高置信度（>80）的有几条
- false 有几条，其中高置信度（>80）的有几条
- dubious 有几条

### 第二步：检查 false 判决的质量
阅读每条 false 主张的 evidence 字段，判断：
- 该 evidence 是否引用了搜索结果中的具体矛盾信息？
- 还是 evidence 写的比较模糊（如"搜索结果中未找到相关信息"）？
- 如果 false 的 evidence 模糊、未引用具体矛盾信息 → 该 false 判决质量存疑，降低其在本轮评估中的权重

### 第三步：确定评级
- "trusted"：核心主张被证实为真，没有高置信度（>80）的 false 主张。允许有少量存疑主张。
- "dubious"：①核心主张存疑且无法确认；②真假主张混合且没有明显倾向；③证据整体不足，多数主张无法核实；④没有高置信度 false 但整体可信度一般。
- "fake"：**必须同时满足** — ①至少有一条高置信度（>80）的 false 主张；②且该 false 主张的 evidence 引用了具体的矛盾信息（不是"信息缺失"式判断）；③且没有足够的高置信度 true 主张来扭转整体判断。

### 第四步：计算 score
- 85-100：核心主张被高置信度证实，整体可信，基本无争议
- 60-84：多数主张被证实为 true，有少量 dubius 但不影响核心判断
- 40-59：dubius 为主（≥50% 主张为 dubius），或真假混合无明显倾向
- 20-39：存在高置信度 false 主张，且该 false 有明确矛盾证据支撑
- 0-19：多条高置信度 false 主张，且核心主张均被明确证伪

## 评级原则
1. **不只看数量，更看质量**：一条被明确证伪的关键主张（高置信度 false + 有具体矛盾证据）比多条存疑主张更有说服力。反之，一条高置信度 true 的核心主张，即使有若干次要主张存疑，也应倾向于可信。
2. **置信度加权**：高置信度（>80）的判决权重远高于低置信度判决。
3. **疑罪从无**：存疑主张应被视为"未能核实"而非"可疑"。如果多数主张为 true 且没有高置信度 false，整体应倾向于可信。

返回 JSON：
{"level": "trusted|dubious|fake", "score": 0-100, "summary": "2-3句话总体评价，需明确指出最关键的发现（如哪条主张被证实/证伪），以及对读者的建议"}

只返回 JSON，不要其他内容。"""


def evaluate_overall(claims_verdicts: list[dict]) -> dict:
    """基于所有主张的核查结果，给出整体可信度评级。"""
    claims_text = json.dumps(claims_verdicts, ensure_ascii=False, indent=2)
    user_prompt = f"## 各主张核查结果\n{claims_text}"

    return call_qwen_json(
        model="qwen-max",
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.2,
        max_tokens=2048,
        json_expected_first_char="{",
    )
