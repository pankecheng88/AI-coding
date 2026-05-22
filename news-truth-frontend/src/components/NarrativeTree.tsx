import type { NarrativeTree as NarrativeTreeType } from "../types";

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 30);
  }
}

interface Props {
  tree: NarrativeTreeType;
}

export default function NarrativeTreeView({ tree }: Props) {
  const { root, branches } = tree;

  return (
    <div className="max-w-4xl mx-auto overflow-x-auto">
      {/* 横向布局 */}
      <div className="flex items-start min-w-fit py-2">
        {/* ──────── 根节点 ──────── */}
        <div className="shrink-0 w-[240px]">
          <div className="border border-gray-200 rounded-lg px-4 py-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              原始版本
            </span>
            <p className="text-sm text-gray-800 mt-1.5 leading-relaxed">
              {root.description}
            </p>
            {root.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                {root.sources.slice(0, 2).map((s, i) => (
                  <a
                    key={i}
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-gray-400 hover:text-gray-600 truncate transition-colors"
                  >
                    {sourceDomain(s)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ──────── 连接区 + 分枝 ──────── */}
        <div className="flex-1 min-w-0">
          {branches.length === 0 ? (
            <div className="flex items-center pl-6 h-full">
              <svg width="40" height="20" className="shrink-0">
                <line
                  x1="0" y1="10" x2="30" y2="10"
                  stroke="#e5e7eb" strokeWidth="1"
                />
              </svg>
              <span className="text-sm text-gray-400">无叙事分枝</span>
            </div>
          ) : (
            <div className="pl-0">
              {branches.map((branch, i) => {
                const isLast = i === branches.length - 1;
                const isSingle = branches.length === 1;
                // 计算每条分枝的 SVG 连接线参数
                const y = isSingle ? 44 : 44 + i * 120;
                const yRoot = isSingle ? 44 : 60;
                const lineH = 50; // 水平线长度

                return (
                  <div
                    key={i}
                    className="flex items-start"
                    style={{ minHeight: isSingle ? 88 : 120 }}
                  >
                    {/* SVG 连接线 */}
                    <svg
                      width="60" height={isSingle ? 88 : 120}
                      className="shrink-0"
                      style={{ marginTop: -8 }}
                    >
                      {/* 从根节点出来的水平线 */}
                      {i === 0 && (
                        <line
                          x1="0" y1={yRoot} x2={lineH - 10} y2={yRoot}
                          stroke="#e5e7eb" strokeWidth="1"
                        />
                      )}
                      {/* 垂直线连接所有分枝 */}
                      {branches.length > 1 && !isLast && (
                        <line
                          x1={lineH - 10} y1={yRoot} x2={lineH - 10} y2={yRoot + (branches.length - 1) * 120}
                          stroke="#e5e7eb" strokeWidth="1"
                        />
                      )}
                      {branches.length > 1 && isLast && (
                        <line
                          x1={lineH - 10} y1={yRoot} x2={lineH - 10} y2={yRoot + (branches.length - 1) * 120}
                          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2 3"
                        />
                      )}
                      {/* 当前分枝的水平连接 */}
                      {branches.length > 1 && (
                        <line
                          x1={lineH - 10} y1={yRoot + i * 120} x2={lineH - 10} y2={yRoot + i * 120}
                          stroke="transparent" strokeWidth="1"
                        />
                      )}
                      {/* 贝塞尔曲线：从竖线弯到节点 */}
                      <path
                        d={`M ${lineH - 10} ${yRoot + i * 120} C ${lineH + 5} ${yRoot + i * 120}, ${lineH + 5} ${y + 20}, ${lineH + 15} ${y + 20}`}
                        stroke="#e5e7eb" strokeWidth="1" fill="none"
                      />
                    </svg>

                    {/* 分枝内容 */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* 分枝节点卡片 */}
                      <div className="border border-gray-200 rounded-lg px-4 py-3 flex-1 min-w-0 max-w-[280px]">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                          变形版本 {i + 1}
                        </span>
                        <p className="text-sm text-gray-800 mt-1.5 leading-relaxed">
                          {branch.description}
                        </p>
                        {branch.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            {branch.sources.slice(0, 2).map((s, j) => (
                              <a
                                key={j}
                                href={s}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-gray-400 hover:text-gray-600 truncate transition-colors"
                              >
                                {sourceDomain(s)}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 差异标注 */}
                      {branch.diff && (
                        <div className="shrink-0 w-[200px] border-l-2 border-gray-200 pl-3 py-1">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            差异
                          </span>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {branch.diff}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
