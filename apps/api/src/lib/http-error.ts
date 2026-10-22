export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const badRequest = (code = "BAD_REQUEST", message?: string) => new HttpError(400, code, message);
export const unauthorized = (code = "UNAUTHORIZED", message?: string) => new HttpError(401, code, message);
export const forbidden = (code = "FORBIDDEN", message?: string) => new HttpError(403, code, message);
export const notFound = (code = "NOT_FOUND", message?: string) => new HttpError(404, code, message);
export const conflict = (code = "CONFLICT", message?: string) => new HttpError(409, code, message);
