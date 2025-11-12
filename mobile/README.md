# SHARE Mobile (React Native)

This folder contains the native rewrite of the SHARE Project client built with [Expo](https://expo.dev/) and React Native. It lives alongside the existing web app (`frontend/`) so both experiences can evolve together while sharing the same backend.

## Prerequisites

- Node.js 18 or newer (matches the web project)
- Expo CLI (optional but recommended): `npm install -g expo-cli`
- Android Studio and/or Xcode for running native emulators, or the Expo Go app for running on a physical device

## Getting Started

```bash
cd mobile
npm install

# Start the development server (opens Expo Dev Tools)
npm start

# Alternative shortcuts
npm run android   # build/run on Android emulator or device
npm run ios       # build/run on iOS simulator (macOS only)
npm run web       # preview inside a browser
```

When the Expo Dev Tools open, choose:
- **Run on Android device/emulator** or use the `expo go` QR code on a physical device.
- **Run on iOS simulator** (macOS) or scan the QR code with the Expo Go app.

## API Configuration

The app targets the same backend as the web client. By default, the base URL is set in `app.json`:

```json
{
  "extra": {
    "apiBaseUrl": "https://share-project-production.up.railway.app/api"
  }
}
```

Override this at runtime by defining `EXPO_PUBLIC_API_URL` before starting Expo:

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000/api npm start
```

This is useful when running the backend locally (`npm run dev` in `/backend`).

## Project Structure

```
mobile/
├── App.tsx                # Entry point that wires providers and navigation
├── app.json               # Expo configuration (name, bundle IDs, API base URL)
├── package.json           # Dependencies & scripts
├── src/
│   ├── api/client.ts      # Axios instance pointing at the backend
│   ├── components/
│   │   └── LoadingOverlay.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── screens/           # Native versions of the major web screens
│       ├── DashboardScreen.tsx
│       ├── FinancialRecordsScreen.tsx
│       ├── LoginScreen.tsx
│       ├── RegisterScreen.tsx
│       ├── SettingsScreen.tsx
│       └── SharedAccountsScreen.tsx
└── tsconfig.json
```

### Auth & Shared Logic

The `AuthContext` mirrors the behaviour of the web app:

- Stores JWT tokens with `@react-native-async-storage/async-storage`
- Ensures `Authorization` headers on every request
- Exposes `login`, `register`, `sendVerificationCode`, `verifyEmail`, `updateProfile`, `deleteAccount`, and `logout`

Screens consume this context to stay in sync with the backend.

## Keeping Web + Mobile Aligned

- **Web app** remains in `frontend/` and continues to run with `npm start`.
- **Mobile app** in `mobile/` uses the same REST API. Update shared business rules in the backend so both clients stay consistent.
- When adding new endpoints, update both the React (web) and React Native clients as needed.

## Next Steps

- Connect any missing web features (email verification flows, gallery, etc.) to the mobile counterpart.
- Add platform-specific polish (native date pickers, notifications, biometric login).
- Configure custom icons/splash screens under `app.json` before shipping to stores.

If you need help extending the mobile app or reusing logic from the web version, let me know!
