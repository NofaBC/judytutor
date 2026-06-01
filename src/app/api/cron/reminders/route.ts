// GET /api/cron/reminders — Vercel Cron job to send study reminders.
// Queries users with reminders enabled and sends email nudges.
// Reuses nodemailer pattern from JudyVA's report.js.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";
import type { UserProfile, UserProgress } from "@/lib/types";
import { getTrackById } from "@/lib/exam-tracks";

// Vercel Cron uses GET
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getFirestore();

    // Query users with reminders enabled
    const usersSnap = await db
      .collection("users")
      .where("reminderPrefs.enabled", "==", true)
      .where("reminderPrefs.email", "==", true)
      .where("onboardingComplete", "==", true)
      .limit(100)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ sent: 0, message: "No users with reminders enabled" });
    }

    // Set up email transport
    const transporter = createTransporter();
    if (!transporter) {
      return NextResponse.json({ error: "Email not configured" }, { status: 503 });
    }

    let sent = 0;

    for (const doc of usersSnap.docs) {
      const user = doc.data() as UserProfile;

      try {
        // Load progress
        const progressSnap = await db.doc(`users/${user.uid}/progress/current`).get();
        const progress = progressSnap.exists
          ? (progressSnap.data() as UserProgress)
          : null;

        // Determine reminder type and content
        const emailContent = buildReminderEmail(user, progress);
        if (!emailContent) continue;

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "JudyTutor™ <noreply@judytutor.com>",
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${user.email}:`, err);
      }
    }

    return NextResponse.json({ sent, total: usersSnap.size });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return NextResponse.json({ error: "Reminder job failed" }, { status: 500 });
  }
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !smtpUser || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass },
  });
}

function buildReminderEmail(
  user: UserProfile,
  progress: UserProgress | null
): { subject: string; html: string } | null {
  const name = user.displayName || "Student";
  const track = getTrackById(user.selectedExam);
  const examName = track?.name || user.selectedExam.toUpperCase();

  // Calculate days until exam
  let daysLeft: number | null = null;
  if (user.examDate) {
    daysLeft = Math.ceil(
      (new Date(user.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }

  // Determine reminder type
  let subject: string;
  let body: string;

  if (progress && progress.currentStreak > 0 && progress.currentStreak >= 3) {
    // Streak encouragement
    subject = `🔥 ${progress.currentStreak}-day streak! Keep it going, ${name}`;
    body = `
      <p>Hi ${name},</p>
      <p>You're on a <strong>${progress.currentStreak}-day study streak</strong>! Don't break it — log in today to keep your momentum going.</p>
      ${daysLeft !== null && daysLeft > 0 ? `<p>Your ${examName} exam is in <strong>${daysLeft} days</strong>.</p>` : ""}
      <p>Your readiness score: <strong>${progress.readinessScore}%</strong></p>
    `;
  } else if (progress && progress.weakDomains.length > 0) {
    // Weak area nudge
    subject = `📚 Time to study, ${name} — focus on your weak areas`;
    body = `
      <p>Hi ${name},</p>
      <p>JudyTutor has identified some areas that need attention:</p>
      <ul>${progress.weakDomains.map((d) => `<li>${d}</li>`).join("")}</ul>
      <p>Log in and take a quiz or study with Judy to strengthen these domains.</p>
      ${daysLeft !== null && daysLeft > 0 ? `<p>Your ${examName} exam is in <strong>${daysLeft} days</strong>.</p>` : ""}
    `;
  } else if (daysLeft !== null && daysLeft > 0 && daysLeft <= 30) {
    // Exam approaching
    subject = `⏰ ${daysLeft} days until your ${examName} exam, ${name}`;
    body = `
      <p>Hi ${name},</p>
      <p>Your ${examName} exam is in <strong>${daysLeft} days</strong>. Make sure you're studying consistently.</p>
      <p>Log in to JudyTutor to review your progress and take a practice quiz.</p>
    `;
  } else {
    // General study nudge
    subject = `📖 Time to study, ${name} — JudyTutor is ready`;
    body = `
      <p>Hi ${name},</p>
      <p>It's time for your ${examName} study session. Consistency is key to exam success!</p>
      <p>Log in to continue where you left off with JudyTutor.</p>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      ${body}
      <p style="margin-top: 24px;">
        <a href="https://judytutor.vercel.app/dashboard" 
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Open JudyTutor
        </a>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        JudyTutor™ by NOFA Business Consulting<br/>
        <a href="https://judytutor.vercel.app/dashboard" style="color: #9ca3af;">Manage reminder preferences</a>
      </p>
    </div>
  `;

  return { subject, html };
}
