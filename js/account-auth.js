function waitForComicsApi() {
  return new Promise((resolve) => {
    document.addEventListener("comics-api-ready", () => resolve(), { once: true });
    setTimeout(() => {
      if (typeof ComicsApi !== "undefined") resolve();
    }, 12000);
  });
}

function authSetupError() {
  const cfg = window.SiteConfig ?? {};
  if (cfg.backend !== "supabase") {
    return "This site is not set to use Supabase. Add js/config.local.js with backend: \"supabase\" and your project keys, then refresh.";
  }
  if (!cfg.supabase?.url || !cfg.supabase?.anonKey) {
    return "Supabase keys are missing in js/config.local.js.";
  }
  if (typeof ComicsApi !== "undefined" && ComicsApi.getAdapterName() !== "supabase") {
    return "Supabase scripts did not load. Check the browser console (F12) and refresh.";
  }
  return null;
}

async function initLoginForm() {
  await waitForComicsApi();
  const form = document.getElementById("auth-login-form");
  const errEl = document.getElementById("auth-error");
  if (!form) return;

  const setupErr = authSetupError();
  if (setupErr && errEl) {
    errEl.hidden = false;
    errEl.textContent = setupErr;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errEl) errEl.hidden = true;
    const setupErr = authSetupError();
    if (setupErr) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = setupErr;
      }
      return;
    }
    const email = form.email.value.trim();
    const password = form.password.value;
    try {
      await ComicsApi.signIn(email, password);
      const next = new URLSearchParams(location.search).get("next") || "index.html";
      location.href = next;
    } catch (err) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message;
      }
    }
  });
}

async function showAuthStatus() {
  const statusEl = document.getElementById("auth-status");
  if (!statusEl) return;
  await waitForComicsApi();
  const cfg = window.SiteConfig ?? {};
  const adapter =
    typeof ComicsApi !== "undefined" ? ComicsApi.getAdapterName() : "loading";
  statusEl.hidden = false;
  statusEl.textContent = `Backend: ${cfg.backend ?? "?"} · Adapter: ${adapter}`;
}

async function initSignUpForm() {
  await waitForComicsApi();
  showAuthStatus();
  const form = document.getElementById("auth-signup-form");
  const errEl = document.getElementById("auth-error");
  if (!form) return;

  const setupErr = authSetupError();
  if (setupErr && errEl) {
    errEl.hidden = false;
    errEl.textContent = setupErr;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errEl) errEl.hidden = true;
    const setupErr = authSetupError();
    if (setupErr) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = setupErr;
      }
      return;
    }
    const email = form.email.value.trim();
    const password = form.password.value;
    const displayName = form.displayName?.value?.trim() ?? "";
    try {
      await ComicsApi.signUp(email, password, displayName);
      location.href = "index.html";
    } catch (err) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = err.message;
      }
    }
  });
}

async function initAccountDashboard() {
  await waitForComicsApi();
  const session = await ComicsApi.getSession();
  const gate = document.getElementById("account-gate");
  const panel = document.getElementById("account-panel");
  if (!session) {
    if (gate) gate.hidden = false;
    if (panel) panel.hidden = true;
    return;
  }
  if (gate) gate.hidden = true;
  if (panel) panel.hidden = false;

  const emailEl = document.getElementById("account-email");
  if (emailEl) emailEl.textContent = session.user.email ?? "";

  document.getElementById("account-sign-out")?.addEventListener("click", async () => {
    await ComicsApi.signOut();
    location.reload();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.accountPage;
  if (page === "login") initLoginForm();
  if (page === "signup") initSignUpForm();
  if (page === "dashboard") initAccountDashboard();
});
