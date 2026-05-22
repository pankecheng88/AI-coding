import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import SearchBox from "../components/SearchBox";
import { API_BASE_URL } from "../constants";
import type { TaskResponse } from "../types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (text: string, url: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || undefined, url: url || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "提交失败");
      }

      const data: TaskResponse = await res.json();
      navigate(`/result/${data.task_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-6">
        <Logo />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
          新闻求真
        </h1>
        <p className="text-gray-500 mb-8 text-sm">
          事实核查与新闻溯源，一秒识别真假新闻
        </p>

        <SearchBox onSubmit={handleSubmit} loading={loading} />

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm max-w-2xl w-full">
            {error}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        核查结果由 AI 生成，仅供参考。请结合多方信息做出判断。
      </footer>
    </div>
  );
}
