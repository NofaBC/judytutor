// lib/auth-helpers.ts
// Server-side helper to verify Firebase ID tokens from request headers.

import { NextRequest } from "next/server";
import { getAuth } from "@/lib/firebase-admin";

export interface AuthUser {
  uid: string;
  email: string;
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded user or null if invalid/missing.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || "" };
  } catch {
    return null;
  }
}
