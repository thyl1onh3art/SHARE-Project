/// <reference types="@types/google.maps" />

// Ensure google namespace is available globally
declare global {
  interface Window {
    google: typeof google;
  }
}

export {};

