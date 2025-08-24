// Minimal ASN.1 DER <-> raw (r,s) helpers for ECDSA signatures
// ECDSA signature DER format: SEQUENCE { r INTEGER, s INTEGER }

function trimLeadingZeros(buf: Buffer): Buffer {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0x00) i++;
  return i ? buf.subarray(i) : buf;
}

export function ecdsaDerToRaw(der: Buffer, size: number = 32): { r: Buffer; s: Buffer } {
  // Very small decoder (assumes correct format)
  if (der[0] !== 0x30) throw new Error('Invalid DER sequence');
  let offset = 2; // skip SEQ + len
  if (der[1] & 0x80) {
    const lenBytes = der[1] & 0x7f;
    offset = 2 + lenBytes; // not handling >2 length bytes (not needed here)
  }
  if (der[offset] !== 0x02) throw new Error('Expected INTEGER (r)');
  const rLen = der[offset + 1];
  const r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error('Expected INTEGER (s)');
  const sLen = der[offset + 1];
  const s = der.subarray(offset + 2, offset + 2 + sLen);
  const rPadded = Buffer.concat([
    Buffer.alloc(Math.max(0, size - r.length), 0),
    trimLeadingZeros(r),
  ]).slice(-size);
  const sPadded = Buffer.concat([
    Buffer.alloc(Math.max(0, size - s.length), 0),
    trimLeadingZeros(s),
  ]).slice(-size);
  return { r: rPadded, s: sPadded };
}

export function ecdsaRawToDer(r: Buffer, s: Buffer): Buffer {
  function encodeInt(b: Buffer): Buffer {
    const v = trimLeadingZeros(b);
    // if high bit set, prepend 0x00
    if (v[0] & 0x80) return Buffer.concat([Buffer.from([0x02, v.length + 1, 0x00]), v]);
    return Buffer.concat([Buffer.from([0x02, v.length]), v]);
  }
  const rEnc = encodeInt(r);
  const sEnc = encodeInt(s);
  const len = rEnc.length + sEnc.length;
  if (len < 128) {
    return Buffer.concat([Buffer.from([0x30, len]), rEnc, sEnc]);
  }
  // length > 127 (not expected here) -> simplistic long form (one byte) limited
  return Buffer.concat([Buffer.from([0x30, 0x81, len]), rEnc, sEnc]);
}
