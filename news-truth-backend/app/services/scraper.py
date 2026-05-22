import re

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )
}


def scrape_url(url: str) -> str:
    """抓取网页正文内容，返回纯文本。"""
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding or "utf-8"

    soup = BeautifulSoup(resp.text, "lxml")

    # 移除无意义标签
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    body = soup.find("body")
    if not body:
        return ""

    text = body.get_text(separator="\n")
    # 清理空白行
    lines = (line.strip() for line in text.splitlines())
    chunks = (line for line in lines if line and len(line) > 20)
    clean = "\n".join(chunks)

    # 截断过长的网页，保留前15000字
    if len(clean) > 15000:
        clean = clean[:15000] + "\n...(内容已截断)"

    return clean
