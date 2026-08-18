import { removeRuntimeTempBlock, listRuntimeEvents, listRuntimeTempBlocks } from "@/lib/server/security-runtime-store";
import { requireAdminRequest } from "@/lib/server/verify-admin-request";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: 403 });
  }

  const [tempBlocks, recent] = await Promise.all([listRuntimeTempBlocks(), listRuntimeEvents()]);
  return NextResponse.json({ tempBlocks, recent });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { ip?: string } | null;
  const ip = String(body?.ip ?? "").trim();
  if (!ip) {
    return NextResponse.json({ message: "해제할 IP를 확인해 주세요." }, { status: 400 });
  }

  await removeRuntimeTempBlock(ip);
  return NextResponse.json({ ok: true });
}
