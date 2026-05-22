import type { CredibilityRating } from "../types";

const STYLES: Record<
  string,
  { bg: string; text: string; border: string; bar: string; label: string; emoji: string }
> = {
  trusted: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    label: "可信",
    emoji: "✓",
  },
  dubious: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    bar: "bg-amber-500",
    label: "存疑",
    emoji: "?",
  },
  fake: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    bar: "bg-red-500",
    label: "虚假",
    emoji: "✗",
  },
};

interface Props {
  rating: CredibilityRating;
}

export default function CredibilityBadge({ rating }: Props) {
  const style = STYLES[rating.level] ?? STYLES.dubious;

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-xl overflow-hidden max-w-3xl mx-auto`}
    >
      {/* 顶部色条 */}
      <div className={`${style.bar} h-1.5`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* 左侧：评分圆环 */}
          <div className="shrink-0 flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${style.bg} border-2 ${style.border}`}
            >
              <span className={`text-2xl font-bold ${style.text}`}>
                {rating.score}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-1">/100</span>
          </div>

          {/* 中间：标签和总结 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold ${style.text} ${style.bg} border ${style.border}`}
              >
                <span className="text-base">{style.emoji}</span>
                {style.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {rating.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
