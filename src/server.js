// ============================================================
// CHATBOT PRO — Serveur principal
// ============================================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const { loadAllConfigs, getAllBusinesses, saveBusinessConfig } = require("./businessConfig");
const { handleIncomingMessage } = require("./webhook");
const { getLeads, getAllLeadsStats } = require("./leadCapture");
const { getStats } = require("./sessionManager");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Servir le dashboard admin
app.use(express.static(path.join(__dirname, "../public")));

// ── Middleware auth admin simple ────────────────────────────
function adminAuth(req, res, next) {
  const password = req.headers["x-admin-password"] || req.query.password;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

// ── Webhook WhatsApp ────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.status(200).send("OK"); // Répondre immédiatement à Twilio
  try {
    await handleIncomingMessage(req.body);
  } catch (err) {
    console.error("Erreur webhook:", err);
  }
});

// ── API Admin ───────────────────────────────────────────────

// Dashboard stats
app.get("/api/stats", adminAuth, async (req, res) => {
  const sessionStats = getStats();
  const leadsStats = await getAllLeadsStats();
  const businesses = getAllBusinesses();

  res.json({
    sessions: sessionStats,
    leads: leadsStats,
    businesses: businesses.map(b => ({
      id: b.id,
      name: b.name,
      type: b.type,
      active: b.active,
      whatsappNumber: b.whatsappNumber,
    })),
  });
});

// Liste des businesses
app.get("/api/businesses", adminAuth, (req, res) => {
  res.json(getAllBusinesses());
});

// Leads d'un business
app.get("/api/leads/:businessId", adminAuth, async (req, res) => {
  const leads = await getLeads(req.params.businessId);
  res.json(leads);
});

// Créer / mettre à jour un business
app.post("/api/businesses", adminAuth, (req, res) => {
  try {
    const config = req.body;
    if (!config.id || !config.name) {
      return res.status(400).json({ error: "id et name obligatoires" });
    }
    saveBusinessConfig(config);
    res.json({ success: true, message: `Client ${config.name} sauvegardé` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulation (pour le dashboard)
app.post("/api/simulate", adminAuth, async (req, res) => {
  try {
    const { businessId, history } = req.body;
    const businesses = getAllBusinesses();
    const business = businesses.find(b => b.id === businessId);
    if (!business) return res.status(404).json({ error: "Business non trouvé" });

    const { buildSystemPrompt } = require("./businessConfig");
    const { generateReply } = require("./aiEngine");
    const systemPrompt = buildSystemPrompt(business);
    const reply = await generateReply(systemPrompt, history);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast à tous les leads d'un business
app.post("/api/broadcast", adminAuth, async (req, res) => {
  try {
    const { businessId, message } = req.body;
    if (!businessId || !message) {
      return res.status(400).json({ error: "businessId et message obligatoires" });
    }

    const business = getBusinessConfig(getAllBusinesses().find(b => b.id === businessId)?.whatsappNumber);
    if (!business) {
      return res.status(404).json({ error: "Business non trouvé" });
    }

    const leads = await getLeads(businessId);
    const recipients = leads.map(l => l.phone).filter(phone => phone);

    if (recipients.length === 0) {
      return res.json({ success: true, message: "Aucun destinataire trouvé" });
    }

    const { sendBroadcast } = require("./twilioService");
    const results = await sendBroadcast(business.whatsappNumber, recipients, message);

    res.json({
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "online", version: "2.0.0", agency: process.env.AGENCY_NAME || "Prodience Lab" });
});

// ── Proxy Claude — Chatbot prodiencelab.com ─────────────────
app.use((req, res, next) => {
  if (req.headers.origin === 'https://prodiencelab.com') {
    res.header('Access-Control-Allow-Origin', 'https://prodiencelab.com');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/chat', async (req, res) => {
  try {
    // Vérification token de sécurité
    const token = req.headers['x-site-token'];
    if (token !== 'PL-2026-SITE-SECRET') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    const { messages, system } = req.body;
    const { generateReply } = require('./aiEngine');
    const reply = await generateReply(system, messages);
    res.json({ content: [{ text: reply }] });
  } catch (error) {
    console.error('Erreur proxy Claude:', error);
    res.status(500).json({
      fallback: "Petit souci technique 😅 Écrivez-nous sur WhatsApp : +225 07 15 41 53 96"
    });
  }
});
// ── Fin Proxy Claude ─────────────────────────────────────────

// ── Démarrage ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// Charger les configs au démarrage
loadAllConfigs();

app.listen(PORT, () => {
  console.log(`\n🚀 CHATBOT PRO démarré sur http://localhost:${PORT}`);
  console.log(`📊 Dashboard admin : http://localhost:${PORT}/dashboard.html`);
  console.log(`📡 Webhook URL     : http://localhost:${PORT}/webhook`);
  console.log(`💡 Exposer avec   : npx ngrok http ${PORT}\n`);
});
