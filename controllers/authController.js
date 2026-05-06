/**
 * @file authController.js
 * @description Contrôleur d'authentification — EthnicEats
 *
 * Orchestre les interactions entre les vues d'authentification et le service
 * authService.js. Ne manipule jamais le DOM directement — retourne des objets
 * résultat aux vues qui s'occupent de l'affichage.
 *
 * Pages gérées :
 *   - choix-role.html      → initChoixRole()
 *   - auth/register.html   → handleRegister()
 *   - auth/login.html      → handleLogin()
 *   - auth/verification.html → handleVerificationOTP()
 *   - client/preferences.html (post-OTP client)
 *   - Toutes les pages protégées → protegerPage()
 *
 * Architecture MVC : ce contrôleur est consommé par les vues uniquement.
 * Il n'accède ni au DOM ni aux éléments visuels.
 *
 * Dépendances :
 *   - services/authService.js
 */

import {
  register,
  login,
  logout,
  verifierEmail,
  modifierProfil,
  modifierMotDePasse,
  getCurrentUser,
} from "../services/authService.js";

import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Clés sessionStorage utilisées pour le flux d'inscription / vérification */
const SESSION_KEYS = {
  rolePending: "ee_role_pending",
  uidPending:  "ee_uid_pending",
};

/** Pages de redirection selon le contexte */
const ROUTES = {
  choixRole:      "/",
  connexion:      "/login",
  verification:   "/verification",
  preferences:    "/preferences",
  clientAccueil:  "/accueil",
  livreurCommandes: "/livreur/commandes",
};

// ─── Helpers privés ──────────────────────────────────────────────────────────

/**
 * Redirige la fenêtre courante.
 * Isolé pour faciliter les tests unitaires.
 * @param {string} url
 */
function _rediriger(url) {
  window.location.href = url;
}

/**
 * Retourne l'URL de destination selon le rôle après connexion réussie.
 * @param {string} role - "client" | "livreur"
 * @returns {string}
 */
function _routeParRole(role) {
  return role === "livreur" ? ROUTES.livreurCommandes : ROUTES.clientAccueil;
}

// ─── initChoixRole ────────────────────────────────────────────────────────────

/**
 * Initialise la page de choix du rôle.
 *
 * Vérifie si un utilisateur est déjà connecté et redirige automatiquement
 * vers son interface sans repasser par le choix du rôle.
 *
 * À appeler au DOMContentLoaded de choix-role.html.
 *
 * @returns {Promise<{ redirige: boolean, role: string|null }>}
 */
async function initChoixRole() {
  try {
    const utilisateur = await getCurrentUser();

    if (utilisateur) {
      // Utilisateur déjà connecté — redirection silencieuse
      _rediriger(_routeParRole(utilisateur.role));
      return { redirige: true, role: utilisateur.role };
    }

    return { redirige: false, role: null };

  } catch (error) {
    console.error("[authController.initChoixRole]", error.message);
    return { redirige: false, role: null };
  }
}

// ─── handleRegister ───────────────────────────────────────────────────────────

/**
 * Gère l'inscription d'un client ou d'un livreur.
 *
 * Flux :
 *  1. Valide la cohérence des données du formulaire.
 *  2. Délègue la création du compte à authService.register().
 *  3. Retourne un objet résultat à la vue pour l'affichage.
 *
 * @param {FormData|Object} formData - Données du formulaire d'inscription.
 *   Champs attendus :
 *     nomComplet      {string}       — obligatoire, ≥ 2 caractères
 *     email           {string}       — obligatoire
 *     motDePasse      {string}       — obligatoire, ≥ 6 caractères
 *     confirmMdp      {string}       — doit correspondre à motDePasse
 *     role            {string}       — "client" | "livreur"
 *     telephoneContact {string|null} — obligatoire si role === "livreur"
 *
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function handleRegister(formData) {
  try {
    const currentUser = await getCurrentUser();

    if (currentUser?.uid) {
      return {
        success: false,
        message: "Vous êtes déjà connecté. Déconnectez-vous avant de créer un nouveau compte.",
      };
    }
    // ── Normalisation de l'entrée ──────────────────────────────────────────
    const données = formData instanceof FormData
      ? Object.fromEntries(formData.entries())
      : formData;

    const {
      nomComplet       = "",
      email            = "",
      motDePasse       = "",
      confirmMdp       = "",
      telephoneContact = null,
    } = données;

    // Le rôle peut provenir du formulaire ou du sessionStorage
    const role = données.role || sessionStorage.getItem(SESSION_KEYS.rolePending) || "";

    // ── Validations controller ─────────────────────────────────────────────
    if (!["client", "livreur"].includes(role)) {
      return {
        success: false,
        message: "Rôle non reconnu. Veuillez retourner à l'écran de choix du rôle.",
      };
    }

    if (motDePasse !== confirmMdp) {
      return {
        success: false,
        message: "Les mots de passe ne correspondent pas.",
      };
    }

    // ── Délégation au service ──────────────────────────────────────────────
    const résultat = await register(
      nomComplet,
      email,
      motDePasse,
      role,
      role === "livreur" ? telephoneContact : null
    );

    return résultat;

  } catch (error) {
    console.error("[authController.handleRegister]", error.message);
    return {
      success: false,
      message: "Une erreur inattendue est survenue lors de l'inscription. Veuillez réessayer.",
    };
  }
}

// ─── handleLogin ─────────────────────────────────────────────────────────────

/**
 * Gère la connexion par email + mot de passe.
 *
 * Flux :
 *  1. Délègue à authService.login().
 *  2. Retourne un objet résultat à la vue.
 *
 * @param {string} email
 * @param {string} motDePasse
 * @returns {Promise<{ success: boolean, role: string|null, message: string }>}
 */
