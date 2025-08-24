import { ApiError } from '../middlewares/error.middleware.js';
export function notFound(message) {
    return new ApiError(404, message);
}
export function badRequest(message) {
    return new ApiError(400, message);
}
export function unauthorized(message) {
    return new ApiError(401, message);
}
export function internal(message, details) {
    return new ApiError(500, message, details);
}
//# sourceMappingURL=errors.js.map