// /pages/api/generateImage.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "A 'prompt' is required." });
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0].url;
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("OpenAI Image API error:", error);
    res.status(500).json({ error: `Failed to generate image. ${error.message}` });
  }
}
