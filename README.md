# ⚡ ChatBot WhatsApp Pro — Plateforme IA Multi-clients

> La solution que toute entreprise africaine veut. Déployée par Prodience Lab.

---

## 🎯 Ce que c'est

Une plateforme SaaS clé en main qui permet à n'importe quelle entreprise d'avoir un **assistant IA sur WhatsApp**, actif 24h/24, qui :

- Répond aux questions des clients instantanément
- Présente les services, menus, tarifs
- Prend des rendez-vous
- Capture les leads (nom + téléphone)
- S'adapte à l'identité de chaque client

**Cibles** : restaurants, salons, boutiques, hôtels, pharmacies, écoles, garages, agents immobiliers, prestataires de services... **toute entreprise qui a des clients sur WhatsApp**.

---

## 🏗️ Architecture

```
WhatsApp Client
    ↓
Twilio API → Webhook POST /webhook
    ↓
businesses/{id}.json (config du client)
    ↓
Claude API (Anthropic) — avec system prompt personnalisé
    ↓
Réponse → Twilio → WhatsApp Client
    ↓ (en parallèle)
data/leads/{id}.json — Capture automatique des leads
```

**Multi-tenant** : un seul serveur, autant de clients que vous voulez. Chaque client a son propre fichier de configuration JSON.

---

## ⚡ Démarrage rapide

### 1. Installation
```bash
npm install
cp .env.example .env
# Éditer .env avec vos clés
```

### 2. Lancement dev
```bash
npm run dev
# → http://localhost:3000/dashboard.html
```

### 3. Exposer en ligne (dev)
```bash
npx ngrok http 3000
# Copier l'URL dans .env : PUBLIC_URL=https://xxx.ngrok.io
```

### 4. Configurer Twilio
- Aller sur console.twilio.com → Messaging → WhatsApp Sandbox
- **Webhook URL** : `https://votre-url.com/webhook` (méthode POST)

---

## 🏢 Ajouter un nouveau client

### Option A : Via le Dashboard (recommandé)
1. Ouvrir `http://localhost:3000/dashboard.html`
2. Cliquer "Nouveau client"
3. Remplir le formulaire
4. Cliquer "Créer le chatbot"
5. Redémarrer le serveur

### Option B : Fichier JSON manuel
Créer `businesses/mon-client.json` en copiant un exemple existant.

---

## 📁 Structure du projet

```
chatbot-pro/
├── src/
│   ├── server.js           # Serveur Express + routes API admin
│   ├── webhook.js          # Orchestration principale
│   ├── businessConfig.js   # Chargement configs + system prompt
│   ├── sessionManager.js   # Sessions de conversation
│   ├── aiEngine.js         # Intégration Claude API
│   ├── leadCapture.js      # Sauvegarde des leads
│   └── twilioService.js    # Envoi WhatsApp
├── businesses/             # Config JSON de chaque client
│   ├── restaurant-chez-marie.json
│   ├── salon-beaute-flora.json
│   └── boutique-mode-africa.json
├── public/
│   └── dashboard.html      # Dashboard admin
├── data/
│   ├── leads/              # Leads par client (auto-créé)
│   └── sessions/           # Sessions actives (auto-créé)
├── .env.example
└── package.json
```

---

## 💰 Modèle commercial recommandé

### Votre offre (Prodience Lab)

| Prestation | Prix |
|---|---|
| Setup + configuration | 50 000 FCFA |
| Abonnement mensuel | 25 000 FCFA/mois |
| Formation du client (1h) | 15 000 FCFA |

### Vos coûts mensuels (pour info)
| Coût | Prix |
|---|---|
| Claude API (env. 1000 messages) | ~2 $ |
| Twilio WhatsApp | ~1 $/1000 messages |
| Hébergement Railway/Render | 0-5 $ |
| **Total par client** | **< 5 000 FCFA/mois** |

**Marge : > 80%** 💰

### Secteurs prioritaires à démarcher
1. **Restaurants** — Commandes, menus, réservations
2. **Salons de coiffure/beauté** — RDV, tarifs
3. **Boutiques de mode** — Catalogue, tailles, livraison
4. **Pharmacies** — Disponibilité produits, prix
5. **Écoles / Centres de formation** — Inscriptions, programmes
6. **Hôtels / Guest houses** — Disponibilités, tarifs
7. **Agents immobiliers** — Annonces, visites

---

## 🚀 Déploiement production

### Railway (recommandé)
```bash
npm install -g @railway/cli
railway login
railway new
railway up
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx
railway variables set TWILIO_ACCOUNT_SID=ACxxx
# ... autres variables
```

### Variables d'environnement requises
```
ANTHROPIC_API_KEY     → console.anthropic.com
TWILIO_ACCOUNT_SID    → console.twilio.com
TWILIO_AUTH_TOKEN     → console.twilio.com
TWILIO_WHATSAPP_NUMBER → whatsapp:+14155238886 (sandbox) ou votre numéro
ADMIN_PASSWORD        → Mot de passe de votre dashboard
PUBLIC_URL            → https://votre-app.railway.app
```

---

## 📞 Support — Prodience Lab
Développé avec ❤️ pour les entrepreneurs africains.
