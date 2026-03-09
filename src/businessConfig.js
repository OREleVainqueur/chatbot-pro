// ============================================================
// CHATBOT PRO — Gestionnaire de configurations métier
// Charge la config du bon client selon le numéro WhatsApp
// ============================================================
const fs = require("fs");
const path = require("path");

const BUSINESSES_DIR = path.join(__dirname, "../businesses");

// Cache en mémoire pour les configs
let configCache = {};

/**
 * Charge toutes les configurations au démarrage
 */
function loadAllConfigs() {
  configCache = {};
  const files = fs.readdirSync(BUSINESSES_DIR).filter(f => f.endsWith(".json"));

  files.forEach(file => {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(BUSINESSES_DIR, file), "utf8"));
      if (config.active) {
        configCache[config.whatsappNumber] = config;
        console.log(`✅ Config chargée : ${config.name} (${config.whatsappNumber})`);
      }
    } catch (e) {
      console.error(`❌ Erreur config ${file}:`, e.message);
    }
  });

  console.log(`📋 ${Object.keys(configCache).length} client(s) actif(s)`);
  return configCache;
}

/**
 * Récupère la config d'un business par son numéro WhatsApp destination
 */
function getBusinessConfig(toNumber) {
  return configCache[toNumber] || null;
}

/**
 * Récupère toutes les configs (pour le dashboard)
 */
function getAllBusinesses() {
  const files = fs.readdirSync(BUSINESSES_DIR).filter(f => f.endsWith(".json"));
  return files.map(file => {
    try {
      return JSON.parse(fs.readFileSync(path.join(BUSINESSES_DIR, file), "utf8"));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Sauvegarde ou met à jour une config
 */
function saveBusinessConfig(config) {
  const filename = `${config.id}.json`;
  fs.writeFileSync(
    path.join(BUSINESSES_DIR, filename),
    JSON.stringify(config, null, 2),
    "utf8"
  );
  // Recharger le cache
  if (config.active) {
    configCache[config.whatsappNumber] = config;
  }
}

/**
 * Construit le system prompt Claude à partir de la config métier
 */
function buildSystemPrompt(business) {
  const b = business;
  const info = b.businessInfo || {};

  let prompt = `Tu es ${b.identity.botName}, l'assistant(e) WhatsApp de "${b.name}".

PERSONNALITÉ : ${b.identity.tone}
LANGUE : Réponds toujours en français (ou dans la langue du client si différente).

INFORMATIONS SUR L'ENTREPRISE :
- Nom : ${b.name}
- Type : ${b.type}
${info.address ? `- Adresse : ${info.address}` : ""}
${info.phone ? `- Téléphone : ${info.phone}` : ""}
${info.hours ? `- Horaires : ${info.hours}` : ""}
${info.website ? `- Site web : ${info.website}` : ""}
${info.instagram ? `- Instagram : ${info.instagram}` : ""}
${info.delivery ? `- Livraison : Oui${info.deliveryZones ? " (" + info.deliveryZones.join(", ") + ")" : ""}` : ""}
`;

  // Menu / Services / Catalogue selon le type
  if (b.menu) {
    prompt += `\nMENU :\n`;
    b.menu.forEach(cat => {
      prompt += `\n${cat.category}:\n`;
      cat.items.forEach(item => {
        prompt += `  • ${item.name} — ${item.price.toLocaleString("fr-FR")} FCFA${item.description ? " (" + item.description + ")" : ""}\n`;
      });
    });
  }

  if (b.services) {
    prompt += `\nSERVICES & TARIFS :\n`;
    b.services.forEach(cat => {
      prompt += `\n${cat.category}:\n`;
      cat.items.forEach(item => {
        prompt += `  • ${item.name} — ${item.price.toLocaleString("fr-FR")} FCFA${item.duration ? " | " + item.duration : ""}\n`;
      });
    });
  }

  if (b.catalog) {
    prompt += `\nCATALOGUE :\n`;
    b.catalog.forEach(cat => {
      prompt += `\n${cat.category}:\n`;
      cat.items.forEach(item => {
        prompt += `  • ${item.name} — ${item.price.toLocaleString("fr-FR")} FCFA${item.sizes ? " | Tailles : " + item.sizes.join(", ") : ""}\n`;
      });
    });
  }

  // FAQ
  if (b.faqs && b.faqs.length > 0) {
    prompt += `\nFAQ — RÉPONSES TYPES :\n`;
    b.faqs.forEach(faq => {
      prompt += `Q: ${faq.question}\nR: ${faq.answer}\n\n`;
    });
  }

  // Prise de RDV
  if (b.appointments?.enabled) {
    prompt += `\nPRISE DE RENDEZ-VOUS :
Créneaux disponibles : ${b.appointments.slots.join(", ")}
Quand un client veut un RDV : demande-lui le service souhaité, la date et l'heure préférées, et son prénom.
Confirme avec le message : "${b.appointments.confirmationMessage}"
`;
  }

  // Capture de leads
  if (b.leadCapture?.enabled) {
    prompt += `\nCAPTURE DE LEADS :
Si le client semble intéressé à acheter ou réserver, demande naturellement son prénom et son numéro de téléphone.
Formule de manière naturelle, pas comme un formulaire.
`;
  }

  prompt += `
RÈGLES IMPORTANTES :
1. Réponds TOUJOURS de manière utile, chaleureuse et concise (max 3-4 lignes par réponse).
2. Utilise des emojis avec modération pour rendre la conversation vivante.
3. Si tu ne sais pas quelque chose, propose de faire rappeler par un humain.
4. Ne fabrique JAMAIS d'informations. Si tu n'as pas l'info, dis-le honnêtement.
5. Pour les commandes complexes, résume ce que tu as compris et demande confirmation.
6. Si le client demande explicitement à parler à un humain, un responsable, ou à être rappelé, réponds avec exactement : "[ESCALATION_REQUESTED] Je transfère votre demande à notre équipe. Un conseiller vous contactera sous peu."
7. Termine toujours par une question ou une proposition pour faire avancer la conversation.
`;

  return prompt;
}

module.exports = { loadAllConfigs, getBusinessConfig, getAllBusinesses, saveBusinessConfig, buildSystemPrompt };
