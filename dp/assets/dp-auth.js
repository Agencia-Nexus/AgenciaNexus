/* ════════════════════════════════════════════
   dp-auth.js — Agência Nexus · Auth Guard
   Supabase Auth — proteção de rota para todas
   as páginas do sistema DP.

   ➜ Substitua SUPABASE_URL e SUPABASE_ANON_KEY
     pelos valores do seu projeto Supabase.
     Veja: supabase.com → seu projeto → Settings → API
   ════════════════════════════════════════════ */

// ── 1. CONFIGURAÇÃO — preencha após criar o projeto Supabase ──
const SUPABASE_URL      = 'https://huycenqggwkfhvoynnhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XPRq5RZwkFLToHc8cYcXXg_5YnPr-TA';

// ── 2. Carrega o SDK do Supabase via CDN ──
(function loadSupabaseSDK() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = () => window.__supabaseReady && window.__supabaseReady();
  document.head.appendChild(s);
})();

// ── 3. Auth Guard — bloqueia página se não autenticado ──
window.__supabaseReady = async function () {
  const { createClient } = window.supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window._sb = sb; // expõe para uso global (logout, etc.)

  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    // Sem sessão → redireciona para login, preservando a página de origem
    const origem = encodeURIComponent(window.location.pathname + window.location.search);
    const base   = '/dp/';
    window.location.replace(`${base}login.html?next=${origem}`);
    return;
  }

  // Sessão válida → preenche info do usuário no topbar (se existir)
  const user = session.user;
  const nomeEl = document.getElementById('user-nome');
  const emailEl = document.getElementById('user-email');
  if (nomeEl)  nomeEl.textContent  = user.user_metadata?.nome || user.email.split('@')[0];
  if (emailEl) emailEl.textContent = user.email;

  // Expõe função de logout globalmente
  window.dpLogout = async () => {
    await sb.auth.signOut();
    window.location.replace(_dpAuthBase() + 'login.html');
  };
};

// Detecta base path (para funcionar em subpastas como /dp/)
function _dpAuthBase() {
  const path = window.location.pathname;
  const idx  = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx + 1) : '/';
}

// ── 4. Fallback: se o SDK demorar muito (CDN lento), mostra aviso ──
setTimeout(() => {
  if (!window._sb) {
    console.warn('[dp-auth] SDK do Supabase não carregou. Verifique sua conexão.');
  }
}, 8000);
