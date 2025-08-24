import pkcs11 from 'pkcs11js';
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { internal, unauthorized } from '../utils/errors.js';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
class PKCS11Service {
    static _instance;
    pkcs11 = null;
    moduleLoaded = false;
    slot = null;
    slotId = null;
    initialized = false;
    tokenLabel;
    pin;
    static get instance() {
        if (!this._instance)
            this._instance = new PKCS11Service();
        return this._instance;
    }
    init() {
        if (this.initialized)
            return;
        const modulePath = this.resolveModulePath();
        this.ensureSoftHsmConfig();
        this.tokenLabel = process.env.PKCS11_TOKEN_LABEL;
        this.pin = process.env.PKCS11_PIN;
        if (!this.tokenLabel)
            throw internal('PKCS11_TOKEN_LABEL manquant');
        if (!this.pin)
            throw internal('PKCS11_PIN manquant');
        this.pkcs11 = new pkcs11.PKCS11();
        try {
            this.pkcs11.load(modulePath);
            this.pkcs11.C_Initialize();
            this.moduleLoaded = true;
            this.findSlot();
            this.initialized = true;
            logger.info({ modulePath, slotId: this.slotId, tokenLabel: this.tokenLabel }, 'pkcs11_initialized');
            process.once('exit', () => this.finalize());
            process.once('SIGINT', () => {
                this.finalize();
                process.exit(0);
            });
        }
        catch (err) {
            throw internal('Echec initialisation PKCS#11', err?.message || err);
        }
    }
    ensureSoftHsmConfig() {
        // SoftHSM nécessite un fichier de config pointant vers un storage
        // Si SOFTHSM2_CONF est vide, créer ./softhsm/softhsm2.local.conf
        if (!process.env.SOFTHSM2_CONF || !process.env.SOFTHSM2_CONF.trim()) {
            const baseDir = './softhsm-store';
            fs.mkdirSync(baseDir, { recursive: true });
            const confPath = `${baseDir}/softhsm2.local.conf`;
            const tokenDir = `${baseDir}/tokens`;
            fs.mkdirSync(tokenDir, { recursive: true });
            const content = `directories.tokendir = ${tokenDir}\nobjectstore.backend = file\nlog.level = ERROR\n`;
            try {
                fs.writeFileSync(confPath, content, { flag: 'w' });
            }
            catch {
                /* ignore */
            }
            process.env.SOFTHSM2_CONF = confPath;
            logger.warn({ confPath }, 'softHsm_config_auto_generated');
        }
    }
    ensureTokenInitialized() {
        // Optionnel: vérifier si au moins un slot avec token; sinon le script init doit être lancé.
    }
    finalize() {
        if (this.pkcs11 && this.moduleLoaded) {
            try {
                this.pkcs11.C_Finalize();
            }
            catch {
                /* ignore */
            }
            this.moduleLoaded = false;
        }
    }
    commonModulePaths() {
        const envPath = process.env.PKCS11_MODULE_PATH || '';
        const discovered = this.discoverHomebrewPaths();
        // Liste statique de fallback
        const statics = [
            '/opt/homebrew/lib/softhsm/libsofthsm2.so',
            '/opt/homebrew/lib/softhsm/libsofthsm2.dylib',
            '/usr/lib/softhsm/libsofthsm2.so',
            '/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so',
            '/usr/local/lib/softhsm/libsofthsm2.so',
        ];
        const ordered = [envPath, ...discovered, ...statics].filter(Boolean);
        // déduplication en conservant l'ordre
        const seen = new Set();
        return ordered.filter((p) => {
            if (seen.has(p))
                return false;
            seen.add(p);
            return true;
        });
    }
    discoverHomebrewPaths() {
        const paths = [];
        try {
            const base = '/opt/homebrew/Cellar/softhsm';
            if (!fs.existsSync(base))
                return paths;
            for (const ver of fs.readdirSync(base)) {
                const libDir = `${base}/${ver}/lib/softhsm`;
                try {
                    const entries = fs.readdirSync(libDir);
                    for (const f of entries) {
                        if (f.startsWith('libsofthsm2.') && (f.endsWith('.so') || f.endsWith('.dylib'))) {
                            paths.push(`${libDir}/${f}`);
                        }
                    }
                }
                catch {
                    /* ignore */
                }
            }
        }
        catch {
            /* ignore */
        }
        return paths;
    }
    resolveModulePath() {
        const tried = [];
        for (const p of this.commonModulePaths()) {
            try {
                fs.accessSync(p);
                logger.debug({ moduleCandidate: p }, 'pkcs11_module_access_ok');
                return p;
            }
            catch (e) {
                let detail = { code: e?.code, message: e?.message };
                try {
                    const stat = fs.statSync(p);
                    detail.stat = { exists: true, mode: stat.mode.toString(8), size: stat.size };
                }
                catch (se) {
                    detail.stat = { exists: false, statError: se?.code };
                }
                logger.debug({ moduleCandidate: p, detail }, 'pkcs11_module_access_fail');
                tried.push(p);
            }
        }
        throw internal('PKCS11_MODULE_PATH introuvable. Essayé: ' +
            tried.join(', ') +
            '. Astuce: sous macOS/Homebrew: export PKCS11_MODULE_PATH="$(brew --prefix softhsm)/lib/softhsm/libsofthsm2.so"');
    }
    findSlot() {
        if (!this.pkcs11)
            throw internal('Module non chargé');
        const slots = this.pkcs11.C_GetSlotList(true);
        for (const s of slots) {
            const info = this.pkcs11.C_GetTokenInfo(s);
            if (info.label.trim() === (this.tokenLabel || '').padEnd(info.label.length, ' ')) {
                this.slotId = s;
                this.slot = { slotHandle: s }; // minimal
                return;
            }
        }
        if (slots.length && this.slotId == null) {
            // fallback premier slot si label non strict trouvé
            this.slotId = slots[0];
            this.slot = { slotHandle: slots[0] };
            const info = this.pkcs11.C_GetTokenInfo(slots[0]);
            logger.warn({ wantedLabel: this.tokenLabel, usingLabel: info.label.trim() }, 'token_label_mismatch');
        }
        if (this.slotId == null)
            throw internal('Aucun slot/token disponible');
    }
    async withSession(fn, opts = {}) {
        if (!this.initialized)
            this.init();
        if (!this.pkcs11 || this.slotId == null)
            throw internal('PKCS#11 non initialisé');
        const flags = pkcs11.CKF_SERIAL_SESSION | (opts.rw ? pkcs11.CKF_RW_SESSION : 0);
        let session = null;
        try {
            session = this.pkcs11.C_OpenSession(this.slotId, flags);
            if (opts.login) {
                try {
                    this.pkcs11.C_Login(session, 1, this.pin); // CKU_USER=1
                }
                catch (e) {
                    if (e?.message?.includes('CKR_USER_ALREADY_LOGGED_IN')) {
                        // ignore
                    }
                    else if (e?.message?.includes('CKR_PIN_INCORRECT')) {
                        throw unauthorized('PIN incorrect');
                    }
                    else
                        throw e;
                }
            }
            if (session == null)
                throw internal('Session non ouverte');
            const result = await fn(session);
            if (opts.login) {
                try {
                    this.pkcs11.C_Logout(session);
                }
                catch {
                    /* ignore */
                }
            }
            return result;
        }
        catch (err) {
            if (err?.message?.includes('CKR_SESSION_HANDLE_INVALID')) {
                logger.warn('Session invalide, retry');
                return this.withSession(fn, opts);
            }
            throw err;
        }
        finally {
            if (session) {
                try {
                    this.pkcs11.C_CloseSession(session);
                }
                catch {
                    /* ignore */
                }
            }
        }
    }
    get pkcs() {
        // Auto-init lazily si pas encore initialisé
        if (!this.initialized) {
            try {
                this.init();
            }
            catch (e) {
                throw internal('Initialisation PKCS#11 échouée: ' + (e?.message || e));
            }
        }
        if (!this.pkcs11)
            throw internal('PKCS#11 non dispo');
        return this.pkcs11;
    }
    newId() {
        return Buffer.from(randomUUID().replace(/-/g, ''), 'hex');
    }
}
export const pkcs11Service = PKCS11Service.instance;
//# sourceMappingURL=pkcs11.service.js.map