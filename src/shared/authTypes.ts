export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type AuthMethod = 'password' | 'google';

export type AuthSession = {
  user: AuthUser | null;
  method: AuthMethod;
};

export type AuthStatus = {
  hasPassword: boolean;
  hasGoogle: boolean;
  googleSub?: string;
};
