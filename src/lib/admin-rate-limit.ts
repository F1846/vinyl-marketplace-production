import { rateLimit, type RateLimitResult } from "@/lib/rate-limit";

const ADMIN_LOGIN_LIMIT = 5;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function rateLimitAdminLogin(ip: string): Promise<RateLimitResult> {
  return rateLimit(`admin-login:${ip}`, ADMIN_LOGIN_LIMIT, ADMIN_LOGIN_WINDOW_MS);
}
