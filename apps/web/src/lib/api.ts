export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public fields?: { path: string; message: string }[],
  ) {
    super(code);
  }
}

type ApiOptions = Omit<RequestInit, "body"> & { token?: string; body?: unknown };

/** Pemanggil API Express. Melempar ApiError dengan `code` yang bisa diterjemahkan. */
export async function api<T>(path: string, { token, body, headers, ...init }: ApiOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = res.status === 429 ? "RATE_LIMITED" : (data?.error?.code ?? "UNKNOWN");
    throw new ApiError(res.status, code, data?.error?.fields);
  }
  return data as T;
}

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  currency: string;
  locale: "id" | "en";
  gradeScale: "LETTER_AB" | "PLUS_MINUS";
  notificationsSeenAt: string | null;
  hasPassword?: boolean;
  createdAt: string;
};

export type AuthResponse = { user: ApiUser; accessToken: string; expiresAt: number };
