import { AuthSession, AuthStatus, AuthUser } from '../../shared/authTypes';

class AuthService {
  private user: AuthUser | null = null;

  private method: AuthSession['method'] | null = null;

  private status: AuthStatus | null = null;

  async getStatus(): Promise<AuthStatus> {
    const status = (await window.electron.auth.status()) as AuthStatus;
    this.status = status;
    return status;
  }

  async init(password: string): Promise<AuthSession> {
    const session = (await window.electron.auth.init(password)) as AuthSession;
    this.user = session.user;
    this.method = session.method;
    await this.getStatus();
    return session;
  }

  async loginWithPassword(password: string): Promise<AuthSession> {
    const session = (await window.electron.auth.loginWithPassword(password)) as AuthSession;
    this.user = session.user;
    this.method = session.method;
    await this.getStatus();
    return session;
  }

  async loginWithGoogle(): Promise<AuthSession> {
    const session = (await window.electron.auth.loginWithGoogle()) as AuthSession;
    this.user = session.user;
    this.method = session.method;
    await this.getStatus();
    return session;
  }

  async linkGoogle(): Promise<AuthUser | null> {
    const result = (await window.electron.auth.linkGoogle()) as { user: AuthUser | null };
    await this.getStatus();
    return result.user;
  }

  async unlinkGoogle(): Promise<void> {
    await window.electron.auth.unlinkGoogle();
    await this.getStatus();
  }

  async changePassword(password: string): Promise<void> {
    await window.electron.auth.changePassword(password);
    await this.getStatus();
  }

  async changeGoogle(): Promise<AuthUser | null> {
    const result = (await window.electron.auth.changeGoogle()) as { user: AuthUser | null };
    await this.getStatus();
    return result.user;
  }

  async logout(): Promise<void> {
    await window.electron.auth.logout();
    this.user = null;
    this.method = null;
  }

  async reset(password: string): Promise<void> {
    await window.electron.auth.reset(password);
    this.user = null;
    this.method = null;
    this.status = null;
  }

  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  getMethod(): AuthSession['method'] | null {
    return this.method;
  }

  getCachedStatus(): AuthStatus | null {
    return this.status;
  }
}

export const authService = new AuthService();
