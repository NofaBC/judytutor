// /api/materials — Manage user study materials.
// POST: Upload study material (text content stored in Firestore)
// GET: List user's materials

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-helpers";

interface StudyMaterial {
  id: string;
  userId: string;
  title: string;
  type: "notes" | "pdf-text" | "study-guide" | "slides" | "other";
  content: string; // extracted text content
  charCount: number;
  createdAt: string;
}

// GET — List user's materials
export async function GET(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const snap = await db
      .collection(`users/${authUser.uid}/materials`)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const materials = snap.docs.map((d) => {
      const data = d.data() as StudyMaterial;
      return {
        id: d.id,
        title: data.title,
        type: data.type,
        charCount: data.charCount,
        createdAt: data.createdAt,
      };
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("Materials list error:", error);
    return NextResponse.json({ error: "Failed to list materials" }, { status: 500 });
  }
}

// POST — Upload study material
export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, type, content } = (await req.json()) as {
      title: string;
      type: StudyMaterial["type"];
      content: string;
    };

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Limit content size (500KB of text)
    const maxChars = 500_000;
    const trimmedContent = content.slice(0, maxChars);

    const db = getFirestore();
    const ref = db.collection(`users/${authUser.uid}/materials`).doc();

    const material: StudyMaterial = {
      id: ref.id,
      userId: authUser.uid,
      title,
      type: type || "notes",
      content: trimmedContent,
      charCount: trimmedContent.length,
      createdAt: new Date().toISOString(),
    };

    await ref.set(material);

    return NextResponse.json({
      id: ref.id,
      title,
      charCount: trimmedContent.length,
    });
  } catch (error) {
    console.error("Material upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE — Remove a material
export async function DELETE(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { materialId } = (await req.json()) as { materialId: string };
    if (!materialId) {
      return NextResponse.json({ error: "materialId required" }, { status: 400 });
    }

    const db = getFirestore();
    await db.doc(`users/${authUser.uid}/materials/${materialId}`).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Material delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
