import { proxyAuth } from "@/lib/auth/proxy";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function handle(request: Request, context: { params: Promise<{ action: string }> }) {
  return proxyAuth(request, (await context.params).action);
}
export { handle as GET, handle as POST };
