import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

type TokenPayload = { sub: string; exp: number };

export function signAccessToken(userId: string) {
  const accessToken = jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
  const { exp } = jwt.decode(accessToken) as TokenPayload;
  return { accessToken, expiresAt: exp * 1000 };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
