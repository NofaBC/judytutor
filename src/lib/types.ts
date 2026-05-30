// lib/types.ts
// Firestore document types for JudyTutor.

// ── User profile ─────────────────────────────────────────────

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface StudySchedule {
  days: string[]; // e.g. ["monday", "wednesday", "friday"]
  preferredTimes: string[]; // e.g. ["morning", "evening"]
  hoursPerWeek: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  selectedExam: string; // examTrack ID, e.g. "cissp"
  examCategory: string; // e.g. "it-cybersecurity"
  examDate: string; // ISO date string
  skillLevel: SkillLevel;
  studySchedule: StudySchedule;
  reminderPrefs: {
    enabled: boolean;
    email: boolean;
    preferredTime: string; // e.g. "09:00"
  };
  adminAccess: boolean; // bypass subscription check
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Study plan ───────────────────────────────────────────────

export interface StudyPlanWeek {
  weekNumber: number;
  startDate: string;
  domains: string[]; // domain IDs to cover
  topics: string[];
  hoursAllocated: number;
  completed: boolean;
}

export interface StudyPlan {
  examId: string;
  generatedAt: string;
  totalWeeks: number;
  weeks: StudyPlanWeek[];
}

// ── Tutoring sessions ────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface TutoringSession {
  id: string;
  userId: string;
  examId: string;
  domain: string;
  topic: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ── Quizzes ──────────────────────────────────────────────────

export interface QuizQuestion {
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string; // why correct answer is best
  competingAnalysis: string; // why other options are suboptimal
  domain: string;
  topic: string;
  questionType:
    | "scenario"
    | "best-answer"
    | "risk-prioritization"
    | "governance"
    | "management"
    | "factual";
}

export interface QuizAnswer {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
  timeSpentSeconds: number;
}

export type QuizType = "topic" | "domain" | "review" | "practice-exam";

export interface QuizResult {
  id: string;
  userId: string;
  examId: string;
  quizType: QuizType;
  domain: string;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  score: number; // percentage 0-100
  totalQuestions: number;
  correctCount: number;
  weakAreas: string[]; // topics/concepts missed
  completedAt: string;
}

// ── Progress & readiness ─────────────────────────────────────

export interface DomainProgress {
  domainId: string;
  domainName: string;
  quizScoreAvg: number; // 0-100
  quizAttempts: number;
  lessonsCompleted: number;
  totalLessons: number;
  lastStudied: string;
}

export type ReadinessVerdict = "ready" | "almost-ready" | "needs-preparation";

export interface UserProgress {
  userId: string;
  examId: string;
  lessonsCompleted: number;
  totalQuizzesTaken: number;
  overallQuizAvg: number;
  currentStreak: number; // consecutive days
  longestStreak: number;
  domains: DomainProgress[];
  readinessScore: number; // 0-100
  confidenceScore: number; // 0-100
  readinessVerdict: ReadinessVerdict;
  weakDomains: string[];
  lastStudied: string;
  updatedAt: string;
}

// ── Exam tracks & curriculum ─────────────────────────────────

export interface ExamTrack {
  id: string;
  name: string; // e.g. "CISSP"
  fullName: string; // e.g. "Certified Information Systems Security Professional"
  category: string; // e.g. "it-cybersecurity"
  domainCount: number;
  domains: { id: string; name: string; weight: number }[];
  passingScore: string; // e.g. "700/1000"
  examDuration: string; // e.g. "3-6 hours (CAT)"
  description: string;
}

export interface CurriculumDomain {
  id: string;
  examId: string;
  name: string;
  weight: number; // percentage of exam
  concepts: string[];
  terminology: string[];
  learningObjectives: string[];
  scenarioTemplates: string[]; // AI prompt templates for generating questions
}
