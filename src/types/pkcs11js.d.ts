// Minimal ambient declarations for pkcs11js to allow compilation when optional dependency not installed.
// For full typings install the actual package (native module required at runtime).
declare module 'pkcs11js' {
  export type Session = number; // simplifié
  export interface Mechanism {
    mechanism: number;
    parameter?: Buffer;
  }
  export interface Attribute {
    type: number;
    value?: any;
  }
  export interface Slot {
    slotHandle: number;
  }

  export class PKCS11 {
    load(path: string): void;
    C_Initialize(): void;
    C_Finalize(): void;
    C_GetSlotList(tokenPresent: boolean): number[];
    C_GetTokenInfo(slot: number): { label: string };
    C_OpenSession(slot: number, flags: number): Session;
    C_CloseSession(session: Session): void;
    C_Login(session: Session, userType: number, pin: string): void;
    C_Logout(session: Session): void;
    C_GenerateKeyPair(
      session: Session,
      mech: Mechanism,
      pub: Attribute[],
      priv: Attribute[],
    ): { publicKey: any; privateKey: any };
    C_FindObjectsInit(session: Session, template: Attribute[]): void;
    C_FindObjects(session: Session, max: number): any[];
    C_FindObjectsFinal(session: Session): void;
    C_GetAttributeValue(session: Session, hObject: any, attrs: Attribute[]): Attribute[];
    C_DestroyObject(session: Session, hObject: any): void;
    C_SignInit(session: Session, mech: Mechanism, key: any): void;
    C_Sign(session: Session, data: Buffer): Buffer;
  }

  interface PKCS11Module {
    PKCS11: typeof PKCS11;
    CKF_SERIAL_SESSION: number;
    CKF_RW_SESSION: number;
    CKO_PUBLIC_KEY: number;
    CKO_PRIVATE_KEY: number;
    CKM_EC_KEY_PAIR_GEN: number;
    CKM_ECDSA: number;
    CKA_VERIFY: number;
    CKA_EC_PARAMS: number;
    CKA_TOKEN: number;
    CKA_LABEL: number;
    CKA_ID: number;
    CKA_SIGN: number;
    CKA_SENSITIVE: number;
    CKA_EXTRACTABLE: number;
    CKA_CLASS: number;
    CKA_EC_POINT: number;
  }

  const pkcs11: PKCS11Module;
  export default pkcs11;
}
