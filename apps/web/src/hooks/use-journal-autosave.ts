"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { journalKeys, type JournalEntry, type JournalInput, type JournalSummary } from "@/lib/queries/journals";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const DELAY = 900;

/**
 * Simpan otomatis setelah user berhenti mengetik. Perubahan ditampung lalu dikirim
 * berurutan: entri baru dibuat sekali (POST), selanjutnya PATCH ke id yang sama.
 */
export function useJournalAutosave({ id: initialId, date, onCreated }: { id: string | null; date: string; onCreated: (id: string) => void }) {
  const { call } = useApi();
  const client = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>("idle");

  const id = useRef(initialId);
  const dateRef = useRef(date);
  const pending = useRef<JournalInput>({});
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const created = useRef(onCreated);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    dateRef.current = date;
    created.current = onCreated;
  });

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setStatus("saving");

    const run = (async () => {
      try {
        const { entry } = id.current
          ? await call<{ entry: JournalSummary }>(`/journals/${id.current}`, { method: "PATCH", body: patch })
          : await call<{ entry: JournalSummary }>("/journals", { method: "POST", body: { date: dateRef.current, ...patch } });

        if (!id.current) {
          id.current = entry.id;
          created.current(entry.id);
        }
        // Cache entri diperbarui langsung (tanpa refetch) agar membuka ulang menampilkan versi terbaru
        client.setQueryData<JournalEntry>(journalKeys.entry(entry.id), (old) => ({ content: null, ...old, ...entry, ...(patch.content && { content: patch.content }) }));
        client.invalidateQueries({ queryKey: journalKeys.all, predicate: (q) => q.queryKey[1] !== "entry" });
        setStatus(Object.keys(pending.current).length ? "dirty" : "saved");
        return true;
      } catch {
        // Tidak dicoba ulang otomatis — user menekan "coba lagi" atau mengetik lagi
        pending.current = { ...patch, ...pending.current };
        setStatus("error");
        return false;
      }
    })();

    inflight.current = run.then(() => undefined);
    const ok = await run;
    inflight.current = null;
    if (ok && Object.keys(pending.current).length) timer.current = setTimeout(() => flushRef.current(), DELAY);
  }, [call, client]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback(
    (patch: JournalInput) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("dirty");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, DELAY);
    },
    [flush],
  );

  // Simpan sisa perubahan saat halaman ditinggal; peringatkan bila browser ditutup sebelum tersimpan
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || inflight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flush();
    };
  }, [flush]);

  return { status, schedule, flush, id };
}
