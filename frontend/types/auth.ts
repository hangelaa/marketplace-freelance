export interface AuthUser { email: string; name: string }
export type SessionResult = { status: "authenticated"; user: AuthUser } | { status: "anonymous" } | { status: "unavailable" };
