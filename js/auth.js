let isRecoveryMode = false;

// 1. Check for recovery tokens immediately before anything clears them
(function checkImmediateRecoveryState() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const full = window.location.href;

  if (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    full.includes('type=recovery') ||
    search.includes('code=')
  ) {
    isRecoveryMode = true;
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  setupViewToggles();
  setupAuthForms();
  handleRecoveryAndUrlErrors();
});

// View Switching Logic
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

function showNewPasswordForm() {
  document.getElementById('loginView')?.classList.add('hidden');
  document.getElementById('registerView')?.classList.add('hidden');
  document.getElementById('resetView')?.classList.add('hidden');
  document.getElementById('updatePasswordView')?.classList.remove('hidden');
}

// 2. Handle Password Recovery State and Errors
function handleRecoveryAndUrlErrors() {
  const fullUrl = window.location.href;
  const alertBanner = document.getElementById('authAlertBanner');
  const alertMsg = document.getElementById('authAlertMessage');

  // Check for expired OTP / link errors
  if (fullUrl.includes('error_code=otp_expired') || fullUrl.includes('error_description=')) {
    if (alertBanner && alertMsg) {
      alertMsg.textContent = 'This reset link has expired or has already been used. Please request a new one.';
      alertBanner.classList.remove('hidden');
    }
    document.getElementById('loginView')?.classList.add('hidden');
    document.getElementById('resetView')?.classList.remove('hidden');
    return;
  }

  // If detected during immediate execution
  if (isRecoveryMode) {
    showNewPasswordForm();
  }

  // Supabase Auth State Change Listener (Catches recovery session event)
  if (window.supabase && window.supabase.auth) {
    window.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecoveryMode)) {
        showNewPasswordForm();
      }
    });
  }
}

// 3. Supabase Auth Forms Submissions
function setupAuthForms() {
  // --- A. LOGIN ---
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

  // --- B. REGISTER ---
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

  // --- C. SEND RESET LINK ---
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

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUrl = isLocal 
        ? `${window.location.origin}/html/login.html`
        : 'https://aungkhantmoe880-spec.github.io/UniMart/html/login.html';

      const { error } = await window.supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      alert('Password reset link sent! Check your student email inbox.');
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

  // --- D. SAVE NEW PASSWORD (With Re-Write Confirmation) ---
  const updatePasswordForm = document.getElementById('updatePasswordForm');
  const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const mismatchMsg = document.getElementById('passwordMismatchMsg');

  // Clear mismatch warning while typing
  confirmPasswordInput?.addEventListener('input', () => {
    mismatchMsg?.classList.add('hidden');
  });

  updatePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    // Validate matching passwords
    if (newPass !== confirmPass) {
      mismatchMsg?.classList.remove('hidden');
      confirmPasswordInput.focus();
      return;
    }

    mismatchMsg?.classList.add('hidden');
    saveNewPasswordBtn.disabled = true;
    saveNewPasswordBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Updating...';

    try {
      const { error } = await window.supabase.auth.updateUser({
        password: newPass
      });

      if (error) throw error;

      alert('Password updated successfully! Please log in with your new password.');

      // Sign out from recovery session and switch to normal login card
      await window.supabase.auth.signOut();
      window.history.replaceState({}, document.title, window.location.pathname);
      
      updatePasswordForm.reset();
      document.getElementById('updatePasswordView')?.classList.add('hidden');
      document.getElementById('loginView')?.classList.remove('hidden');
    } catch (err) {
      alert('Failed to update password: ' + err.message);
    } finally {
      saveNewPasswordBtn.disabled = false;
      saveNewPasswordBtn.innerHTML = '<span>Update Password</span>';
    }
  });
}