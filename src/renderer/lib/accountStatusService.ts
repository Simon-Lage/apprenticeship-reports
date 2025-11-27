class AccountStatusService {
  async hasExistingAccount(): Promise<boolean> {
    return false;
  }
}

export const accountStatusService = new AccountStatusService();
