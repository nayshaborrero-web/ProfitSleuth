import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

router.post("/analyze", async (req, res) => {
  const { imageBase64, mimeType, itemNameHint } = req.body as {
    imageBase64?: string;
    mimeType?: string;
    itemNameHint?: string;
  };

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: "imageBase64 and mimeType are required" });
    return;
  }

  const hintLine = itemNameHint
    ? `\n\nIMPORTANT: The user has identified this item as "${itemNameHint}". Use this as the item name and base all pricing, tags, and listing copy on this specific item. Do not override it with your own guess.`
    : "";

  const prompt = `You are an expert resale market analyst. Analyze this image of an item and provide a resale value estimate.${hintLine}

Return ONLY a valid JSON object with exactly these fields (no markdown, no extra text):
{
  "itemName": "specific descriptive item name",
  "category": "one of: Electronics, Clothing, Footwear, Collectibles, Furniture, Toys, Sports, Books, Jewelry, Other",
  "condition": "one of exactly: poor, fair, good, like_new — choose based on visible wear. poor = heavily worn/damaged, fair = noticeable wear/flaws, good = light use/minor marks, like_new = barely used/no visible wear. If the item is not clearly visible default to fair.",
  "estimatedLow": <number: conservative low-end resale price in USD as integer>,
  "estimatedHigh": <number: optimistic high-end resale price in USD as integer>,
  "description": "2-3 sentences explaining what the item is, what makes it valuable on the resale market, and why it has this price range. Do NOT describe condition here — condition is captured separately.",
  "certainty": <integer 0–100 representing your certainty in the price estimate accuracy — not item condition. Use 0-40 if the item is unclear or obscured, 41-70 for moderate confidence, 71-100 for high confidence>,
  "suggestedPlatforms": ["array", "of", "best", "platforms", "to sell on like eBay, Facebook Marketplace, Depop, StockX, etc"],
  "listingTags": ["8 to 12 short keyword tags a seller should add to their listing title or tags field, e.g. brand name, model, colour, size, style, condition keywords, niche descriptors — optimised for searchability on resale platforms"],
  "listingTemplate": {
    "title": "A punchy, search-optimised listing title of 60-80 characters including brand, item name, key feature, and the condition label from the condition field above",
    "body": "A ready-to-paste listing description of 3-4 short paragraphs: (1) what the item is and standout features, (2) visible condition details consistent with the condition field — be specific and honest about any flaws, (3) what's included in the sale, (4) a brief seller assurance line about dispatch and packaging. Write in second-person seller voice, no markdown, plain text only."
  }
}

IMPORTANT: The condition field must be exactly one of: poor, fair, good, like_new. No other values are allowed.
Be specific and accurate. If the item is not clearly visible, set confidenceLevel to "low" and provide a wide price range.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType as string,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const text = response.text ?? "";

    let analysis: unknown;
    try {
      analysis = JSON.parse(text);
    } catch {
      req.log.error({ text }, "Failed to parse Gemini JSON response");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Gemini API error");
    res.status(500).json({ error: "AI analysis failed. Please try again." });
  }
});

export default router;
