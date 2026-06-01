"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            JudyTutor<span className="text-blue-600">™</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.displayName || user.email}</span>
            <button
              onClick={() => signOut().then(() => router.push("/"))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.displayName || "Student"}!</h2>
        <p className="mt-2 text-gray-600">Your study dashboard is being built. Check back soon.</p>

        {/* Dashboard cards */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Study Plan", desc: "View your personalized roadmap", href: "/dashboard/materials" },
            { title: "AI Tutor", desc: "Start a tutoring session with Judy", href: "/dashboard/study" },
            { title: "Quizzes", desc: "Test your knowledge", href: "/dashboard/quiz" },
            { title: "Progress", desc: "Track lessons, scores, and streaks", href: "/dashboard/progress" },
            { title: "Weak Areas", desc: "Focus on what needs work", href: "/dashboard/progress" },
            { title: "Readiness", desc: "Are you ready for exam day?", href: "/dashboard/progress" },
          ].map((card) => (
            <button
              key={card.title}
              onClick={() => card.href && router.push(card.href)}
              disabled={!card.href}
              className={`rounded-lg border bg-white p-6 shadow-sm text-left transition-colors ${
                card.href
                  ? "hover:border-blue-300 hover:shadow-md cursor-pointer"
                  : "opacity-60 cursor-default"
              }`}
            >
              <h3 className="font-semibold text-gray-900">{card.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
              {!card.href && (
                <span className="mt-2 inline-block text-xs text-gray-400">Coming soon</span>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
