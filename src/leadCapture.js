// ============================================================
// CHATBOT PRO — Capture de leads
// Sauvegarde les contacts et intentions des prospects
// ============================================================
const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const LEADS_DIR = path.join(__dirname, "../data/leads");
fs.ensureDirSync(LEADS_DIR);

/**
 * Sauvegarde un lead
 */
async function saveLead(businessId, leadData, session) {
  const lead = {
    id: uuidv4(),
    businessId,
    capturedAt: new Date().toISOString(),
    phone: session.userPhone,
    name: leadData.name || null,
    contactPhone: leadData.phone || null,
    interest: leadData.interest || null,
    service: leadData.service || null,
    messageCount: session.messageCount,
    firstMessage: session.history.length > 0 ? session.history[0].content : null,
  };

  const file = path.join(LEADS_DIR, `${businessId}.json`);
  let leads = [];
  try {
    leads = await fs.readJSON(file);
  } catch {
    leads = [];
  }

  // Éviter les doublons par numéro de téléphone (24h)
  const existingIdx = leads.findIndex(
    l => l.phone === lead.phone &&
    Date.now() - new Date(l.capturedAt).getTime() < 24 * 60 * 60 * 1000
  );
  if (existingIdx >= 0) {
    leads[existingIdx] = { ...leads[existingIdx], ...lead };
  } else {
    leads.push(lead);
  }

  await fs.writeJSON(file, leads, { spaces: 2 });
  console.log(`📧 Lead sauvegardé : ${lead.phone} → ${businessId}`);
  return lead;
}

/**
 * Récupère tous les leads d'un business
 */
async function getLeads(businessId) {
  const file = path.join(LEADS_DIR, `${businessId}.json`);
  try {
    return await fs.readJSON(file);
  } catch {
    return [];
  }
}

/**
 * Récupère les stats leads de tous les businesses
 */
async function getAllLeadsStats() {
  const files = await fs.readdir(LEADS_DIR);
  const stats = {};
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const businessId = file.replace(".json", "");
    const leads = await fs.readJSON(path.join(LEADS_DIR, file));
    const today = new Date().toDateString();
    stats[businessId] = {
      total: leads.length,
      today: leads.filter(l => new Date(l.capturedAt).toDateString() === today).length,
    };
  }
  return stats;
}

module.exports = { saveLead, getLeads, getAllLeadsStats };
