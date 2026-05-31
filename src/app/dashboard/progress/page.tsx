"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import type { DomainProgress, ReadinessVerdict } from "@/lib/types";

interface ReadinessData {
  readinessScore: number;
  confidenceScore: number;
  readinessVerdict: ReadinessVerdict;
  domains: DomainProgress[];
  weakDomains: string[];
  totalQuizzesTaken: number;
  currentStreak: number;
  daysUntilExam: number | null;
  recommendation: string;
}

const VERDICT_CONFIG: Record<
  ReadinessVerdict,
  { label: string; color: string; bg: string; border: string }
> = {
  ready: {
    label: "Ready",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-500",
  },
  "almost-ready": {
    label: "Almost Ready",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-500",
  },
  "needs-preparation": {
    label: "Needs Additional Preparation",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-500",
  },
};

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReadiness = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/readiness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load progress");

      const result = await res.json();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchReadiness();
  }, [user, fetchReadiness]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const verdict = data ? VERDICT_CONFIG[data.readinessVerdict] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Progress & Readiness
            </h1>
          </div>
          <button
            onClick={fetchReadiness}
            disabled={loading}
            className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Refresh"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-gray-500">Calculating readiness...</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Top row: Readiness + Confidence + Streak + Exam countdown */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Readiness */}
              <div
                className={`rounded-lg border-2 ${verdict?.border} ${verdict?.bg} p-5 text-center`}
              >
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Readiness
                </p>
                <p className={`mt-1 text-4xl font-bold ${verdict?.color}`}>
                  {data.readinessScore}%
                </p>
                <p className={`mt-1 text-sm font-semibold ${verdict?.color}`}>
                  {verdict?.label}
                </p>
              </div>

              {/* Confidence */}
              <div className="rounded-lg border bg-white p-5 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Confidence
                </p>
                <p className="mt-1 text-4xl font-bold text-gray-900">
                  {data.confidenceScore}%
                </p>
                <p className="mt-1 text-sm text-gray-500">Consistency</p>
              </div>

              {/* Streak */}
              <div className="rounded-lg border bg-white p-5 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Study Streak
                </p>
                <p className="mt-1 text-4xl font-bold text-gray-900">
                  {data.currentStreak}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  day{data.currentStreak !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Exam countdown */}
              <div className="rounded-lg border bg-white p-5 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Exam In
                </p>
                <p className="mt-1 text-4xl font-bold text-gray-900">
                  {data.daysUntilExam !== null ? data.daysUntilExam : "—"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {data.daysUntilExam !== null ? "days" : "No date set"}
                </p>
              </div>
            </div>

            {/* Recommendation */}
            {data.recommendation && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Judy&apos;s Recommendation
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  {data.recommendation}
                </p>
              </div>
            )}

            {/* Domain heatmap */}
            <div className="rounded-lg border bg-white p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Domain Performance
              </h2>
              <div className="space-y-3">
                {data.domains.map((d) => {
                  const isWeak = data.weakDomains.includes(d.domainId);
                  return (
                    <div key={d.domainId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">
                          {d.domainName}
                          {isWeak && (
                            <span className="ml-2 text-xs text-red-600 font-medium">
                              Weak
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {d.quizAttempts > 0 ? `${d.quizScoreAvg}%` : "—"}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            d.quizAttempts === 0
                              ? "bg-gray-300"
                              : d.quizScoreAvg >= 80
                              ? "bg-green-500"
                              : d.quizScoreAvg >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${d.quizAttempts > 0 ? d.quizScoreAvg : 0}%`,
                          }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {d.quizAttempts > 0
                          ? `${d.quizAttempts} question${d.quizAttempts !== 1 ? "s" : ""} answered`
                          : "Not yet tested"}
                        {d.lastStudied &&
                          ` • Last: ${new Date(d.lastStudied).toLocaleDateString()}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weak areas */}
            {data.weakDomains.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <h2 className="text-sm font-semibold text-red-800 mb-3">
                  Weak Areas — Focus Here
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.weakDomains.map((id) => {
                    const dom = data.domains.find(
                      (d) => d.domainId === id
                    );
                    return (
                      <button
                        key={id}
                        onClick={() =>
                          router.push(`/dashboard/study`)
                        }
                        className="rounded-full bg-white border border-red-200 px-4 py-1.5 text-sm text-red-700 hover:bg-red-100 transition-colors"
                      >
                        {dom?.domainName || id}
                        {dom && dom.quizAttempts > 0 && (
                          <span className="ml-1 text-xs text-red-500">
                            ({dom.quizScoreAvg}%)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-red-600">
                  Click a domain to study it with Judy.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="rounded-lg border bg-white p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Overall Stats
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.totalQuizzesTaken}
                  </p>
                  <p className="text-sm text-gray-500">Quizzes Taken</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.domains.reduce((s, d) => s + d.quizAttempts, 0)}
                  </p>
                  <p className="text-sm text-gray-500">Questions Answered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.domains.filter((d) => d.quizAttempts > 0).length}/
                    {data.domains.length}
                  </p>
                  <p className="text-sm text-gray-500">Domains Covered</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard/quiz")}
                className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Take a Quiz
              </button>
              <button
                onClick={() => router.push("/dashboard/study")}
                className="flex-1 rounded-md border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Study with Judy
              </button>
            </div>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900">
              No progress data yet
            </h2>
            <p className="mt-2 text-gray-500">
              Take your first quiz to start tracking your readiness.
            </p>
            <button
              onClick={() => router.push("/dashboard/quiz")}
              className="mt-6 rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
            >
              Start a Quiz
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
