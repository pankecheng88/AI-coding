import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../constants";
import type { TaskStatus } from "../types";

async function fetchTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await fetch(`${API_BASE_URL}/task/${taskId}`);
  if (!res.ok) {
    throw new Error("获取任务状态失败");
  }
  return res.json();
}

export function useTaskPolling(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed") return false;
      return 2000;
    },
    staleTime: 1000,
  });
}
