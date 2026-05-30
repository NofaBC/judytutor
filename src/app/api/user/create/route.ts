// POST /api/user/create — Create user profile in Firestore after signup.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import type { UserProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { uid, email, displayName } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: "uid and email are required" }, { status: 400 });
    }

    const db = getFirestore();
    const now = new Date().toISOString();

    const profile: UserProfile = {
      uid,
      email,
      displayName: displayName || "",
      selectedExam: "",
      examCategory: "",
      examDate: "",
      skillLevel: "beginner",
      studySchedule: {
        days: [],
        preferredTimes: [],
        hoursPerWeek: 0,
      },
      reminderPrefs: {
        enabled: true,
        email: true,
        preferredTime: "09:00",
      },
      adminAccess: false,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.doc(`users/${uid}`).set(profile);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