async function handleLogin(email, motDePasse) {
  try {
    if (!email || !motDePasse) {
      return {
        success: false,
        role: null,
        message: "Veuillez saisir votre email et votre mot de passe.",
      };
    }

    const résultat = await login(email, motDePasse);
    return résultat;

  } catch (error) {
    console.error("[authController.handleLogin]", error.message);
    return {
      success: false,
      role: null,
      message: "Une erreur inattendue est survenue lors de la connexion. Veuillez réessayer.",
    };
  }
}

// ─── handleLogout ─────────────────────────────────────────────────────────────

/**
 * Déconnecte l'utilisateur et redirige vers choix-role.
 *
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function handleLogout() {
  try {
    const résultat = await logout();

    if (résultat.success) {
      // Nettoyage sessionStorage
      sessionStorage.removeItem(SESSION_KEYS.rolePending);
      sessionStorage.removeItem(SESSION_KEYS.uidPending);

      _rediriger(ROUTES.choixRole);
    }

    return résultat;

  } catch (error) {
    console.error("[authController.handleLogout]", error.message);
    return {
      success: false,
      message: "Une erreur inattendue est survenue lors de la déconnexion.",
    };
  }
}

// ─── handleVerificationOTP ────────────────────────────────────────────────────

/**
 * Vérifie que l'email de l'utilisateur a bien été validé.
 *
 * Retourne l'état de vérification — la vue décide de la redirection ou de l'affichage.
 * La vérification est OPTIONNELLE après la création du compte.
 *
 * À appeler sur demande utilisateur (bouton "J'ai vérifié mon email"), PAS au DOMContentLoaded.
 *
 * @returns {Promise<{ success: boolean, role: string|null, vérifié: boolean, message: string }>}
 */
async function handleVerificationOTP() {
  try {
    const résultat = await verifierEmail();

    const role = résultat.role
      || sessionStorage.getItem(SESSION_KEYS.rolePending)
      || null;

    if (résultat.vérifié) {
      // Best-effort sign out so the user lands on the login screen as requested
      try {
        await fbSignOut(getAuth());
      } catch (signOutErr) {
        console.warn("[authController.handleVerificationOTP] signOut failed:", signOutErr?.message || signOutErr);
      }

      // Cleanup pending session keys
      sessionStorage.removeItem(SESSION_KEYS.rolePending);
      sessionStorage.removeItem(SESSION_KEYS.uidPending);
      sessionStorage.removeItem("ee_email_pending");

      // Redirect to login
      _rediriger(ROUTES.connexion);

      return { ...résultat, role };
    }

    return { ...résultat, role };
  } catch (error) {
    console.error("[authController.handleVerificationOTP]", error.message);
    return {
      success: false,
      role: null,
      vérifié: false,
      message: "Une erreur est survenue lors de la vérification. Veuillez réessayer.",
    };
  }
}

// ─── handleModifierProfil ─────────────────────────────────────────────────────

/**
 * Modifie le profil de l'utilisateur connecté.
 *
 * @param {string} userId   - UID Firebase de l'utilisateur
 * @param {Object} données  - Champs à mettre à jour
 *   { nomComplet?, email?, telephoneContact? }
 *
 * @returns {Promise<{ success: boolean, emailChange: boolean, message: string }>}
 */
