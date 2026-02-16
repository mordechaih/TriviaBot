/**
 * Legal Disclaimer Dismissal Handler
 * Manages cookie-based dismissal of the legal disclaimer
 */

const DISCLAIMER_COOKIE_NAME = 'triviabot_disclaimer_dismissed';
const DISCLAIMER_COOKIE_EXPIRY_DAYS = 365; // Cookie expires in 1 year

/**
 * Set a cookie with the given name, value, and expiration days
 */
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

/**
 * Get a cookie value by name
 */
function getCookie(name) {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Check if the disclaimer has been dismissed
 */
function isDisclaimerDismissed() {
  return getCookie(DISCLAIMER_COOKIE_NAME) === 'true';
}

/**
 * Dismiss the disclaimer and set the cookie
 */
function dismissDisclaimer() {
  const disclaimer = document.querySelector('.legal-disclaimer');
  if (disclaimer) {
    disclaimer.style.display = 'none';
    setCookie(DISCLAIMER_COOKIE_NAME, 'true', DISCLAIMER_COOKIE_EXPIRY_DAYS);
  }
}

/**
 * Initialize the disclaimer dismissal functionality
 */
function initDisclaimer() {
  const disclaimer = document.querySelector('.legal-disclaimer');
  if (!disclaimer) return;

  // Check if already dismissed
  if (isDisclaimerDismissed()) {
    disclaimer.style.display = 'none';
    return;
  }

  // Add dismiss button if it doesn't exist
  if (!disclaimer.querySelector('.disclaimer-dismiss-btn')) {
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'disclaimer-dismiss-btn';
    dismissBtn.setAttribute('aria-label', 'Dismiss disclaimer');
    dismissBtn.innerHTML = '<i data-lucide="x"></i>';
    dismissBtn.addEventListener('click', dismissDisclaimer);
    disclaimer.appendChild(dismissBtn);
    
    // Initialize Lucide icon if available (with retry for async loading)
    function initIcon() {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      } else {
        // Retry after a short delay if Lucide hasn't loaded yet
        setTimeout(initIcon, 100);
      }
    }
    initIcon();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDisclaimer);
} else {
  initDisclaimer();
}

