/* eslint-disable @typescript-eslint/no-explicit-any */
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUserNamespace, upsertToNamespace, textToVector } from "@/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

// Cerebras OpenAI-compatible provider
// Available models: llama-3.3-70b, llama-3.1-70b, llama-3.1-8b, qwen-2.5-32b
// Using llama-3.3-70b for best CRM agent reasoning
const cerebras = createOpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY || "",

});

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { messages, conversationId } = body;

  // Get user info and CRM counts
  let userName = "User";
  let userEmail = "";
  let dealCount = 0;
  let contactCount = 0;
  let companyCount = 0;
  let taskCount = 0;
  let leadCount = 0;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    userName = user?.name || "User";
    userEmail = user?.email || "";
    [dealCount, contactCount, companyCount, taskCount, leadCount] = await Promise.all([
      prisma.deal.count({ where: { userId } }),
      prisma.contact.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
      prisma.task.count({ where: { userId } }),
      prisma.lead.count({ where: { userId } }),
    ]);
  } catch {
    // DB might fail on first load, continue with defaults
  }

  const systemPrompt = `You are Reper, an AI-powered CRM assistant. You help users manage their business relationships, deals, contacts, companies, tasks, and leads.

Current User: ${userName} (${userEmail})
Current Date: ${new Date().toISOString()}

CRM Database Summary:
- Deals: ${dealCount}
- Contacts: ${contactCount}
- Companies: ${companyCount}
- Tasks: ${taskCount}
- Leads: ${leadCount}

You can help with:
- Querying CRM data (deals, contacts, companies, tasks, leads)
- Creating new records
- Updating existing records
- Finding leads and prospects
- Drafting emails
- Analyzing pipeline and deals
- Accessing Google Workspace data (Gmail, Calendar, Drive, Contacts)

Guidelines:
- Be concise and professional
- Use markdown tables when showing data
- Use **bold** for important information
- Keep responses focused and actionable
- When the user asks about their data, describe what you found
- For lead searches, describe the results clearly`;

  try {
    const result = streamText({
      model: cerebras("llama-3.3-70b"),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
    });

    // Save to Pinecone memory in background (don't await)
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
    if (lastUserMsg && conversationId) {
      try {
        const namespace = getUserNamespace(userId);
        const vector = textToVector(lastUserMsg.content);
        upsertToNamespace(namespace, [{
          id: uuidv4(),
          values: vector,
          metadata: {
            content: lastUserMsg.content.substring(0, 500),
            role: "user",
            conversationId: conversationId || "",
            timestamp: new Date().toISOString(),
          },
        }]).catch(() => {});
      } catch {
        // Silent
      }
    }

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to generate response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
