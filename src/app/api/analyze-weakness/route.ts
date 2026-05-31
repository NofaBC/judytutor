// POST /api/analyze-weakness — Analyze quiz history and update progress.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";
import { getTrackById } from "@/lib/exam-tracks";
import type { UserProfile, QuizResult, UserProgress, DomainProgress } from "@/lib/types";

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const uid = authUser.uid;

    // Load user profile
    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = userSnap.data() as UserProfile;
    const track = getTrackById(user.selectedExam);

    if (!track) {
      return NextResponse.json({ error: "No exam selected" }, { status: 400 });
    }

    // Load all quiz results
    const quizSnap = await db
      .collection(`users/${uid}/quizzes`)
      .orderBy("completedAt", "desc")
      .limit(100)
      .get();

    if (quizSnap.empty) {
      return NextResponse.json({
        message: "No quiz history yet",
        progress: null,
      });
    }

    const quizzes = quizSnap.docs.map((d) => d.data() as QuizResult);

    // Aggregate per-domain performance
    const domainStats: Record<
      string,
      { totalCorrect: number; totalQuestions: number; attempts: number; lastDate: string }
    > = {};

    for (const quiz of quizzes) {
      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        const a = quiz.answers[i];
        if (!q || !a) continue;

        const domId = q.domain || "unknown";
        if (!domainStats[domId]) {
          domainStats[domId] = { totalCorrect: 0, totalQuestions: 0, attempts: 0, lastDate: "" };
        }
        domainStats[domId].totalQuestions++;
        if (a.correct) domainStats[domId].totalCorrect++;
      }

      // Count quiz-level domain attempts
      const quizDomain = quiz.domain || "all";
      if (quizDomain !== "all" && domainStats[quizDomain]) {
        domainStats[quizDomain].attempts++;
        if (!domainStats[quizDomain].lastDate || quiz.completedAt > domainStats[quizDomain].lastDate) {
          domainStats[quizDomain].lastDate = quiz.completedAt;
        }
      }
    }

    // Build domain progress
    const domains: DomainProgress[] = track.domains.map((d) => {
      const stats = domainStats[d.id];
      return {
        domainId: d.id,
        domainName: d.name,
        quizScoreAvg: stats
          ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
          : 0,
        quizAttempts: stats?.attempts || 0,
        lessonsCompleted: 0, // Updated when tutoring sessions are tracked
        totalLessons: 0,
        lastStudied: stats?.lastDate || "",
      };
    });

    // Identify weak domains (below 70% average)
    const weakDomains = domains
      .filter((d) => d.quizAttempts > 0 && d.quizScoreAvg < 70)
      .map((d) => d.domainId);

    // Overall stats
    const totalCorrect = quizzes.reduce((sum, q) => sum + q.correctCount, 0);
    const totalQuestions = quizzes.reduce((sum, q) => sum + q.totalQuestions, 0);
    const overallAvg = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Compute study streak (consecutive days with quiz activity)
    const quizDates = [...new Set(quizzes.map((q) => q.completedAt.split("T")[0]))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let checkDate = today;
    for (const d of quizDates) {
      if (d === checkDate) {
        streak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split("T")[0];
      } else {
        break;
      }
    }

    // Build and save progress
    const progress: UserProgress = {
      userId: uid,
      examId: user.selectedExam,
      lessonsCompleted: 0,
      totalQuizzesTaken: quizzes.length,
      overallQuizAvg: overallAvg,
      currentStreak: streak,
      longestStreak: streak, // Simplified — would track historical max in production
      domains,
      readinessScore: overallAvg, // Simplified — Phase 5 adds weighted calculation
      confidenceScore: 0,
      readinessVerdict: overallAvg >= 80 ? "ready" : overallAvg >= 60 ? "almost-ready" : "needs-preparation",
      weakDomains,
      lastStudied: quizzes[0]?.completedAt || "",
      updatedAt: new Date().toISOString(),
    };

    await db.doc(`users/${uid}/progress/current`).set(progress);

    return NextResponse.json({
      progress,
      weakDomains,
      overallAvg,
      totalQuizzesTaken: quizzes.length,
    });
  } catch (error) {
    console.error("Weakness analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
