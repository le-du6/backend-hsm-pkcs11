// OID utilities for EC curves (currently only P-256)
// prime256v1 / secp256r1 OID: 1.2.840.10045.3.1.7
// ASN.1 DER for ECParameters (namedCurve) = 06 <len> <oid-bytes>
export const P256_OID = '1.2.840.10045.3.1.7';
// Pre-encoded DER for the OID 1.2.840.10045.3.1.7
// 06 08 2A 86 48 CE 3D 03 01 07
export const P256_OID_DER = Buffer.from([
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
]);
//# sourceMappingURL=oid.js.map