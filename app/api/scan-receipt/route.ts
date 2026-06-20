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
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
            },
            {
              type: "text",
              text: `You are a receipt data extraction expert for a home rehab/construction company. Analyze this receipt carefully.

Extract all data and return ONLY valid JSON with no markdown, no backticks, no explanation. Use this exact structure:
{
  "store": "exact store name (e.g. Home Depot, Menards, Lowes)",
  "date": "date as YYYY-MM-DD or original format",
  "notes": "any promo codes, loyalty numbers, or relevant info",
  "items": [
    {
      "name": "full item description",
      "sku": "SKU, UPC, item number, or barcode if visible (empty string if not found)",
      "qty": 1,
      "price": 0.00,
      "category": "one of: Materials, Tools, Flooring, Plumbing, Electrical, Paint, Hardware, Lumber, Appliances, Other",
      "tax_deductible": true or false
    }
  ]
}

Category rules: Tools = tax deductible business equipment. Materials/Hardware/Lumber/Flooring/Paint = capital improvement, deductible. Appliances = usually deductible. Personal items = not deductible.

Tax deductible: If purchased for rehab/rental property business, most items ARE deductible. Mark true for anything construction, repair, or renovation related. Mark false for food, personal items, or unclear.

Return ONLY the JSON object.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
    const text = data.content[0].text.trim();
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
