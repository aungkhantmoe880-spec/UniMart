// Run the guard immediately
async function enforceAuth() {
  const { data: { session }, error } = await window.supabase.auth.getSession();

  // 1. Kick out unauthenticated users
  if (error || !session) {
    alert('Please log in to access this page.');
    window.location.replace('login.html');
    return null;
  }

  // 2. Save user session globally
  window.currentUser = session.user;
  console.log('Access granted to:', session.user.email);

  // 3. Automatically hook up logout button if it exists on the page
  setupLogout();

  return session.user;
}

function setupLogout() {
  document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabase.auth.signOut();
        window.location.replace('login.html');
      });
    }
  });
}

// Start auth check right away
enforceAuth();