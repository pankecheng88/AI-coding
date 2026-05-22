// Docker/nginx 模式下用相对路径；开发模式下设为 http://localhost:8000/api
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
