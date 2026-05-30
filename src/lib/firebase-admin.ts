// lib/firebase-admin.ts
// Shared Firebase Admin init for server-side use (API routes, middleware).
// Ported from judyva/api/_firebase.js — handles private key edge cases on Vercel.

import admin from "firebase-admin";

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) return "";
  let key = raw.trim();

  // Strip surrounding quotes (common when pasting from JSON)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Replace literal \n sequences with real newlines
  key = key.replace(/\\n/g, "\n");

  return key;
}

let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;

export function getFirestore(): admin.firestore.Firestore {
  initAdmin();
  if (!_db) {
    _db = admin.firestore();
  }
  return _db;
}

export function getAuth(): admin.auth.Auth {
  initAdmin();
  if (!_auth) {
    _auth = admin.auth();
  }
  return _auth;
}

function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = parsePrivateKey(process.env.FB_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase env vars. Required: FB_PROJECT_ID, FB_CLIENT_EMAIL, FB_PRIVATE_KEY"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export { admin };