async function handleModifierProfil(userId, données = {}) {
  try {
    if (!userId) {
      return {
        success: false,
        emailChange: false,
        message: "Identifiant utilisateur manquant.",
      };
    }

    if (!données || Object.keys(données).length === 0) {
      return {
        success: false,
        emailChange: false,
        message: "Aucune donnée à modifier.",
      };
    }

    const résultat = await modifierProfil(userId, données);
    return résultat;

  } catch (error) {
    console.error("[authController.handleModifierProfil]", error.message);
    return {
      success: false,
      emailChange: false,
      message: "Une erreur inattendue est survenue lors de la modification du profil.",
    };
  }
}

// ─── handleModifierMotDePasse ─────────────────────────────────────────────────

/**
 * Modifie le mot de passe de l'utilisateur connecté.
 *
 * @param {string} ancienMdp   - Mot de passe actuel (ré-authentification)
 * @param {string} nouveauMdp  - Nouveau mot de passe (≥ 6 caractères)
 * @param {string} confirmMdp  - Confirmation du nouveau mot de passe
 *
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function handleModifierMotDePasse(ancienMdp, nouveauMdp, confirmMdp) {
  try {
    if (!ancienMdp) {
      return { success: false, message: "Veuillez saisir votre mot de passe actuel." };
    }

    if (!nouveauMdp || nouveauMdp.length < 6) {
      return {
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      };
    }

    if (nouveauMdp !== confirmMdp) {
      return {
        success: false,
        message: "Les nouveaux mots de passe ne correspondent pas.",
      };
    }

    if (ancienMdp === nouveauMdp) {
      return {
        success: false,
        message: "Le nouveau mot de passe doit être différent de l'ancien.",
      };
    }

    const résultat = await modifierMotDePasse(ancienMdp, nouveauMdp);
    return résultat;

  } catch (error) {
    console.error("[authController.handleModifierMotDePasse]", error.message);
    return {
      success: false,
      message: "Une erreur inattendue est survenue lors de la modification du mot de passe.",
    };
  }
}

// ─── protegerPage ─────────────────────────────────────────────────────────────

/**
 * Protège une page en vérifiant que l'utilisateur connecté a le bon rôle.
 *
 * À appeler au DOMContentLoaded de chaque page protégée :
 *   await protegerPage("client");
 *   await protegerPage("livreur");
 *
 * Comportement :
 *   - Aucun utilisateur connecté → redirection vers choix-role.html
 *   - Mauvais rôle → redirection vers l'interface du rôle réel
 *   - Bon rôle → retourne les données de l'utilisateur
 *
 * @param {string} roleRequis - "client" | "livreur"
 * @returns {Promise<{
 *   uid: string,
 *   email: string,
 *   role: string,
 *   nomComplet: string,
 *   emailVerifie: boolean,
 *   profil: Object
 * } | null>}
 */
async function protegerPage(roleRequis) {
  try {
    const utilisateur = await getCurrentUser();

    // Cas 1 : Personne de connecté
    if (!utilisateur) {
      _rediriger(ROUTES.choixRole);
      return null;
    }

    // Cas 2 : Mauvais rôle — redirection vers la bonne interface
    if (utilisateur.role !== roleRequis) {
      _rediriger(_routeParRole(utilisateur.role));
      return null;
    }

    // Cas 3 : Tout est correct — on retourne l'utilisateur à la vue
    return utilisateur;

  } catch (error) {
    console.error("[authController.protegerPage]", error.message);
    _rediriger(ROUTES.choixRole);
    return null;
  }
}

// ─── handleMotDePasseOublie ───────────────────────────────────────────────────

/**
 * Envoie un email de réinitialisation du mot de passe.
 *
 * @param {string} email - Adresse email du compte à réinitialiser
 * @returns {Promise<{ success: boolean, erreur?: string }>}
 */
async function handleMotDePasseOublie(email) {
  try {
    // ── Validation ─────────────────────────────────────────────────────────
    if (!email || !email.trim()) {
      return {
        success: false,
        erreur: "Veuillez saisir votre adresse email.",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return {
        success: false,
        erreur: "Veuillez saisir une adresse email valide.",
      };
    }

    // ── Envoi de l'email de réinitialisation ───────────────────────────────
    const auth = getAuth();
    await sendPasswordResetEmail(auth, email.trim());

    return { success: true };

  } catch (error) {
    console.error("[authController.handleMotDePasseOublie]", error.message);

    if (error.code === "auth/user-not-found") {
      return {
        success: false,
        erreur: "Aucun compte n'est associé à cette adresse email.",
      };
    }

    return {
      success: false,
      erreur: "Une erreur inattendue est survenue. Veuillez réessayer.",
    };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  initChoixRole,
  handleRegister,
  handleLogin,
  handleLogout,
  handleVerificationOTP,
  handleModifierProfil,
  handleModifierMotDePasse,
  handleMotDePasseOublie,
  protegerPage,
  getCurrentUser,
};