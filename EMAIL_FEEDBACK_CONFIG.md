# EthnicEats — Configuration Email (Feedback)

## 🎯 Objectif
Envoyer automatiquement un email de remerciement avec lien vers un formulaire de feedback **une seule fois par compte** après la première commande.

## 📝 Configuration Requise

### Variables d'Environnement
Créez un fichier `.env` à la racine du projet :

```bash
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@ethniceats.ma
FROM_NAME=EthnicEats
```

### Configuration Gmail (Recommandé)

1. **Activer l'authentification à 2 facteurs**
   - Allez sur : https://myaccount.google.com/security
   - Activez "Vérification en 2 étapes"

2. **Générer un mot de passe d'application**
   - Allez sur : https://myaccount.google.com/apppasswords
   - Sélectionnez : "Mail" et "Windows (ou autre)"
   - Générez un mot de passe (16 caractères)
   - Copiez-le dans `SMTP_PASSWORD` (ignorez les espaces)

3. **Alternative : Utiliser un autre service email**
   - Mailgun, SendGrid, Resend, etc.
   - Adapter `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

## 📧 Contenu de l'Email

**Sujet :** "Merci d'avoir utilisé EthnicEats ! 🙏"

**Contenu :**
- Remerciement personnalisé (avec le prénom du client)
- Message explicatif sur l'importance du feedback
- Bouton CTA : "Répondre au formulaire (2 min)"
- Lien Google Form (cliquable)
- Avantages du feedback listés
- Signature professionnelle

**Lien Google Form :**
```
https://docs.google.com/forms/d/e/1FAIpQLScVow3L11nzvFbrPRvuTmYUIQDbl7PsXavRTqSLPf72HAxgJQ/viewform?usp=dialog
```

## 🔄 Flux d'Exécution

```
Client crée une commande
       ↓
crierCommande() exécutée
       ↓
Commande sauvegardée
       ↓
Vérification : feedbackEmailSent == false ?
       ↓ OUI
Envoi email via Flask API (/api/email/feedback)
       ↓
Mise à jour profil utilisateur : feedbackEmailSent = true
       ↓
Prochaines commandes : email NON envoyé (flag = true)
```

## 🚀 Déploiement

### Render (ou autre plateforme)

1. **Ajouter les variables d'environnement dans le dashboard Render :**
   - Settings → Environment
   - Ajouter `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`, `FROM_NAME`

2. **Installation des dépendances :**
   ```bash
   pip install -r requirements.txt  # python-dotenv inclus
   ```

3. **Tester l'endpoint :**
   ```bash
   curl -X POST https://your-app.onrender.com/api/email/feedback \
     -H "Content-Type: application/json" \
     -d '{
       "user_email": "test@example.com",
       "user_name": "Jean Dupont",
       "form_link": "https://docs.google.com/forms/d/e/1FAIpQLScVow3L11nzvFbrPRvuTmYUIQDbl7PsXavRTqSLPf72HAxgJQ/viewform?usp=dialog"
     }'
   ```

## 🔍 Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `controllers/email_controller.py` | **NOUVEAU** — Logique d'envoi email SMTP |
| `app.py` | Ajout endpoint `POST /api/email/feedback` |
| `controllers/commandeController.js` | Déclenchement email après création commande |
| `requirements.txt` | Ajout `python-dotenv` |

## ⚙️ Logique JavaScript

Dans `commandeController.js` / `crierCommande()` :

```javascript
// Après sauvegarde de la commande :
if (utilisateur && !utilisateur.feedbackEmailSent) {
  // Email non encore envoyé pour cet utilisateur
  const emailResult = await fetch("/api/email/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_email: utilisateur.email,
      user_name: utilisateur.nomComplet,
      form_link: "https://docs.google.com/forms/..."
    })
  });
  
  if (emailResult.ok) {
    // Marquer dans Firestore : feedbackEmailSent = true
    await sauvegarderUtilisateur(clientId, { 
      feedbackEmailSent: true 
    });
  }
}
```

## 🛡️ Gestion des Erreurs

- ✅ Erreur SMTP ? → Logguée en console (ne bloque pas la commande)
- ✅ Email invalide ? → Ignoré silencieusement (feedback optionnel)
- ✅ Email déjà envoyé ? → Vérification via flag `feedbackEmailSent`
- ✅ Appel API échoue ? → Tentative unique (pas de retry)

## 📊 Données Sauvegardées

Dans Firestore (`utilisateurs/{userId}`) :
```json
{
  "email": "client@example.com",
  "nomComplet": "Jean Dupont",
  "feedbackEmailSent": true  // Ajouté après premier email
}
```

## 🧪 Test Local

```bash
# 1. Installer les dépendances
pip install flask flask-cors python-dotenv

# 2. Créer un fichier .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@ethniceats.ma
FROM_NAME=EthnicEats

# 3. Lancer le serveur
python app.py

# 4. Créer une commande via checkout.html
# → Email envoyé automatiquement
# → feedbackEmailSent = true dans Firestore
```

## 🔗 Ressources Utiles

- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [SMTP Configuration](https://support.google.com/mail/answer/7126229)
- [Google Forms](https://docs.google.com/forms)
- [Python smtplib Docs](https://docs.python.org/3/library/smtplib.html)

---

**Besoin d'aide ?** Vérifiez les logs de la console du navigateur et du serveur Flask.
