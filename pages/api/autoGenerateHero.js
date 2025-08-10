// /pages/api/autoGenerateHero.js
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
    // Load JSON from public folder
    const jsonPath = path.join(process.cwd(), "public", "prompts", "hero_act1.json");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    const autoStep = jsonData.steps.find(s => s.id === "auto_generate");
    const systemInstructions = autoStep.backend_call.payload_template.systemInstructions;

    // Call GPT for a hero blueprint
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: "Generate a fictional hero for the story." }
      ]
    });

    // Assume GPT returns JSON
    let heroBlueprint = {};
    try {
      heroBlueprint = JSON.parse(completion.choices[0].message.content);
    } catch {
      return res.status(500).json({ error: "Invalid hero JSON from GPT" });
    }

    res.status(200).json(heroBlueprint);
  } catch (err) {
    console.error("autoGenerateHero error:", err);
    res.status(500).json({ error: "Hero auto-generation failed" });
  }
}
