import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const body = await req.json();

  try {
    // Proxy to Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/leads/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Fallback to local mock data if Python backend is not available
      return NextResponse.json(generateFallbackLeads(body));
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // Python backend not available - use fallback
    return NextResponse.json(generateFallbackLeads(body));
  }
}

function generateFallbackLeads(params: Record<string, unknown>) {
  const firstNames = ["Gina", "Danish", "Mohit", "Suman", "Phillip", "Octavio", "Stephen", "Peter", "Maria", "Ashutosh", "Thomas", "Saksham", "Gitesh", "Alice", "Bob"];
  const lastNames = ["Cardoso", "Shaikh", "Agrawal", "Kumar", "Roach", "Martinez", "Prax", "Richard", "Sullivan", "Jha", "Irving", "Maheshwari", "Katre", "Johnson", "Smith"];
  const titles = ["Partner and Alliances Manager", "Seller Onboarding Associate", "Associate Director", "Information System Security", "Product Line Director", "Director of Product Management", "A&D Tech Director", "Chief Business Officer", "Head of Recruiting", "Member of Technical Staff"];
  const companies = ["elastic.co", "amazon.com", "greyorange.com", "upwork.com", "clarityinnovates.com", "phdmedia.com", "triumphgroup.com", "origamirisk.com", "siemens.com", "salesforce.com"];
  const locations = ["San Francisco, US", "New York, US", "London, UK", "Berlin, DE", "Mumbai, IN", "Singapore, SG"];

  const limit = (params.limit as number) || 25;
  const leads = Array.from({ length: limit }, (_, i) => {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i + 7) % lastNames.length];
    const co = companies[i % companies.length];
    return {
      id: `lead-${Date.now()}-${i}`,
      name: `${fn} ${ln}`,
      title: titles[i % titles.length],
      company: co.split(".")[0].charAt(0).toUpperCase() + co.split(".")[0].slice(1),
      location: (params.location as string) || locations[i % locations.length],
      email: `${fn.charAt(0).toLowerCase()}***@${co}`,
      email_score: Math.random() * 0.5 + 0.5,
      linkedin: `linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}`,
      industry: (params.industry as string) || "Technology",
      company_size: (params.company_size as string) || ["1-50", "51-200", "201-500", "501-1000", "5000+"][i % 5],
      source: "fallback",
    };
  });

  return {
    leads,
    total_count: Math.floor(Math.random() * 90000) + 10000,
    query: params.query,
    filters: params,
  };
}
