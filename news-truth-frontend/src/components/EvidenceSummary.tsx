import { useState } from "react";
import type { EvidenceSummary as EvidenceSummaryType, EvidenceItem } from "../types";

type Tab = "supporting" | "opposing" | "neutral";

const TABS: { key: Tab; label: string; dot: string; activeColor: string }[] = [
  {
    key: "supporting",
    label: "支持",
    dot: "bg-emerald-500",
    activeColor: "text-emerald-600 border-emerald-500",
  },
  {
    key: "opposing",
    label: "反对",
    dot: "bg-red-500",
    activeColor: "text-red-600 border-red-500",
  },
  {
    key: "neutral",
    label: "中性",
    dot: "bg-gray-400",
    activeColor: "text-gray-700 border-gray-400",
  },
];

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 40);
  }
}

function EvidenceCard({ item, index }: { item: EvidenceItem; index: number }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
      {/* URL 行 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="shrink-0 w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
          {index + 1}
        </span>
        <span className="text-xs text-gray-400">{sourceDomain(item.url)}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 underline truncate ml-auto"
        >
          打开
        </a>
      </div>
      {/* 解释 */}
      <p className="text-xs text-gray-500 leading-relaxed">{item.explanation}</p>
    </div>
  );
}

interface Props {
  evidence: EvidenceSummaryType;
}

export default function EvidenceSummaryView({ evidence }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(
    evidence.supporting.length > 0
      ? "supporting"
      : evidence.opposing.length > 0
        ? "opposing"
        : "neutral",
  );

  const items =
    activeTab === "supporting"
      ? evidence.supporting
      : activeTab === "opposing"
        ? evidence.opposing
        : evidence.neutral;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden max-w-3xl mx-auto">
      {/* 标签栏 */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? tab.activeColor : "text-gray-500 border-transparent"
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${tab.dot} mr-1.5`} />
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">
              {evidence[tab.key].length}
            </span>
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无来源</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <EvidenceCard key={i} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
