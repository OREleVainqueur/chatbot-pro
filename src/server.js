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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "online", version: "1.0.0", agency: process.env.AGENCY_NAME || "Prodience Lab" });
});

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
