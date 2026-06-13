import { NextResponse } from "next/server";
import { getAllSessions, getSessionById, insertSession } from "../../../utils/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const session = await getSessionById(id);
      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    const sessions = await getAllSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    console.error("GET /api/sessions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, studentName, metrics, timeline, aiReport } = body;

    if (!id || !metrics || !timeline) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, metrics, timeline" },
        { status: 400 }
      );
    }

    const inserted = await insertSession({
      id,
      studentName: studentName || "Anonymous Student",
      metrics,
      timeline,
      aiReport: aiReport || null,
    });

    return NextResponse.json({ success: true, session: inserted });
  } catch (err: any) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
