import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress browser extension errors that don't affect app functionality
// This prevents performance issues from extension initialization failures
const originalError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.join(' ');
  // Filter out WAX Cloud Wallet extension errors
  if (
    errorMessage.includes('CS WAX not initialized') ||
    errorMessage.includes('ContentIsolatedWorld') ||
    (errorMessage.includes('WAX') && errorMessage.includes('not initialized'))
  ) {
    // Silently ignore these browser extension errors
    return;
  }
  // Log all other errors normally
  originalError.apply(console, args);
};

// Also suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString() || '';
  if (
    reason.includes('CS WAX not initialized') ||
    reason.includes('ContentIsolatedWorld') ||
    (reason.includes('WAX') && reason.includes('not initialized'))
  ) {
    event.preventDefault(); // Prevent the error from appearing in console
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
