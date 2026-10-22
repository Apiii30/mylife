"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import type { CalEvent } from "@/lib/calendar";

export type EventInput = Omit<CalEvent, "id">;

const KEY = ["events"] as const;

/** Acara yang bersinggungan dengan [from, to) — pengulangan dijabarkan di klien. */
export function useEvents(from: string, to: string) {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: [...KEY, from, to],
    queryFn: () => call<{ events: CalEvent[] }>(`/events?from=${from}&to=${to}`).then((r) => r.events),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

/** Perubahan langsung diterapkan ke semua rentang yang ter-cache, dibatalkan jika gagal. */
function useOptimistic() {
  const client = useQueryClient();
  return {
    async apply(update: (events: CalEvent[]) => CalEvent[]) {
      await client.cancelQueries({ queryKey: KEY });
      const previous = client.getQueriesData<CalEvent[]>({ queryKey: KEY });
      client.setQueriesData<CalEvent[]>({ queryKey: KEY }, (old) => old && update(old));
      return { previous };
    },
    rollback(context?: { previous: [readonly unknown[], CalEvent[] | undefined][] }) {
      context?.previous.forEach(([key, data]) => client.setQueryData(key, data));
    },
    settle: () => client.invalidateQueries({ queryKey: KEY }),
  };
}

export function useCreateEvent() {
  const { call } = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: EventInput) => call<{ event: CalEvent }>("/events", { method: "POST", body }).then((r) => r.event),
    onSuccess: (event) => client.setQueriesData<CalEvent[]>({ queryKey: KEY }, (old) => old && [...old, event]),
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateEvent() {
  const { call } = useApi();
  const optimistic = useOptimistic();
  return useMutation({
    mutationFn: ({ id, ...body }: CalEvent) => call<{ event: CalEvent }>(`/events/${id}`, { method: "PATCH", body }).then((r) => r.event),
    onMutate: (event) => optimistic.apply((events) => events.map((e) => (e.id === event.id ? event : e))),
    onError: (_e, _v, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}

export function useDeleteEvent() {
  const { call } = useApi();
  const optimistic = useOptimistic();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/events/${id}`, { method: "DELETE" }),
    onMutate: (id) => optimistic.apply((events) => events.filter((e) => e.id !== id)),
    onError: (_e, _v, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}
