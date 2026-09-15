import React from 'react';
import { SharedAccountRole } from '../utils/sharedAccountRole';

interface SharedAccountRoleBadgeProps {
  role: SharedAccountRole | null;
}

const ROLE_COPY: Record<SharedAccountRole, { icon: string; label: string }> = {
  organiser: { icon: '👑', label: 'Organiser' },
  shared: { icon: '👥', label: 'Shared with you' }
};

const SharedAccountRoleBadge: React.FC<SharedAccountRoleBadgeProps> = ({ role }) => {
  if (!role) return null;
  const copy = ROLE_COPY[role];
  return (
    <span
      className={`shared-account-role-badge shared-account-role-${role}`}
      role="status"
      aria-label={copy.label}
    >
      <span className="shared-account-role-icon" aria-hidden="true">{copy.icon}</span>
      {copy.label}
    </span>
  );
};

export default SharedAccountRoleBadge;
