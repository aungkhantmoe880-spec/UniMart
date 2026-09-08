document.addEventListener('DOMContentLoaded', async () => {
  // 0. Auto-redirect if an active session already exists (Persistent Login)
  const hash = window.location.hash;
  const isRecoveryMode = hash && (hash.includes('type=recovery') || hash.includes('access_token='));

  // Only auto-redirect if the user is NOT actively resetting their password
  if (!isRecoveryMode && window.supabase?.auth) {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session && session.user) {
        window.location.replace('marketplace.html');
        return;
      }
    } catch (e) {
      console.warn('Session verification error:', e);
    }
  }

  // 1. Form elements
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotForm');
  const resetPasswordForm = document.getElementById('resetPasswordForm');

  // 2. Toggle links
  const showRegisterLink = document.getElementById('showRegisterLink');
  const showLoginLink = document.getElementById('showLoginLink');
  const showForgotLink = document.getElementById('showForgotLink');
  const backToLoginFromForgot = document.getElementById('backToLoginFromForgot');

  // 3. Error & notification elements
  const passwordError = document.getElementById('passwordError');
  const ageError = document.getElementById('ageError');
  const generalError = document.getElementById('generalError');
  const loginError = document.getElementById('loginError');
  const forgotError = document.getElementById('forgotError');
  const forgotSuccess = document.getElementById('forgotSuccess');
  const resetError = document.getElementById('resetError');

  // Helper to show only one form
  function showForm(formToShow) {
    [loginForm, registerForm, forgotForm, resetPasswordForm].forEach(f => {
      if (f) f.classList.add('hidden');
    });
    if (formToShow) formToShow.classList.remove('hidden');
  }

  // Check if URL hash indicates password recovery
  if (isRecoveryMode) {
    showForm(resetPasswordForm);
  }

  // Supabase Auth state listener for recovery event
  window.supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showForm(resetPasswordForm);
    }
  });

  // Switch to Register form
  showRegisterLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm(registerForm);
  });

  // Switch to Login form
  showLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm(loginForm);
  });

  // Switch to Forgot Password form
  showForgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (forgotError) forgotError.textContent = '';
    if (forgotSuccess) forgotSuccess.textContent = '';
    showForm(forgotForm);
  });

  // Back to Login from Forgot form
  backToLoginFromForgot?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm(loginForm);
  });

  // Register form submission
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (passwordError) passwordError.textContent = '';
    if (ageError) ageError.textContent = '';
    if (generalError) generalError.textContent = '';

    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const age = parseInt(document.getElementById('regAge').value, 10);

    if (age < 15) {
      if (ageError) ageError.textContent = 'You must be at least 15 years old.';
      return;
    }

    if (password.length < 6) {
      if (passwordError) passwordError.textContent = 'Password must be at least 6 characters long.';
      return;
    }

    const { data, error } = await window.supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      if (generalError) generalError.textContent = error.message;
      return;
    }

    const user = data.user;
    if (user) {
      const studentId = document.getElementById('regStudentId').value.trim();
      const fullName = document.getElementById('regName').value.trim();

      const { error: profileError } = await window.supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            student_id: studentId,
            full_name: fullName,
            age: age,
            email: email,
          },
        ]);

      if (profileError) {
        if (generalError) generalError.textContent = 'Account created, but profile setup failed: ' + profileError.message;
        return;
      }
    }

    alert('Registration successful! Please check your email to verify.');
    registerForm.reset();
  });

  // Login form submission
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (loginError) loginError.textContent = '';

    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    let emailToUse = identifier;

    // Look up email via student_id if needed
    if (!identifier.includes('@')) {
      const { data: profile, error: profileLookupError } = await window.supabase
        .from('profiles')
        .select('email')
        .eq('student_id', identifier)
        .single();

      if (profileLookupError || !profile) {
        if (loginError) loginError.textContent = 'No account found with this Student ID.';
        return;
      }

      emailToUse = profile.email;
    }

    const { error } = await window.supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    if (error) {
      if (loginError) loginError.textContent = 'Incorrect Password';
      return;
    }

    alert('Login successful!');
    window.location.href = 'marketplace.html';
  });

  // Forgot Password form submission
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (forgotError) forgotError.textContent = '';
    if (forgotSuccess) forgotSuccess.textContent = '';

    const identifier = document.getElementById('forgotIdentifier').value.trim();
    const submitBtn = document.getElementById('btnSendReset');
    let emailToUse = identifier;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      if (!identifier.includes('@')) {
        const { data: profile, error: lookupErr } = await window.supabase
          .from('profiles')
          .select('email')
          .eq('student_id', identifier)
          .single();

        if (lookupErr || !profile || !profile.email) {
          if (forgotError) forgotError.textContent = 'No account associated with that Student ID.';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
          }
          return;
        }

        emailToUse = profile.email;
      }

      // Resolves properly on localhost and GitHub Pages
      const redirectUrl = new URL('login.html', window.location.href).href;

      const { error: resetErr } = await window.supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: redirectUrl
      });

      if (resetErr) {
        if (forgotError) forgotError.textContent = resetErr.message;
      } else {
        if (forgotSuccess) forgotSuccess.textContent = `A password reset link has been sent to ${emailToUse}. Please check your inbox.`;
        forgotForm.reset();
      }
    } catch (err) {
      if (forgotError) forgotError.textContent = 'Something went wrong. Please try again.';
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    }
  });

  // Set New Password submission (After clicking recovery link)
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (resetError) resetError.textContent = '';

      const newPassword = document.getElementById('newPassword').value.trim();
      const btn = document.getElementById('btnUpdatePassword');

      if (newPassword.length < 6) {
        if (resetError) resetError.textContent = 'Password must be at least 6 characters long.';
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Updating...';
      }

      const { error } = await window.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        if (resetError) resetError.textContent = error.message;
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Update Password';
        }
      } else {
        alert('Password updated successfully! Please log in with your new password.');
        window.location.hash = '';
        showForm(loginForm);
      }
    });
  }
});