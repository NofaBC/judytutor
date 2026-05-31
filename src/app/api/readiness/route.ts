// POST /api/readiness — Compute readiness score, confidence, and verdict.
// Uses domain weights from exam blueprint for weighted scoring.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";
import { getTrackById } from "@/lib/exam-tracks";
import type {
  UserProfile,
  QuizResult,
  UserProgress,
  DomainProgress,
  ReadinessVerdict,
} from "@/lib/types";

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

    if (!track || !track.domains.length) {
      return NextResponse.json({ error: "No exam selected" }, { status: 400 });
    }

    // Load quiz history
    const quizSnap = await db
      .collection(`users/${uid}/quizzes`)
      .orderBy("completedAt", "desc")
      .limit(200)
      .get();

    const quizzes = quizSnap.docs.map((d) => d.data() as QuizResult);

    // Aggregate per-domain stats
    const domainScores: Record<string, { scores: number[]; lastDate: string }> = {};
    for (const d of track.domains) {
      domainScores[d.id] = { scores: [], lastDate: "" };
    }

    for (const quiz of quizzes) {
      // Per-question domain tracking
      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        const a = quiz.answers[i];
        if (!q || !a || !domainScores[q.domain]) continue;
        domainScores[q.domain].scores.push(a.correct ? 100 : 0);
        if (
          !domainScores[q.domain].lastDate ||
          quiz.completedAt > domainScores[q.domain].lastDate
        ) {
          domainScores[q.domain].lastDate = quiz.completedAt;
        }
      }
    }

    // Build domain progress with weighted readiness
    const totalWeight = track.domains.reduce((s, d) => s + d.weight, 0);
    let weightedSum = 0;
    const scoreVariances: number[] = [];

    const domains: DomainProgress[] = track.domains.map((d) => {
      const ds = domainScores[d.id];
      const avg =
        ds.scores.length > 0
          ? Math.round(ds.scores.reduce((s, v) => s + v, 0) / ds.scores.length)
          : 0;

      // Weighted contribution
      weightedSum += avg * (d.weight / totalWeight);

      // Variance for confidence (consistency)
      if (ds.scores.length >= 2) {
        const mean = ds.scores.reduce((s, v) => s + v, 0) / ds.scores.length;
        const variance =
          ds.scores.reduce((s, v) => s + (v - mean) ** 2, 0) / ds.scores.length;
        scoreVariances.push(variance);
      }

      // Recency factor — boost score if studied recently (within 7 days)
      let recencyBonus = 0;
      if (ds.lastDate) {
        const daysSince = Math.ceil(
          (Date.now() - new Date(ds.lastDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= 3) recencyBonus = 5;
        else if (daysSince <= 7) recencyBonus = 2;
      }

      return {
        domainId: d.id,
        domainName: d.name,
        quizScoreAvg: Math.min(100, avg + recencyBonus),
        quizAttempts: ds.scores.length,
        lessonsCompleted: 0,
        totalLessons: 0,
        lastStudied: ds.lastDate,
      };
    });

    // Readiness score (weighted by exam blueprint)
    const readinessScore = Math.round(weightedSum);

    // Confidence score — higher when scores are consistent (low variance)
    let confidenceScore = 0;
    if (scoreVariances.length > 0) {
      const avgVariance =
        scoreVariances.reduce((s, v) => s + v, 0) / scoreVariances.length;
      // Max variance for binary (0/100) scores is 2500
      // Lower variance = higher confidence
      confidenceScore = Math.round(Math.max(0, 100 - avgVariance / 25));
    }

    // Weak domains (below 70% or untested)
    const weakDomains = domains
      .filter((d) => d.quizAttempts === 0 || d.quizScoreAvg < 70)
      .map((d) => d.domainId);

    // Verdict
    let readinessVerdict: ReadinessVerdict;
    if (readinessScore >= 80 && weakDomains.length <= 1) {
      readinessVerdict = "ready";
    } else if (readinessScore >= 60) {
      readinessVerdict = "almost-ready";
    } else {
      readinessVerdict = "needs-preparation";
    }

    // Days until exam
    let daysUntilExam: number | null = null;
    let recommendation = "";
    if (user.examDate) {
      daysUntilExam = Math.ceil(
        (new Date(user.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (readinessVerdict === "needs-preparation" && daysUntilExam <= 14) {
        recommendation =
          "Your exam is approaching but readiness is low. Consider extending your preparation time.";
      } else if (readinessVerdict === "almost-ready" && daysUntilExam <= 7) {
        recommendation =
          "You're almost ready. Focus intensively on your weak domains this week.";
      } else if (readinessVerdict === "ready") {
        recommendation =
          "You're showing strong readiness. Keep reviewing and stay confident.";
      }
    }

    // Study streak
    const quizDates = [
      ...new Set(quizzes.map((q) => q.completedAt.split("T")[0])),
    ]
      .sort()
      .reverse();
    let streak = 0;
    let checkDate = new Date().toISOString().split("T")[0];
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

    // Save progress
    const progress: UserProgress = {
      userId: uid,
      examId: user.selectedExam,
      lessonsCompleted: 0,
      totalQuizzesTaken: quizzes.length,
      overallQuizAvg:
        quizzes.length > 0
          ? Math.round(
              quizzes.reduce((s, q) => s + q.score, 0) / quizzes.length
            )
          : 0,
      currentStreak: streak,
      longestStreak: streak,
      domains,
      readinessScore,
      confidenceScore,
      readinessVerdict,
      weakDomains,
      lastStudied: quizzes[0]?.completedAt || "",
      updatedAt: new Date().toISOString(),
    };

    await db.doc(`users/${uid}/progress/current`).set(progress);

    return NextResponse.json({
      readinessScore,
      confidenceScore,
      readinessVerdict,
      domains,
      weakDomains,
      totalQuizzesTaken: quizzes.length,
      currentStreak: streak,
      daysUntilExam,
      recommendation,
    });
  } catch (error) {
    console.error("Readiness error:", error);
    return NextResponse.json({ error: "Readiness calculation failed" }, { status: 500 });
  }
}
