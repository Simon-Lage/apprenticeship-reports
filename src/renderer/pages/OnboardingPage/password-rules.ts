export type PasswordRule = {
  id: 'minLength' | 'lowercase' | 'uppercase' | 'number' | 'special';
  isValid: boolean;
};

export function evaluatePasswordRules(password: string): PasswordRule[] {
  return [
    {
      id: 'minLength',
      isValid: password.length >= 8,
    },
    {
      id: 'lowercase',
      isValid: /[a-z]/.test(password),
    },
    {
      id: 'uppercase',
      isValid: /[A-Z]/.test(password),
    },
    {
      id: 'number',
      isValid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return evaluatePasswordRules(password).every((rule) => rule.isValid);
}
