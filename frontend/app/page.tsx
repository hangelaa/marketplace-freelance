import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LandingPage, type CategoryState } from "@/components/marketing/landing-page";
import { getSession } from "@/lib/auth/server";
import { djangoOrigin } from "@/lib/auth/proxy";

export const metadata: Metadata = {
  title: "پیوند | از یک ایده تا یک همکاری",
  description: "برای پروژه‌تان همکار پیدا کنید یا با مهارت‌تان مسیر تازه‌ای بسازید. شروع همکاری در پیوند.",
};

async function loadCategories(): Promise<CategoryState> {
  try {
    const jar = await cookies();
    const response = await fetch(`${djangoOrigin()}/api/categories/`, {
      headers: { Cookie: jar.toString(), Accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { status: "error" };
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) {
      return { status: "error" };
    }
    const categories: { id: number; name: string }[] = [];
    const ids = new Set<number>();
    for (const item of data.results) {
      if (!item || typeof item !== "object" || !Number.isSafeInteger(item.id) || item.id <= 0 ||
          typeof item.name !== "string" || !item.name.trim() || ids.has(item.id)) {
        return { status: "error" };
      }
      ids.add(item.id);
      categories.push({ id: item.id, name: item.name });
    }
    return { status: "ready", categories };
  } catch {
    return { status: "error" };
  }
}

export default async function Home() {
  const session = await getSession();
  // The catalog is protected. Never request it for an anonymous or unverified session.
  const categories: CategoryState = session.status === "authenticated"
    ? await loadCategories()
    : { status: session.status === "anonymous" ? "anonymous" : "session-unavailable" };
  return <LandingPage authenticated={session.status === "authenticated"} categories={categories} />;
}
