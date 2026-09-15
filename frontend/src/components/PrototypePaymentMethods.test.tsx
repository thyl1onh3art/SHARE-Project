import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PrototypePaymentMethods from './PrototypePaymentMethods';
import { DEFAULT_PROTOTYPE_PAYMENT_METHOD } from '../utils/prototypePaymentMethods';

describe('PrototypePaymentMethods', () => {
  it('selects debit / credit card by default and allows only one method', () => {
    const onChange = jest.fn();
    render(<PrototypePaymentMethods onChange={onChange} />);

    const card = screen.getByRole('radio', { name: 'Debit / credit card' });
    expect(card).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Apple Pay' })).not.toBeChecked();
    expect(screen.getByRole('group', { name: 'Pay with' })).toBeInTheDocument();
    expect(screen.getByText('Prototype payment option — no real money is processed.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Apple Pay' }));
    expect(onChange).toHaveBeenCalledWith('apple-pay');
  });

  it('marks the chosen method as selected', () => {
    const onChange = jest.fn();
    render(
      <PrototypePaymentMethods value="paypal" onChange={onChange} />
    );

    expect(screen.getByRole('radio', { name: 'PayPal' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Debit / credit card' })).not.toBeChecked();
    expect(DEFAULT_PROTOTYPE_PAYMENT_METHOD).toBe('card');
  });
});
