let currentAuthenticatedUser = null;
let toastTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  await verifySessionState();
  setupRestrictedNavigationGuards();
  setupLogout();
});

// Check session state on the Welcome/Home page
async function verifySessionState() {
  const loginBtn = document.getElementById('navLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const avatarEl = document.getElementById('navUserAvatar');
  const nameEl = document.getElementById('navUserName');
  const getStartBtn = document.getElementById('getStartBtn');

  try {
    const { data: { session } } = await window.supabase.auth.getSession();

    if (session && session.user) {
      currentAuthenticatedUser = session.user;

      // Update Header for logged-in user
      if (loginBtn) loginBtn.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.remove('hidden');

      // Update CTA: If already logged in, "Get Start!" goes directly to marketplace
      if (getStartBtn) {
        getStartBtn.href = 'marketplace.html';
      }

      // Fetch student profile name and avatar
      const { data: profile } = await window.supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        if (nameEl && profile.full_name) {
          nameEl.textContent = profile.full_name.split(' ')[0];
        }
        if (avatarEl && profile.avatar_url && profile.avatar_url.trim() !== '') {
          avatarEl.src = profile.avatar_url;
        }
      }
    } else {
      // Guest state
      currentAuthenticatedUser = null;
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      if (nameEl) nameEl.textContent = 'Guest';
      if (avatarEl) {
        avatarEl.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
      }
      if (getStartBtn) {
        getStartBtn.href = 'login.html';
      }
    }
  } catch (err) {
    console.warn('Session verification error on home page:', err);
    currentAuthenticatedUser = null;
  }
}

// Intercept clicks on Marketplace, Sell, Inventory, and Profile if logged out
function setupRestrictedNavigationGuards() {
  const restrictedLinks = document.querySelectorAll('.auth-restricted-link');

  restrictedLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      if (!currentAuthenticatedUser) {
        e.preventDefault();
        e.stopPropagation();
        showRedWarningToast();
      }
    });
  });
}

// Show bright red warning banner if guest clicks protected links
function showRedWarningToast() {
  const toast = document.getElementById('authWarningToast');
  if (!toast) return;

  clearTimeout(toastTimeout);

  toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

// Logout button handler on home page
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await window.supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
      window.location.replace('home.html');
    });
  }
}