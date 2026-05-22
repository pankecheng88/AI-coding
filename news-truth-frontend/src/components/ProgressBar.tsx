import type { ProgressInfo } from "../types";

const STEPS: { key: string; label: string }[] = [
  { key: "scraping", label: "抓取网页" },
  { key: "extracting", label: "提取主张" },
  { key: "searching", label: "搜索证据" },
  { key: "verifying", label: "核查事实" },
  { key: "analyzing", label: "综合分析" },
];

interface Props {
  progress: ProgressInfo;
}

export default function ProgressBar({ progress }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.key === progress.step);

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center flex-1">
            <div
              className={`w-3 h-3 rounded-full mb-1 ${
                i < currentIdx
                  ? "bg-green-500"
                  : i === currentIdx
                  ? "bg-blue-500 animate-pulse"
                  : "bg-gray-200"
              }`}
            />
            <span className="text-xs text-gray-400 hidden sm:block">
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-500 mt-3">
        {progress.message}
      </p>
    </div>
  );
}
