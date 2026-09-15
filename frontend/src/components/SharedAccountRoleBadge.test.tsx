import React from 'react';
import { render, screen } from '@testing-library/react';
import SharedAccountRoleBadge from './SharedAccountRoleBadge';

describe('SharedAccountRoleBadge', () => {
  it('shows Organiser with icon and text, not colour alone', () => {
    const { container } = render(<SharedAccountRoleBadge role="organiser" />);
    const badge = screen.getByRole('status', { name: 'Organiser' });
    expect(badge).toHaveClass('shared-account-role-badge');
    expect(badge).toHaveTextContent('Organiser');
    expect(badge.querySelector('[aria-hidden="true"]')).toHaveTextContent('👑');
    expect(container.querySelector('.shared-account-role-organiser')).toBeTruthy();
  });

  it('shows Shared with you with icon and text', () => {
    render(<SharedAccountRoleBadge role="shared" />);
    const badge = screen.getByRole('status', { name: 'Shared with you' });
    expect(badge).toHaveTextContent('Shared with you');
    expect(badge.querySelector('[aria-hidden="true"]')).toHaveTextContent('👥');
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('renders nothing when the role cannot be determined', () => {
    const { container } = render(<SharedAccountRoleBadge role={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps icon and text together so meaning is not hover-only or colour-only', () => {
    render(<SharedAccountRoleBadge role="shared" />);
    const badge = screen.getByRole('status', { name: 'Shared with you' });
    expect(badge).toHaveClass('shared-account-role-badge');
    expect(badge).toHaveClass('shared-account-role-shared');
    expect(badge.textContent).toContain('Shared with you');
    expect(badge).not.toHaveAttribute('title');
  });
});
