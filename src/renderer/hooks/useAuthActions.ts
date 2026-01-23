import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useAuthActions() {
  const {
    init,
    loginWithPassword,
    loginWithGoogle,
    linkGoogle,
    unlinkGoogle,
    changePassword,
    changeGoogle,
    logout,
    reset,
  } = useAuth();

  const loginPassword = useCallback(async (password: string) => {
    await loginWithPassword(password);
  }, [loginWithPassword]);

  const initPassword = useCallback(async (password: string) => {
    await init(password);
  }, [init]);

  const linkGoogleAccount = useCallback(async () => {
    await linkGoogle();
  }, [linkGoogle]);

  const unlinkGoogleAccount = useCallback(async () => {
    await unlinkGoogle();
  }, [unlinkGoogle]);

  const changePasswordValue = useCallback(async (password: string) => {
    await changePassword(password);
  }, [changePassword]);

  const changeGoogleAccount = useCallback(async () => {
    await changeGoogle();
  }, [changeGoogle]);

  const logoutUser = useCallback(async () => {
    await logout();
  }, [logout]);

  const resetApp = useCallback(async (password: string) => {
    await reset(password);
  }, [reset]);

  return {
    init: initPassword,
    loginWithPassword: loginPassword,
    loginWithGoogle,
    linkGoogle: linkGoogleAccount,
    unlinkGoogle: unlinkGoogleAccount,
    changePassword: changePasswordValue,
    changeGoogle: changeGoogleAccount,
    logout: logoutUser,
    reset: resetApp,
  };
}
