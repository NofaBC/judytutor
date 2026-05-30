// POST /api/user/onboarding — Save onboarding selections to user profile.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { examCategory, selectedExam, examDate, skillLevel, studySchedule } =
      await req.json();

    if (!selectedExam || !examDate || !skillLevel || !studySchedule) {
      return NextResponse.json(
        { error: "Missing required onboarding fields" },
        { status: 400 }
      );
    }

    const db = getFirestore();

    await db.doc(`users/${authUser.uid}`).update({
      examCategory: examCategory || "",
      selectedExam,
      examDate,
      skillLevel,
      studySchedule,
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding data" },
      { status: 500 }
    );
  }
}
