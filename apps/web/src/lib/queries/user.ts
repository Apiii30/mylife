"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import type { ApiUser } from "@/lib/api";
import { financeKeys } from "./finance";

export { useMe } from "./finance";

export type MeUpdate = Partial<Pick<ApiUser, "name" | "currency" | "locale" | "gradeScale" | "notificationsSeenAt">>;

/** Ubah profil/preferensi; cache `me` langsung diperbarui dari respons server. */
export function useUpdateMe() {
  const { call } = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: MeUpdate) => call<{ user: ApiUser }>("/users/me", { method: "PATCH", body }).then((r) => r.user),
    onMutate: (body) => client.setQueryData<ApiUser>(financeKeys.me, (old) => old && { ...old, ...body }),
    onSuccess: (user) => client.setQueryData(financeKeys.me, user),
    onError: () => client.invalidateQueries({ queryKey: financeKeys.me }),
  });
}

export const setMeCache = (client: ReturnType<typeof useQueryClient>, user: ApiUser) => client.setQueryData(financeKeys.me, user);
