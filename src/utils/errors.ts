import { ApiError } from '../middlewares/error.middleware.js';

export function notFound(message: string): ApiError {
  return new ApiError(404, message);
}
export function badRequest(message: string): ApiError {
  return new ApiError(400, message);
}
export function unauthorized(message: string): ApiError {
  return new ApiError(401, message);
}
export function internal(message: string, details?: any): ApiError {
  return new ApiError(500, message, details);
}
