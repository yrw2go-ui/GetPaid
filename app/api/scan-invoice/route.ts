import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            {
              type: "text",
              text: `You are an invoice data extraction expert for a home rehab/construction company. Analyze this invoice carefully.

Extract all data and return ONLY valid JSON with no markdown, no backticks, no explanation. Use this exact structure:
{
  "invoice_number": 142,
  "date": "YYYY-MM-DD",
  "contractor_name": "name or empty string",
  "contractor_address": "address or empty string",
  "contractor_phone": "phone or empty string",
  "contractor_email": "email or empty string",
  "property_address": "property address or empty string",
  "notes": "payment info or notes or empty string",
  "sections": [
    { "id": "exterior", "name": "Exterior", "items": [{ "id": "item-1", "description": "description", "materials": 0.00, "labor": 0.00 }] },
    { "id": "interior", "name": "Interior", "items": [] },
    { "id": "bathroom", "name": "Bathroom", "items": [] },
    { "id": "kitchen", "name": "Kitchen", "items": [] },
    { "id": "misc", "name": "Misc", "items": [] }
  ]
}

Rules: Always include all 5 sections even if empty. Use unique string ids like item-1, item-2. If unsure of section put in Misc. If unsure materials vs labor put in labor. invoice_number is a number not string, use 0 if not found. Return ONLY the JSON.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
    const parsed = JSON.parse(data.content[0].text.trim());
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
