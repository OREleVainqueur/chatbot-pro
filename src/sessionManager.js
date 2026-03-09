// ============================================================
// CHATBOT PRO — Gestionnaire de sessions
// Maintient l'historique de conversation par client
// ============================================================
const fs = require("fs-extra");
const path = require("path");

const SESSIONS_DIR = path.join(__dirname, "../data/sessions");
fs.ensureDirSync(SESSIONS_DIR);

// Cache mémoire des sessions actives
const activeSessions = {};

const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 heures d'inactivité = nouvelle session
const MAX_HISTORY = 20; // Garder les 20 derniers messages

/**
 * Récupère ou crée une session pour un utilisateur
 */
function getSession(userPhone, businessId) {
  const key = `${businessId}::${userPhone}`;

  if (activeSessions[key]) {
    const session = activeSessions[key];
    // Vérifier si la session a expiré
    if (Date.now() - session.lastActivity > SESSION_TTL) {
      console.log(`⏰ Session expirée pour ${userPhone}`);
      delete activeSessions[key];
      return createSession(key, userPhone, businessId);
    }
    session.lastActivity = Date.now();
    return session;
  }

  return createSession(key, userPhone, businessId);
}

function createSession(key, userPhone, businessId) {
  const session = {
    key,
    userPhone,
    businessId,
    startedAt: new Date().toISOString(),
    lastActivity: Date.now(),
    messageCount: 0,
    history: [], // Format Claude : [{role, content}]
    leadData: {}, // Données collectées sur le client
    context: {}, // Contexte métier (ex: commande en cours)
  };
  activeSessions[key] = session;
  return session;
}

/**
 * Ajoute un message à l'historique
 */
function addMessage(session, role, content) {
  session.history.push({ role, content });
  session.messageCount++;
  session.lastActivity = Date.now();

  // Garder seulement les N derniers messages
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
}

/**
 * Met à jour les données de lead capturé
 */
function updateLeadData(session, data) {
  session.leadData = { ...session.leadData, ...data };
}

/**
 * Marque la session pour escalation
 */
function markEscalation(session) {
  session.escalated = true;
  session.escalatedAt = new Date().toISOString();
  console.log(`🚨 Escalation demandée pour ${session.userPhone}`);
}

/**
 * Retourne les statistiques des sessions actives
 */
function getStats() {
  const now = Date.now();
  const active = Object.values(activeSessions).filter(
    s => now - s.lastActivity < SESSION_TTL
  );

  return {
    activeSessions: active.length,
    totalMessages: active.reduce((sum, s) => sum + s.messageCount, 0),
  };
}

module.exports = { getSession, addMessage, updateLeadData, markEscalation, getStats };
