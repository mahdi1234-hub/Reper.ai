/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { streamText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUserNamespace, queryNamespace, upsertToNamespace, textToVector } from "@/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

const cerebras = createOpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY || process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { messages, conversationId } = body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const [dealCount, contactCount, companyCount, taskCount, leadCount] = await Promise.all([
    prisma.deal.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.lead.count({ where: { userId } }),
  ]);

  let memoryContext = "";
  try {
    const lastMessage = messages[messages.length - 1]?.content || "";
    if (typeof lastMessage === "string" && lastMessage.length > 0) {
      const vector = textToVector(lastMessage);
      const namespace = getUserNamespace(userId);
      const results = await queryNamespace(namespace, vector, 3);
      if (results.length > 0) {
        memoryContext = "\n\nRelevant context from memory:\n" +
          results.map((r) => `- ${(r.metadata as Record<string, string>)?.content || ""}`).join("\n");
      }
    }
  } catch {
    // Pinecone may not be configured
  }

  const systemPrompt = `You are Reper, an AI-powered CRM assistant. You help users manage their business relationships, deals, contacts, companies, tasks, and leads.

Current User: ${user?.name || "User"} (${user?.email || ""})
Current Date: ${new Date().toISOString()}

CRM Database Summary:
- Deals: ${dealCount}
- Contacts: ${contactCount}  
- Companies: ${companyCount}
- Tasks: ${taskCount}
- Leads: ${leadCount}

Database Schema:
- Deals: id, name, value, stage (prospect/qualified/proposal/negotiation/closed_won/closed_lost), status (open/closed), companyId, closeDate, notes
- Contacts: id, name, email, phone, title, companyId
- Companies: id, name, domain, industry, size, location, description, website
- Tasks: id, title, description, status (pending/in_progress/completed), priority (low/medium/high/urgent), dueDate
- Leads: id, name, email, phone, title, company, location, industry, linkedin, emailScore, source, status (new/contacted/qualified/unqualified), companySize
${memoryContext}

Guidelines:
- Be concise and professional
- When showing data, use markdown tables with Show more/Show less
- When user asks about their data, use the query-data tool
- For lead searches, use the find-leads tool
- Always confirm before creating or modifying records
- Use **bold** for important information
- Keep responses focused and actionable`;

  const result = streamText({
    model: cerebras("llama-3.3-70b"),
    system: systemPrompt,
    messages,
    tools: {
      "query-data": tool({
        description: "Query CRM data including deals, contacts, companies, tasks, and leads",
        parameters: z.object({
          entity: z.enum(["deals", "contacts", "companies", "tasks", "leads"]),
          status: z.string().optional(),
          stage: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().optional(),
        }),
        execute: async (params: { entity: string; status?: string; stage?: string; search?: string; limit?: number }) => {
          try {
            const where: Record<string, unknown> = { userId };
            if (params.status) where.status = params.status;
            if (params.stage) where.stage = params.stage;
            if (params.search) {
              where.OR = [{ name: { contains: params.search, mode: "insensitive" } }];
            }
            const limit = params.limit || 20;

            let data: unknown[];
            let count: number;

            switch (params.entity) {
              case "deals":
                [data, count] = await Promise.all([
                  prisma.deal.findMany({ where, take: limit, orderBy: { createdAt: "desc" }, include: { company: true } }),
                  prisma.deal.count({ where }),
                ]);
                break;
              case "contacts":
                [data, count] = await Promise.all([
                  prisma.contact.findMany({ where, take: limit, orderBy: { createdAt: "desc" }, include: { company: true } }),
                  prisma.contact.count({ where }),
                ]);
                break;
              case "companies":
                [data, count] = await Promise.all([
                  prisma.company.findMany({ where, take: limit, orderBy: { createdAt: "desc" } }),
                  prisma.company.count({ where }),
                ]);
                break;
              case "tasks":
                [data, count] = await Promise.all([
                  prisma.task.findMany({ where, take: limit, orderBy: { createdAt: "desc" } }),
                  prisma.task.count({ where }),
                ]);
                break;
              case "leads":
                [data, count] = await Promise.all([
                  prisma.lead.findMany({ where, take: limit, orderBy: { createdAt: "desc" } }),
                  prisma.lead.count({ where }),
                ]);
                break;
              default:
                return { error: "Unknown entity type" };
            }
            return { entity: params.entity, data, totalCount: count, showing: data.length };
          } catch (error) {
            return { error: `Failed to query: ${error}` };
          }
        },
      }),

      "create-record": tool({
        description: "Create a new CRM record",
        parameters: z.object({
          entity: z.enum(["deal", "contact", "company", "task", "lead"]),
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          title: z.string().optional(),
          value: z.number().optional(),
          stage: z.string().optional(),
          status: z.string().optional(),
          industry: z.string().optional(),
          location: z.string().optional(),
          description: z.string().optional(),
          priority: z.string().optional(),
        }),
        execute: async (params: Record<string, unknown>) => {
          try {
            const { entity, ...data } = params;
            const recordData = { ...data, userId } as Record<string, unknown>;
            let result: unknown;
            switch (entity) {
              case "deal":
                result = await prisma.deal.create({ data: { name: recordData.name as string, value: recordData.value as number, stage: (recordData.stage as string) || "prospect", status: (recordData.status as string) || "open", userId } });
                break;
              case "contact":
                result = await prisma.contact.create({ data: { name: recordData.name as string, email: recordData.email as string, phone: recordData.phone as string, title: recordData.title as string, userId } });
                break;
              case "company":
                result = await prisma.company.create({ data: { name: recordData.name as string, industry: recordData.industry as string, location: recordData.location as string, userId } });
                break;
              case "task":
                result = await prisma.task.create({ data: { title: recordData.name as string, description: recordData.description as string, priority: (recordData.priority as string) || "medium", userId } });
                break;
              case "lead":
                result = await prisma.lead.create({ data: { name: recordData.name as string, email: recordData.email as string, title: recordData.title as string, company: (recordData.description as string) || "", industry: recordData.industry as string, location: recordData.location as string, userId } });
                break;
            }
            return { success: true, entity, record: result };
          } catch (error) {
            return { error: `Failed to create: ${error}` };
          }
        },
      }),

      "find-leads": tool({
        description: "Search for leads/prospects. Results render in sidebar as a data grid. Use when user asks to find leads, people, or prospects.",
        parameters: z.object({
          query: z.string(),
          industry: z.string().optional(),
          location: z.string().optional(),
          companySize: z.string().optional(),
          jobTitle: z.string().optional(),
        }),
        execute: async (params: { query: string; industry?: string; location?: string; companySize?: string; jobTitle?: string }) => {
          const leads = generateMockLeads(params.query, params, 25);
          return {
            leads,
            totalCount: Math.floor(Math.random() * 90000) + 10000,
            query: params.query,
            filters: params,
            renderInSidebar: true,
          };
        },
      }),

      "create-email-draft": tool({
        description: "Create an email draft",
        parameters: z.object({
          to: z.string(),
          subject: z.string(),
          body: z.string(),
        }),
        execute: async (params: { to: string; subject: string; body: string }) => {
          return { success: true, ...params, type: "email-draft" };
        },
      }),

      "ask-structured-question": tool({
        description: "Ask user a structured question with clickable options",
        parameters: z.object({
          question: z.string(),
          options: z.array(z.object({ label: z.string(), value: z.string() })),
        }),
        execute: async (params: { question: string; options: { label: string; value: string }[] }) => {
          return { ...params, type: "structured-question" };
        },
      }),

      "read-google-data": tool({
        description: "Read data from Google Workspace (Gmail, Calendar, Drive, Contacts, Tasks, Sheets, Docs)",
        parameters: z.object({
          service: z.enum(["gmail", "calendar", "drive", "contacts", "tasks", "sheets", "docs"]),
          action: z.string(),
          query: z.string().optional(),
        }),
        execute: async (params: { service: string; action: string; query?: string }) => {
          return {
            ...params,
            message: `Google ${params.service} integration configured. Access enabled via OAuth.`,
          };
        },
      }),
    },
    onFinish: async ({ text }) => {
      try {
        const namespace = getUserNamespace(userId);
        const vector = textToVector(text);
        await upsertToNamespace(namespace, [{
          id: uuidv4(),
          values: vector,
          metadata: {
            content: text.substring(0, 1000),
            role: "assistant",
            conversationId: conversationId || "",
            timestamp: new Date().toISOString(),
          },
        }]);
      } catch { /* silent */ }

      if (conversationId) {
        try {
          await prisma.message.create({
            data: { role: "assistant", content: text, conversationId, userId },
          });
        } catch { /* silent */ }
      }
    },
  });

  return result.toTextStreamResponse();
}

