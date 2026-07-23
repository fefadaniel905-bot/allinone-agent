
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// gemini-1.5-flash is deprecated. gemini-2.5-flash-lite is the current
// free-tier model with the most generous quota (verified via web search,
// July 2026 — check ai.google.dev/gemini-api/docs/pricing if this drifts).
const GEMINI_MODEL = "gemini-2.5-flash-lite";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { userMessage, business_id } = body;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'userMessage'." },
        { status: 400 }
      );
    }
    if (!business_id || typeof business_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'business_id'." },
        { status: 400 }
      );
    }

    // Look up this business's info — this is what makes the agent
    // multi-tenant instead of a generic chatbot.
    const { data: business, error: dbError } = await supabase
      .from("businesses")
      .select("business_info, name")
      .eq("business_id", business_id)
      .single();

    if (dbError || !business) {
      console.error("Supabase lookup error:", dbError);
      return NextResponse.json({ error: "Unknown business_id." }, { status: 404 });
    }

    const prompt = `You are a helpful WhatsApp assistant for a business. Use ONLY this info: ${business.business_info}. Reply short in English or Oshiwambo. If asked for price/menu/hours use the info. If someone wants to book/order say 'Got it! Sent to owner.' If info is missing say 'Let me check with the owner and get back to you.' Customer: ${userMessage}`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    if (!reply) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({
      reply: reply.trim(),
      business_id,
      business_name: business.name,
    });
  } catch (error) {
    console.error("Error in /api/whatsapp:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
