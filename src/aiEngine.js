// ============================================================
// CHATBOT PRO — Moteur IA (Claude)
// Génère les réponses et détecte les intentions
// ============================================================
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Génère une réponse conversationnelle pour le client
 */
async function generateReply(systemPrompt, history) {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: history,
    });
    return response.content[0].text;
  } catch (error) {
    console.error("Erreur Claude:", error.message);
    return "Désolé, je rencontre un problème technique. Veuillez réessayer dans un instant ou appelez-nous directement.";
  }
}

/**
 * Détecte si un message contient des informations de lead (nom, téléphone)
 * Utilise Claude pour extraction intelligente
 */
async function detectLeadInfo(message, existingData = {}) {
  try {
    const prompt = `Analyse ce message et extrais les informations personnelles si présentes.
Message : "${message}"
Données existantes déjà capturées : ${JSON.stringify(existingData)}

Réponds UNIQUEMENT avec un JSON :
{
  "name": "prénom si trouvé ou null",
  "phone": "numéro de téléphone si trouvé ou null",
  "interest": "ce que le client veut acheter/faire ou null",
  "hasNewInfo": true/false
}

Règles :
- Ne duplique pas les données déjà capturées
- Pour le téléphone, normalise au format +2257XXXXXXXX si ivoirien
- hasNewInfo = true seulement s'il y a vraiment de nouvelles infos`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].text.replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch {
    return { hasNewInfo: false };
  }
}

module.exports = { generateReply, detectLeadInfo };
