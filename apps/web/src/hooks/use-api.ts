"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Options = Parameters<typeof api>[1];

/** `api()` yang otomatis membawa token sesi. Token kedaluwarsa (401) → keluar & login ulang. */
export function useApi() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const call = useCallback(
    async <T,>(path: string, options: Options = {}) => {
      try {
        return await api<T>(path, { ...options, token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) signOut({ redirectTo: "/login" });
        throw error;
      }
    },
    [token],
  );

  return { call, ready: Boolean(token) };
}
