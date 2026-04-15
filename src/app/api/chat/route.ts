/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { messages } = body;

  // Get user info
  let userName = "User";
  let userEmail = "";
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    userName = user?.name || "User";
    userEmail = user?.email || "";
  } catch {
    // Continue with defaults
  }

  const systemPrompt = `You are Reper, a helpful AI assistant built into the Reper.ai platform. You can chat naturally about any topic the user wants to discuss. You are knowledgeable, friendly, and concise.

In addition to general conversation, you also have CRM capabilities and can help with:
- Managing business data (deals, contacts, companies, tasks, leads)
- Finding leads and prospects
- Drafting emails
- Analyzing sales pipelines
- Google Workspace integration (Gmail, Calendar, Drive, etc.)

Current User: ${userName} (${userEmail})
Current Date: ${new Date().toISOString()}

Guidelines:
- Chat naturally about any topic - you are not limited to CRM
- Be helpful, concise, and professional
- Use markdown formatting when appropriate (tables, bold, lists, code blocks)
- When the user asks about CRM data, help with their request
- When the user asks general questions, answer them directly
- Keep a friendly but professional tone`;

  // Build messages array for Cerebras API
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : String(m.content),
    })),
  ];

  // Call Cerebras API directly (OpenAI-compatible)
  const apiKey = process.env.CEREBRAS_API_KEY || "";
  
  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: apiMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cerebras API error:", response.status, errorText);
      return new Response(
        `Error from AI: ${response.status} - ${errorText.substring(0, 200)}`,
        { status: 500 }
      );
    }

    if (!response.body) {
      return new Response("No response body from AI", { status: 500 });
    }

    // Stream the SSE response, extracting just the text content
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      },
    });

    const readable = response.body.pipeThrough(transformStream);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      `Error: ${error?.message || "Failed to connect to AI service"}`,
      { status: 500 }
    );
  }
}
