import { NextResponse } from "next/server";
import { FUND_STATS } from "../../../lib/mock-data";
export async function GET() { return NextResponse.json(FUND_STATS); }
