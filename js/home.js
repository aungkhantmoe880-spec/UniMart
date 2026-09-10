let currentAuthenticatedUser = null;
let toastTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  await verifySessionState();
  setupRestrictedNavigationGuards();
  setupLogout();
});

// Check if a user is actively authenticated
async function verifySessionState() {
  const loginBtn = document.getElementById('navLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const avatarEl = document.getElementById('navUserAvatar');
  const nameEl = document.getElementById('navUserName');

  try {
    const { data: { session } } = await window.supabase.auth.getSession();

    if (session && session.user) {
      currentAuthenticatedUser = session.user;

      // Update Header for logged-in user
      if (loginBtn) loginBtn.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.remove('hidden');

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
      currentAuthenticatedUser = null;
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      if (nameEl) nameEl.textContent = 'Guest';
    }
  } catch (err) {
    console.warn('Session check error on landing page:', err);
    currentAuthenticatedUser = null;
  }
}

// Intercept clicks on Marketplace, Sell, Inventory, and Profile if not authenticated
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

// Trigger bright red warning toast
function showRedWarningToast() {
  const toast = document.getElementById('authWarningToast');
  if (!toast) return;

  clearTimeout(toastTimeout);

  toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  // Vibrate on supported mobile devices
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

// Sign-out action
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.supabase.auth.signOut();
      window.location.reload();
    });
  }
}