export type Credentials = {
  email: string;
  password: string;
};

class AuthService {
  async login(_credentials: Credentials): Promise<void> {}

  async logout(): Promise<void> {}

  async getCurrentUser(): Promise<null> {
    return null;
  }
}

export const authService = new AuthService();
