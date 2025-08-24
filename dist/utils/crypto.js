import { createHash } from 'node:crypto';
export function sha256(data) {
    return createHash('sha256').update(data).digest();
}
//# sourceMappingURL=crypto.js.map