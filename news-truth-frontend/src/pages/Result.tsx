import { useParams } from "react-router-dom";
import Logo from "../components/Logo";
import SearchBox from "../components/SearchBox";
import ProgressBar from "../components/ProgressBar";
import CredibilityBadge from "../components/CredibilityBadge";
import ClaimCard from "../components/ClaimCard";
import TimelineView from "../components/TimelineView";
import NarrativeTreeView from "../components/NarrativeTree";
import EvidenceSummaryView from "../components/EvidenceSummary";
import { useTaskPolling } from "../hooks/useTaskPolling";
import { API_BASE_URL } from "../constants";

const LEVEL_LABEL: Record<string, string> = {
  trusted: "可信",
  dubious: "存疑",
  fake: "虚假",
};

const LEVEL_DOT: Record<string, string> = {
  trusted: "bg-emerald-500",
  dubious: "bg-amber-500",
  fake: "bg-red-500",
};

const SECTION_CLASS =
  "bg-white border border-gray-100 rounded-xl p-5 shadow-sm";

export default function Result() {
  const { taskId } = useParams<{ taskId: string }>();
  const { data, isLoading, error } = useTaskPolling(taskId ?? null);

  const handleNewCheck = async (text: string, url: string) => {
    const res = await fetch(`${API_BASE_URL}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || undefined, url: url || undefined }),
    });
    const result = await res.json();
    window.location.href = `/result/${result.task_id}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Logo />
          <div className="w-full max-w-md">
            <SearchBox onSubmit={handleNewCheck} loading={false} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
            <span className="text-gray-400">加载中...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-500">加载失败: {error.message}</p>
          </div>
        )}

        {data && data.status === "pending" && (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">任务已提交，等待处理...</p>
          </div>
        )}

        {data && data.status === "processing" && data.progress && (
          <div className="max-w-xl mx-auto py-20">
            <ProgressBar progress={data.progress} />
          </div>
        )}

        {data && data.status === "failed" && (
          <div className="text-center py-20">
            <div className="text-red-500 text-lg mb-2">核查失败</div>
            <p className="text-gray-400 text-sm">{data.error}</p>
          </div>
        )}

        {data && data.status === "completed" && data.result && (
          <div className="space-y-5">
            {/* 核查来源 */}
            {data.input_url && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                <span className="text-xs text-gray-400">核查来源</span>
                <a
                  href={data.input_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 truncate mt-0.5"
                >
                  {data.input_url}
                </a>
              </div>
            )}
            {data.input_text && !data.input_url && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                <span className="text-xs text-gray-400">核查文本</span>
                <p className="text-sm text-gray-700 mt-0.5 line-clamp-4 whitespace-pre-wrap">
                  {data.input_text}
                </p>
              </div>
            )}
            {data.input_text && data.input_url && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                <span className="text-xs text-gray-400">核查文本</span>
                <p className="text-sm text-gray-700 mt-0.5 line-clamp-3 whitespace-pre-wrap">
                  {data.input_text}
                </p>
              </div>
            )}

            {/* 快速摘要栏 */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
              <span
                className={`w-3 h-3 rounded-full ${LEVEL_DOT[data.result.credibility_rating.level] ?? "bg-gray-400"}`}
              />
              <span className="text-sm font-medium text-gray-700">
                {LEVEL_LABEL[data.result.credibility_rating.level] ?? "未知"}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                共 {data.result.claims.length} 条主张
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                可信度 {data.result.credibility_rating.score}/100
              </span>
            </div>

            {/* 可信度评级 */}
            <section>
              <CredibilityBadge rating={data.result.credibility_rating} />
            </section>

            {/* 逐条核查 */}
            <section className={SECTION_CLASS}>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-blue-500" />
                逐条核查
              </h2>
              <div className="space-y-2.5">
                {data.result.claims.map((claim) => (
                  <ClaimCard key={claim.id} claim={claim} />
                ))}
              </div>
            </section>

            {/* 传播链 */}
            <section className={SECTION_CLASS}>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-purple-500" />
                传播链还原
              </h2>
              <TimelineView events={data.result.timeline} />
            </section>

            {/* 叙事分枝 */}
            {data.result.narrative_tree && (
              <section className={SECTION_CLASS}>
                <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 rounded bg-orange-500" />
                  事实版本分枝
                </h2>
                <NarrativeTreeView tree={data.result.narrative_tree} />
              </section>
            )}

            {/* 证据汇总 */}
            <section className={SECTION_CLASS}>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-gray-400" />
                证据汇总
              </h2>
              <EvidenceSummaryView evidence={data.result.evidence_summary} />
            </section>
          </div>
        )}
      </main>

      <footer className="py-5 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
        核查结果由 AI 生成，仅供参考。请结合多方信息做出判断。
      </footer>
    </div>
  );
}
