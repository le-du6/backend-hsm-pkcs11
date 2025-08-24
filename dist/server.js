import 'dotenv/config';
import pino from 'pino';
import app from './app.js';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const basePort = Number(process.env.PORT || 3000);
function start(onPort, attempt = 0) {
    const server = app.listen(onPort, () => {
        if (attempt > 0)
            logger.warn({ requested: basePort, port: onPort }, 'Port fallback appliqué');
        logger.info({ port: onPort }, 'Server started');
    });
    server.on('error', (err) => {
        if (err?.code === 'EADDRINUSE' && attempt < 10) {
            const next = onPort + 1;
            logger.warn({ port: onPort, next }, 'Port occupé, tentative sur le suivant');
            setTimeout(() => start(next, attempt + 1), 200);
        }
        else {
            logger.error({ err }, 'Echec démarrage serveur');
            process.exit(1);
        }
    });
}
start(basePort);
//# sourceMappingURL=server.js.map