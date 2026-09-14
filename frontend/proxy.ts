import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const protectedRoutes = ["/admin", "/staff"];
const publicRoutes = ["/login"];
const API_EXCLUDED = ["/api", "/_next", "/favicon.ico"];

function isPublic(pathname: string) {
  return publicRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

function isProtected(pathname: string) {
  return protectedRoutes.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}

function isExcluded(pathname: string) {
  return API_EXCLUDED.some(
    (p) =>
      pathname.startsWith(p) ||
      pathname.endsWith(".svg") ||
      pathname.endsWith(".ico") ||
      pathname.endsWith(".png"),
  );
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isExcluded(pathname)) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  const session = await verifySessionToken(token);

  if (isProtected(pathname) && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublic(pathname) && session) {
    const redirectPath =
      session.roleCode === "ADMIN" ? "/admin" : "/staff";
    return NextResponse.redirect(new URL(redirectPath, req.nextUrl));
  }

  if (session) {
    const isStaff = pathname.startsWith("/staff");
    const isAdmin = pathname.startsWith("/admin");
    if (isStaff && session.roleCode !== "STAFF") {
      return NextResponse.redirect(
        new URL(
          session.roleCode === "ADMIN" ? "/admin" : "/login",
          req.nextUrl,
        ),
      );
    }
    if (isAdmin && session.roleCode !== "ADMIN") {
      return NextResponse.redirect(
        new URL(
          session.roleCode === "STAFF" ? "/staff" : "/login",
          req.nextUrl,
        ),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};