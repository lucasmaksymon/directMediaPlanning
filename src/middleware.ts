import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

function redirectToLogin(req: { url: string; nextUrl: URL }) {
  const login = new URL("/login", req.url);
  const callback = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (callback !== "/login") {
    login.searchParams.set("callbackUrl", callback);
  }
  return NextResponse.redirect(login);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/api/ai")) {
    const limited = rateLimit(clientKey(req, pathname.split("/")[1] ?? "auth"), 30, 60_000);
    if (!limited.ok) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
      }
      return new NextResponse("Demasiados intentos. Probá de nuevo en un minuto.", { status: 429 });
    }
  }

  if (pathname.startsWith("/inicio") && !session) {
    return redirectToLogin(req);
  }

  if (pathname.startsWith("/provider")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "provider" && role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/backoffice")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/advertiser")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "advertiser" && role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/agency")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "agency" && role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/provider/:path*",
    "/advertiser/:path*",
    "/admin",
    "/admin/:path*",
    "/backoffice",
    "/backoffice/:path*",
    "/agency/:path*",
    "/inicio",
    "/inicio/:path*",
    "/login",
    "/login/:path*",
    "/register",
    "/register/:path*",
    "/api/ai/:path*",
  ],
};
