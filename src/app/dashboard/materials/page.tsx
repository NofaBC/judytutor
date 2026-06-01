"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

interface MaterialSummary {
  id: string;
  title: string;
  type: string;
  charCount: number;
  createdAt: string;
}

const MATERIAL_TYPES = [
  { value: "notes", label: "Notes" },
  { value: "pdf-text", label: "PDF (pasted text)" },
  { value: "study-guide", label: "Study Guide" },
  { value: "slides", label: "Slides" },
  { value: "other", label: "Other" },
] as const;

export default function MaterialsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("notes");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchMaterials = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/materials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch {
      // Silently fail on load
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchMaterials();
  }, [user, fetchMaterials]);

  const handleUpload = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setUploading(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), type, content: content.trim() }),
      });

      if (!res.ok) throw new Error("Upload failed");

      setTitle("");
      setContent("");
      setType("notes");
      setShowForm(false);
      await fetchMaterials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/materials", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ materialId }),
      });
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch {
      // Silently fail
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </button>
            <h1 className="text-lg font-bold text-gray-900">Study Materials</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Upload Material"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Upload form */}
        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Add Study Material
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Paste your notes, study guide text, or PDF content. Judy will use
              this material to personalize your tutoring sessions.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CISSP Domain 1 Notes"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your study notes, extracted PDF text, or guide content here..."
                  rows={10}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-y"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {content.length.toLocaleString()} characters
                </p>
              </div>

              <button
                onClick={handleUpload}
                disabled={!title.trim() || !content.trim() || uploading}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Save Material"}
              </button>
            </div>
          </div>
        )}

        {/* Materials list */}
        {loading ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Loading materials...</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-lg font-semibold text-gray-900">
              No study materials yet
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Upload your notes, study guides, or extracted PDF text. Judy will
              use these to personalize your tutoring.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Upload Your First Material
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {m.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {m.type} • {m.charCount.toLocaleString()} chars •{" "}
                    {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
