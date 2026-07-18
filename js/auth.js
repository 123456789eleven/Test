const Auth = (function () {
  let user = null;

  const ready = supabaseClient.auth.getSession().then(({ data }) => {
    user = data.session ? data.session.user : null;
    renderButton();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    user = session ? session.user : null;
    renderButton();
    window.dispatchEvent(new CustomEvent("custodian:authchange"));
    if (user) migrateLocalNotesIfNeeded();
  });

  function isSignedIn() { return !!user; }
  function currentUser() { return user; }

  function renderButton() {
    const btn = document.getElementById("authButton");
    if (!btn) return;
    if (user) {
      btn.textContent = user.email + " · Sign out";
      btn.dataset.mode = "signout";
    } else {
      btn.textContent = "Sign in to edit";
      btn.dataset.mode = "signin";
    }
  }

  function wireUI() {
    const overlay = document.getElementById("authModalOverlay");
    const form = document.getElementById("authForm");
    const errorEl = document.getElementById("authError");
    const title = document.getElementById("authModalTitle");
    const submitBtn = document.getElementById("authSubmit");
    const toggleBtn = document.getElementById("authToggleMode");
    const authButton = document.getElementById("authButton");
    let mode = "signin";

    function openModal() {
      mode = "signin";
      title.textContent = "Sign in";
      submitBtn.textContent = "Sign in";
      toggleBtn.textContent = "First time? Create your account";
      errorEl.textContent = "";
      form.reset();
      overlay.classList.add("show");
      document.getElementById("authEmail").focus();
    }
    function closeModal() { overlay.classList.remove("show"); }

    authButton.addEventListener("click", () => {
      if (isSignedIn()) { supabaseClient.auth.signOut(); }
      else { openModal(); }
    });
    document.getElementById("authModalClose").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

    toggleBtn.addEventListener("click", () => {
      mode = mode === "signin" ? "signup" : "signin";
      title.textContent = mode === "signin" ? "Sign in" : "Create your account";
      submitBtn.textContent = mode === "signin" ? "Sign in" : "Create account";
      toggleBtn.textContent = mode === "signin" ? "First time? Create your account" : "Already have an account? Sign in";
      errorEl.textContent = "";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      submitBtn.disabled = true;
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      const { error } = mode === "signin"
        ? await supabaseClient.auth.signInWithPassword({ email, password })
        : await supabaseClient.auth.signUp({ email, password });
      submitBtn.disabled = false;
      if (error) { errorEl.textContent = error.message; return; }
      if (mode === "signup") {
        errorEl.style.color = "var(--good)";
        errorEl.textContent = "Account created — check your email if confirmation is required, otherwise you're signed in.";
      }
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", wireUI);

  return { ready, isSignedIn, currentUser };
})();
