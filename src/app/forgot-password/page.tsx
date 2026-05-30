"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth as getAuth } from "@/lib/firebase-client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(getAuth(), email);
      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reset email.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            JudyTutor<span className="text-blue-600">™</span>
          </h1>
          <p className="mt-2 text-gray-600">Reset your password</p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-white p-8 shadow text-center space-y-4">
            <p className="text-green-700">
              Password reset email sent to <strong>{email}</strong>.
            </p>
            <p className="text-sm text-gray-600">Check your inbox and follow the link to reset your password.</p>
            <Link href="/login" className="inline-block text-blue-600 hover:underline text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-8 shadow">
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
