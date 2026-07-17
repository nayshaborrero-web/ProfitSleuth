import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

router.post("/analyze", async (req, res) => {
  const { imageBase64, mimeType } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: "imageBase64 and mimeType are required" });
    return;
  }

  const prompt = `You are an expert resale market analyst. Analyze this image of an item and provide a resale value estimate.

Return ONLY a valid JSON object with exactly these fields (no markdown, no extra text):
{
  "itemName": "specific descriptive item name",
  "category": "one of: Electronics, Clothing, Footwear, Collectibles, Furniture, Toys, Sports, Books, Jewelry, Other",
  "estimatedLow": <number: conservative low-end resale price in USD as integer>,
  "estimatedHigh": <number: optimistic high-end resale price in USD as integer>,
  "description": "2-3 sentences explaining what the item is, its condition (if visible), and why it has this resale value",
  "confidenceLevel": "one of: low, medium, high",
  "suggestedPlatforms": ["array", "of", "best", "platforms", "to sell on like eBay, Facebook Marketplace, Depop, StockX, etc"],
  "listingTags": ["8 to 12 short keyword tags a seller should add to their listing title or tags field, e.g. brand name, model, colour, size, style, condition keywords, niche descriptors — optimised for searchability on resale platforms"],
  "listingTemplate": {
    "title": "A punchy, search-optimised listing title of 60-80 characters including brand, item name, key feature, and condition",
    "body": "A ready-to-paste listing description of 3-4 short paragraphs: (1) what the item is and standout features, (2) visible condition details and any flaws to be transparent, (3) what's included in the sale, (4) a brief seller assurance line about dispatch and packaging. Write in second-person seller voice, no markdown, plain text only."
  }
}

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
