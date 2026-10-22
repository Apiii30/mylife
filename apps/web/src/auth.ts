import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/i18n/config";
import { api, ApiError, type AuthResponse } from "@/lib/api";

/** Membawa kode error dari API (mis. INVALID_CREDENTIALS) ke form login. */
class ApiSignInError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

const internalHeaders = { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" };

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        try {
          const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
          const res = await api<AuthResponse>("/auth/login", {
            method: "POST",
            headers: { ...internalHeaders, ...(clientIp && { "x-client-ip": clientIp }) },
            body: { email: credentials.email, password: credentials.password },
          });
          return { ...res.user, accessToken: res.accessToken, accessTokenExpires: res.expiresAt };
        } catch (error) {
          throw new ApiSignInError(error instanceof ApiError ? error.code : "UNKNOWN");
        }
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Hanya terima akun Google dengan email terverifikasi
      if (account?.provider === "google") return Boolean(profile?.email_verified);
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "google" && token.email) {
        const locale = (await cookies()).get(LOCALE_COOKIE)?.value;
        const res = await api<AuthResponse>("/auth/oauth", {
          method: "POST",
          headers: internalHeaders,
          body: { email: token.email, name: token.name ?? token.email.split("@")[0], image: token.picture, locale },
        });
        token.uid = res.user.id;
        token.name = res.user.name;
        token.picture = res.user.image;
        token.accessToken = res.accessToken;
        token.accessTokenExpires = res.expiresAt;
      } else if (user) {
        token.uid = user.id;
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessTokenExpires;
      }

      // Dipanggil via useSession().update() setelah user mengubah profil
      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name;
        // `image: null` berarti foto profil dihapus — jangan jatuh ke nilai lama
        if ("image" in session.user) token.picture = session.user.image;
      }

      // Token API kedaluwarsa → akhiri sesi agar user login ulang
      if (token.accessTokenExpires && Date.now() > token.accessTokenExpires) return null;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid ?? "";
      session.accessToken = token.accessToken ?? "";
      return session;
    },
  },
});
