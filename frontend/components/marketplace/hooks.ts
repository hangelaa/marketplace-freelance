"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { marketplace, MarketplaceError, errorMessage } from "@/lib/api/marketplace";

export function useResource<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: MarketplaceError | null; loading: boolean }>({ path: null, data: null, error: null, loading: true });
  const sequence = useRef(0);
  const load = useCallback(async (target: string, request: number, signal?: AbortSignal) => {
    try {
      const data = await marketplace<T>(target, signal ? { signal } : {});
      if (sequence.current === request && !signal?.aborted) setState({ path: target, data, error: null, loading: false });
      return data;
    } catch (reason) {
      if (sequence.current === request && !signal?.aborted) setState({ path: target, data: null, error: reason instanceof MarketplaceError ? reason : new MarketplaceError(errorMessage(reason), 0), loading: false });
      return null;
    }
  }, []);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    if (!path) return null;
    setState(previous => ({ ...previous, loading: true, error: null }));
    return load(path, request);
  }, [path, load]);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    void load(path, ++sequence.current, controller.signal);
    return () => controller.abort();
  }, [path, load]);
  const current = state.path === path;
  return { data: current ? state.data : null, error: current ? state.error : null, loading: path !== null && (!current || state.loading), reload };
}

// Guard a dirty form without inventing draft storage. Actual server saves remain explicit.
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const message = "تغییرات ذخیره نشده‌اند. از این صفحه خارج می‌شوید؟";
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, location.href);
      if (destination.pathname === location.pathname && destination.search === location.search) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopPropagation(); }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [dirty]);
}
