export const PROTOTYPE_PAYMENT_METHOD_IDS = ['apple-pay', 'card', 'google-pay', 'paypal'] as const;

export type PrototypePaymentMethodId = (typeof PROTOTYPE_PAYMENT_METHOD_IDS)[number];

export const DEFAULT_PROTOTYPE_PAYMENT_METHOD: PrototypePaymentMethodId = 'card';

export const PROTOTYPE_PAYMENT_METHODS: Array<{
  id: PrototypePaymentMethodId;
  label: string;
}> = [
  { id: 'apple-pay', label: 'Apple Pay' },
  { id: 'card', label: 'Debit / credit card' },
  { id: 'google-pay', label: 'Google Pay' },
  { id: 'paypal', label: 'PayPal' }
];
