import { configureApiBaseUrl, configureSessionExpired } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";

configureSessionExpired(accessToken => {
  const state = useAuthStore.getState();
  // Ignore a late failure from a request made before a newer sign-in.
  if (state.tokens?.access_token === accessToken) state.expireSession();
});

const publicUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";
configureApiBaseUrl(
  typeof window === "undefined"
    ? process.env.NEWFIND_BACKEND_ORIGIN ?? publicUrl
    : publicUrl,
);
