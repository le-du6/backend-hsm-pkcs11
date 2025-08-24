// Custom ambient types will go here (e.g., augmentation for requestId)
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}
