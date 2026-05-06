/**
 * @file emailVerificationBanner.js
 * @description Reusable email verification banner component for all protected pages.
 * 
 * Usage:
 *   import { setupEmailVerificationBanner } from '../../services/emailVerificationBanner.js';
 *   setupEmailVerificationBanner();
 */

import { getCurrentUser } from './authService.js';

/**
 * Injects email verification banner into the page if user is logged in but not verified.
 * Call this at DOMContentLoaded on all protected client pages.
 */
export async function setupEmailVerificationBanner() {
  try {
    const user = await getCurrentUser();

    // Only show banner if user is logged in AND email NOT verified
    if (user?.uid && user.emailVerifie === false) {
      injectBanner();
    }
  } catch (error) {
    console.error('[emailVerificationBanner]', error);
  }
}

/**
 * Injects the banner HTML into the page right after the header
 */
function injectBanner() {
  const bannerHTML = `
    <div id="email-verification-banner" class="bg-secondary-container border-b-2 border-secondary text-on-surface px-5 lg:px-10 py-4">
      <div class="max-w-2xl lg:mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 flex-1">
          <span class="material-symbols-outlined text-secondary flex-shrink-0" style="font-size:24px">mail_outline</span>
          <div class="flex-1">
            <p class="font-semibold text-sm">Veuillez vérifier votre adresse email</p>
            <p class="text-xs text-on-surface-variant mt-1">Pour accéder à toutes les fonctionnalités, veuillez cliquer sur le lien de vérification envoyé à votre email.</p>
          </div>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <a href="/verification" class="px-4 py-2 rounded-full bg-secondary text-on-secondary font-semibold text-xs hover:opacity-90 active:scale-95 transition-all whitespace-nowrap">
            Vérifier
          </a>
          <button onclick="closeBannerVerification()" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/20 transition-colors text-on-surface-variant">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const bannerWrapper = document.createElement('div');
  bannerWrapper.innerHTML = bannerHTML;
  const banner = bannerWrapper.firstElementChild;

  document.body.prepend(banner);
  window.closeBannerVerification = closeBannerVerification;
}

/**
 * Closes the email verification banner
 */
function closeBannerVerification() {
  const banner = document.getElementById('email-verification-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}