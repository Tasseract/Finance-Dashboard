"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStore } from "./store";
import type { NewTransaction, Transaction } from "./types";

export function useTransactions() {
  const store = useMemo(() => getStore(), []);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRows(await store.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load transactions");
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    store
      .list()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load transactions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const add = useCallback(
    async (input: NewTransaction) => {
      const optimistic: Transaction = {
        ...input,
        id: `tmp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setRows((r) => [optimistic, ...r]);
      try {
        const saved = await store.add(input);
        setRows((r) => r.map((x) => (x.id === optimistic.id ? saved : x)));
        setError(null);
      } catch (e) {
        setRows((r) => r.filter((x) => x.id !== optimistic.id));
        setError(e instanceof Error ? e.message : "Could not save transaction");
        throw e;
      }
    },
    [store],
  );

  const addMany = useCallback(
    async (inputs: NewTransaction[]) => {
      for (const i of inputs) await store.add(i);
      await refresh();
    },
    [store, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = rows;
      setRows((r) => r.filter((x) => x.id !== id));
      try {
        await store.remove(id);
      } catch (e) {
        setRows(prev);
        setError(e instanceof Error ? e.message : "Could not delete transaction");
      }
    },
    [store, rows],
  );

  const clear = useCallback(async () => {
    await store.clear();
    setRows([]);
  }, [store]);

  return { rows, loading, error, source: store.source, add, addMany, remove, clear, refresh };
}
