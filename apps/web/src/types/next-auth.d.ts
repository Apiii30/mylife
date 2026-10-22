import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    user: { id: string } & DefaultSession["user"];
  }

  interface User {
    accessToken?: string;
    accessTokenExpires?: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    accessToken?: string;
    accessTokenExpires?: number;
  }
}
