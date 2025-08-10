// /pages/api/forgeHeroStep.js
import OpenAI from "openai";
import path from "path";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { heroDetails = {}, stepId } = req.body;
    if (!stepId) {
      return res.status(400).json({ error: "Missing stepId" });
    }

    // Load conversation JSON
    const jsonPath = path.join(process.cwd(), "public", "prompts", "hero_act1.json");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    const step = jsonData.steps.find((s) => s.id === stepId);
    if (!step || !step.backend_call) {
      return res.status(400).json({ error: `No backend_call found for step: ${stepId}` });
    }

    // Fill payload template
    const payloadTemplate = JSON.stringify(step.backend_call.payload_template || {});
    const filledPayload = JSON.parse(
      payloadTemplate.replace(/\{\{(.*?)\}\}/g, (_, key) => heroDetails[key.trim()] || "")
    );

    let responseData = {};

    // Action handling
    switch (stepId) {
      case "image_generation": {
        const promptParts = Object.values(filledPayload).filter(Boolean).join(", ");
        const image = await openai.images.generate({
          model: "dall-e-3",
          prompt: promptParts,
          size: "1024x1024",
        });
        responseData.imageUrl = image.data[0].url;
        break;
      }

      case "auto_generate": {
        // TODO: Replace mock with GPT call
        responseData = {
          name: "Aelarion",
          age: "27",
          gender: "male",
          traits: "brave, cunning, loyal",
          wardrobe: "silver armor with emerald cape",
          signatureItem: "enchanted longsword",
          imageUrl: "https://via.placeholder.com/1024",
        };
        break;
      }

      default:
        return res.status(400).json({ error: `No handler implemented for stepId: ${stepId}` });
    }

    // Apply response mapping
    if (step.backend_call.response_mapping) {
      const mappedData = {};
      for (const [apiKey, heroKey] of Object.entries(step.backend_call.response_mapping)) {
        if (responseData[apiKey] !== undefined) {
          mappedData[heroKey] = responseData[apiKey];
        }
      }
      return res.status(200).json(mappedData);
    }

    res.status(200).json(responseData);
  } catch (err) {
    console.error("forgeHeroStep error:", err);
    res.status(500).json({ error: "Backend action failed" });
  }
}
