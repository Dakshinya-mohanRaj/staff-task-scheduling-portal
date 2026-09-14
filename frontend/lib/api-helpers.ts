import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }
  console.error("Unhandled error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

export function jsonSuccess(
  data: unknown,
  status = 200,
  total?: number,
): NextResponse {
  return NextResponse.json(
    total !== undefined ? { data, total } : { data },
    { status },
  );
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}