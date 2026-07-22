import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Multi-Tenant AI WhatsApp Agent — Allinone Trust
// One endpoint. Any business. Business identity comes from `business_id`,
// never hardcoded.
// ---------------------------------------------------------------------------

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// NOTE (flagged, not guessed): Gemini 1.5 Flash is deprecated as of 2026.
// gemini-2.5-flash-lite is the current free-tier model with the most
// generous quota. If you want higher quality answers and don't mind a
// lower daily cap, switch this to "gemini-2.5-flash".
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT_TEMPLATE = (business_info: string, userMessage: string) =>
  `You are a helpful WhatsApp assistant for a business. Use ONLY this info: ${business_info}. Reply short in English or Oshiwambo. If asked for price/menu/hours use the info. If someone wants to book/order say 'Got it! Sent to owner.' If info is missing say 'Let me check with the owner and get back to you.' Customer: ${userMessage}`;

interface WhatsAppRequestBody {
  userMessage: string;
  business_id: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<WhatsAppRequestBody>;
    const { userMessage, business_id } = body;

    // --- 1. Validate input --------------------------------------------------
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

    // --- 2. Look up business_info from Supabase using business_id -----------
    const { data: business, error: dbError } = await supabase
      .from("businesses")
      .select("business_info, owner_whatsapp, name")
      .eq("business_id", business_id)
      .single();

    if (dbError || !business) {
      // Don't leak DB error details to the client — log server-side only.
      console.error("Supabase lookup error:", dbError);
      return NextResponse.json(
        { error: "Unknown business_id." },
        { status: 404 }
      );
    }

    // --- 3. Send to Gemini with the system prompt ----------------------------
    const prompt = SYSTEM_PROMPT_TEMPLATE(business.business_info ?? "", userMessage);

    const geminiRes = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return NextResponse.json(
        { error: "AI service temporarily unavailable." },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();

    const reply: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("Unexpected Gemini response shape:", JSON.stringify(geminiData));
      return NextResponse.json(
        { error: "AI returned an empty response." },
        { status: 502 }
      );
    }

    // --- 4. Return the AI reply ----------------------------------------------
    return NextResponse.json({
      reply: reply.trim(),
      business_id,
      business_name: business.name ?? null,
    });
  } catch (err) {
    console.error("Unhandled error in /api/whatsapp:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// Optional: reject other HTTP methods explicitly for clarity
export async function GET() {
  return NextResponse.json(
    { error: "Use POST with { userMessage, business_id }." },
    { status: 405 }
  );
}
