import { requireMemberRequest } from "@/lib/server/verify-admin-request";
import { NextResponse } from "next/server";

const MAX_STUDY_FILE_BYTES = 8 * 1024 * 1024;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function callGemini(prompt: string, pdfBase64: string) {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("정리·퀴즈는 서버에 Gemini 키가 없습니다. 운영진이 GEMINI_API_KEY를 넣으면 켜집니다.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            ],
          },
        ],
      }),
    },
  );

  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "정리·퀴즈를 만들지 못했습니다.");
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
  if (!text) {
    throw new Error("AI가 빈 답을 보냈습니다. 다른 PDF로 다시 시도해 주세요.");
  }
  return text;
}

export async function POST(request: Request) {
  const member = await requireMemberRequest(request);
  if (!member.ok) {
    return NextResponse.json({ error: member.message }, { status: 401 });
  }

  let body: { action?: string; fileUrl?: string };
  try {
    body = (await request.json()) as { action?: string; fileUrl?: string };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  const fileUrl = String(body.fileUrl ?? "").trim();
  if (action !== "summarize" && action !== "quiz") {
    return NextResponse.json({ error: "지원하지 않는 공부 기능입니다." }, { status: 400 });
  }
  if (!isHttpUrl(fileUrl)) {
    return NextResponse.json({ error: "파일 주소가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: "PDF를 읽지 못했습니다. 로그인 후 다시 시도해 주세요." }, { status: 400 });
    }
    const fileBytes = Buffer.from(await fileResponse.arrayBuffer());
    if (fileBytes.byteLength <= 0 || fileBytes.byteLength > MAX_STUDY_FILE_BYTES) {
      return NextResponse.json({ error: "정리·퀴즈는 8MB 이하 PDF만 지원합니다." }, { status: 400 });
    }

    const prompt =
      action === "quiz"
        ? "이 학습 노트 PDF를 읽고, 한글로 퀴즈 5개와 정답을 만들어 주세요. 질문과 답을 구분해 주세요."
        : "이 학습 노트 PDF를 한글로 상세히 정리해 주세요. 핵심 개념, 중요 포인트, 복습 포인트를 나눠 주세요.";

    const result = await callGemini(prompt, fileBytes.toString("base64"));
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "정리·퀴즈를 만들지 못했습니다.";
    const status = /Gemini 키/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
