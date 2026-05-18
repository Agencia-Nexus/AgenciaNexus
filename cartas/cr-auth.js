/**
 * cr-auth.js — Agência Nexus
 * Guard de autenticação compartilhado.
 * Carrega o Supabase SDK, verifica sessão e expõe window._sb.
 * Se não houver sessão, redireciona para login.html.
 */
(function () {
  const SB_URL = 'https://yunoxkembhskpnprffoi.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bm94a2VtYmhza3BucHJmZm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzg2MzksImV4cCI6MjA5NDU1NDYzOX0.WhkzrBCHThvJaMuLeo6oVPjrWvc_MvfCoyz9B90-Yms';
  const LOGIN   = 'login.html';

  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function redirectToLogin() {
    const page = encodeURIComponent(currentPage() + window.location.search);
    window.location.replace(LOGIN + '?next=' + page);
  }

  function init(supabaseLib) {
    const client = supabaseLib.createClient(SB_URL, SB_KEY);
    window._sb = client;

    client.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        redirectToLogin();
        return;
      }
      // Expose user helpers
      window.crUser  = session.user;
      window.crLogout = async () => {
        await client.auth.signOut();
        window.location.replace(LOGIN);
      };
    });
  }

  // Load SDK dynamically if not already present
  if (window.supabase && window.supabase.createClient) {
    init(window.supabase);
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = () => init(window.supabase);
    s.onerror = () => {
      // Fallback CDN
      const s2 = document.createElement('script');
      s2.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s2.onload = () => init(window.supabase);
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  }
})();
