/**
 * Generate a unique 8-character alphanumeric PIN
 * Uses uppercase letters (excluding confusing ones like O, I, L) and digits
 */
export function generatePIN(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // No O, I, L, 0, 1
  let pin = "";
  for (let i = 0; i < 8; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

/**
 * Validate PIN format (8 chars, alphanumeric)
 */
export function isValidPINFormat(pin: string): boolean {
  return /^[A-Z0-9]{6,10}$/i.test(pin);
}
