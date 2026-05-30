// POST /api/generate-plan — Generate a personalized study plan using AI.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";
import { getTrackById } from "@/lib/exam-tracks";
import type { StudyPlan, StudyPlanWeek } from "@/lib/types";

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { examId, examDate, skillLevel, hoursPerWeek, studyDays } =
      await req.json();

    if (!examId || !examDate || !skillLevel || !hoursPerWeek) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const track = getTrackById(examId);
    if (!track) {
      return NextResponse.json(
        { error: "Unknown exam track" },
        { status: 400 }
      );
    }

    // Calculate weeks until exam
    const now = new Date();
    const exam = new Date(examDate);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const totalWeeks = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / msPerWeek));

    // Build the AI prompt
    const domainList = track.domains
      .map((d) => `- ${d.name} (${d.weight}%)`)
      .join("\n");

    const prompt = `You are JudyTutor™, an expert study plan generator.

Create a week-by-week study plan for the ${track.name} (${track.fullName}) exam.

Student profile:
- Skill level: ${skillLevel}
- Exam date: ${examDate} (${totalWeeks} weeks from now)
- Available hours per week: ${hoursPerWeek}
- Study days: ${(studyDays as string[]).join(", ")}

Exam domains:
${domainList}

Requirements:
1. Distribute all ${track.domainCount} domains across the available weeks.
2. Weight study time toward higher-weighted domains.
3. For a ${skillLevel} student, ${skillLevel === "beginner" ? "start with foundational concepts and build up" : skillLevel === "intermediate" ? "balance review with deeper dives" : "focus on weak areas and exam-specific strategies"}.
4. Include review weeks and a final practice exam week before the exam date.
5. Each week should list the domain IDs to cover, specific topics, and allocated hours.

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "weeks": [
    {
      "weekNumber": 1,
      "domains": ["domain_id_1"],
      "topics": ["Topic A", "Topic B"],
      "hoursAllocated": 10
    }
  ]
}

Use the domain IDs: ${track.domains.map((d) => d.id).join(", ")}`;

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: generate a basic plan without AI
      const plan = generateFallbackPlan(track, totalWeeks, hoursPerWeek);
      await savePlan(authUser.uid, examId, totalWeeks, plan);
      return NextResponse.json({ success: true, plan });
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
          { role: "system", content: "You are a study plan generator. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      console.error("OpenAI error:", aiRes.status);
      // Fallback to generated plan
      const plan = generateFallbackPlan(track, totalWeeks, hoursPerWeek);
      await savePlan(authUser.uid, examId, totalWeeks, plan);
      return NextResponse.json({ success: true, plan });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || "";

    let weeks: StudyPlanWeek[];
    try {
      const parsed = JSON.parse(content);
      weeks = (parsed.weeks as Array<Record<string, unknown>>).map(
        (w: Record<string, unknown>, i: number) => ({
          weekNumber: (w.weekNumber as number) || i + 1,
          startDate: getWeekStartDate(now, i),
          domains: (w.domains as string[]) || [],
          topics: (w.topics as string[]) || [],
          hoursAllocated: (w.hoursAllocated as number) || hoursPerWeek,
          completed: false,
        })
      );
    } catch {
      // JSON parse failed — use fallback
      weeks = generateFallbackPlan(track, totalWeeks, hoursPerWeek);
    }

    await savePlan(authUser.uid, examId, totalWeeks, weeks);

    return NextResponse.json({ success: true, totalWeeks, weeks });
  } catch (error) {
    console.error("Generate plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate study plan" },
      { status: 500 }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function savePlan(
  uid: string,
  examId: string,
  totalWeeks: number,
  weeks: StudyPlanWeek[]
) {
  const db = getFirestore();
  const plan: StudyPlan = {
    examId,
    generatedAt: new Date().toISOString(),
    totalWeeks,
    weeks,
  };
  await db.doc(`users/${uid}/studyPlan/current`).set(plan);
}

function getWeekStartDate(from: Date, weekOffset: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + weekOffset * 7);
  return d.toISOString().split("T")[0];
}

/**
 * Generate a basic study plan when AI is unavailable.
 * Distributes domains evenly across weeks, weighted by domain weight.
 */
function generateFallbackPlan(
  track: { domains: { id: string; name: string; weight: number }[] },
  totalWeeks: number,
  hoursPerWeek: number
): StudyPlanWeek[] {
  const domains = track.domains;
  if (!domains.length) return [];

  const now = new Date();
  const weeks: StudyPlanWeek[] = [];

  // Reserve last week for review
  const studyWeeks = Math.max(1, totalWeeks - 1);
  const weeksPerDomain = Math.max(1, Math.floor(studyWeeks / domains.length));

  let weekNum = 1;
  for (const domain of domains) {
    for (let i = 0; i < weeksPerDomain && weekNum <= studyWeeks; i++) {
      weeks.push({
        weekNumber: weekNum,
        startDate: getWeekStartDate(now, weekNum - 1),
        domains: [domain.id],
        topics: [`${domain.name} — Part ${i + 1}`],
        hoursAllocated: hoursPerWeek,
        completed: false,
      });
      weekNum++;
    }
  }

  // Fill remaining study weeks with highest-weighted domains
  const sorted = [...domains].sort((a, b) => b.weight - a.weight);
  let idx = 0;
  while (weekNum <= studyWeeks) {
    const d = sorted[idx % sorted.length];
    weeks.push({
      weekNumber: weekNum,
      startDate: getWeekStartDate(now, weekNum - 1),
      domains: [d.id],
      topics: [`${d.name} — Deep Dive`],
      hoursAllocated: hoursPerWeek,
      completed: false,
    });
    weekNum++;
    idx++;
  }

  // Final review week
  weeks.push({
    weekNumber: totalWeeks,
    startDate: getWeekStartDate(now, totalWeeks - 1),
    domains: domains.map((d) => d.id),
    topics: ["Full Review", "Practice Exam"],
    hoursAllocated: hoursPerWeek,
    completed: false,
  });

  return weeks;
}
