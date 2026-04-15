import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({}, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { conversationId, content, role } = await req.json();

  const message = await prisma.message.create({
    data: { conversationId, content, role, userId },
  });

  return NextResponse.json(message);
}
