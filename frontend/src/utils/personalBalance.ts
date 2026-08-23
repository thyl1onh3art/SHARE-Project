export interface PersonalFinanceRecord {
  type?: string;
  amount?: number;
  sharedAccount?: unknown;
  archivedAccountName?: string;
}

export function isPermanentlyDeletedTripMoneyHistory(record: PersonalFinanceRecord): boolean {
  return !!record.archivedAccountName && !record.sharedAccount;
}

/** Canonical personal tracked total: inputs − outputs, excluding Trip Money rows. */
export function personalBalanceFromRecords(
  records: PersonalFinanceRecord[] | null | undefined
): number {
  const personal = (records || []).filter(
    (record) => !record.sharedAccount && !isPermanentlyDeletedTripMoneyHistory(record)
  );
  const income = personal
    .filter((record) => record.type === 'input')
    .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const expenses = personal
    .filter((record) => record.type === 'output')
    .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  return Math.round((income - expenses) * 100) / 100;
}

export function formatPersonalBalanceGbp(amount: number): string {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `£${value.toFixed(2)}`;
}
