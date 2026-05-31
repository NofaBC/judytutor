// POST /api/tutor — AI tutoring endpoint.
// Loads user context, builds persona-aware prompt, calls OpenAI, saves session.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";
import { buildTutorSystemPrompt, summarizeSession } from "@/lib/tutor-persona";
import type { UserProfile, UserProgress, ChatMessage, TutoringSession } from "@/lib/types";

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      message,
      sessionId,
      domain,
    }: { message: string; sessionId?: string; domain?: string } =
      await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = getFirestore();
    const uid = authUser.uid;

    // Load user profile
    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    const user = userSnap.data() as UserProfile;

    // Load progress (may not exist yet)
    let progress: UserProgress | null = null;
    const progressSnap = await db.doc(`users/${uid}/progress/current`).get();
    if (progressSnap.exists) {
      progress = progressSnap.data() as UserProgress;
    }

    // Load or create session
    let session: TutoringSession;
    let sessionRef: FirebaseFirestore.DocumentReference;
    let priorSummary = "";

    if (sessionId) {
      // Continue existing session
      sessionRef = db.doc(`users/${uid}/sessions/${sessionId}`);
      const sessionSnap = await sessionRef.get();
      if (sessionSnap.exists) {
        session = sessionSnap.data() as TutoringSession;
      } else {
        // Session not found — create new
        session = createNewSession(uid, user.selectedExam, domain);
        sessionRef = db.collection(`users/${uid}/sessions`).doc();
        session.id = sessionRef.id;
      }
    } else {
      // Check for most recent session to get continuity summary
      const recentSessions = await db
        .collection(`users/${uid}/sessions`)
        .orderBy("updatedAt", "desc")
        .limit(1)
        .get();

      if (!recentSessions.empty) {
        const lastSession = recentSessions.docs[0].data() as TutoringSession;
        priorSummary = summarizeSession(lastSession.messages);
      }

      // Create new session
      sessionRef = db.collection(`users/${uid}/sessions`).doc();
      session = createNewSession(uid, user.selectedExam, domain);
      session.id = sessionRef.id;
    }

    // Add user message to session
    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: "user", content: message, timestamp: now };
    session.messages.push(userMsg);

    // Build system prompt
    const systemPrompt = buildTutorSystemPrompt({
      user,
      progress,
      currentDomain: domain || session.domain,
      sessionSummary: priorSummary,
    });

    // Build messages for OpenAI (system + conversation history)
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Include conversation history (last 20 messages to stay within token limits)
    const historyMessages = session.messages.slice(-20);
    for (const msg of historyMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: aiMessages,
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("OpenAI error:", aiRes.status, errBody);
      return NextResponse.json(
        { error: "AI service error" },
        { status: 502 }
      );
    }

    const aiData = await aiRes.json();
    const assistantContent =
      aiData.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    // Add assistant response to session
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: assistantContent,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(assistantMsg);

    // Update session metadata
    session.updatedAt = new Date().toISOString();
    if (domain) {
      session.domain = domain;
    }

    // Save session to Firestore
    await sessionRef.set(session);

    return NextResponse.json({
      response: assistantContent,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Tutor API error:", error);
    return NextResponse.json(
      { error: "Tutoring request failed" },
      { status: 500 }
    );
  }
}

function createNewSession(
  userId: string,
  examId: string,
  domain?: string
): TutoringSession {
  const now = new Date().toISOString();
  return {
    id: "",
    userId,
    examId,
    domain: domain || "",
    topic: "",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
