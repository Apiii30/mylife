import { NextResponse } from "next/server";
import { auth } from "@/auth";

const AUTH_PAGES = ["/login", "/register"];

// Pemeriksaan cepat (optimistic): dashboard butuh login, halaman auth hanya untuk tamu
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const loggedIn = Boolean(req.auth);

  if (pathname.startsWith("/dashboard") && !loggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
