import { NextResponse } from "next/server";
import { GUARDRAILS } from "../../../lib/mock-data";
export async function GET() { return NextResponse.json(GUARDRAILS); }
