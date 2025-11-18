/**
 * BankAccount Class
 * Simple bank account management with balance, interest rate, and bank charges
 */
export class BankAccount {
  public balance: number;
  public interestRate: number;
  public bankCharges: number;

  constructor(balance: number, interestRate: number = 0, bankCharges: number = 0) {
    this.balance = balance;
    this.interestRate = interestRate;
    this.bankCharges = bankCharges;
  }

  finishMonth(): void {
    this.balance = ((((this.balance * (this.interestRate / 100)) / 12) + this.balance) - this.bankCharges);
  }

  deposit(depositedAmount: number): void {
    this.balance += depositedAmount;
  }

  withdraw(withdrawal: number): void {
    if (withdrawal > this.balance) {
      throw new Error(`Insufficient balance. Available: £${this.balance.toFixed(2)}`);
    }
    this.balance -= withdrawal;
  }

  getBalance(): number {
    return this.balance;
  }
}

/**
 * Transfer Service
 * Handles transfers from total balance account to shared accounts
 */
export class TransferService {
  private personalAccount: BankAccount;
  private sharedAccounts: Map<string, BankAccount>;

  constructor() {
    this.personalAccount = new BankAccount(0, 0, 0);
    this.sharedAccounts = new Map();
  }

  /**
   * Initialize personal account with current balance
   */
  initializePersonalAccount(balance: number): void {
    this.personalAccount = new BankAccount(balance, 0, 0);
  }

  /**
   * Initialize or update a shared account
   */
  initializeSharedAccount(accountId: string, balance: number): void {
    this.sharedAccounts.set(accountId, new BankAccount(balance, 0, 0));
  }

  /**
   * Get personal account balance
   */
  getPersonalBalance(): number {
    return this.personalAccount.getBalance();
  }

  /**
   * Get shared account balance
   */
  getSharedAccountBalance(accountId: string): number {
    const account = this.sharedAccounts.get(accountId);
    return account ? account.getBalance() : 0;
  }

  /**
   * Transfer funds from personal account to shared account
   * Returns true if successful, throws error if insufficient funds
   */
  transferToSharedAccount(accountId: string, amount: number): { success: boolean; personalBalance: number; sharedBalance: number } {
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // Check if shared account exists, create if not
    if (!this.sharedAccounts.has(accountId)) {
      this.sharedAccounts.set(accountId, new BankAccount(0, 0, 0));
    }

    const sharedAccount = this.sharedAccounts.get(accountId)!;

    // Withdraw from personal account (will throw if insufficient)
    this.personalAccount.withdraw(amount);

    // Deposit to shared account
    sharedAccount.deposit(amount);

    return {
      success: true,
      personalBalance: this.personalAccount.getBalance(),
      sharedBalance: sharedAccount.getBalance()
    };
  }

  /**
   * Check if transfer is possible
   */
  canTransfer(amount: number): { canTransfer: boolean; reason?: string } {
    if (amount <= 0) {
      return { canTransfer: false, reason: 'Amount must be greater than 0' };
    }

    if (amount > this.personalAccount.getBalance()) {
      return {
        canTransfer: false,
        reason: `Insufficient balance. Available: £${this.personalAccount.getBalance().toFixed(2)}`
      };
    }

    return { canTransfer: true };
  }
}


