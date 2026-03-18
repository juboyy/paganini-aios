import { NextResponse } from "next/server";
import { ACTIVITY } from "../../../lib/mock-data";
export async function GET() { return NextResponse.json(ACTIVITY); }
