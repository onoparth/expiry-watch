import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3001;
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(ai) });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini is not connected yet. Add your GEMINI_API_KEY to the .env file and restart the server."
      });
    }

    const { message, inventory = [], history = [] } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Please enter a message." });
    }

    const inventorySummary = inventory.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      expiryDate: item.expiryDate,
      notes: item.notes || ""
    }));

    const systemInstruction = `
You are EXPI, the friendly AI assistant inside EXPIRY WATCH, a household product expiry tracker.
Help users understand and manage ONLY the inventory supplied in the context.
Today's date is ${new Date().toISOString().slice(0, 10)}.
Be concise, practical, and friendly. Never claim you changed inventory; the website currently only uses you for advice and Q&A.
For food safety: do not guarantee that food is safe based only on its date or appearance. Explain that storage, handling, packaging instructions, and signs of spoilage matter. Do not advise tasting questionable food. For medicines, tell users not to use expired medication and to ask a pharmacist about disposal or replacement. Do not give medical diagnoses or dosage advice.
If the inventory is empty, explain how to add products.
Inventory JSON:
${JSON.stringify(inventorySummary)}
`;

    const contents = [
      ...history.slice(-8).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.text || "").slice(0, 3000) }]
      })),
      { role: "user", parts: [{ text: message.slice(0, 3000) }] }
    ];

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 700
      }
    });

    res.json({ reply: result.text || "I couldn't create a response. Please try again." });
  } catch (error) {
    console.error("Gemini request failed:", error);
    res.status(500).json({ error: "The AI assistant couldn't respond. Check your API key and try again." });
  }
});

app.listen(PORT, () => console.log(`EXPI server running at http://localhost:${PORT}`));
