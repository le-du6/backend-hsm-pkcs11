import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export class ApiError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
// Basic PKCS#11 error mapping placeholder
function mapError(err) {
    if (err instanceof ApiError)
        return err;
    const message = err?.message || 'Internal Server Error';
    return new ApiError(500, message);
}
export function errorHandler(err, _req, res, _next) {
    const apiErr = mapError(err);
    const payload = { error: apiErr.message };
    if (process.env.NODE_ENV !== 'production' && apiErr.details)
        payload.details = apiErr.details;
    logger.error({ err: apiErr, status: apiErr.status }, 'request_error');
    res.status(apiErr.status).json(payload);
}
//# sourceMappingURL=error.middleware.js.map