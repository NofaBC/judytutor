"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getDomainList } from "@/lib/cissp-curriculum";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DOMAINS = getDomainList();

export default function StudyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !user) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setSending(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId || undefined,
          domain: selectedDomain || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setSessionId(null);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              Study with Judy<span className="text-blue-600">™</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              {sidebarOpen ? "Hide" : "Show"} Domains
            </button>
            <button
              onClick={startNewSession}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            >
              New Session
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — domain selector */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 border-r bg-white p-4 overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Study Domain
            </h2>
            <button
              onClick={() => setSelectedDomain("")}
              className={`mb-1 w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                selectedDomain === ""
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              General (all domains)
            </button>
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDomain(d.id)}
                className={`mb-1 w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                  selectedDomain === d.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="block">{d.name}</span>
                <span className="text-xs text-gray-400">{d.weight}% of exam</span>
              </button>
            ))}
          </aside>
        )}

        {/* Chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Hi, {user.displayName || "Student"}!
                </h2>
                <p className="mt-2 max-w-md text-gray-500">
                  I&apos;m JudyTutor™, your personal AI tutor. Select a domain from
                  the sidebar or ask me anything about your exam preparation.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "Explain the CIA triad",
                    "What is risk management?",
                    "Help me understand encryption",
                    "Quiz me on security models",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                      }}
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <p className="mb-1 text-xs font-semibold text-blue-600">
                          JudyTutor™
                        </p>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <p className="mb-1 text-xs font-semibold text-blue-600">
                        JudyTutor™
                      </p>
                      <p className="text-sm text-gray-400 animate-pulse">
                        Thinking...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-white px-4 py-3 shrink-0">
            <div className="mx-auto flex max-w-3xl gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Judy anything..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {selectedDomain && (
              <p className="mx-auto mt-1 max-w-3xl text-xs text-gray-400">
                Studying:{" "}
                {DOMAINS.find((d) => d.id === selectedDomain)?.name || selectedDomain}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
