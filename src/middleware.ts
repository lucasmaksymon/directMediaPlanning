import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/provider")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "provider" && role !== "admin") return NextResponse.redirect(new URL("/", req.url));
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
  matcher: ["/provider/:path*", "/advertiser/:path*", "/admin/:path*", "/agency/:path*"],
};
