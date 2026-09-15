/**
 * SignalScope Authentication & Scroll-Guard System
 * SIH-2026 Problem Statement 2 (LJIET [C-433])
 * 
 * Rules:
 * - Strictly enforces exactly ONE account per mobile number and ONE account per email address.
 * - Rejects any attempt to re-register with an existing mobile number or existing email address.
 * - Enforces Scroll Guard: If user is not logged in and tries to scroll down,
 *   they are smoothly scrolled back to the login card with an attention prompt.
 * - Once logged in, scrolling is unlocked across all studio tools & bonus modules.
 */

const SignalScopeAuth = (function () {
  const STORAGE_KEY = 'signalscope_auth_user';
  const LOGIN_STATE_KEY = 'signalscope_is_logged_in';

  let currentUser = null;
  let scrollGuardActive = true;
  let isAutoScrolling = false;
  let lastToastTime = 0;
  let activeAuthMode = 'signup'; // 'signup' or 'login'

  function init() {
    // Check saved login state
    const savedUser = localStorage.getItem(STORAGE_KEY);
    const isLoggedInFlag = localStorage.getItem(LOGIN_STATE_KEY);

    if (savedUser && isLoggedInFlag === 'true') {
      try {
        currentUser = JSON.parse(savedUser);
        scrollGuardActive = false;
      } catch (e) {
        currentUser = null;
        scrollGuardActive = true;
      }
    } else {
      currentUser = null;
      scrollGuardActive = true;
    }

    updateUI();
    bindEvents();
    initScrollGuard();
  }

  function clearAlerts() {
    const errorBanner = document.getElementById('auth-error-banner');
    const successBanner = document.getElementById('auth-success-banner');
    const errorText = document.getElementById('auth-error-text');
    const successText = document.getElementById('auth-success-text');

    if (errorBanner) errorBanner.classList.add('hidden');
    if (successBanner) successBanner.classList.add('hidden');
    if (errorText) errorText.textContent = '';
    if (successText) successText.textContent = '';
  }

  function showError(message) {
    const errorBanner = document.getElementById('auth-error-banner');
    const successBanner = document.getElementById('auth-success-banner');
    const errorText = document.getElementById('auth-error-text');

    if (successBanner) successBanner.classList.add('hidden');
    if (errorBanner && errorText) {
      errorText.textContent = message;
      errorBanner.classList.remove('hidden');
    }
    if (window.showToast) {
      window.showToast(message, 'error');
    }
  }

  function showSuccess(message) {
    const errorBanner = document.getElementById('auth-error-banner');
    const successBanner = document.getElementById('auth-success-banner');
    const successText = document.getElementById('auth-success-text');

    if (errorBanner) errorBanner.classList.add('hidden');
    if (successBanner && successText) {
      successText.textContent = message;
      successBanner.classList.remove('hidden');
    }
    if (window.showToast) {
      window.showToast(message, 'success');
    }
  }

  function setAuthMode(mode) {
    activeAuthMode = mode;
    clearAlerts();

    const tabLogin = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');
    const authHeading = document.getElementById('auth-card-heading');
    const authSubtitle = document.getElementById('auth-card-subtitle');
    const authSubmitBtnText = document.getElementById('auth-submit-btn-text');
    const fullnameContainer = document.getElementById('auth-fullname-container');
    const emailContainer = document.getElementById('auth-email-container');
    const confirmContainer = document.getElementById('auth-confirm-container');
    const passwordsWrapper = document.getElementById('auth-passwords-wrapper');
    const phoneLabel = document.getElementById('hero-phone-label');
    const phoneBadge = document.getElementById('hero-phone-badge');
    const phoneInput = document.getElementById('hero-phone');

    if (mode === 'login') {
      // Tab styling
      if (tabLogin) {
        tabLogin.classList.add('bg-white', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-200', 'dark:bg-slate-900', 'dark:text-blue-400');
        tabLogin.classList.remove('text-slate-500');
      }
      if (tabSignup) {
        tabSignup.classList.remove('bg-white', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-200', 'dark:bg-slate-900', 'dark:text-blue-400');
        tabSignup.classList.add('text-slate-500');
      }

      // Card texts
      if (authHeading) authHeading.textContent = 'Welcome Back';
      if (authSubtitle) authSubtitle.textContent = 'Sign in with your registered mobile number or email';
      if (authSubmitBtnText) authSubmitBtnText.textContent = 'SIGN IN →';

      // Hide registration-only fields
      if (fullnameContainer) fullnameContainer.classList.add('hidden');
      if (emailContainer) emailContainer.classList.add('hidden');
      if (confirmContainer) confirmContainer.classList.add('hidden');
      if (passwordsWrapper) {
        passwordsWrapper.classList.remove('grid-cols-2');
        passwordsWrapper.classList.add('grid-cols-1');
      }

      // Update identifier label
      if (phoneLabel) phoneLabel.textContent = 'Mobile Number or Email';
      if (phoneBadge) phoneBadge.textContent = 'Registered Key';
      if (phoneInput) phoneInput.placeholder = 'e.g. 9876543210 or rutvik@ljiet.edu.in';

    } else {
      // Sign Up mode
      if (tabSignup) {
        tabSignup.classList.add('bg-white', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-200', 'dark:bg-slate-900', 'dark:text-blue-400');
        tabSignup.classList.remove('text-slate-500');
      }
      if (tabLogin) {
        tabLogin.classList.remove('bg-white', 'text-blue-700', 'shadow-sm', 'border', 'border-blue-200', 'dark:bg-slate-900', 'dark:text-blue-400');
        tabLogin.classList.add('text-slate-500');
      }

      // Card texts
      if (authHeading) authHeading.textContent = 'Create an Account';
      if (authSubtitle) authSubtitle.textContent = 'Strict policy: Only 1 account per mobile number and email';
      if (authSubmitBtnText) authSubmitBtnText.textContent = 'CREATE ACCOUNT →';

      // Show all registration fields
      if (fullnameContainer) fullnameContainer.classList.remove('hidden');
      if (emailContainer) emailContainer.classList.remove('hidden');
      if (confirmContainer) confirmContainer.classList.remove('hidden');
      if (passwordsWrapper) {
        passwordsWrapper.classList.remove('grid-cols-1');
        passwordsWrapper.classList.add('grid-cols-2');
      }

      // Update identifier label
      if (phoneLabel) phoneLabel.textContent = 'Mobile Number';
      if (phoneBadge) phoneBadge.textContent = '1 Account per Mobile';
      if (phoneInput) phoneInput.placeholder = 'e.g. 9876543210';
    }
  }

  function bindEvents() {
    // Segmented Toggle on Hero Card: Log In vs Sign Up
    const tabLogin = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');

    if (tabLogin && tabSignup) {
      tabLogin.addEventListener('click', () => setAuthMode('login'));
      tabSignup.addEventListener('click', () => setAuthMode('signup'));
    }

    // Hero Form Submit (Strict Sign Up / Log In with SQLite backend validation)
    const heroAuthForm = document.getElementById('hero-auth-form');
    if (heroAuthForm) {
      heroAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlerts();

        const submitBtn = document.getElementById('auth-submit-btn');
        const submitBtnText = document.getElementById('auth-submit-btn-text');
        const originalText = submitBtnText ? submitBtnText.textContent : 'CONTINUE →';

        const nameInput = document.getElementById('hero-fullname');
        const phoneInput = document.getElementById('hero-phone');
        const emailInput = document.getElementById('hero-email');
        const passwordInput = document.getElementById('hero-password');
        const confirmInput = document.getElementById('hero-confirm');

        const name = (nameInput && nameInput.value.trim()) || '';
        const identifier = (phoneInput && phoneInput.value.trim()) || '';
        const email = (emailInput && emailInput.value.trim()) || '';
        const password = (passwordInput && passwordInput.value.trim()) || '';
        const confirm = (confirmInput && confirmInput.value.trim()) || '';

        // UI Loading state
        if (submitBtn) submitBtn.disabled = true;
        if (submitBtnText) submitBtnText.textContent = 'PROCESSING...';

        try {
          if (activeAuthMode === 'signup') {
            // Validate client-side inputs for registration
            if (!name) {
              showError('Please enter your full name.');
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }
            if (!identifier) {
              showError('Please enter your mobile number.');
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }
            if (!email) {
              showError('Please enter your email address (Required for 1-ID policy).');
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }
            if (!password) {
              showError('Please choose a password.');
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }
            if (password !== confirm) {
              showError('Passwords do not match. Please re-enter your password.');
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }

            // Call Backend Registration Endpoint
            const res = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: name,
                phone: identifier,
                email: email,
                password: password,
                role: 'Fact-Checker',
                organization: 'LJIET [C-433]'
              })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
              const errMsg = data.error || 'Registration failed. Mobile number or email already exists.';
              showError(errMsg);
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }

            // Successful registration
            showSuccess(`Account created successfully! Welcome, ${data.user.name}.`);
            setSessionUser(data.user);

          } else {
            // Log In mode
            if (!identifier) {
              showError('Please enter your mobile number or email address.');
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }

            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: identifier,
                password: password
              })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
              const errMsg = data.error || 'Login failed. Please check your credentials or sign up.';
              showError(errMsg);
              if (submitBtn) submitBtn.disabled = false;
              if (submitBtnText) submitBtnText.textContent = originalText;
              return;
            }

            // Successful login
            showSuccess(`Welcome back, ${data.user.name}!`);
            setSessionUser(data.user);
          }
        } catch (err) {
          console.error('Auth request error:', err);
          showError('Authentication service error: ' + (err.message || 'Server unreachable'));
        } finally {
          if (submitBtn) submitBtn.disabled = false;
          if (submitBtnText) submitBtnText.textContent = originalText;
        }
      });
    }

    // Instant 1-Click Demo Login for Hackathon Judges
    const instantDemoBtn = document.getElementById('btn-instant-demo');
    if (instantDemoBtn) {
      instantDemoBtn.addEventListener('click', async () => {
        clearAlerts();
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: '9876543210',
              password: 'admin123'
            })
          });

          const data = await res.json();
          if (data && data.success && data.user) {
            showSuccess(`Demo Access Granted: Welcome ${data.user.name}!`);
            setSessionUser(data.user);
          } else {
            // Fallback demo user
            const fallbackUser = {
              name: 'Dr. Rutvik Vamja',
              phone: '9876543210',
              email: 'rutvik@ljiet.edu.in',
              role: 'Lead Forensic Investigator',
              organization: 'LJIET [C-433]'
            };
            setSessionUser(fallbackUser);
          }
        } catch (e) {
          console.warn('Demo login fetch failed, using pre-verified session:', e);
          const fallbackUser = {
            name: 'Dr. Rutvik Vamja',
            phone: '9876543210',
            email: 'rutvik@ljiet.edu.in',
            role: 'Lead Forensic Investigator',
            organization: 'LJIET [C-433]'
          };
          setSessionUser(fallbackUser);
        }
      });
    }

    // See Demo Button in Hero
    const btnSeeDemo = document.getElementById('btn-see-demo');
    if (btnSeeDemo) {
      btnSeeDemo.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isLoggedIn()) {
          scrollBackToLogin('<strong>Please Login First!</strong> Sign in or click "Instant Demo Access" to view the live studio demo.');
        } else {
          const studio = document.getElementById('visualizer');
          if (studio) studio.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    const btnGetStarted = document.getElementById('btn-get-started');
    if (btnGetStarted) {
      btnGetStarted.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isLoggedIn()) {
          scrollBackToLogin('<strong>Please Login First!</strong> Create an account or sign in to get started.');
        } else {
          const studio = document.getElementById('visualizer');
          if (studio) studio.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Intercept internal section jumps when unauthenticated
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href === '#top') return;
        if (!isLoggedIn()) {
          e.preventDefault();
          scrollBackToLogin('<strong>Please Login First!</strong> Authentication required to access ' + href.replace('#', '') + '.');
        }
      });
    });

    // Password visibility toggles (Eye icons)
    initPasswordToggle('btn-toggle-password', 'hero-password');
    initPasswordToggle('btn-toggle-confirm', 'hero-confirm');

    // Logout button
    const btnLogout = document.getElementById('btn-nav-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', logout);
    }
  }

  function initPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isPass = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPass ? 'text' : 'password');

      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      if (eyeOpen && eyeClosed) {
        if (isPass) {
          eyeOpen.classList.add('hidden');
          eyeClosed.classList.remove('hidden');
        } else {
          eyeOpen.classList.remove('hidden');
          eyeClosed.classList.add('hidden');
        }
      }
    });
  }

  // Scroll Guard: Enforce return to login page if user is not logged in
  function initScrollGuard() {
    window.addEventListener('scroll', () => {
      if (!scrollGuardActive || isAutoScrolling) return;

      const heroAuthCard = document.getElementById('hero-auth-card');
      if (!heroAuthCard) return;

      // If user scrolls down past the hero login card threshold
      if (window.scrollY > 220) {
        scrollBackToLogin('<strong>Please Login First!</strong> Sign in or use Instant Demo to explore the website.');
      }
    }, { passive: true });
  }

  function scrollBackToLogin(customMessage) {
    if (isAutoScrolling) return;
    isAutoScrolling = true;

    const heroAuthCard = document.getElementById('hero-auth-card');
    if (heroAuthCard) {
      heroAuthCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Attention shake effect on card with warning amber ring
      heroAuthCard.classList.add('login-card-pulse', 'ring-4', 'ring-amber-500');
      setTimeout(() => {
        heroAuthCard.classList.remove('login-card-pulse', 'ring-4', 'ring-amber-500');
        isAutoScrolling = false;
      }, 900);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { isAutoScrolling = false; }, 800);
    }

    const now = Date.now();
    if (now - lastToastTime > 2200) {
      lastToastTime = now;
      const msg = customMessage || '<strong>Please Login First!</strong> Sign in or use Instant Demo to explore the website.';
      if (window.showToast) {
        window.showToast(msg, 'warning');
      }
    }
  }

  function setSessionUser(userData) {
    currentUser = userData;
    scrollGuardActive = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    localStorage.setItem(LOGIN_STATE_KEY, 'true');

    updateUI();

    // Trigger history update for this user
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: userData }));

    // Remove lock overlay on modules
    const lockOverlay = document.getElementById('platform-locked-banner');
    if (lockOverlay) lockOverlay.classList.add('hidden');
  }

  function logout() {
    currentUser = null;
    scrollGuardActive = true;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(LOGIN_STATE_KEY, 'false');

    updateUI();

    if (window.showToast) {
      window.showToast('Signed out. Platform locked to login page.');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateUI() {
    const navProfile = document.getElementById('nav-user-profile');
    const navUserName = document.getElementById('nav-user-name');
    const navUserRole = document.getElementById('nav-user-role');
    const navStatusPill = document.getElementById('nav-auth-status-pill');
    const heroCardUnlocked = document.getElementById('hero-auth-card-unlocked');
    const heroCardForm = document.getElementById('hero-auth-card-content');

    if (currentUser) {
      if (navProfile) navProfile.classList.remove('hidden');
      if (navUserName) navUserName.textContent = currentUser.name;
      if (navUserRole) navUserRole.textContent = currentUser.role || 'Fact-Checker';
      if (navStatusPill) {
        navStatusPill.textContent = 'Unlocked';
        navStatusPill.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 border border-emerald-200';
      }

      if (heroCardUnlocked && heroCardForm) {
        heroCardForm.classList.add('hidden');
        heroCardUnlocked.classList.remove('hidden');
        const unlockedName = document.getElementById('unlocked-user-name');
        const unlockedRole = document.getElementById('unlocked-user-role');
        if (unlockedName) unlockedName.textContent = currentUser.name;
        if (unlockedRole) unlockedRole.textContent = currentUser.role || 'Fact-Checker';
      }
    } else {
      if (navProfile) navProfile.classList.add('hidden');
      if (navStatusPill) {
        navStatusPill.textContent = 'Auth Required';
        navStatusPill.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200';
      }

      if (heroCardUnlocked && heroCardForm) {
        heroCardForm.classList.remove('hidden');
        heroCardUnlocked.classList.add('hidden');
      }
    }
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  return {
    init,
    login: setSessionUser,
    logout,
    isLoggedIn,
    getUser: () => currentUser,
    scrollBackToLogin,
    setAuthMode
  };
})();

window.SignalScopeAuth = SignalScopeAuth;
