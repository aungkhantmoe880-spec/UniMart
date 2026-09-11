// Run the guard immediately
async function enforceAuth() {
  const { data: { session }, error } = await window.supabase.auth.getSession();

  // 1. Kick out unauthenticated users to the welcome page
  if (error || !session) {
    window.location.replace('home.html');
    return null;
  }

  // 2. Save user session globally
  window.currentUser = session.user;

  // 3. Automatically hook up logout button across all pages
  setupLogout();

  return session.user;
}

function setupLogout() {
  document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await window.supabase.auth.signOut();
        } catch (err) {
          console.warn('Sign out error:', err);
        }
        // Redirect directly to the welcome home page
        window.location.replace('home.html');
      });
    }
  });
}

// Start auth check right away
enforceAuth();