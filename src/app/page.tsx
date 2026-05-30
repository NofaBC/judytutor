"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            JudyTutor<span className="text-blue-600">™</span>
          </h1>
          <div className="flex gap-3">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Your Personal AI Tutor for{" "}
          <span className="text-blue-600">Exam Success</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-gray-600">
          JudyTutor™ is a personalized AI tutor, study coach, accountability partner,
          and readiness evaluator. Not a question bank — a tutor who understands your
          learning journey.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
          >
            Start Studying
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-gray-300 px-6 py-3 text-gray-700 font-medium hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>

        {/* Exam examples */}
        <div className="mt-16 max-w-2xl">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Prepare for exams like
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {["CISSP", "Security+", "PMP", "TOEFL", "NCLEX", "GED", "HVAC", "Real Estate"].map(
              (exam) => (
                <span
                  key={exam}
                  className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700"
                >
                  {exam}
                </span>
              )
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white px-6 py-4 text-center text-sm text-gray-500">
        JudyTutor™ · Built by NOFA Business Consulting
      </footer>
    </div>
  );
}
