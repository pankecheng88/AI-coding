import type { TimelineEvent } from "../types";

const PLATFORM_DOT: Record<string, string> = {
  "微博": "bg-red-400",
  "微信": "bg-green-500",
  "抖音": "bg-pink-500",
  "快手": "bg-orange-500",
  "知乎": "bg-blue-500",
  "百度": "bg-indigo-400",
  "头条": "bg-rose-500",
  "新闻网站": "bg-sky-500",
  "新闻": "bg-sky-500",
  "电视": "bg-violet-500",
  "官方": "bg-cyan-500",
};

function dotColor(platform: string): string {
  for (const [key, cls] of Object.entries(PLATFORM_DOT)) {
    if (platform.includes(key)) return cls;
  }
  return "bg-gray-400";
}

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 40);
  }
}

interface Props {
  events: TimelineEvent[];
}

export default function TimelineView({ events }: Props) {
  if (!events.length) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative">
        {/* 主时间线 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

        <div className="space-y-8">
          {events.map((event, i) => (
            <div key={i} className="relative pl-8">
              {/* 节点 */}
              <div className="absolute left-0 top-1.5 flex items-center justify-center">
                {i === 0 ? (
                  <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-300 bg-white" />
                ) : (
                  <div className="w-[15px] h-[15px] rounded-full border border-gray-200 bg-white">
                    <div className="w-[5px] h-[5px] rounded-full bg-gray-300 m-auto mt-[4px]" />
                  </div>
                )}
              </div>

              {/* 内容区 */}
              <div>
                {/* 第一行：时间 + 平台 */}
                <div className="flex items-center gap-3 mb-1">
                  <time className="text-xs text-gray-400 tabular-nums">
                    {event.time}
                  </time>
                  <span className="flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor(event.platform)}`}
                    />
                    <span className="text-xs text-gray-500">
                      {event.platform}
                    </span>
                  </span>
                </div>

                {/* 第二行：事件描述 */}
                <p className="text-sm text-gray-800 leading-relaxed mb-0.5">
                  {event.event}
                </p>

                {/* 第三行：来源链接 */}
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                  >
                    <span className="truncate max-w-[280px]">
                      {sourceDomain(event.url)}
                    </span>
                    <svg
                      width="10" height="10" viewBox="0 0 10 10"
                      fill="none" stroke="currentColor" strokeWidth="1.2"
                      className="shrink-0"
                    >
                      <path d="M4 2h4v4M9 1L4.5 5.5" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
