import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateEmail } from "@/lib/lead-finder";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { email } = await req.json();
  const result = await validateEmail(email);
  return NextResponse.json(result);
}
