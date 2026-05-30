// lib/firebase-client.ts
// Firebase client SDK — used in the browser for authentication.
// Lazy-initialized to avoid errors during SSR/prerendering when env vars are absent.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FB_APP_ID || "",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export { getFirebaseApp as app, getFirebaseAuth as auth };
