import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json([], { status: 401 });
  const userId = (session.user as { id: string }).id;

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { take: 1, orderBy: { createdAt: "desc" }, select: { content: true } },
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({}, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { title } = await req.json();

  const conversation = await prisma.conversation.create({
    data: { title: title || "New Chat", userId },
  });

  return NextResponse.json(conversation);
}
