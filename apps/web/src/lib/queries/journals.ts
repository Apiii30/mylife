"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/react";
import { useApi } from "@/hooks/use-api";
import type { Mood } from "@/config/moods";

export type JournalSummary = {
  id: string;
  title: string | null;
  excerpt: string | null;
  mood: Mood | null;
  date: string; // YYYY-MM-DD
  wordCount: number;
  createdAt: string;
  updatedAt: string;
};

export type JournalEntry = JournalSummary & { content: JSONContent | null };

export type JournalStats = {
  total: number;
  streak: number;
  writtenToday: boolean;
  words: number;
  monthEntries: number;
  moods: Record<string, Mood>;
};

export type JournalInput = { title?: string | null; content?: JSONContent; mood?: Mood | null; date?: string };

export const journalKeys = {
  all: ["journals"] as const,
  list: (q: string, mood: Mood | null) => ["journals", "list", q, mood] as const,
  latest: ["journals", "latest"] as const,
  stats: (month: string, today: string) => ["journals", "stats", month, today] as const,
  entry: (id: string) => ["journals", "entry", id] as const,
};

export function useJournalList(q: string, mood: Mood | null) {
  const { call, ready } = useApi();
  return useInfiniteQuery({
    queryKey: journalKeys.list(q, mood),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (q) params.set("q", q);
      if (mood) params.set("mood", mood);
      if (pageParam) params.set("cursor", pageParam);
      return call<{ entries: JournalSummary[]; nextCursor: string | null }>(`/journals?${params}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useLatestJournal() {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: journalKeys.latest,
    queryFn: () => call<{ entries: JournalSummary[] }>("/journals?limit=1").then((r) => r.entries[0] ?? null),
    enabled: ready,
  });
}

export function useJournalStats(month: string, today: string) {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: journalKeys.stats(month, today),
    queryFn: () => call<JournalStats>(`/journals/stats?month=${month}&today=${today}`),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useJournal(id: string | null) {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: journalKeys.entry(id ?? ""),
    queryFn: () => call<{ entry: JournalEntry }>(`/journals/${id}`).then((r) => r.entry),
    enabled: ready && Boolean(id),
    staleTime: Infinity, // editor memegang versi terbaru selama halaman terbuka
  });
}

export function useDeleteJournal() {
  const { call } = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/journals/${id}`, { method: "DELETE" }),
    onSettled: () => client.invalidateQueries({ queryKey: journalKeys.all }),
  });
}
