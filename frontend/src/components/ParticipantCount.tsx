import React, { useState } from 'react';

interface Participant {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

interface ParticipantCountProps {
  owner: string | Participant | null | undefined;
  members: Array<string | Participant>;
  currentUser?: Participant | null;
  scrollTargetId?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const getParticipantName = (person: Participant, fallback: string): string => {
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  if (fullName) {
    return fullName;
  }
  if (person.name) {
    return person.name;
  }
  if (person.email) {
    return person.email;
  }
  return fallback;
};

const normalizeId = (value: string | Participant | null | undefined): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value._id || value.id;
};

const getOwnerId = (owner: string | Participant | null | undefined): string | undefined => {
  return normalizeId(owner);
};

const getCurrentUserId = (currentUser?: Participant | null): string | undefined => {
  if (!currentUser) return undefined;
  return currentUser._id || currentUser.id;
};

export const getParticipants = (
  owner: string | Participant | null | undefined,
  members: Array<string | Participant>,
  currentUser?: Participant | null
): Array<{ name: string; role: string; email?: string }> => {
  const participants: Array<{ name: string; role: string; email?: string }> = [];
  const ownerId = getOwnerId(owner);
  const seenIds = new Set<string>();

  if (owner && typeof owner === 'object') {
    participants.push({
      name: getParticipantName(owner, 'Account creator'),
      role: 'Owner',
      email: owner.email
    });
  } else if (ownerId) {
    const currentUserId = getCurrentUserId(currentUser);
    if (currentUser && currentUserId === ownerId) {
      participants.push({
        name: getParticipantName(currentUser, 'Account creator'),
        role: 'Owner',
        email: currentUser.email
      });
    } else {
      participants.push({
        name: 'Account creator',
        role: 'Owner'
      });
    }
  }

  if (ownerId) {
    seenIds.add(ownerId);
  }

  const memberArray = Array.isArray(members) ? members : [];
  memberArray.forEach((member, index) => {
    const memberId = normalizeId(member);
    if (memberId && seenIds.has(memberId)) return;
    if (memberId) seenIds.add(memberId);

    if (typeof member === 'object' && member) {
      participants.push({
        name: getParticipantName(member, `Member ${index + 1}`),
        role: 'Member',
        email: member.email
      });
    } else if (memberId) {
      participants.push({
        name: `Member ${index + 1}`,
        role: 'Member'
      });
    }
  });

  return participants;
};

const ParticipantCount: React.FC<ParticipantCountProps> = ({
  owner,
  members,
  currentUser,
  scrollTargetId,
  style,
  onClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const participants = getParticipants(owner, members, currentUser);
  const count = participants.length;
  const tooltipText = participants.map((p) => p.name).join(', ');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick?.(e);

    if (scrollTargetId) {
      const element = document.getElementById(scrollTargetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.style.transition = 'background-color 0.3s';
        element.style.backgroundColor = '#ebf4ff';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 1500);
        return;
      }
    }

    setShowModal(true);
  };

  if (count === 0) {
    return null;
  }

  return (
    <>
      <span
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          position: 'relative',
          cursor: 'pointer',
          textDecoration: 'underline dotted',
          ...style
        }}
        title={tooltipText}
      >
        {count} {count === 1 ? 'member' : 'members'}
        {showTooltip && tooltipText && (
          <span
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#2d3748',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              maxWidth: '280px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {tooltipText}
          </span>
        )}
      </span>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '420px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Participants ({count})</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {participants.map((participant, index) => (
                <li
                  key={`${participant.name}-${index}`}
                  style={{
                    padding: '0.75rem',
                    borderBottom: index < participants.length - 1 ? '1px solid #e2e8f0' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#2d3748' }}>{participant.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                    {participant.role}
                    {participant.email ? ` · ${participant.email}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default ParticipantCount;
