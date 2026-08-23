import { randomInt } from "node:crypto"

import { hashToken } from "./trusted-device"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sin 0/O/1/I, ambiguos al transcribir

function generateOne() {
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)]
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/** 8 códigos de respaldo (mfa_backup_codes) — se muestran una sola vez al enrolar TOTP. */
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, generateOne)
}

export function hashBackupCode(code: string) {
  return hashToken(code.trim().toUpperCase())
}
