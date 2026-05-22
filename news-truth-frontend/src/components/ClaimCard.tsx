import { useState } from "react";
import type { VerdictClaim } from "../types";

const VERDICT_STYLE: Record<
  string,
  { label: string; bar: string; badge: string; text: string }
> = {
  true: {
    label: "可信",
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
  },
  false: {
    label: "虚假",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    text: "text-red-700",
  },
  dubious: {
    label: "存疑",
    bar: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
  },
};

function sourceDomain(url: string): string {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return host;
  } catch {
    return url.slice(0, 40);
  }
}

interface Props {
  claim: VerdictClaim;
}

export default function ClaimCard({ claim }: Props) {
  const [expanded, setExpanded] = useState(true);
  const style = VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.dubious;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 左侧色条 + 内容 */}
      <div className="flex">
        <div className={`${style.bar} w-1 shrink-0`} />

        <div className="flex-1 p-4 min-w-0">
          {/* Header：主张 + 判定标签 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-start justify-between gap-3 text-left"
          >
            <p className="text-gray-800 leading-relaxed flex-1">
              <span className="text-xs text-gray-400 mr-1.5 font-mono">
                #{claim.id}
              </span>
              {claim.text}
            </p>
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}
            >
              {style.label}
            </span>
          </button>

          {/* 置信度条 */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${style.bar} transition-all`}
                style={{ width: `${claim.confidence}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {claim.confidence}%
            </span>
          </div>

          {/* 可折叠详情 */}
          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-500 leading-relaxed">
                {claim.evidence}
              </p>

              {claim.sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-400">来源:</span>
                  {claim.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      {sourceDomain(s)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 展开/折叠指示器 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? "收起 ▲" : "展开 ▼"}
          </button>
        </div>
      </div>
    </div>
  );
}
