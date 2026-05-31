"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getDomainList } from "@/lib/cissp-curriculum";
import type { QuizType, QuizQuestion } from "@/lib/types";

const DOMAINS = getDomainList();

type Phase = "setup" | "loading" | "quiz" | "review" | "results";

interface AnswerRecord {
  questionIndex: number;
  selectedIndex: number;
  timeSpentSeconds: number;
}

export default function QuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Setup state
  const [quizType, setQuizType] = useState<QuizType>("domain");
  const [domain, setDomain] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  // Quiz state
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [error, setError] = useState("");

  // Results state
  const [results, setResults] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    weakAreas: string[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const generateQuiz = async () => {
    if (!user) return;
    setPhase("loading");
    setError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quizType, domain: domain || undefined, questionCount }),
      });

      if (!res.ok) throw new Error("Failed to generate quiz");

      const data = await res.json();
      if (!data.questions?.length) throw new Error("No questions generated");

      setQuestions(data.questions);
      setAnswers([]);
      setCurrentIndex(0);
      setSelectedOption(null);
      setShowFeedback(false);
      setQuestionStart(Date.now());
      setPhase("quiz");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Quiz generation failed");
      setPhase("setup");
    }
  };

  const selectAnswer = (optionIndex: number) => {
    if (showFeedback) return;
    setSelectedOption(optionIndex);
  };

  const confirmAnswer = () => {
    if (selectedOption === null) return;

    const timeSpent = Math.round((Date.now() - questionStart) / 1000);
    setAnswers((prev) => [
      ...prev,
      { questionIndex: currentIndex, selectedIndex: selectedOption, timeSpentSeconds: timeSpent },
    ]);
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setQuestionStart(Date.now());
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!user) return;
    setPhase("loading");

    try {
      const token = await user.getIdToken();

      // Submit quiz
      const submitRes = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quizType,
          domain: domain || "all",
          questions,
          answers: [
            ...answers,
            // Include current answer if not yet added
            ...(answers.length < questions.length && selectedOption !== null
              ? [{ questionIndex: currentIndex, selectedIndex: selectedOption, timeSpentSeconds: Math.round((Date.now() - questionStart) / 1000) }]
              : []),
          ],
        }),
      });

      if (!submitRes.ok) throw new Error("Submission failed");
      const resultData = await submitRes.json();
      setResults(resultData);

      // Trigger weakness analysis in background
      fetch("/api/analyze-weakness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});

      setPhase("results");
    } catch {
      setError("Failed to submit quiz");
      setPhase("results");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shrink-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Quizzes<span className="text-blue-600">™</span>
            </h1>
          </div>
          {phase === "quiz" && (
            <span className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {error && (
          <div className="mb-6 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* ── SETUP ── */}
        {phase === "setup" && (
          <div className="rounded-lg bg-white p-8 shadow">
            <h2 className="text-xl font-semibold text-gray-900">Start a Quiz</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose your quiz type and domain.
            </p>

            {/* Quiz type */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Type
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: "domain", label: "Domain Quiz", desc: "Focus on one domain" },
                    { value: "review", label: "Review Quiz", desc: "Mix of studied topics" },
                    { value: "topic", label: "Topic Quiz", desc: "Specific topic deep-dive" },
                    { value: "practice-exam", label: "Practice Exam", desc: "Full exam simulation" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setQuizType(t.value)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      quizType === t.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium text-gray-900">{t.label}</span>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain */}
            {(quizType === "domain" || quizType === "topic") && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a domain...</option>
                  {DOMAINS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.weight}%)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Question count */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      questionCount === n
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateQuiz}
              disabled={
                (quizType === "domain" || quizType === "topic") && !domain
              }
              className="mt-8 w-full rounded-md bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Generate Quiz
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-gray-500">Generating your quiz...</p>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && currentQ && (
          <div className="rounded-lg bg-white p-8 shadow">
            {/* Progress bar */}
            <div className="mb-6 h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question */}
            <p className="text-xs text-gray-400 uppercase mb-2">
              {currentQ.questionType} • {DOMAINS.find((d) => d.id === currentQ.domain)?.name || currentQ.domain}
            </p>
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              {currentQ.stem}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, i) => {
                let optClass = "border-gray-200 hover:border-gray-300";
                if (showFeedback) {
                  if (i === currentQ.correctIndex) {
                    optClass = "border-green-500 bg-green-50";
                  } else if (i === selectedOption && i !== currentQ.correctIndex) {
                    optClass = "border-red-500 bg-red-50";
                  }
                } else if (i === selectedOption) {
                  optClass = "border-blue-600 bg-blue-50";
                }

                return (
                  <button
                    key={i}
                    onClick={() => selectAnswer(i)}
                    disabled={showFeedback}
                    className={`w-full rounded-lg border p-4 text-left text-sm transition-colors ${optClass}`}
                  >
                    <span className="font-medium mr-2 text-gray-400">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className="mt-6 space-y-3 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-green-700">Why this is the best answer:</p>
                  <p className="text-sm text-gray-700 mt-1">{currentQ.explanation}</p>
                </div>
                {currentQ.competingAnalysis && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Why other options are less optimal:</p>
                    <p className="text-sm text-gray-600 mt-1">{currentQ.competingAnalysis}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end">
              {!showFeedback ? (
                <button
                  onClick={confirmAnswer}
                  disabled={selectedOption === null}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
                >
                  {currentIndex + 1 < questions.length
                    ? "Next Question"
                    : "See Results"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <div className="rounded-lg bg-white p-8 shadow">
            <h2 className="text-xl font-semibold text-gray-900">Quiz Results</h2>

            {results && (
              <>
                {/* Score */}
                <div className="mt-6 flex items-center justify-center">
                  <div
                    className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${
                      results.score >= 80
                        ? "border-green-500 text-green-700"
                        : results.score >= 60
                        ? "border-yellow-500 text-yellow-700"
                        : "border-red-500 text-red-700"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-3xl font-bold">{results.score}%</p>
                      <p className="text-xs">
                        {results.correctCount}/{results.totalQuestions}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verdict */}
                <p className="mt-4 text-center text-gray-600">
                  {results.score >= 80
                    ? "Excellent work! You're showing strong understanding."
                    : results.score >= 60
                    ? "Good progress! Keep studying the areas you missed."
                    : "Keep going — focus on the weak areas below and try again."}
                </p>

                {/* Weak areas */}
                {results.weakAreas.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Areas to Review
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {results.weakAreas.map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700"
                        >
                          {DOMAINS.find((d) => d.id === area)?.name || area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setPhase("setup");
                  setResults(null);
                  setQuestions([]);
                  setAnswers([]);
                }}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Take Another Quiz
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
