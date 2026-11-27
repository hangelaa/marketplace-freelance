"use client";
import { ErrorState } from "@/components/marketplace/primitives";
export default function WorkspaceError({ reset }: { reset: () => void }) { return <ErrorState error={{ message: "نمایش فضای کار انجام نشد. دوباره تلاش کنید." }} retry={reset} />; }
