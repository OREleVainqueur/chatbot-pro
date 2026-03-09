// ============================================================
// CHATBOT PRO — Service Twilio
// ============================================================
const twilio = require("twilio");

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Envoie un message WhatsApp
 */
async function sendWhatsApp(to, from, message) {
  try {
    await twilioClient.messages.create({ from, to, body: message });
    console.log(`✅ Envoyé à ${to}`);
  } catch (err) {
    console.error(`❌ Erreur envoi à ${to}:`, err.message);
  }
}

/**
 * Envoie un broadcast à plusieurs numéros
 */
async function sendBroadcast(from, recipients, message) {
  const results = [];
  for (const to of recipients) {
    try {
      await twilioClient.messages.create({ from, to, body: message });
      results.push({ to, success: true });
      console.log(`📢 Broadcast envoyé à ${to}`);
      // Petite pause pour éviter les limites de taux
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      results.push({ to, success: false, error: err.message });
      console.error(`❌ Broadcast erreur à ${to}:`, err.message);
    }
  }
  return results;
}

module.exports = { sendWhatsApp, sendBroadcast };
