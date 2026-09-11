document.addEventListener('DOMContentLoaded', () => {
  setupViewToggles();
  setupAuthForms();
});

// View Switching Logic (Login <-> Register <-> Reset Password)
function setupViewToggles() {
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const resetView = document.getElementById('resetView');

  const toRegisterBtn = document.getElementById('toRegisterBtn');
  const toResetBtn = document.getElementById('toResetBtn');
  const backToLoginFromReg = document.getElementById('backToLoginFromReg');
  const backToLoginFromReset = document.getElementById('backToLoginFromReset');

  function showView(viewToShow) {
    if (loginView) loginView.classList.add('hidden');
    if (registerView) registerView.classList.add('hidden');
    if (resetView) resetView.classList.add('hidden');

    if (viewToShow) {
      viewToShow.classList.remove('hidden');
    }
  }

  // Switch to Register View
  toRegisterBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(registerView);
  });

  // Switch to Forgot Password View
  toResetBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(resetView);
  });

  // Back to Login from Register
  backToLoginFromReg?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
  });

  // Back to Login from Reset
  backToLoginFromReset?.addEventListener('click', (e) => {
    e.preventDefault();
    showView(loginView);
  });
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

      // Check if user inputted a Student ID instead of an email
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

      // Redirect into Marketplace on success
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
      // 1. Create Supabase Auth User
      const { data: authData, error: authError } = await window.supabase.auth.signUp({
        email,
        password
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (userId) {
        // 2. Insert into profiles table
        const { error: profileError } = await window.supabase
          .from('profiles')
          .upsert({
            id: userId,
            student_id: studentId,
            full_name: fullName,
            age: age,
            email: email,
            created_at: new Date().toISOString()
          });

        if (profileError) {
          console.warn('Profile sync error:', profileError);
        }
      }

      alert('Registration successful! Please log in with your credentials.');
      
      // Reset form and return to login view
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

  // 3. PASSWORD RESET
  const resetForm = document.getElementById('resetForm');
  const sendResetBtn = document.getElementById('sendResetBtn');

  resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('resetEmailInput').value.trim();

    sendResetBtn.disabled = true;
    sendResetBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Sending...';

    try {
      let emailToUse = identifier;

      // Handle student ID input
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

      const { error } = await window.supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: window.location.origin + '/html/login.html'
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
}