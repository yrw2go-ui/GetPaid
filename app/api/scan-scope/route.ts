import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const isImage = mediaType?.startsWith("image/") || !mediaType;
    const isPDF = mediaType === "application/pdf";

    const contentBlock = isPDF
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `You are a construction scope of work extraction expert. Analyze this document carefully.

Extract every single line item from this scope of work document. Copy descriptions EXACTLY as written — do not summarize or shorten them. Preserve the exact wording (e.g. "Paint entire house, trim, doors" not just "Paint").

Return ONLY valid JSON with no markdown, no backticks, no explanation:
{
  "property_address": "address if visible or empty string",
  "items": [
    {
      "description": "EXACT description copied from document",
      "cost": 0.00,
      "labor": 0.00,
      "is_paint": false,
      "sort_order": 1
    }
  ]
}

Rules:
- Copy description text EXACTLY as it appears — every word, every detail
- cost = material/parts cost for that item
- labor = labor cost for that item  
- If only one total is given with no breakdown, put it all in labor, leave cost as 0
- is_paint = true if description mentions paint, painting, primer, stain, or finish coat
- sort_order = line number order as they appear in the document
- Include EVERY line item, even small ones
- Return ONLY the JSON object`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
    let text = data.content[0].text.trim();
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
