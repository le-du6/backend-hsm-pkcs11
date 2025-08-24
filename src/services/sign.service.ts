import pkcs11 from 'pkcs11js';
import { pkcs11Service } from './pkcs11.service.js';
import { sha256 } from '../utils/crypto.js';
import { ecdsaDerToRaw, ecdsaRawToDer } from '../utils/asn1.js';
import { notFound } from '../utils/errors.js';

export interface SignResult {
  algorithm: 'ECDSA';
  hash: 'SHA-256';
  hashHex: string;
  signatureDerBase64: string;
  signatureRaw: {
    rHex: string;
    sHex: string;
    rBase64Url: string;
    sBase64Url: string;
  };
}

export class SignService {
  async signData(id: string, data: Buffer): Promise<SignResult> {
    const hash = sha256(data);
    const pkcs = pkcs11Service.pkcs;
    const ckaId = Buffer.from(id, 'hex');
    return pkcs11Service.withSession<SignResult>(
      (session) => {
        // Locate private key
        pkcs.C_FindObjectsInit(session, [
          { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY },
          { type: pkcs11.CKA_ID, value: ckaId },
        ]);
        const priv = pkcs.C_FindObjects(session, 1)[0];
        pkcs.C_FindObjectsFinal(session);
        if (!priv) throw notFound('Clé privée introuvable');

        pkcs.C_SignInit(session, { mechanism: pkcs11.CKM_ECDSA }, priv);
        let signature: any;
        try {
          // Version API à 2 paramètres
          signature = pkcs.C_Sign(session, hash);
        } catch (e: any) {
          if (e?.message?.includes('Expected 3 arguments')) {
            // Essai avec buffer de sortie (API à 3 paramètres)
            const out = Buffer.alloc(256);
            const maybe = pkcs.C_Sign(session, hash, out);
            // Certaines versions retournent le buffer rempli, d'autres un length
            if (Buffer.isBuffer(maybe)) {
              signature = maybe.subarray(0, maybe.length);
            } else if (typeof maybe === 'number') {
              signature = out.subarray(0, maybe);
            } else {
              signature = out; // fallback
            }
          } else throw e;
        }
        let r: Buffer;
        let s: Buffer;
        let derSig: Buffer;
        if (signature[0] === 0x30) {
          // DER fourni par le module
          ({ r, s } = ecdsaDerToRaw(signature, 32));
          derSig = signature;
        } else if (signature.length === 64) {
          // Signature brute r||s (PKCS#11 CKM_ECDSA standard)
          r = signature.subarray(0, 32);
          s = signature.subarray(32, 64);
          derSig = ecdsaRawToDer(r, s);
        } else {
          throw new Error('Format signature inattendu');
        }
        const toB64Url = (b: Buffer) =>
          b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        return {
          algorithm: 'ECDSA',
          hash: 'SHA-256',
          hashHex: hash.toString('hex'),
          signatureDerBase64: derSig.toString('base64'),
          signatureRaw: {
            rHex: r.toString('hex'),
            sHex: s.toString('hex'),
            rBase64Url: toB64Url(r),
            sBase64Url: toB64Url(s),
          },
        };
      },
      { login: true },
    );
  }
}

export const signService = new SignService();
