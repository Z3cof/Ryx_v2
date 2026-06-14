import type { CountryCode } from 'libphonenumber-js';

export type RegisterDraft = {
  name: string;
  email: string;
  password: string;
  phoneE164: string;
  countryIso: CountryCode;
};

let draft: RegisterDraft | null = null;

export function setRegisterDraft(next: RegisterDraft): void {
  draft = next;
}

export function getRegisterDraft(): RegisterDraft | null {
  return draft;
}

export function clearRegisterDraft(): void {
  draft = null;
}
