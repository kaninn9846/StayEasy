export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-`~\[\]\\;'\/]/.test(password),
  };
}

export function getPasswordStrength(rules: PasswordValidation): 'Weak' | 'Medium' | 'Strong' {
  const count = Object.values(rules).filter(Boolean).length;
  if (count <= 2) return 'Weak';
  if (count <= 4) return 'Medium';
  return 'Strong';
}

export function isPasswordValid(rules: PasswordValidation): boolean {
  return Object.values(rules).every(Boolean);
}

export const PASSWORD_RULES: { key: keyof PasswordValidation; label: string }[] = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUppercase', label: 'One uppercase letter' },
  { key: 'hasLowercase', label: 'One lowercase letter' },
  { key: 'hasNumber', label: 'One number' },
  { key: 'hasSpecial', label: 'One special character' },
];
