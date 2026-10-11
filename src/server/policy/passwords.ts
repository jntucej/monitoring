export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password must be at most 128 characters long." };
  }
  return { valid: true };
}

export function assertPasswordPolicy(password: string): void {
  const result = validatePasswordPolicy(password);
  if (!result.valid) {
    throw new Error(result.error);
  }
}
