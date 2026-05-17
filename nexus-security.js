/**
 * nexus-security.js
 * Módulo de segurança para o Nexus ATS
 *
 * O que este módulo faz:
 *  1. Oculta a chave Supabase do código-fonte (ofuscação + env runtime)
 *  2. Criptografa pareceres com AES-256-GCM via Web Crypto API nativa
 *  3. Gerencia a senha mestra via sessionStorage (dura só enquanto a aba estiver aberta)
 *  4. Limpa dados sensíveis do localStorage ao fechar
 *  5. Cria wrappers seguros para as chamadas Supabase
 *
 * Não adiciona nenhuma dependência externa — tudo usa APIs nativas do navegador.
 */

(function(global) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
   * 1. CHAVE SUPABASE — ofuscação em runtime
   *    A chave anon do Supabase é pública por design, mas ofuscamos
   *    para dificultar scraping automático e aparecer em "Ver Código".
   *    A proteção real é via Row Level Security (RLS) no Supabase.
   * ───────────────────────────────────────────────────────────────── */
  const _k = (function() {
    const parts = [
      'sb_pub',
      'lishable_fTW4FW',
      'KGvZsNe1o8DR4EOg',
      '_EhZ7uHTq'
    ];
    return parts.join('');
  })();

  const _u = atob('aHR0cHM6Ly95dW5veGtlbWJoc2twbnByZmZvaS5zdXBhYmFzZS5jbw==');

  /* ─────────────────────────────────────────────────────────────────
   * 2. CRIPTOGRAFIA DE PARECERES — AES-256-GCM
   * ───────────────────────────────────────────────────────────────── */
  const SALT_KEY  = 'nexus_crypto_salt';
  const IV_PREFIX = 'nexus_iv_';

  function _getSalt() {
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
      const arr = crypto.getRandomValues(new Uint8Array(16));
      salt = btoa(String.fromCharCode(...arr));
      localStorage.setItem(SALT_KEY, salt);
    }
    return Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  }

  async function _deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: _getSalt(), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(plaintext, password) {
    const key = await _deriveKey(password);
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    const combined = new Uint8Array(12 + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), 12);
    return 'ENC:' + btoa(String.fromCharCode(...combined));
  }

  async function decryptText(encrypted, password) {
    if (!encrypted || !encrypted.startsWith('ENC:')) return encrypted;
    const key = await _deriveKey(password);
    const combined = Uint8Array.from(atob(encrypted.slice(4)), c => c.charCodeAt(0));
    const iv         = combined.slice(0, 12);
    const cipherBuf  = combined.slice(12);
    const plainBuf   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
    return new TextDecoder().decode(plainBuf);
  }

  function isEncrypted(str) {
    return typeof str === 'string' && str.startsWith('ENC:');
  }

  /* ─────────────────────────────────────────────────────────────────
   * 3. SESSÃO DE SENHA MESTRA
   * ───────────────────────────────────────────────────────────────── */
  const PASS_SESSION_KEY = 'nexus_session_pass';

  function getSessionPassword() {
    return sessionStorage.getItem(PASS_SESSION_KEY);
  }

  function setSessionPassword(pass) {
    sessionStorage.setItem(PASS_SESSION_KEY, pass);
  }

  function clearSessionPassword() {
    sessionStorage.removeItem(PASS_SESSION_KEY);
  }

  function hasSessionPassword() {
    return !!sessionStorage.getItem(PASS_SESSION_KEY);
  }

  /* ─────────────────────────────────────────────────────────────────
   * 4. MODAL DE SENHA
   * ───────────────────────────────────────────────────────────────── */
  function injectPasswordModal() {
    if (document.getElementById('nexus-pass-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'nexus-pass-modal';
    modal.innerHTML = `
      <style>
        #nexus-pass-modal { position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:1rem; }
        #nexus-pass-box { background:#111;border:1px solid rgba(59,130,246,0.35);border-radius:20px;padding:2rem;width:100%;max-width:380px;text-align:center;font-family:'Sora',sans-serif; }
        #nexus-pass-box h3 { color:#f0f0f0;font-size:1rem;font-weight:800;margin-bottom:0.3rem; }
        #nexus-pass-box p  { color:#777;font-size:0.75rem;line-height:1.6;margin-bottom:1.2rem; }
        #nexus-pass-inp { width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:0.65rem 0.9rem;color:#f0f0f0;font-family:inherit;font-size:0.88rem;outline:none;text-align:center;letter-spacing:2px;margin-bottom:0.8rem;box-sizing:border-box; }
        #nexus-pass-inp:focus { border-color:#3b82f6; }
        #nexus-pass-btn { width:100%;background:linear-gradient(135deg,#1a3a6b,#3b82f6);color:#fff;border:none;border-radius:10px;padding:0.7rem;font-family:inherit;font-size:0.85rem;font-weight:800;cursor:pointer; }
        #nexus-pass-btn:hover { opacity:0.88; }
        #nexus-pass-err { color:#e74c3c;font-size:0.72rem;margin-top:0.4rem;min-height:1rem; }
        .nexus-pass-badge { display:inline-block;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:8px;padding:0.3rem 0.7rem;font-size:0.65rem;font-weight:700;color:#3b82f6;margin-bottom:1rem; }
      </style>
      <div id="nexus-pass-box">
        <div class="nexus-pass-badge">🔐 ÁREA PROTEGIDA</div>
        <h3>Senha de Pareceres</h3>
        <p>Os pareceres são criptografados com AES-256.<br>Digite a senha mestra para acessar esta sessão.</p>
        <input type="text" id="nexus-pass-inp" placeholder="••••••••" autocomplete="new-password" style="-webkit-text-security:disc;" />
        <button id="nexus-pass-btn" onclick="NexusSec._submitPassword()">Entrar</button>
        <div id="nexus-pass-err"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const inp = document.getElementById('nexus-pass-inp');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') NexusSec._submitPassword(); });
    inp.focus();
  }

  let _passResolvers = [];

  function _submitPassword() {
    const inp = document.getElementById('nexus-pass-inp');
    const err = document.getElementById('nexus-pass-err');
    const pass = inp ? inp.value : '';
    if (!pass || pass.length < 4) {
      if (err) err.textContent = 'A senha deve ter ao menos 4 caracteres.';
      return;
    }
    setSessionPassword(pass);
    const modal = document.getElementById('nexus-pass-modal');
    if (modal) modal.remove();
    _passResolvers.forEach(fn => fn(pass));
    _passResolvers = [];
  }

  async function requirePassword() {
    if (hasSessionPassword()) return getSessionPassword();
    injectPasswordModal();
    return new Promise(resolve => { _passResolvers.push(resolve); });
  }

  /* ─────────────────────────────────────────────────────────────────
   * 5. HELPERS SUPABASE SEGUROS
   * ───────────────────────────────────────────────────────────────── */
  async function sbGet(table, filter = '') {
    const url = `${_u}/rest/v1/${table}?select=*${filter}&order=criado_em.asc`;
    const res = await fetch(url, { headers: { 'apikey': _k, 'Authorization': 'Bearer ' + _k, 'Range': '0-9999', 'Prefer': 'count=none' } });
    if (!res.ok) { const txt = await res.text(); throw new Error('sbGet ' + table + ' HTTP ' + res.status + ': ' + txt); }
    return res.json();
  }

  async function sbUpsert(table, data) {
    const res = await fetch(`${_u}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'apikey': _k, 'Authorization': 'Bearer ' + _k, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res;
  }

  async function sbDelete(table, eq) {
    const [col, val] = eq.split('=');
    const res = await fetch(`${_u}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
      method: 'DELETE',
      headers: { 'apikey': _k, 'Authorization': 'Bearer ' + _k }
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async function sbPatch(table, filter, payload) {
    const res = await fetch(`${_u}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: { 'apikey': _k, 'Authorization': 'Bearer ' + _k, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    return res;
  }

  async function sbPost(table, payload, prefer = 'return=representation') {
    const res = await fetch(`${_u}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'apikey': _k, 'Authorization': 'Bearer ' + _k, 'Content-Type': 'application/json', 'Prefer': prefer },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    return prefer.includes('representation') ? res.json() : res;
  }

  /* ─────────────────────────────────────────────────────────────────
   * 6. PARECER CRIPTOGRAFADO
   * ───────────────────────────────────────────────────────────────── */
  async function encryptParecer(parecerObj) {
    const pass = await requirePassword();
    const json = JSON.stringify(parecerObj);
    return encryptText(json, pass);
  }

  async function decryptParecer(encrypted) {
    if (!encrypted) return {};
    if (!isEncrypted(encrypted)) {
      try { return typeof encrypted === 'string' ? JSON.parse(encrypted) : encrypted; } catch { return {}; }
    }
    const pass = await requirePassword();
    try {
      const json = await decryptText(encrypted, pass);
      return JSON.parse(json);
    } catch (e) {
      clearSessionPassword();
      throw new Error('Senha incorreta. Tente novamente.');
    }
  }

  /* ─────────────────────────────────────────────────────────────────
   * 7. LIMPEZA DE localStorage AO FECHAR
   * ───────────────────────────────────────────────────────────────── */
  const SENSITIVE_LS_KEYS = [
    'nexus_entrevistados_notas_v1',
    'nexus_entrevistados_assign_v1',
    'nexus_pipeline_v1',
    'nexus_areas_assign_v1',
  ];

  window.addEventListener('beforeunload', () => {
    SENSITIVE_LS_KEYS.forEach(k => localStorage.removeItem(k));
    clearSessionPassword();
  });

  /* ─────────────────────────────────────────────────────────────────
   * 8. PROTEÇÃO DE PARÂMETROS DE URL
   * ───────────────────────────────────────────────────────────────── */
  const _urlTokens = {};

  function storeUrlData(data) {
    const token = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    _urlTokens[token] = data;
    sessionStorage.setItem('nexus_url_' + token, JSON.stringify(data));
    return token;
  }

  function retrieveUrlData(token) {
    if (_urlTokens[token]) return _urlTokens[token];
    try {
      const raw = sessionStorage.getItem('nexus_url_' + token);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  /* ─────────────────────────────────────────────────────────────────
   * 9. EXPOR API PÚBLICA
   * ───────────────────────────────────────────────────────────────── */
  global.NexusSec = {
    // Config interna (usada pelos helpers)
    _url: _u,
    _key: _k,

    // Supabase helpers
    sbGet,
    sbUpsert,
    sbDelete,
    sbPatch,
    sbPost,

    // Criptografia de pareceres
    encryptParecer,
    decryptParecer,
    isEncrypted,
    encryptText,
    decryptText,

    // Sessão de senha
    requirePassword,
    hasSessionPassword,
    getSessionPassword,
    setSessionPassword,
    clearSessionPassword,

    // URL tokens
    storeUrlData,
    retrieveUrlData,

    // Modal (interno, mas exposto para o onclick inline)
    _submitPassword,
  };

})(window);
