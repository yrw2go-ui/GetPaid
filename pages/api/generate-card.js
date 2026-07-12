// pages/api/generate-card.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { concept } = req.body

  if (!concept || !concept.trim()) {
    return res.status(400).json({ error: 'No concept provided' })
  }

  const prompt = `You are a trading card designer. Based on this concept, invent a character and return ONLY a JSON object with no markdown, no backticks, no preamble.

Concept: ${concept}

Return exactly this shape:
{
  "name": "character name",
  "title": "a short epithet, e.g. Warden of the Deep",
  "description": "2 sentences describing who they are",
  "flavor_text": "one evocative italic-style quote or line, max 15 words",
  "rarity": "one of: common, uncommon, rare, epic, legendary",
  "hp": number 20-100,
  "attack": number 20-100,
  "defense": number 20-100,
  "speed": number 20-100,
  "image_prompt": "a vivid visual description for an image generator, describing appearance, pose, setting, mood, art style"
}

Make stats reflect the character concept. Higher rarity should mean stronger stats overall.`

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 600,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({ error: data.message || 'Mistral error' })
    }

    let text = data.choices[0].message.content.trim()
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()

    let card
    try {
      card = JSON.parse(text)
    } catch {
      return res.status(500).json({ error: 'Could not parse card JSON', raw: text.slice(0, 300) })
    }

    return res.status(200).json({ card })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
