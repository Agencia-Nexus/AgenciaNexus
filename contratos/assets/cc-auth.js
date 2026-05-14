/* ════════════════════════════════════════════
   cc-auth.js — Agência Nexus
   ════════════════════════════════════════════ */

const SUPABASE_URL      = 'https://huycenqggwkfhvoynnhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWNlbnFnZ3drZmh2b3lubmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTM1NTEsImV4cCI6MjA4OTc4OTU1MX0.Tg-XchEyLov6xZuILhqUE1f9XRhcCdGXejyHXS6kW8c';
const SUPABASE_ANON_KEY2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveW9nZWRzZ3J2ZHV5Z2pzZ3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDEwNDksImV4cCI6MjA4OTM3NzA0OX0.IUyEh5SZLz_j5nf2k9-xelbxthcvSJ8oX0mAbqtuLF4';

window.__ccAuthReady = async function () {
  try {
    let sb, session = null;

    for (const key of [SUPABASE_ANON_KEY, SUPABASE_ANON_KEY2]) {
      try {
        sb = window.supabase.createClient(SUPABASE_URL, key);
        window._sb = sb;
        const res = await sb.auth.getSession();
        if (res.data?.session) { session = res.data.session; break; }
      } catch(e) { console.warn('[cc-auth] key falhou:', e.message); }
    }

    if (!session) {
      const origem = encodeURIComponent(window.location.pathname);
      window.location.replace('/contratos/login.html?next=' + origem);
      return;
    }

    const user = session.user;
    const nomeEl  = document.getElementById('user-nome');
    const emailEl = document.getElementById('user-email');
    if (nomeEl)  nomeEl.textContent  = user.user_metadata?.nome || user.email.split('@')[0];
    if (emailEl) emailEl.textContent = user.email;

    window.ccLogout = async () => {
      await sb.auth.signOut();
      window.location.replace('/contratos/login.html');
    };

  } catch(e) {
    console.error('[cc-auth] Exceção:', e);
    window.location.replace('/contratos/login.html');
  }
};

(function() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload  = () => window.__ccAuthReady();
  s.onerror = () => {
    console.error('[cc-auth] SDK não carregou');
    window.location.replace('/contratos/login.html');
  };
  document.head.appendChild(s);
})();
