import React from 'react';
import {
  DEFAULT_PROTOTYPE_PAYMENT_METHOD,
  PROTOTYPE_PAYMENT_METHODS,
  PrototypePaymentMethodId
} from '../utils/prototypePaymentMethods';

interface PrototypePaymentMethodsProps {
  value?: PrototypePaymentMethodId;
  onChange: (method: PrototypePaymentMethodId) => void;
}

const MethodMark: React.FC<{ method: PrototypePaymentMethodId }> = ({ method }) => {
  if (method === 'card') {
    return (
      <svg className="prototype-pay-method-icon" width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
        <rect x="0.75" y="1.25" width="16.5" height="11.5" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 5h16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (method === 'apple-pay') {
    return (
      <svg className="prototype-pay-method-icon" width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true">
        <path d="M10.6 8.3c0-1.6 1.3-2.4 1.4-2.5-0.8-1.1-2-1.3-2.4-1.3-1-0.1-2 0.6-2.5 0.6s-1.3-0.6-2.2-0.6c-1.1 0-2.2 0.7-2.8 1.7-1.2 2.1-0.3 5.1 0.8 6.8 0.6 0.8 1.2 1.7 2.1 1.7s1.2-0.6 2.3-0.6 1.4 0.6 2.3 0.6 1.5-0.8 2.1-1.7c0.4-0.6 0.8-1.3 1-2-1.2-0.5-1.9-1.8-1.9-3.1zM8.8 3.6c0.5-0.6 0.9-1.5 0.8-2.4-0.8 0-1.7 0.5-2.3 1.2-0.5 0.6-1 1.5-0.8 2.3 0.9 0.1 1.7-0.4 2.3-1.1z" />
      </svg>
    );
  }
  if (method === 'google-pay') {
    return (
      <span className="prototype-pay-method-g" aria-hidden="true">G</span>
    );
  }
  return (
    <span className="prototype-pay-method-pp" aria-hidden="true">P</span>
  );
};

const PrototypePaymentMethods: React.FC<PrototypePaymentMethodsProps> = ({
  value = DEFAULT_PROTOTYPE_PAYMENT_METHOD,
  onChange
}) => {
  return (
    <fieldset className="prototype-pay-methods">
      <legend className="prototype-pay-methods-legend">Pay with</legend>
      <div className="prototype-pay-method-list">
        {PROTOTYPE_PAYMENT_METHODS.map((method) => {
          const selected = value === method.id;
          return (
            <label
              key={method.id}
              className={`prototype-pay-method prototype-pay-method-${method.id}${selected ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="prototype-payment-method"
                value={method.id}
                checked={selected}
                onChange={() => onChange(method.id)}
              />
              <MethodMark method={method.id} />
              <span className="prototype-pay-method-label">{method.label}</span>
            </label>
          );
        })}
      </div>
      <p className="prototype-pay-methods-note">Prototype payment option — no real money is processed.</p>
    </fieldset>
  );
};

export default PrototypePaymentMethods;
