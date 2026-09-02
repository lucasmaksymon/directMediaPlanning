import { auth } from "@/auth";
import { NextResponse } from "next/server";

function redirectToLogin(req: { url: string; nextUrl: URL }) {
  const login = new URL("/login", req.url);
  const callback = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (callback !== "/login") {
    login.searchParams.set("callbackUrl", callback);
  }
  return NextResponse.redirect(login);
}

function isCatalogPath(pathname: string) {
  return (
    pathname.startsWith("/explorar") ||
    pathname.startsWith("/api/explore") ||
    pathname === "/api/ai/audience"
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  if (isCatalogPath(pathname) && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    return redirectToLogin(req);
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
    "/explorar",
    "/explorar/:path*",
    "/inicio",
    "/inicio/:path*",
    "/api/explore/:path*",
    "/api/ai/audience",
  ],
};
