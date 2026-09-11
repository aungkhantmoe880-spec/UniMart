document.addEventListener('DOMContentLoaded', () => {
  setupViewToggles();
  setupAuthForms();
  listenForPasswordRecovery();
});

// View Switching Logic (Login <-> Register <-> Reset Password <-> Update Password)
function setupViewToggles() {
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const resetView = document.getElementById('resetView');
  const updatePasswordView = document.getElementById('updatePasswordView');

  const toRegisterBtn = document.getElementById('toRegisterBtn');
  const toResetBtn = document.getElementById('toResetBtn');
  const backToLoginFromReg = document.getElementById('backToLoginFromReg');
  const backToLoginFromReset = document.getElementById('backToLoginFromReset');

  function showView(viewToShow) {
    if (loginView) loginView.classList.add('hidden');
    if (registerView) registerView.classList.add('hidden');
    if (resetView) resetView.classList.add('hidden');
    if (updatePasswordView) updatePasswordView.classList.add('hidden');

    if (viewToShow) {
      viewToShow.classList.remove('hidden');
    }
  }

  toRegisterBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(registerView);
  });

  toResetBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(resetView);
  });

  backToLoginFromReg?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
  });

  backToLoginFromReset?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
  });
}

// Detect when the user lands on login.html from the reset password email link
function listenForPasswordRecovery() {
  // 1. Supabase Event Listener
  window.supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showNewPasswordForm();
    }
  });

  // 2. Hash Fragment check (fallback if event fires before DOM binds)
  if (window.location.hash && window.location.hash.includes('type=recovery')) {
    showNewPasswordForm();
  }
}

function showNewPasswordForm() {
  document.getElementById('loginView')?.classList.add('hidden');
  document.getElementById('registerView')?.classList.add('hidden');
  document.getElementById('resetView')?.classList.add('hidden');
  document.getElementById('updatePasswordView')?.classList.remove('hidden');
}

// Supabase Form Submissions
function setupAuthForms() {
  // 1. LOGIN
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('loginId').value.trim();
    const password = document.getElementById('loginPassword').value;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Logging in...';

    try {
      let emailToUse = identifier;

      if (!identifier.includes('@')) {
        const { data: profile, error: idErr } = await window.supabase
          .from('profiles')
          .select('email')
          .eq('student_id', identifier)
          .single();

        if (idErr || !profile?.email) {
          throw new Error('Student ID not found. Please verify or use your email address.');
        }
        emailToUse = profile.email;
      }

      const { data, error } = await window.supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password
      });

      if (error) throw error;
      window.location.replace('marketplace.html');
    } catch (err) {
      alert(err.message || 'Login failed');
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>Log In</span>';
    }
  });

  // 2. REGISTER
  const registerForm = document.getElementById('registerForm');
  const registerBtn = document.getElementById('registerBtn');

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('regStudentId').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const age = parseInt(document.getElementById('regAge').value, 10);
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Registering...';

    try {
      const { data: authData, error: authError } = await window.supabase.auth.signUp({
        email,
        password
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (userId) {
        await window.supabase
          .from('profiles')
          .upsert({
            id: userId,
            student_id: studentId,
            full_name: fullName,
            age: age,
            email: email,
            created_at: new Date().toISOString()
          });
      }

      alert('Registration successful! Please log in with your credentials.');
      registerForm.reset();
      document.getElementById('loginView')?.classList.remove('hidden');
      document.getElementById('registerView')?.classList.add('hidden');
    } catch (err) {
      alert(err.message || 'Registration failed');
    } finally {
      registerBtn.disabled = false;
      registerBtn.innerHTML = '<span>Register</span>';
    }
  });

  // 3. SEND PASSWORD RESET EMAIL
  const resetForm = document.getElementById('resetForm');
  const sendResetBtn = document.getElementById('sendResetBtn');

  resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('resetEmailInput').value.trim();

    sendResetBtn.disabled = true;
    sendResetBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Sending...';

    try {
      let emailToUse = identifier;

      if (!identifier.includes('@')) {
        const { data: profile, error: idErr } = await window.supabase
          .from('profiles')
          .select('email')
          .eq('student_id', identifier)
          .single();

        if (idErr || !profile?.email) {
          throw new Error('Student ID not found. Please use your email address.');
        }
        emailToUse = profile.email;
      }

      // Dynamically calculate the exact full URL (including /UniMart/ on GitHub Pages)
      const redirectUrl = window.location.href.split('#')[0].split('?')[0];

      const { error } = await window.supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      alert('Password reset link sent! Please check your email inbox.');
      resetForm.reset();
      document.getElementById('loginView')?.classList.remove('hidden');
      document.getElementById('resetView')?.classList.add('hidden');
    } catch (err) {
      alert(err.message || 'Password reset request failed');
    } finally {
      sendResetBtn.disabled = false;
      sendResetBtn.innerHTML = '<span>Send Reset Link</span>';
    }
  });

  // 4. SAVE NEW PASSWORD AFTER RECOVERY LINK CLICK
  const updatePasswordForm = document.getElementById('updatePasswordForm');
  const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');

  updatePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPasswordInput').value;

    saveNewPasswordBtn.disabled = true;
    saveNewPasswordBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Updating...';

    try {
      const { error } = await window.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      alert('Password updated successfully! You can now log in.');
      window.location.replace('marketplace.html');
    } catch (err) {
      alert('Failed to update password: ' + err.message);
      saveNewPasswordBtn.disabled = false;
      saveNewPasswordBtn.innerHTML = '<span>Update Password</span>';
    }
  });
}