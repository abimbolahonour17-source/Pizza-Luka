/* Pizza Luka Supabase authentication
   Replace these two placeholders with your Supabase project URL and anon/public key.
   Never put a service_role key in browser code. */
const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_ANON_KEY = "SUPABASE_ANON_KEY";

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

(() => {
  const modal = document.querySelector("#auth-modal");
  const authNav = document.querySelector("#auth-nav");
  const form = document.querySelector("#auth-form");
  if (!modal || !authNav || !form) return;

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
  const clientReady = window.supabase && SUPABASE_URL !== "SUPABASE_URL" && SUPABASE_ANON_KEY !== "SUPABASE_ANON_KEY";
  const client = clientReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
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
    window.setTimeout(() => emailInput.focus(), 30);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("auth-open");
    setMessage("");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function renderMode() {
    const isSignup = mode === "signup";
    const isRecovery = mode === "recovery";
    title.textContent = isSignup ? "Create your account." : isRecovery ? "Choose a new password." : "Welcome back.";
    description.textContent = isSignup
      ? "Sign up with your email and a password."
      : isRecovery ? "Enter a new password for your account."
      : "Log in to your account to continue.";
    confirmWrap.hidden = !isSignup;
    confirmInput.required = isSignup;
    passwordInput.hidden = isRecovery;
    passwordInput.required = !isRecovery;
    newPasswordWrap.hidden = !isRecovery;
    newPasswordInput.required = isRecovery;
    forgotButton.hidden = isSignup || isRecovery;
    submit.textContent = isSignup ? "Create account" : isRecovery ? "Update password" : "Log in";
    switchLine.hidden = isRecovery;
    switchLine.innerHTML = isSignup
      ? 'Already have an account? <button type="button" data-auth-switch="login">Log in</button>'
      : 'New to Pizza Luka? <button type="button" data-auth-switch="signup">Create an account</button>';
    setMessage("");
  }

  function friendlyError(error, action) {
    const raw = String(error?.message || "").toLowerCase();
    if (raw.includes("password") && (raw.includes("weak") || raw.includes("length") || raw.includes("characters") || raw.includes("least"))) return "That password is too weak. Please choose a stronger password.";
    if (raw.includes("already") || raw.includes("registered") || raw.includes("exists")) return "This email may already be registered. Try logging in or use another email.";
    if (raw.includes("invalid login credentials") || raw.includes("invalid email or password")) return "That email and password don't match. Please try again.";
    if (raw.includes("email not confirmed")) return "Please confirm your email using the link we sent before logging in.";
    if (raw.includes("rate limit") || raw.includes("too many")) return "Too many attempts. Please wait a little and try again.";
    if (action === "signup") return "We couldn't create your account. Please check your details and try again.";
    if (action === "recovery") return "We couldn't send the reset email just now. Please try again.";
    return "Something went wrong. Please check your connection and try again.";
  }

  function renderUser(user) {
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
      return;
    }
    const email = document.createElement("span");
    email.className = "auth-user";
    email.textContent = user.email || "Signed in";
    email.title = user.email || "";
    const logout = document.createElement("button");
    logout.className = "auth-nav-button auth-logout";
    logout.type = "button";
    logout.textContent = "Log out";
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) {
        logout.disabled = false;
        window.alert(friendlyError(error, "logout"));
      }
    });
    authNav.append(email, logout);
  }

  authNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-open]");
    if (button) openModal(button.dataset.authOpen);
  });
  modal.querySelectorAll("[data-auth-close]").forEach((el) => el.addEventListener("click", closeModal));
  modal.addEventListener("click", (event) => {
    const switchButton = event.target.closest("[data-auth-switch]");
    if (switchButton) {
      mode = switchButton.dataset.authSwitch;
      renderMode();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  forgotButton.addEventListener("click", async () => {
    if (!client) return setMessage("Authentication is not configured yet. Add your Supabase project URL and anon key.", true);
    const email = emailInput.value.trim();
    if (!email) {
      emailInput.focus();
      return setMessage("Enter your email address first, and we'll send a reset link.", true);
    }
    forgotButton.disabled = true;
    setMessage("Sending password reset email…");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    forgotButton.disabled = false;
    if (error) return setMessage(friendlyError(error, "recovery"), true);
    setMessage("If an account exists for that email, a password reset link is on its way.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return setMessage("Authentication isn't connected yet. Replace SUPABASE_URL and SUPABASE_ANON_KEY in script.js with your Supabase project credentials.", true);
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submit.disabled = true;
    setMessage("Please wait…");
    try {
      if (mode === "signup") {
        if (password !== confirmInput.value) return setMessage("Your passwords don't match. Please check and try again.", true);
        if (password.length < 6) return setMessage("Please choose a stronger password with at least 6 characters.", true);
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (error) return setMessage(friendlyError(error, "signup"), true);
        if (data.session) {
          setMessage("Your account is ready. You're now logged in.");
        } else {
          setMessage("Account created! Check your inbox for the confirmation email before logging in.");
        }
        form.reset();
      } else if (mode === "recovery") {
        const newPassword = newPasswordInput.value;
        if (newPassword.length < 6) return setMessage("Please choose a stronger password with at least 6 characters.", true);
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) return setMessage(friendlyError(error, "recovery"), true);
        setMessage("Your password has been updated. You can now log in.");
        mode = "login";
        renderMode();
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) return setMessage(friendlyError(error, "login"), true);
        closeModal();
      }
    } catch (error) {
      setMessage(friendlyError(error, mode), true);
    } finally {
      submit.disabled = false;
    }
  });

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      renderUser(session?.user || null);
      if (event === "PASSWORD_RECOVERY") openModal("recovery");
      if (event === "SIGNED_IN" && modal.classList.contains("is-open") && mode !== "recovery") closeModal();
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!error) renderUser(data.session?.user || null);
    });
  } else {
    renderUser(null);
  }
})();
