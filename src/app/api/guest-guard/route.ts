import { inspectGuestAccess } from "@/lib/server/guest-access";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let action: "post" | "comment" = "post";
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action === "comment") {
      action = "comment";
    } else if (body.action !== "post") {
      return NextResponse.json({ message: "요청을 확인하지 못했습니다." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ message: "요청을 확인하지 못했습니다." }, { status: 400 });
  }

  const result = await inspectGuestAccess(request, action);
  if (!result.allowed) {
    return NextResponse.json({ message: result.message }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
