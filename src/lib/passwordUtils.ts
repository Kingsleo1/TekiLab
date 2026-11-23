// Safe password generation and validation helper for Teki Pharm ERP

export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export function evaluatePasswordStrength(password: string): {
  score: number; // 0 to 4
  level: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  criteria: PasswordCriteria;
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 6,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  let count = 0;
  if (criteria.minLength) count++;
  if (criteria.hasUpper && criteria.hasLower) count++;
  if (criteria.hasNumber) count++;
  if (criteria.hasSymbol) count++;

  let level: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let color = 'text-rose-500';

  if (count <= 1) {
    level = 'Weak';
    color = 'text-rose-500';
  } else if (count === 2) {
    level = 'Fair';
    color = 'text-amber-500';
  } else if (count === 3) {
    level = 'Good';
    color = 'text-blue-500';
  } else {
    level = 'Strong';
    color = 'text-emerald-500';
  }

  return { score: count, level, color, criteria };
}

export function generateSafePassword(): string {
  const prefixes = ['Pharma', 'TekiPharm', 'CentralRx', 'Health', 'SecureRx', 'MedCore', 'AlphaRx'];
  const symbols = ['!', '@', '#', '$', '%', '&', '*'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const num = Math.floor(100 + Math.random() * 900); // 3 digits
  const suffixChars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 2; i++) {
    suffix += suffixChars.charAt(Math.floor(Math.random() * suffixChars.length));
  }

  return `${prefix}${symbol}${num}${suffix}`;
}

export const SAMPLE_PASSWORDS = [
  'TekiPharm#2025!',
  'CentralRx$99!',
  'Pharma*Safe42',
  'MedCore&2025',
  'AlphaRx@77x'
];
