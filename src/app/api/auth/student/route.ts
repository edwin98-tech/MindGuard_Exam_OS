import { NextResponse } from "next/server";
import { verifyStudent } from "../../../../utils/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rollNo, dob } = body;

    if (!rollNo || !dob) {
      return NextResponse.json(
        { success: false, error: "Roll Number and Date of Birth (Password) are required." },
        { status: 400 }
      );
    }

    const result = await verifyStudent(rollNo, dob);
    if (result.success) {
      return NextResponse.json({ success: true, name: result.name });
    } else {
      return NextResponse.json({ success: false, error: result.error || "Authentication failed." }, { status: 401 });
    }
  } catch (err: any) {
    console.error("Student Authentication API error:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}
