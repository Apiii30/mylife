"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import type { ApiUser } from "@/lib/api";
import { formatMoney } from "@/lib/format";

// ─── Tipe ──────────────────────────────────────────────────

export type TxType = "INCOME" | "EXPENSE";

export type Category = { id: string; name: string; kind: TxType | "TASK"; color: string; icon: string | null };

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string | null;
  category: Pick<Category, "id" | "name" | "color" | "icon"> | null;
};

export type MonthTotals = { month: string; income: number; expense: number; balance: number };

export type FinanceSummary = {
  month: string;
  totals: MonthTotals;
  previous: MonthTotals | null;
  monthly: { month: string; income: number; expense: number }[];
  byCategory: { categoryId: string | null; name: string | null; color: string; icon: string | null; total: number }[];
  daily: { date: string; balance: number }[];
};

export type TransactionInput = {
  type: TxType;
  amount: number;
  date: string;
  categoryId: string | null;
  note: string | null;
};

export const financeKeys = {
  me: ["me"] as const,
  categories: (kind?: string) => ["categories", kind ?? "all"] as const,
  transactions: (month: string, filters: object = {}) => ["transactions", month, filters] as const,
  summary: (month: string, months: number) => ["finance-summary", month, months] as const,
};

// ─── Query ─────────────────────────────────────────────────

export function useMe() {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: financeKeys.me,
    queryFn: () => call<{ user: ApiUser }>("/users/me").then((r) => r.user),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useCategories(kind?: TxType | "TASK") {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: financeKeys.categories(kind),
    queryFn: () => call<{ categories: Category[] }>(`/categories${kind ? `?kind=${kind}` : ""}`).then((r) => r.categories),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useTransactions(month: string, filters: { type?: TxType; q?: string } = {}) {
  const { call, ready } = useApi();
  const params = new URLSearchParams({ month });
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);
  return useQuery({
    queryKey: financeKeys.transactions(month, filters),
    queryFn: () => call<{ transactions: Transaction[] }>(`/transactions?${params}`).then((r) => r.transactions),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useFinanceSummary(month: string, months = 6) {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: financeKeys.summary(month, months),
    queryFn: () => call<FinanceSummary>(`/finance/summary?month=${month}&months=${months}`),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutasi ────────────────────────────────────────────────

function useInvalidateFinance() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["transactions"] }),
      client.invalidateQueries({ queryKey: ["finance-summary"] }),
    ]);
}

export function useSaveTransaction() {
  const { call } = useApi();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...body }: TransactionInput & { id?: string }) =>
      call<{ transaction: Transaction }>(id ? `/transactions/${id}` : "/transactions", {
        method: id ? "PATCH" : "POST",
        body,
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const { call } = useApi();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateCategory() {
  const { call } = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; kind: TxType | "TASK"; color: string; icon?: string }) =>
      call<{ category: Category }>("/categories", { method: "POST", body }).then((r) => r.category),
    onSuccess: () => client.invalidateQueries({ queryKey: ["categories"] }),
  });
}

/** Kategori dipakai di transaksi, tugas, & grafik — semuanya disegarkan setelah diubah. */
function useInvalidateCategoryUsers() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [["categories"], ["transactions"], ["finance-summary"], ["tasks"]].map((queryKey) => client.invalidateQueries({ queryKey })),
    );
}

export function useUpdateCategory() {
  const { call } = useApi();
  const invalidate = useInvalidateCategoryUsers();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; color?: string; icon?: string }) =>
      call<{ category: Category }>(`/categories/${id}`, { method: "PATCH", body }).then((r) => r.category),
    onSettled: invalidate,
  });
}

export function useDeleteCategory() {
  const { call } = useApi();
  const invalidate = useInvalidateCategoryUsers();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/categories/${id}`, { method: "DELETE" }),
    onSettled: invalidate,
  });
}

// ─── Format uang sesuai mata uang user ─────────────────────

export function useMoney() {
  const locale = useLocale();
  const { data: me } = useMe();
  const currency = me?.currency ?? "IDR";

  const money = useCallback((n: number) => formatMoney(n, currency, locale), [currency, locale]);
  const compact = useCallback(
    (n: number) =>
      new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n),
    [currency, locale],
  );

  return { money, compact, currency };
}
