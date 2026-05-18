/* ══════════════════════════════════════════════════════
   dp-mobile.js — Mobile UX Controller · Agência Nexus DP
   v2 — Corrigido: drawer, overlay z-index, desktop toggle
   ══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Detecção mobile ── */
  const isMobile = () => window.innerWidth <= 768;

  /* ── Página atual ── */
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  /* ══════════════════════════════
     1. HAMBURGER BUTTON
  ══════════════════════════════ */
  function injectHamburger() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('tb-hamburger')) return;

    const btn = document.createElement('button');
    btn.className  = 'tb-hamburger';
    btn.id         = 'tb-hamburger';
    btn.innerHTML  = '☰';
    btn.title      = 'Menu';
    btn.setAttribute('aria-label', 'Abrir menu');
    btn.addEventListener('click', toggleSidebar);
    topbar.insertBefore(btn, topbar.firstChild);
  }

  /* ══════════════════════════════
     2. OVERLAY
  ══════════════════════════════ */
  function injectOverlay() {
    if (document.getElementById('sb-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id        = 'sb-overlay';
    // z-index via style inline para garantir que fica abaixo da sidebar (z=300) mas acima do conteúdo (z=100)
    overlay.style.zIndex = '290';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }

  /* ══════════════════════════════
     3. SIDEBAR CONTROL
  ══════════════════════════════ */
  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    sb.classList.contains('mobile-open') ? closeSidebar() : openSidebar();
  }

  function openSidebar() {
    const sb      = document.getElementById('sidebar');
    const overlay = document.getElementById('sb-overlay');
    if (!sb) return;
    sb.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    const btn = document.getElementById('tb-hamburger');
    if (btn) btn.innerHTML = '✕';
  }

  function closeSidebar() {
    const sb      = document.getElementById('sidebar');
    const overlay = document.getElementById('sb-overlay');
    if (!sb) return;
    sb.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    const btn = document.getElementById('tb-hamburger');
    if (btn) btn.innerHTML = '☰';
  }

  /* Fecha sidebar ao clicar em link de nav no mobile */
  function bindNavLinks() {
    document.querySelectorAll('.sb-item').forEach(item => {
      item.addEventListener('click', () => {
        if (isMobile()) setTimeout(closeSidebar, 80);
      });
    });
  }

  /* ══════════════════════════════
     4. DESKTOP TOGGLE (◀ / ▶)
     Só funciona no desktop
  ══════════════════════════════ */
  function bindDesktopToggle() {
    const btn  = document.getElementById('sb-toggle');
    const sb   = document.getElementById('sidebar');
    const main = document.querySelector('.main');
    if (!btn || !sb) return;

    btn.addEventListener('click', () => {
      /* No mobile: delega pro toggleSidebar */
      if (isMobile()) { toggleSidebar(); return; }

      /* Desktop: colapsa/expande */
      const collapsed = sb.classList.toggle('collapsed');
      if (main) main.classList.toggle('expanded', collapsed);
      btn.textContent = collapsed ? '▶' : '◀';
    });
  }

  /* ══════════════════════════════
     5. BOTTOM NAV
  ══════════════════════════════ */
  const BOTTOM_NAV_ITEMS = [
    { ico: '📊', lbl: 'Dashboard',  href: 'index.html' },
    { ico: '👥', lbl: 'Equipe',     href: 'colaboradores.html' },
    { ico: '💰', lbl: 'Folha',      href: 'folha.html' },
    { ico: '🎁', lbl: 'Benefícios', href: 'beneficios.html' },
    { ico: '☰',  lbl: 'Menu',       href: '#', id: 'bnav-menu' },
  ];

  function injectBottomNav() {
    if (document.getElementById('bottom-nav')) return;

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.id        = 'bottom-nav';
    nav.setAttribute('aria-label', 'Navegação inferior');

    BOTTOM_NAV_ITEMS.forEach(item => {
      const el = document.createElement('a');
      el.className = 'bnav-item';
      if (item.id) el.id = item.id;

      if (item.href !== '#' && currentPage === item.href) {
        el.classList.add('active');
      }

      el.href = item.href;
      el.innerHTML = `<span class="bnav-ico">${item.ico}</span>${item.lbl}`;

      if (item.href === '#') {
        el.addEventListener('click', e => {
          e.preventDefault();
          toggleSidebar();
        });
      }

      nav.appendChild(el);
    });

    document.body.appendChild(nav);
  }

  /* ══════════════════════════════
     6. DATA NA TOPBAR
  ══════════════════════════════ */
  function renderDate() {
    const el = document.getElementById('tb-date');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  /* ══════════════════════════════
     7. ITEM ATIVO NA SIDEBAR
  ══════════════════════════════ */
  function markActiveSidebarItem() {
    document.querySelectorAll('.sb-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      const page = href.split('/').pop();
      if (page === currentPage) item.classList.add('active');
    });
  }

  /* ══════════════════════════════
     8. SWIPE GESTURE
  ══════════════════════════════ */
  function bindSwipeGesture() {
    let startX = 0;
    document.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (!isMobile()) return;
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      const sb   = document.getElementById('sidebar');
      if (!sb) return;

      // Swipe da borda esquerda para direita: abre
      if (startX < 30 && diff < -50) openSidebar();
      // Swipe para esquerda com sidebar aberta: fecha
      if (sb.classList.contains('mobile-open') && diff > 60) closeSidebar();
    }, { passive: true });
  }

  /* ══════════════════════════════
     9. RESIZE — desktop fecha drawer
  ══════════════════════════════ */
  function bindResize() {
    let lastMobile = isMobile();
    window.addEventListener('resize', () => {
      const nowMobile = isMobile();
      if (lastMobile !== nowMobile) {
        lastMobile = nowMobile;
        if (!nowMobile) closeSidebar();
      }
    });
  }

  /* ══════════════════════════════
     INIT
  ══════════════════════════════ */
  function init() {
    injectHamburger();
    injectOverlay();
    injectBottomNav();
    bindNavLinks();
    bindDesktopToggle();
    bindSwipeGesture();
    bindResize();
    markActiveSidebarItem();
    renderDate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
