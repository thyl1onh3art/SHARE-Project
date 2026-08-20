import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the unauthenticated app shell', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  expect(screen.getAllByText(/SHARE/i).length).toBeGreaterThan(0);
});
