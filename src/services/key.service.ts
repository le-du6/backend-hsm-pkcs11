import pkcs11 from 'pkcs11js';
import { pkcs11Service } from './pkcs11.service.js';
import { P256_OID_DER } from '../utils/oid.js';
import { notFound } from '../utils/errors.js';

export interface CreateKeyParams {
  label?: string;
  id?: string;
  curve?: 'P-256';
}
export interface KeyInfo {
  id: string;
  label: string;
  curve: 'P-256';
  publicKeyPem?: string;
}

function derToSpkiPem(der: Buffer): string {
  const b64 = der.toString('base64');
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

export class KeyService {
  async createECKeyPair({ label, id, curve = 'P-256' }: CreateKeyParams): Promise<KeyInfo> {
    if (curve !== 'P-256') throw new Error('Curve non supportée');
    const pkcs = pkcs11Service.pkcs;
    const ckaId = id ? Buffer.from(id, 'hex') : pkcs11Service.newId();
    const finalLabel =
      label || `key-${Date.now().toString(36)}-${ckaId.toString('hex').slice(0, 6)}`;

    return pkcs11Service.withSession<KeyInfo>(
      (session) => {
        pkcs.C_GenerateKeyPair(
          session,
          {
            mechanism: pkcs11.CKM_EC_KEY_PAIR_GEN,
            parameter: P256_OID_DER,
          },
          [
            // public template
            { type: pkcs11.CKA_VERIFY, value: true },
            { type: pkcs11.CKA_EC_PARAMS, value: P256_OID_DER },
            { type: pkcs11.CKA_TOKEN, value: true },
            { type: pkcs11.CKA_LABEL, value: finalLabel },
            { type: pkcs11.CKA_ID, value: ckaId },
          ],
          [
            // private template
            { type: pkcs11.CKA_SIGN, value: true },
            { type: pkcs11.CKA_SENSITIVE, value: true },
            { type: pkcs11.CKA_EXTRACTABLE, value: false },
            { type: pkcs11.CKA_TOKEN, value: true },
            { type: pkcs11.CKA_LABEL, value: finalLabel },
            { type: pkcs11.CKA_ID, value: ckaId },
          ],
        );

        // Retrieve public key in DER (SubjectPublicKeyInfo) if possible
        // Some modules store CKA_EC_POINT; we'll attempt SPKI reconstruction if needed.
        const pubTemplate = [
          { type: pkcs11.CKA_ID },
          { type: pkcs11.CKA_LABEL },
          { type: pkcs11.CKA_EC_POINT },
        ];
        const found = this.findPublicKeyByIdRaw(session, ckaId, pubTemplate);
        let publicKeyPem: string | undefined;
        if (found?.ecPoint) {
          // EC_POINT is OCTET STRING wrapping uncompressed point. Build minimal SPKI
          const ecPoint: Buffer = found.ecPoint;
          // Some tokens include an OCTET STRING header; ensure first byte 0x04 appears (uncompressed)
          const uncompressed = ecPoint[0] === 0x04 ? ecPoint : ecPoint.slice(-65); // naive fallback
          // ASN.1 build: SEQ { SEQ {1.2.840.10045.2.1, 1.2.840.10045.3.1.7}, BIT STRING <04..> }
          const algoId = Buffer.from('301306072a8648ce3d020106082a8648ce3d030107', 'hex');
          const bitString = Buffer.concat([
            Buffer.from([0x03, uncompressed.length + 1, 0x00]),
            uncompressed,
          ]);
          const spki = Buffer.concat([
            Buffer.from([0x30, algoId.length + bitString.length]),
            algoId,
            bitString,
          ]);
          publicKeyPem = derToSpkiPem(spki);
        }
        return { id: ckaId.toString('hex'), label: finalLabel, curve, publicKeyPem };
      },
      { rw: true, login: true },
    );
  }

  private findPublicKeyByIdRaw(session: number, ckaId: Buffer, attrs: any[]) {
    const pkcs = pkcs11Service.pkcs;
    pkcs.C_FindObjectsInit(session, [
      { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY },
      { type: pkcs11.CKA_ID, value: ckaId },
    ]);
    const h = pkcs.C_FindObjects(session, 1)[0];
    pkcs.C_FindObjectsFinal(session);
    if (!h) return null;
    const values = pkcs.C_GetAttributeValue(session, h, attrs);
    const out: any = {};
    for (const v of values) {
      if (v.type === pkcs11.CKA_LABEL) out.label = v.value.toString();
      if (v.type === pkcs11.CKA_ID) out.id = v.value;
      if (v.type === pkcs11.CKA_EC_POINT) out.ecPoint = v.value;
    }
    return out;
  }

  async listKeys(): Promise<KeyInfo[]> {
    const pkcs = pkcs11Service.pkcs;
    return pkcs11Service.withSession<KeyInfo[]>(
      (session) => {
        const results: KeyInfo[] = [];
        pkcs.C_FindObjectsInit(session, [{ type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY }]);
        let objs = pkcs.C_FindObjects(session, 50);
        while (objs.length) {
          for (const o of objs) {
            try {
              const attrs = pkcs.C_GetAttributeValue(session, o, [
                { type: pkcs11.CKA_ID },
                { type: pkcs11.CKA_LABEL },
              ]);
              const idAttr = attrs.find((a: any) => a.type === pkcs11.CKA_ID);
              const labelAttr = attrs.find((a: any) => a.type === pkcs11.CKA_LABEL);
              if (idAttr && labelAttr) {
                results.push({
                  id: idAttr.value.toString('hex'),
                  label: labelAttr.value.toString(),
                  curve: 'P-256',
                });
              }
            } catch {
              /* ignore individual errors */
            }
          }
          objs = pkcs.C_FindObjects(session, 50);
        }
        pkcs.C_FindObjectsFinal(session);
        return results;
      },
      { login: true },
    );
  }

  async getKeyById(id: string): Promise<KeyInfo> {
    const pkcs = pkcs11Service.pkcs;
    const ckaId = Buffer.from(id, 'hex');
    return pkcs11Service.withSession<KeyInfo>(
      (session) => {
        pkcs.C_FindObjectsInit(session, [
          { type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY },
          { type: pkcs11.CKA_ID, value: ckaId },
        ]);
        const h = pkcs.C_FindObjects(session, 1)[0];
        pkcs.C_FindObjectsFinal(session);
        if (!h) throw notFound('Clé introuvable');
        const attrs = pkcs.C_GetAttributeValue(session, h, [
          { type: pkcs11.CKA_LABEL },
          { type: pkcs11.CKA_EC_POINT },
        ]);
        let label = id;
        let ecPoint: Buffer | undefined;
        for (const a of attrs) {
          if (a.type === pkcs11.CKA_LABEL) label = a.value.toString();
          if (a.type === pkcs11.CKA_EC_POINT) ecPoint = a.value;
        }
        let publicKeyPem: string | undefined;
        if (ecPoint) {
          const uncompressed = ecPoint[0] === 0x04 ? ecPoint : ecPoint.slice(-65);
          const algoId = Buffer.from('301306072a8648ce3d020106082a8648ce3d030107', 'hex');
          const bitString = Buffer.concat([
            Buffer.from([0x03, uncompressed.length + 1, 0x00]),
            uncompressed,
          ]);
          const spki = Buffer.concat([
            Buffer.from([0x30, algoId.length + bitString.length]),
            algoId,
            bitString,
          ]);
          publicKeyPem = derToSpkiPem(spki);
        }
        return { id, label, curve: 'P-256', publicKeyPem };
      },
      { login: true },
    );
  }

  async deleteKeyById(id: string): Promise<void> {
    const pkcs = pkcs11Service.pkcs;
    const ckaId = Buffer.from(id, 'hex');
    return pkcs11Service.withSession<void>(
      (session) => {
        // delete public and private objects
        const classes = [pkcs11.CKO_PUBLIC_KEY, pkcs11.CKO_PRIVATE_KEY];
        for (const cls of classes) {
          pkcs.C_FindObjectsInit(session, [
            { type: pkcs11.CKA_CLASS, value: cls },
            { type: pkcs11.CKA_ID, value: ckaId },
          ]);
          const h = pkcs.C_FindObjects(session, 10);
          pkcs.C_FindObjectsFinal(session);
          for (const obj of h) {
            try {
              pkcs.C_DestroyObject(session, obj);
            } catch {
              /* ignore */
            }
          }
        }
      },
      { rw: true, login: true },
    );
  }
}

export const keyService = new KeyService();
