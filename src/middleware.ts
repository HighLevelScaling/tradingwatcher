import { NextRequest, NextResponse } from "next/server"

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/politicians",
  "/institutions",
  "/traders",
  "/alerts",
  "/watchlist",
  "/account",
]

// Rate limiting: track requests per IP in memory (use Upstash Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
    const allowed = rateLimit(ip, 60, 60_000) // 60 req/min per IP on API
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      )
    }

    // Block cron routes unless called with secret
    if (pathname.startsWith("/api/cron/")) {
      const cronSecret = request.headers.get("x-cron-secret")
      if (cronSecret !== process.env.CRON_SECRET) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }
    }

    // Block webhook spoofing — Stripe signature verified inside handler
    // Just ensure Content-Type is correct for webhook endpoint
    if (pathname === "/api/webhooks/stripe" && request.method === "POST") {
      const contentType = request.headers.get("content-type") || ""
      if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
        return new NextResponse(JSON.stringify({ error: "Invalid content type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }
    }
  }

  // Auth guard for protected dashboard routes
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (isProtected) {
    // Check for session cookie (NextAuth sets next-auth.session-token)
    const sessionToken =
      request.cookies.get("next-auth.session-token") ||
      request.cookies.get("__Secure-next-auth.session-token")

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === "/login" || pathname === "/register") {
    const sessionToken =
      request.cookies.get("next-auth.session-token") ||
      request.cookies.get("__Secure-next-auth.session-token")

    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
