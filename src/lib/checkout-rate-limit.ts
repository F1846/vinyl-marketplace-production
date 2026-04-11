import { NextRequest, NextResponse } from "next/server";
import { getRequestIp, rateLimit, type RateLimitResult } from "@/lib/rate-limit";

const CHECKOUT_ATTEMPT_LIMIT = 5;
const CHECKOUT_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_RATE_LIMIT_MESSAGE =
  "Too many checkout attempts. Please try again shortly.";
const CHECKOUT_COMPLETION_RATE_LIMIT_MESSAGE =
  "Too many checkout completion attempts. Please try again shortly.";

function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}

async function enforceRateLimit(
  bucket: string,
  message: string
): Promise<{
  headers: Record<string, string>;
  response: NextResponse | null;
}> {
  const result = await rateLimit(bucket, CHECKOUT_ATTEMPT_LIMIT, CHECKOUT_ATTEMPT_WINDOW_MS);
  const headers = createRateLimitHeaders(result);

  if (result.success) {
    return { headers, response: null };
  }

  return {
    headers,
    response: NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message,
        },
      },
      {
        status: 429,
        headers,
      }
    ),
  };
}

export async function enforceCheckoutRateLimit(request: NextRequest): Promise<{
  headers: Record<string, string>;
  response: NextResponse | null;
}> {
  return enforceRateLimit(
    `checkout-create:${getRequestIp(request)}`,
    CHECKOUT_RATE_LIMIT_MESSAGE
  );
}

export async function enforceCheckoutCompletionRateLimit(
  request: NextRequest
): Promise<{
  headers: Record<string, string>;
  response: NextResponse | null;
}> {
  return enforceRateLimit(
    `checkout-complete:${getRequestIp(request)}`,
    CHECKOUT_COMPLETION_RATE_LIMIT_MESSAGE
  );
}
