import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export function configureApiBaseUrl(url: string) {
  apiClient.defaults.baseURL = url;
}

let onSessionExpired: ((accessToken: string) => void) | undefined;
export function configureSessionExpired(handler: (accessToken: string) => void) {
  onSessionExpired = handler;
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("eventmind-auth");
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.tokens?.access_token) {
          config.headers.Authorization = `Bearer ${state.tokens.access_token}`;
        }
      }
    } catch { /* Unavailable or damaged browser storage must not break public pages. */ }
  }
  return config;
});

apiClient.interceptors.response.use(response => response, error => {
  const url = error.config?.url ?? "";
  const authorization = error.config?.headers?.Authorization;
  // A failed login or provider exchange is not an expired existing session.
  const publicAuth = /^\/auth\/(?:login|register|social-login|oauth\/|password\/|email\/)/.test(url);
  if (error.response?.status === 401 && !publicAuth && typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    onSessionExpired?.(authorization.slice(7));
  }
  return Promise.reject(error);
});
