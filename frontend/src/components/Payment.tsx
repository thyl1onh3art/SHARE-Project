import React, { useState, useEffect } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PaymentProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const Payment: React.FC<PaymentProps> = ({
  amount,
  currency = 'GBP',
  description,
  onSuccess,
  onError,
  onCancel
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');

  // PayPal client ID from environment
  const paypalClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || '';

  if (!paypalClientId) {
    return (
      <div className="alert alert-error">
        PayPal client ID is not configured. Please set REACT_APP_PAYPAL_CLIENT_ID in your environment variables.
      </div>
    );
  }

  // Create PayPal order
  const createOrder = async (data: any, actions: any) => {
    try {
      setLoading(true);
      setError('');

      // Create payment on backend
      const response = await axios.post('/payments/create', {
        amount,
        currency: currency.toUpperCase(),
        description: description || `Payment from ${user?.name || 'user'}`,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      });

      if (response.data.success) {
        setPaymentId(response.data.paymentId);
        
        // For PayPal Buttons, we need to extract the order ID from the approval URL
        // The approval URL contains a token parameter
        const approvalUrl = response.data.approvalUrl;
        const urlParams = new URLSearchParams(approvalUrl.split('?')[1]);
        const token = urlParams.get('token');
        
        // Return the token/order ID for PayPal Buttons
        return token || response.data.paymentId;
      } else {
        throw new Error(response.data.error || 'Failed to create payment');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create payment';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle PayPal approval
  const onApprove = async (data: any, actions: any) => {
    try {
      setLoading(true);
      setError('');

      // Execute payment on backend
      const response = await axios.post('/payments/execute', {
        paymentId: data.paymentID,
        payerId: data.payerID
      });

      if (response.data.success) {
        // Payment successful
        if (onSuccess) {
          onSuccess(response.data.payment);
        }
      } else {
        throw new Error(response.data.error || 'Payment execution failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Payment execution failed';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle PayPal cancellation
  const handleCancel = () => {
    setError('Payment was cancelled');
    if (onCancel) {
      onCancel();
    }
  };

  // Handle PayPal errors
  const handleError = (err: any) => {
    const errorMessage = err.message || 'An error occurred with PayPal';
    setError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Payment Details</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>
            Amount: £{amount.toFixed(2)}
          </p>
          {description && (
            <p style={{ color: '#4a5568', marginTop: '0.5rem' }}>{description}</p>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
            <p style={{ marginTop: '1rem', color: '#4a5568' }}>Processing payment...</p>
          </div>
        )}

        <PayPalScriptProvider
          options={{
            clientId: paypalClientId,
            currency: currency.toUpperCase(),
            intent: 'capture'
          }}
        >
          <PayPalButtons
            createOrder={createOrder}
            onApprove={onApprove}
            onCancel={handleCancel}
            onError={handleError}
            style={{
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'paypal'
            }}
            disabled={loading || amount <= 0}
          />
        </PayPalScriptProvider>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}>
        Your payment is secured by PayPal. We never store your payment details.
      </p>
    </div>
  );
};

export default Payment;