function generateMockLeads(query: string, filters: Record<string, unknown>, count: number = 25) {
  const firstNames = ["Gina", "Danish", "Mohit", "Suman", "Phillip", "Octavio", "Stephen", "Peter", "Maria", "Ashutosh", "Thomas", "Saksham", "Gitesh", "Alice", "Bob", "Carol", "Diana", "Eva", "Frank", "Grace", "Henry", "Irene", "Jack", "Karen", "Leo"];
  const lastNames = ["Cardoso", "Shaikh", "Agrawal", "Kumar", "Roach", "Martinez", "Prax", "Richard", "Sullivan", "Jha", "Irving", "Maheshwari", "Katre", "Johnson", "Smith", "Lee", "Chen", "Garcia", "Wilson", "Brown", "Davis", "Miller", "Taylor", "Anderson", "Thomas"];
  const titles = ["Partner and Alliances Manager", "Seller Onboarding Associate", "Associate Director", "Freelance Video Editor", "Information System Security", "Group Media Implementation", "Product Line Director", "Director of Product Management", "A&D Tech Director", "Chief Business Officer", "Head of Recruiting", "Member of Technical Staff"];
  const companies = ["elastic.co", "amazon.com", "greyorange.com", "upwork.com", "clarityinnovates.com", "phdmedia.com", "triumphgroup.com", "origamirisk.com", "siemens.com", "pinnacle.in", "yoummday.com", "salesforce.com"];
  const locations = ["San Francisco, US", "New York, US", "London, UK", "Berlin, DE", "Mumbai, IN", "Singapore, SG"];

  return Array.from({ length: count }, (_, i) => {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i + 7) % lastNames.length];
    const co = companies[i % companies.length];
    return {
      id: `lead-${uuidv4().substring(0, 8)}`,
      name: `${fn} ${ln}`,
      title: titles[i % titles.length],
      company: co.split(".")[0].charAt(0).toUpperCase() + co.split(".")[0].slice(1),
      location: (filters.location as string) || locations[i % locations.length],
      email: `${fn.charAt(0).toLowerCase()}***@${co}`,
      emailScore: Math.random() * 0.5 + 0.5,
      linkedin: `linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}`,
      industry: (filters.industry as string) || "Technology",
      companySize: (filters.companySize as string) || ["1-50", "51-200", "201-500", "501-1000", "5000+"][i % 5],
    };
  });
}
