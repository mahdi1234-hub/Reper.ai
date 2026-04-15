import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchLeads } from "@/lib/lead-finder";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();

  const result = await searchLeads({
    query: body.query || "",
    industry: body.industry,
    location: body.location,
    companySize: body.company_size || body.companySize,
    jobTitle: body.job_title || body.jobTitle,
    seniority: body.seniority,
    limit: body.limit || 25,
    page: body.page || 1,
  });

  return NextResponse.json(result);
}
