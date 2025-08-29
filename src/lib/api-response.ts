// Standardized API JSON response helpers to keep consistent shapes & status codes.
// Prefer these over ad-hoc NextResponse constructions inside route handlers.
import { NextResponse } from "next/server";
import { ZodIssue } from "zod";

export function Success<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function Error(message: string, status: number = 500) {
  return NextResponse.json({ message }, { status });
}

export function BadRequest(errors: ZodIssue[]) {
  return NextResponse.json({ message: "Bad Request", errors }, { status: 400 });
}

export function Unauthorized(message: string = "Invalid credentials") {
  return NextResponse.json({ message }, { status: 401 });
}

export function Forbidden(message: string = "Forbidden") {
  return NextResponse.json({ message }, { status: 403 });
}
