// POST /api/quiz/submit — Score a completed quiz and save results.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";
import type { QuizQuestion, QuizAnswer, QuizResult, QuizType } from "@/lib/types";

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      quizType,
      domain,
      questions,
      answers,
    }: {
      quizType: QuizType;
      domain: string;
      questions: QuizQuestion[];
      answers: { questionIndex: number; selectedIndex: number; timeSpentSeconds: number }[];
    } = await req.json();

    if (!questions?.length || !answers?.length) {
      return NextResponse.json({ error: "Questions and answers required" }, { status: 400 });
    }

    const db = getFirestore();
    const uid = authUser.uid;

    // Load user profile for examId
    const userSnap = await db.doc(`users/${uid}`).get();
    const examId = userSnap.exists ? (userSnap.data() as { selectedExam: string }).selectedExam : "";

    // Score the quiz
    const scoredAnswers: QuizAnswer[] = answers.map((a) => ({
      questionIndex: a.questionIndex,
      selectedIndex: a.selectedIndex,
      correct: questions[a.questionIndex]?.correctIndex === a.selectedIndex,
      timeSpentSeconds: a.timeSpentSeconds || 0,
    }));

    const correctCount = scoredAnswers.filter((a) => a.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);

    // Identify weak areas — topics/domains where answers were wrong
    const weakAreas: string[] = [];
    scoredAnswers.forEach((a) => {
      if (!a.correct) {
        const q = questions[a.questionIndex];
        if (q?.topic && !weakAreas.includes(q.topic)) {
          weakAreas.push(q.topic);
        }
        if (q?.domain && !weakAreas.includes(q.domain)) {
          weakAreas.push(q.domain);
        }
      }
    });

    // Save quiz result
    const quizRef = db.collection(`users/${uid}/quizzes`).doc();
    const result: QuizResult = {
      id: quizRef.id,
      userId: uid,
      examId,
      quizType,
      domain: domain || "all",
      questions,
      answers: scoredAnswers,
      score,
      totalQuestions: questions.length,
      correctCount,
      weakAreas,
      completedAt: new Date().toISOString(),
    };

    await quizRef.set(result);

    return NextResponse.json({
      quizId: quizRef.id,
      score,
      correctCount,
      totalQuestions: questions.length,
      weakAreas,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json({ error: "Quiz submission failed" }, { status: 500 });
  }
}
