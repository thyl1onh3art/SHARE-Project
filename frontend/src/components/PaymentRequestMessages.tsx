import React from 'react';
import { PaymentRequestItem } from '../utils/messageNotifications';

interface PaymentRequestMessagesProps {
  paymentRequests: PaymentRequestItem[];
  currentUserId: string;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}

const getEntityId = (value: { _id?: string } | string | undefined): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || '';
};

const getRequesterName = (request: PaymentRequestItem): string => {
  if (!request.requestedBy || typeof request.requestedBy === 'string') {
    return 'A participant';
  }
  const name = `${request.requestedBy.firstName || ''} ${request.requestedBy.lastName || ''}`.trim();
  return name || request.requestedBy.email || 'A participant';
};

const getAccountName = (request: PaymentRequestItem): string => {
  if (!request.sharedAccount) return 'Unknown Account';
  if (typeof request.sharedAccount === 'string') return 'Shared Account';
  return request.sharedAccount.name;
};

const PaymentRequestMessages: React.FC<PaymentRequestMessagesProps> = ({
  paymentRequests,
  currentUserId,
  onApprove,
  onReject,
  onCancel
}) => {
  if (paymentRequests.length === 0) {
    return (
      <p style={{ color: '#4a5568', textAlign: 'center', padding: '1.5rem' }}>
        No pending payment or withdrawal approvals.
      </p>
    );
  }

  return (
    <div className="list">
      {paymentRequests.map((request) => {
        const requesterId = getEntityId(request.requestedBy);
        const isRequester = requesterId === currentUserId;
        const hasApproved = request.approvals?.some((approval) => getEntityId(approval.user) === currentUserId);
        const hasRejected = request.rejections?.some((rejection) => getEntityId(rejection.user) === currentUserId);
        const approvalCount = request.approvals?.length || 0;
        const requiredApprovals = request.requiredApprovals || 0;
        const isWithdrawal = request.requestType === 'withdrawal';

        return (
          <div
            key={request._id}
            className="list-item"
            style={{
              background: '#fffbeb',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              marginBottom: '0.75rem'
            }}
          >
            <div>
              <strong>
                {isWithdrawal ? 'Withdrawal approval needed' : 'Payment approval needed'}
              </strong>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                Account: {getAccountName(request)}
              </p>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                Amount: £{request.amount?.toFixed(2)}
              </p>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                Requested by: {getRequesterName(request)}
              </p>
              {request.description && (
                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                  Note: {request.description}
                </p>
              )}
              <p style={{ color: '#92400e', fontSize: '0.85rem', margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                Approvals: {approvalCount} / {requiredApprovals}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {!isRequester && !hasApproved && !hasRejected && (
                <>
                  <button
                    type="button"
                    onClick={() => onApprove(request._id)}
                    className="btn btn-success"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(request._id)}
                    className="btn btn-danger"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Reject
                  </button>
                </>
              )}

              {isRequester && (
                <button
                  type="button"
                  onClick={() => onCancel(request._id)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Cancel Request
                </button>
              )}

              {hasApproved && (
                <span style={{ color: '#22543d', fontSize: '0.85rem', alignSelf: 'center' }}>
                  You approved this request
                </span>
              )}

              {hasRejected && (
                <span style={{ color: '#742a2a', fontSize: '0.85rem', alignSelf: 'center' }}>
                  You rejected this request
                </span>
              )}

              {isRequester && !hasApproved && !hasRejected && (
                <span style={{ color: '#744210', fontSize: '0.85rem', alignSelf: 'center' }}>
                  Waiting for other participants to approve or reject
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PaymentRequestMessages;
