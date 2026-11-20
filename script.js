/* Pizza Luka Supabase authentication and gated member site.
   Replace these placeholders with the Supabase Project URL and anon/public key.
   Never expose a service_role or secret key in browser code. */
const SUPABASE_URL = "https://wziegbupghjovoqcitii.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XN4mkcn5DvZB2QIIqVyxAQ_0H5ejgUZ";
const MEMBER_PAGE = "home.html";
const LANDING_PAGE = "index.html";

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

(() => {
  const modal = document.querySelector("#auth-modal");
  const authNav = document.querySelector("#auth-nav");
  const form = document.querySelector("#auth-form");
  const isMemberPage = /(?:^|\/)home\.html$/.test(window.location.pathname);
  const clientReady = Boolean(window.supabase && SUPABASE_URL !== "SUPABASE_URL" && SUPABASE_ANON_KEY !== "SUPABASE_ANON_KEY");
  const client = clientReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  function goToMemberPage() { window.location.replace(MEMBER_PAGE); }
  function goToLanding() { window.location.replace(LANDING_PAGE); }

  if (!client) {
    if (isMemberPage) {
      document.documentElement.classList.add("auth-check-pending");
      window.addEventListener("DOMContentLoaded", () => {
        document.body.innerHTML = '<main class="auth-gate-error"><h1>Almost ready!</h1><p>Pizza Luka sign-in is not connected yet. Add your Supabase project URL and anon key to script.js, then refresh.</p><a href="index.html">Back to welcome page</a></main>';
      });
    }
    return;
  }

  // Enforce the member-only page using the verified Supabase session.
  client.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      if (isMemberPage) goToLanding();
      return;
    }
    if (!isMemberPage) goToMemberPage();
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" && isMemberPage) goToLanding();
    if (event === "SIGNED_IN" && !isMemberPage) goToMemberPage();
    if (event === "PASSWORD_RECOVERY" && modal) openModal("recovery");
    if (authNav) renderUser(session?.user || null);
  });

  if (!modal || !authNav || !form) {
    if (authNav) {
      client.auth.getSession().then(({data}) => renderUser(data.session?.user || null));
    }
    return;
  }

  const title = document.querySelector("#auth-title");
  const description = document.querySelector("#auth-description");
  const emailInput = document.querySelector("#auth-email");
  const passwordInput = document.querySelector("#auth-password");
  const confirmWrap = document.querySelector("#auth-confirm-wrap");
  const confirmInput = document.querySelector("#auth-confirm");
  const newPasswordWrap = document.querySelector("#auth-new-password-wrap");
  const newPasswordInput = document.querySelector("#auth-new-password");
  const forgotButton = document.querySelector("#auth-forgot");
  const message = document.querySelector("#auth-message");
  const submit = document.querySelector("#auth-submit");
  const switchLine = document.querySelector("#auth-switch");
  let mode = "login";
  let lastFocus = null;

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }
  function openModal(nextMode) {
    mode = nextMode;
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("auth-open");
    renderMode();
    setTimeout(() => emailInput.focus(), 30);
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-open");
    setMessage("");
    if (lastFocus?.focus) lastFocus.focus();
  }
  function renderMode() {
    const signup = mode === "signup";
    const recovery = mode === "recovery";
    title.textContent = signup ? "Create your account." : recovery ? "Choose a new password." : "Welcome back.";
    description.textContent = signup ? "Join us at Pizza Luka. It only takes a moment." : recovery ? "Enter a new password for your account." : "Log in to step inside Pizza Luka.";
    confirmWrap.hidden = !signup;
    confirmInput.required = signup;
    passwordInput.hidden = recovery;
    passwordInput.required = !recovery;
    newPasswordWrap.hidden = !recovery;
    newPasswordInput.required = recovery;
    forgotButton.hidden = signup || recovery;
    submit.textContent = signup ? "Create account" : recovery ? "Update password" : "Log in";
    switchLine.hidden = recovery;
    switchLine.innerHTML = signup
      ? 'Already have an account? <button type="button" data-auth-switch="login">Log in</button>'
      : 'New to Pizza Luka? <button type="button" data-auth-switch="signup">Create an account</button>';
    setMessage("");
  }
  function friendlyError(error, action) {
    const raw = String(error?.message || "").toLowerCase();
    if (raw.includes("password") && /(weak|length|characters|least)/.test(raw)) return "That password is too weak. Please choose a stronger password.";
    if (/(already|registered|exists)/.test(raw)) return "This email may already be registered. Try logging in or use another email.";
    if (/(invalid login credentials|invalid email or password)/.test(raw)) return "That email and password don't match. Please try again.";
    if (raw.includes("email not confirmed")) return "Please confirm your email using the link we sent before logging in.";
    if (/(rate limit|too many)/.test(raw)) return "Too many attempts. Please wait a little and try again.";
    return action === "signup" ? "We couldn't create your account. Please check your details and try again." : action === "recovery" ? "We couldn't complete the password reset. Please try again." : "Something went wrong. Please check your connection and try again.";
  }
  function renderUser(user) {
    if (!authNav) return;
    authNav.replaceChildren();
    if (!user) {
      const login = document.createElement("button");
      login.className = "auth-nav-button auth-login";
      login.type = "button";
      login.textContent = "Log in";
      login.addEventListener("click", () => openModal("login"));
      const signup = document.createElement("button");
      signup.className = "auth-nav-button auth-signup";
      signup.type = "button";
      signup.textContent = "Sign up";
      signup.addEventListener("click", () => openModal("signup"));
      authNav.append(login, signup);
    } else {
      const email = document.createElement("span");
      email.className = "auth-user";
      email.textContent = user.email || "Signed in";
      const logout = document.createElement("button");
      logout.className = "auth-nav-button auth-logout";
      logout.type = "button";
      logout.textContent = "Log out";
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        const {error} = await client.auth.signOut();
        if (error) { logout.disabled = false; window.alert(friendlyError(error, "logout")); }
      });
      authNav.append(email, logout);
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-auth-open]");
    if (button) openModal(button.dataset.authOpen);
  });
  modal.querySelectorAll("[data-auth-close]").forEach(el => el.addEventListener("click", closeModal));
  modal.addEventListener("click", event => {
    const button = event.target.closest("[data-auth-switch]");
    if (button) { mode = button.dataset.authSwitch; renderMode(); }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  forgotButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) { emailInput.focus(); return setMessage("Enter your email address first, and we'll send a reset link.", true); }
    forgotButton.disabled = true;
    setMessage("Sending password reset email…");
    const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo: window.location.origin + "/home.html"});
    forgotButton.disabled = false;
    if (error) return setMessage(friendlyError(error, "recovery"), true);
    setMessage("If an account exists for that email, a password reset link is on its way.");
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submit.disabled = true;
    setMessage("Please wait…");
    try {
      if (mode === "signup") {
        if (password !== confirmInput.value) return setMessage("Your passwords don't match. Please check and try again.", true);
        if (password.length < 8) return setMessage("Please choose a stronger password with at least 8 characters.", true);
        const {data, error} = await client.auth.signUp({email, password, options:{emailRedirectTo:window.location.origin + "/home.html"}});
        if (error) return setMessage(friendlyError(error, "signup"), true);
        form.reset();
        if (data.session) goToMemberPage();
        else setMessage("Your account has been created! Please confirm your email using the link we just sent. You'll then be able to log in.");
      } else if (mode === "recovery") {
        const nextPassword = newPasswordInput.value;
        if (nextPassword.length < 8) return setMessage("Please choose a stronger password with at least 8 characters.", true);
        const {error} = await client.auth.updateUser({password:nextPassword});
        if (error) return setMessage(friendlyError(error, "recovery"), true);
        setMessage("Your password has been updated. You're all set.");
        setTimeout(goToMemberPage, 900);
      } else {
        const {error} = await client.auth.signInWithPassword({email, password});
        if (error) return setMessage(friendlyError(error, "login"), true);
        goToMemberPage();
      }
    } catch (error) {
      setMessage(friendlyError(error, mode), true);
    } finally {
      submit.disabled = false;
    }
  });
  client.auth.getSession().then(({data}) => renderUser(data.session?.user || null));
})();
