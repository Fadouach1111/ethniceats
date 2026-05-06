# EthnicEats — Configuration Email de Feedback

## 🎯 Objectif
Envoyer automatiquement un email de remerciement avec lien vers un formulaire de feedback **une seule fois par compte** après la première commande.

**Utilise : Firebase Extensions** ✅ (Pas de SMTP, pas d'environnement à configurer)

---

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

---

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
Écriture dans Firestore : collection "feedbackEmails"
       ↓
Firebase Extension surveille et envoie automatiquement
       ↓
Mise à jour profil utilisateur : feedbackEmailSent = true
       ↓
Prochaines commandes : email NON envoyé (flag = true)
```

---

## 🚀 Installation Firebase Extension

### Étape 1 : Installer l'Extension "Trigger Email"

1. Allez à [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet EthnicEats
3. Cliquez sur **Extensions** (dans le menu gauche)
4. Cherchez et installez **"Trigger Email"** (par Google Cloud)

### Étape 2 : Configurer l'Extension

Lors de l'installation, vous aurez besoin de :

**Option A : Gmail (Simple)**
- Adresse email : `your-email@gmail.com`
- Mot de passe d'application : [Générer ici](https://myaccount.google.com/apppasswords)

**Option B : SendGrid (Recommandé pour production)**
- Clé API SendGrid : [Obtenir ici](https://app.sendgrid.com/settings/api_keys)

**Option C : Mailgun**
- Domaine Mailgun
- Clé API Mailgun

### Étape 3 : Configurer la Collection Firestore

L'extension surveille la collection **`feedbackEmails`**

Structure attendue :
```json
{
  "to": "client@example.com",
  "message": {
    "subject": "Merci d'avoir utilisé EthnicEats ! 🙏",
    "text": "Version texte de l'email",
    "html": "<html>Version HTML de l'email</html>"
  },
  "createdAt": "timestamp",
  "userId": "user-id"
}
```

✅ **Le code JavaScript crée automatiquement cette structure !**

---

## 🔍 Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `controllers/commandeController.js` | Fonction `_declencherEmailFeedback()` écrit dans Firestore |
| `controllers/email_controller.py` | **DÉPRÉCIÉ** — Firebase Extension gère maintenant |
| `app.py` | Endpoint `/api/email/feedback` supprimé |
| `requirements.txt` | `python-dotenv` supprimé |

---

## ⚙️ Logique JavaScript

Dans `commandeController.js` / `crierCommande()` :

```javascript
// Après sauvegarde de la commande :
if (utilisateur && !utilisateur.feedbackEmailSent) {
  // Déclencher email en écrivant dans Firestore
  await _declencherEmailFeedback(clientId, utilisateur);
  
  // Marquer : email déclenché (ne pas renvoyer)
  await sauvegarderUtilisateur(clientId, { feedbackEmailSent: true });
}
```

La fonction `_declencherEmailFeedback()` :
1. Écrit le document dans `feedbackEmails/{userId}`
2. Firebase Extension détecte le document
3. Envoie l'email automatiquement
4. Extension supprime le document (optionnel)

---

## 📊 Données Sauvegardées

Dans Firestore (`utilisateurs/{userId}`) :
```json
{
  "email": "client@example.com",
  "nomComplet": "Jean Dupont",
  "feedbackEmailSent": true  // Ajouté après premier email
}
```

---

## 🛡️ Gestion des Erreurs

- ✅ Extension pas configurée ? → Document reste dans `feedbackEmails` (pas d'erreur)
- ✅ Email invalide ? → Extension ignore le document
- ✅ Email déjà envoyé ? → Vérification via flag `feedbackEmailSent`
- ✅ Extension échoue ? → Document peut être réessayé manuellement

---

## 🧪 Test Local

1. **Installer l'Extension Trigger Email** dans Firebase Console
2. **Créer une commande** via checkout.html
3. **Vérifier Firestore** :
   - Collection `feedbackEmails` contient un document
   - Profil utilisateur : `feedbackEmailSent = true`
4. **Vérifier inbox email** :
   - Email reçu dans la boîte du destinataire
   - Lien Google Form cliquable

---

## 🔗 Ressources Utiles

- [Firebase Extensions Trigger Email](https://firebase.google.com/products/extensions/google-firebaseextensions-firestore-send-email)
- [Configurer Gmail](https://support.google.com/mail/answer/7126229)
- [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
- [Google Forms](https://docs.google.com/forms)

---

## ❓ Dépannage

**Email non reçu ?**
1. Vérifier que l'Extension est **installée** et **activée**
2. Vérifier logs Firebase Console → Extensions
3. Vérifier la collection `feedbackEmails` existe

**Extension dit "Collection introuvable" ?**
1. Écrire un document test dans `feedbackEmails/{test}`
2. L'extension créera la collection automatiquement

**Gmail : "Authentication failed" ?**
1. Générer un **App Password** (pas le mot de passe normal)
2. Vérifier **2-Step Verification** activée

---

**C'est tout ! Firebase gère le reste automatiquement.** 🎉
