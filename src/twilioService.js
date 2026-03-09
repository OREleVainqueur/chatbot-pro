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

module.exports = { sendWhatsApp };
