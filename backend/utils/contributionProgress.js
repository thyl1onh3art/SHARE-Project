function toPence(value) {
  return Math.round((Number(value) || 0) * 100);
}

function isCompletedPaymentStatus(status) {
  return status === 'executed' || status === 'approved';
}

function contributionProgressTotal(records, completedPayments = []) {
  const completed = (completedPayments || []).filter(
    (payment) => payment && isCompletedPaymentStatus(payment.status)
  );

  return (records || []).reduce((sum, record) => {
    if (!record || typeof record === 'string') return sum;
    const amount = Number(record.amount) || 0;
    if (record.type === 'input') return sum + amount;
    if (record.type !== 'output') return sum;

    const isFinalPaymentOutput = completed.some((payment) => (
      toPence(payment.amount) === toPence(amount) &&
      String(payment.description || '') === String(record.description || '')
    ));
    return isFinalPaymentOutput ? sum : sum - amount;
  }, 0);
}

module.exports = {
  toPence,
  isCompletedPaymentStatus,
  contributionProgressTotal
};
