import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Friend } from './Friends';

export interface InviteRecipient {
  recipientEmail: string;
  recipientPhone: string;
}

interface InviteRecipientsFormProps {
  recipients: InviteRecipient[];
  onChange: (recipients: InviteRecipient[]) => void;
  title?: string;
  description?: string;
}

const emptyRecipient = (): InviteRecipient => ({ recipientEmail: '', recipientPhone: '' });

/**
 * Convenience friend picker + email/phone rows for trip invitations.
 * Friendship does not grant Trip Money access — sending still uses /invites/send rules.
 */
const InviteRecipientsForm: React.FC<InviteRecipientsFormProps> = ({
  recipients,
  onChange,
  title = 'Members to invite',
  description = 'Pick SHARE friends for convenience, or enter another registered user’s email. Friendship alone does not grant Shared Account access.'
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selectedFriendId, setSelectedFriendId] = useState('');

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await axios.get('/friends');
        setFriends(response.data);
      } catch {
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, []);

  const updateRecipient = (index: number, field: keyof InviteRecipient, value: string) => {
    const updated = recipients.map((recipient, i) =>
      i === index ? { ...recipient, [field]: value } : recipient
    );
    onChange(updated);
  };

  const addRecipient = () => {
    onChange([...recipients, emptyRecipient()]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length === 1) {
      onChange([emptyRecipient()]);
      return;
    }
    onChange(recipients.filter((_, i) => i !== index));
  };

  const isEmailAlreadyAdded = (email: string) => {
    const normalized = email.trim().toLowerCase();
    return recipients.some((recipient) => recipient.recipientEmail.trim().toLowerCase() === normalized);
  };

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriendId(friendId);
    if (!friendId) return;

    const friend = friends.find((item) => item.id === friendId);
    if (!friend) return;

    if (isEmailAlreadyAdded(friend.email)) {
      setSelectedFriendId('');
      return;
    }

    const emptyIndex = recipients.findIndex(
      (recipient) => !recipient.recipientEmail.trim() && !recipient.recipientPhone.trim()
    );

    if (emptyIndex >= 0) {
      const updated = recipients.map((recipient, index) =>
        index === emptyIndex
          ? { ...recipient, recipientEmail: friend.email }
          : recipient
      );
      onChange(updated);
    } else {
      onChange([...recipients, { recipientEmail: friend.email, recipientPhone: '' }]);
    }

    setSelectedFriendId('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ margin: 0 }}>{title}</label>
      </div>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#718096' }}>{description}</p>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.85rem' }}>Add from friends list</label>
        {loadingFriends ? (
          <p style={{ fontSize: '0.85rem', color: '#718096', margin: 0 }}>Loading friends...</p>
        ) : friends.length > 0 ? (
          <select
            className="form-select"
            value={selectedFriendId}
            onChange={(e) => handleFriendSelect(e.target.value)}
          >
            <option value="">Choose a friend...</option>
            {friends.map((friend) => (
              <option key={friend.id} value={friend.id}>
                {friend.name} ({friend.email})
              </option>
            ))}
          </select>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#718096', margin: 0 }}>
            No friends saved yet.{' '}
            <Link to="/friends">Add friends</Link> under More to pick them quickly when inviting.
          </p>
        )}
      </div>

      {recipients.map((recipient, index) => (
        <div key={index} style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>
              Member {index + 1}
            </span>
            {recipients.length > 1 && (
              <button
                type="button"
                onClick={() => removeRecipient(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e53e3e',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Remove
              </button>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <input
              type="email"
              className="form-input"
              value={recipient.recipientEmail}
              onChange={(e) => updateRecipient(index, 'recipientEmail', e.target.value)}
              placeholder="friend@example.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              type="tel"
              className="form-input"
              value={recipient.recipientPhone}
              onChange={(e) => updateRecipient(index, 'recipientPhone', e.target.value)}
              placeholder="Phone (optional)"
            />
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-secondary" onClick={addRecipient} style={{ width: '100%' }}>
        + Add another member
      </button>
    </div>
  );
};

export const createEmptyInviteRecipient = emptyRecipient;

export default InviteRecipientsForm;
