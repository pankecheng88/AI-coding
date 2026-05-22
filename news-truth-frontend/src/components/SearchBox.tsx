import { useState } from "react";

interface Props {
  onSubmit: (text: string, url: string) => void;
  loading: boolean;
}

export default function SearchBox({ onSubmit, loading }: Props) {
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    onSubmit(mode === "text" ? text : "", mode === "url" ? url : "");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 justify-center">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            mode === "text"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          粘贴文本
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            mode === "url"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          输入链接
        </button>
      </div>

      {mode === "text" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="在此粘贴新闻文本..."
          rows={5}
          className="w-full p-4 border border-gray-300 rounded-xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
        />
      ) : (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="在此粘贴新闻链接..."
          className="w-full p-4 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
        />
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 px-8 py-3 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {loading ? "核查中..." : "开始核查"}
      </button>
    </form>
  );
}
