import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // or gpt-5 if available
      messages: [
        { role: "system", content: "You are StorySmith's hero creation engine. Always output valid JSON strictly matching the CharacterBlock and StoryBlueprintBlock schema." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const rawOutput = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Hero generation failed:", err);
    res.status(500).json({ error: err.message });
  }
}
