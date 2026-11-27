import { GoogleGenAI } from "@google/genai";

export const config = {
  path: ["/api/health", "/api/chat"],
};

export default async (request) => {
  const apiKey = Netlify.env.get("NETLIFY_AI_GATEWAY_KEY");
  const baseUrl = Netlify.env.get("NETLIFY_AI_GATEWAY_URL")?.replace(/\/$/, "");

  if (request.method === "GET") {
    return Response.json({ ok: true, aiConfigured: Boolean(apiKey) });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  if (!apiKey) {
    return Response.json({
      error: "The AI assistant isn't available right now. Please try again shortly."
    }, { status: 503 });
  }

  try {
    const { message, inventory = [], history = [] } = await request.json();
    if (!message || typeof message !== "string") {
      return Response.json({ error: "Please enter a message." }, { status: 400 });
    }

    const inventorySummary = inventory.slice(0, 300).map((item) => ({
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

    const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl } });
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: { systemInstruction, temperature: 0.5, maxOutputTokens: 700 }
    });

    return Response.json({ reply: result.text || "I couldn't create a response. Please try again." });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return Response.json({ error: "The AI assistant couldn't respond. Please try again in a moment." }, { status: 500 });
  }
};
