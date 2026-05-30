"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  EXAM_CATEGORIES,
  EXAM_TRACKS,
  searchExamTracks,
  getTracksByCategory,
} from "@/lib/exam-tracks";
import type { SkillLevel, ExamTrack } from "@/lib/types";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"];

const TOTAL_STEPS = 6; // Steps 2-7 (step 1 is account creation, already done)

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [examCategory, setExamCategory] = useState("");
  const [examSearch, setExamSearch] = useState("");
  const [selectedExam, setSelectedExam] = useState<ExamTrack | null>(null);
  const [examDate, setExamDate] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner");
  const [studyDays, setStudyDays] = useState<string[]>([]);
  const [studyTimes, setStudyTimes] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);

  // Search results
  const searchResults = useMemo(() => {
    if (examSearch.trim()) {
      return searchExamTracks(examSearch);
    }
    if (examCategory) {
      return getTracksByCategory(examCategory);
    }
    return EXAM_TRACKS;
  }, [examSearch, examCategory]);

  // Minimum date = tomorrow
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const canProceed = () => {
    switch (step) {
      case 1:
        return examCategory !== "";
      case 2:
        return selectedExam !== null;
      case 3:
        return examDate !== "";
      case 4:
        return true; // skill level always has a default
      case 5:
        return studyDays.length > 0 && studyTimes.length > 0 && hoursPerWeek > 0;
      case 6:
        return true; // generate step
      default:
        return false;
    }
  };

  const toggleDay = (day: string) => {
    setStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleTime = (time: string) => {
    setStudyTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleGenerate = async () => {
    if (!user || !selectedExam) return;
    setSubmitting(true);
    setError("");

    try {
      // Save onboarding data
      const token = await user.getIdToken();

      const saveRes = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examCategory,
          selectedExam: selectedExam.id,
          examDate,
          skillLevel,
          studySchedule: {
            days: studyDays.map((d) => d.toLowerCase()),
            preferredTimes: studyTimes.map((t) => t.toLowerCase()),
            hoursPerWeek,
          },
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save onboarding data.");
      }

      // Generate study plan
      const planRes = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examId: selectedExam.id,
          examDate,
          skillLevel,
          hoursPerWeek,
          studyDays: studyDays.map((d) => d.toLowerCase()),
        }),
      });

      if (!planRes.ok) {
        throw new Error("Failed to generate study plan.");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900">
            JudyTutor<span className="text-blue-600">™</span>
            <span className="ml-3 text-sm font-normal text-gray-500">
              Setup
            </span>
          </h1>
        </div>
      </header>

      {/* Progress bar */}
      <div className="mx-auto w-full max-w-2xl px-6 pt-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <div className="rounded-lg bg-white p-8 shadow">
          {error && (
            <div className="mb-6 rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Step 1: Exam Category ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Select Exam Category
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                What type of exam are you preparing for?
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {EXAM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setExamCategory(cat.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      examCategory === cat.id
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Search / Select Exam ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Search or Select Your Exam
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Type the exam name or browse the list below.
              </p>
              <input
                type="text"
                placeholder="Search exams (e.g. CISSP, PMP, TOEFL)..."
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="mt-4 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedExam(track)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedExam?.id === track.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium text-gray-900">
                      {track.name}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {track.fullName}
                    </span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No exams found. Try a different search.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Exam Date ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                When is your exam?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your target exam date. This helps Judy build a realistic
                study schedule.
              </p>
              <input
                type="date"
                min={minDate}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="mt-4 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {selectedExam && (
                <p className="mt-3 text-sm text-gray-500">
                  Preparing for: <strong>{selectedExam.name}</strong> (
                  {selectedExam.examDuration})
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Skill Level ── */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                What is your current skill level?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                This helps Judy tailor explanations and difficulty to your
                experience.
              </p>
              <div className="mt-6 space-y-3">
                {(
                  [
                    {
                      value: "beginner",
                      label: "Beginner",
                      desc: "New to the subject. Starting from the basics.",
                    },
                    {
                      value: "intermediate",
                      label: "Intermediate",
                      desc: "Some experience or study. Familiar with core concepts.",
                    },
                    {
                      value: "advanced",
                      label: "Advanced",
                      desc: "Strong background. Focusing on exam-specific preparation.",
                    },
                  ] as const
                ).map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setSkillLevel(level.value)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      skillLevel === level.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium text-gray-900">
                      {level.label}
                    </span>
                    <p className="mt-0.5 text-sm text-gray-500">{level.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 5: Study Availability ── */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                When can you study?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select the days and times that work best for you.
              </p>

              {/* Days */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which days can you study?
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        studyDays.includes(day)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Times */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which times can you study?
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => toggleTime(time)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        studyTimes.includes(time)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours per week */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How many hours per week can you realistically dedicate?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-semibold text-gray-900">
                    {hoursPerWeek} hrs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Generate Study Plan ── */}
          {step === 6 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Ready to Generate Your Study Plan
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Judy will create a personalized study plan based on your
                selections.
              </p>

              {/* Summary */}
              <div className="mt-6 space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Exam</span>
                  <span className="font-medium text-gray-900">
                    {selectedExam?.name} — {selectedExam?.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Exam Date</span>
                  <span className="font-medium text-gray-900">{examDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Skill Level</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {skillLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Study Days</span>
                  <span className="font-medium text-gray-900">
                    {studyDays.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hours/Week</span>
                  <span className="font-medium text-gray-900">
                    {hoursPerWeek}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={submitting}
                className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting
                  ? "Generating your study plan..."
                  : "Generate My Study Plan"}
              </button>
            </div>
          )}

          {/* ── Navigation ── */}
          {step !== 6 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                disabled={!canProceed()}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
