// ============================================================
// CHATBOT PRO — Webhook Handler
// Orchestre tout : session → IA → lead → réponse
// ============================================================
const { getBusinessConfig, buildSystemPrompt } = require("./businessConfig");
const { getSession, addMessage, updateLeadData } = require("./sessionManager");
const { generateReply, detectLeadInfo } = require("./aiEngine");
const { saveLead } = require("./leadCapture");
const { sendWhatsApp } = require("./twilioService");

async function handleIncomingMessage(body) {
  const from = body.From; // Numéro de l'utilisateur (whatsapp:+226...)
  const to = body.To;     // Numéro du business (whatsapp:+225...)
  const text = (body.Body || "").trim();

  if (!text) return; // Ignorer messages vides

  console.log(`\n📩 [${to}] Message de ${from}: "${text}"`);

  // 1. Trouver la config du business
  const business = getBusinessConfig(to);
  if (!business) {
    console.warn(`⚠️ Aucun business configuré pour ${to}`);
    return;
  }

  // 2. Récupérer ou créer la session
  const session = getSession(from, business.id);

  // 3. Message de bienvenue si première interaction
  if (session.messageCount === 0) {
    await sendWhatsApp(from, to, business.identity.greeting);
    // Petite pause pour une meilleure expérience
    await sleep(800);
  }

  // 4. Ajouter le message utilisateur à l'historique
  addMessage(session, "user", text);

  // 5. Générer la réponse IA
  const systemPrompt = buildSystemPrompt(business);
  const reply = await generateReply(systemPrompt, session.history);

  // 6. Ajouter la réponse à l'historique
  addMessage(session, "assistant", reply);

  // 7. Envoyer la réponse
  await sendWhatsApp(from, to, reply);

  // 8. Détecter et sauvegarder les infos de lead (en arrière-plan)
  if (business.leadCapture?.enabled && session.messageCount >= 3) {
    detectAndSaveLead(text, session, business);
  }
}

async function detectAndSaveLead(message, session, business) {
  try {
    const leadInfo = await detectLeadInfo(message, session.leadData);
    if (leadInfo.hasNewInfo) {
      updateLeadData(session, leadInfo);
      // Sauvegarder si on a au moins le téléphone ou le nom
      if (leadInfo.phone || leadInfo.name) {
        await saveLead(business.id, session.leadData, session);
      }
    }
  } catch (e) {
    console.error("Erreur détection lead:", e.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { handleIncomingMessage };
