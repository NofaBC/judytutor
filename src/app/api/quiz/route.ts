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
    ? `=== AMBIGUITY TRAINING MODE™ (CRITICAL) ===

You are generating questions for the CISSP exam. The CISSP does NOT test factual recall — it tests JUDGMENT, PRIORITIZATION, and MANAGERIAL THINKING.

QUESTION FORMAT RULES:
- Every question MUST be single-best-answer. NEVER use "select all that apply" or "which of the following" with multiple correct answers.
- Every question MUST have exactly 4 options (A, B, C, D).
- Exactly ONE option is the BEST answer. The other 3 must be PLAUSIBLE — not obviously wrong.
- At least 2 of the 4 options should be defensible choices that a reasonable security professional might select.
- The difference between the best answer and the runner-up should require managerial judgment to identify.

SCENARIO CONSTRUCTION RULES:
- Every question stem must describe a SPECIFIC SCENARIO with a named role (security manager, CISO, security director, incident commander) facing a DECISION.
- Include real-world constraints: business operations impact, time pressure, regulatory deadlines, budget limits, executive expectations.
- Ask "What should [role] do FIRST?" or "What is the BEST course of action?" or "What is the MOST important consideration?"
- NEVER ask simple definition or recall questions like "What is...?" or "Which protocol does...?"

ANSWER DESIGN RULES:
- The correct answer typically follows this CISSP pattern: assess before acting, protect people first, follow established policy, think organizationally, manage risk over fixing technology.
- Wrong answers should represent common mistakes: jumping to technical fixes before assessing, acting without authority, choosing tactical over strategic, prioritizing technology over people/process.
- A technician would often pick the wrong answer. A manager would pick the right one.

EXPLANATION RULES:
- "explanation" must explain why the best answer is best in terms of ORGANIZATIONAL RISK, business impact, and governance — not just technical correctness.
- "competingAnalysis" must address EACH wrong option individually: acknowledge its merit, then explain specifically why it is suboptimal compared to the best answer. Use the format: "Option A: [merit], but [why it falls short]. Option C: [merit], but [why it falls short]. Option D: [merit], but [why it falls short]."`
    : `Generate questions appropriate for this exam's format and difficulty level.`
}

Respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "stem": "A security manager discovers that... [specific scenario with a decision to make]. What should the security manager do FIRST?",
      "options": ["Plausible action A", "Plausible action B", "Plausible action C", "Plausible action D"],
      "correctIndex": 0,
      "explanation": "This is the best answer because from an organizational risk perspective... A manager would prioritize this because...",
      "competingAnalysis": "Option B: Has merit because [reason], but falls short because [reason]. Option C: Seems reasonable because [reason], but is suboptimal because [reason]. Option D: A technician might choose this because [reason], but a manager would not because [reason].",
      "domain": "domain_id",
      "topic": "Specific topic name",
      "questionType": "scenario"
    }
  ]
}

Available domain IDs: ${track.domains.map((d) => `${d.id} (${d.name})`).join(", ")}
Question types: scenario, best-answer, risk-prioritization, governance, management

IMPORTANT:
- All questions must be ORIGINAL — do not copy from any published question bank.
- Every question must have exactly 4 options. Single best answer only.
- correctIndex is 0-based (0 = first option).
- Generate exactly ${count} questions.
- Do NOT generate any factual recall questions. Every question must be scenario-based.
- If the student would answer in under 30 seconds, the question is too easy. Make them THINK.`;
}
