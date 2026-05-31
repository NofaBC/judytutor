// POST /api/quiz — Generate a quiz using AI.
// Supports topic, domain, review, and practice-exam quiz types.
// CISSP quizzes use Ambiguity Training Mode™.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";
import { getTrackById } from "@/lib/exam-tracks";
import { getCurriculumByDomain } from "@/lib/cissp-curriculum";
import type { UserProfile, QuizType, QuizQuestion } from "@/lib/types";

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      quizType,
      domain,
      questionCount,
    }: { quizType: QuizType; domain?: string; questionCount?: number } =
      await req.json();

    if (!quizType) {
      return NextResponse.json({ error: "quizType is required" }, { status: 400 });
    }

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

    const count = Math.min(questionCount || 5, 20);

    // Build the AI prompt
    const prompt = buildQuizPrompt(track, user, quizType, domain, count);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are JudyTutor™, an expert exam question generator. Respond with valid JSON only. No markdown, no explanation outside JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      console.error("OpenAI quiz error:", aiRes.status);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || "";

    let questions: QuizQuestion[];
    try {
      const parsed = JSON.parse(content);
      questions = (parsed.questions as Array<Record<string, unknown>>).map(
        (q: Record<string, unknown>) => ({
          stem: (q.stem as string) || "",
          options: (q.options as string[]) || [],
          correctIndex: (q.correctIndex as number) ?? 0,
          explanation: (q.explanation as string) || "",
          competingAnalysis: (q.competingAnalysis as string) || "",
          domain: (q.domain as string) || domain || "",
          topic: (q.topic as string) || "",
          questionType: (q.questionType as QuizQuestion["questionType"]) || "scenario",
        })
      );
    } catch {
      return NextResponse.json(
        { error: "Failed to parse quiz questions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quizType,
      domain: domain || "all",
      questions,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: "Quiz generation failed" }, { status: 500 });
  }
}

function buildQuizPrompt(
  track: { name: string; fullName: string; domains: { id: string; name: string; weight: number }[] },
  user: UserProfile,
  quizType: QuizType,
  domain: string | undefined,
  count: number
): string {
  // Get curriculum context if domain-specific
  let domainContext = "";
  if (domain) {
    const curriculum = getCurriculumByDomain(domain);
    if (curriculum) {
      domainContext = `
Focus domain: ${curriculum.name} (${curriculum.weight}% of exam)
Key concepts: ${curriculum.concepts.join(", ")}
Key terminology: ${curriculum.terminology.join(", ")}
Scenario templates for inspiration: ${curriculum.scenarioTemplates.join(" | ")}`;
    }
  }

  const quizTypeInstructions: Record<QuizType, string> = {
    topic: "Generate questions focused on a specific topic within the domain.",
    domain: "Generate questions covering the breadth of the specified domain.",
    review:
      "Generate review questions that test previously studied material across multiple domains.",
    "practice-exam":
      "Generate a realistic practice exam with questions distributed across all domains, weighted by exam blueprint.",
  };

  const isCISSP = track.name === "CISSP";

  return `Generate ${count} original ${track.name} exam-preparation questions.

Exam: ${track.name} (${track.fullName})
Student skill level: ${user.skillLevel}
Quiz type: ${quizType} — ${quizTypeInstructions[quizType]}
${domainContext}

${
  isCISSP
    ? `=== AMBIGUITY TRAINING MODE™ ===
This is CRITICAL for CISSP preparation:
- Generate scenario-based questions where multiple answers seem technically correct.
- The student must identify the BEST answer, not just a correct one.
- Question types to include: scenario-based, best-answer, risk-prioritization, governance, management-focused.
- Think like a CISO — questions should test judgment, not just recall.
- For each question, explain WHY the best answer is best AND why each competing answer is less optimal.
- Include business implications and risk implications in explanations.`
    : `Generate questions appropriate for this exam's format and difficulty level.`
}

Respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "stem": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is the BEST choice...",
      "competingAnalysis": "Why Option B is close but suboptimal because... Option C fails because... Option D is wrong because...",
      "domain": "domain_id",
      "topic": "Specific topic name",
      "questionType": "scenario"
    }
  ]
}

Available domain IDs: ${track.domains.map((d) => `${d.id} (${d.name})`).join(", ")}
Question types: scenario, best-answer, risk-prioritization, governance, management, factual

IMPORTANT:
- All questions must be ORIGINAL — do not copy from any published question bank.
- Every question must have exactly 4 options.
- correctIndex is 0-based (0 = first option).
- Generate exactly ${count} questions.`;
}
