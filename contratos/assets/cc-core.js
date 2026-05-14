/* ════════════════════════════════════════════
   cc-core.js — Agência Nexus
   Sistema de Controle de Contratos
   v3.0 — Supabase como backend de dados
   ════════════════════════════════════════════ */
'use strict';

// ══════════════════════════════════════
// CONFIGURAÇÃO SUPABASE
// ══════════════════════════════════════
const SB_URL = 'https://huycenqggwkfhvoynnhi.supabase.co';
const SB_KEY = 'sb_publishable_XPRq5RZwkFLToHc8cYcXXg_5YnPr-TA';

async function _sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts._prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ══════════════════════════════════════
// CC — API pública (compatível com v2)
// ══════════════════════════════════════
const CC = {
  _ns: 'ex_cc_',
  _ready: false,

  // localStorage ainda usado APENAS para config (sem dados pessoais)
  get(k)   { try { return JSON.parse(localStorage.getItem(this._ns + k)); } catch { return null; } },
  set(k, v){ localStorage.setItem(this._ns + k, JSON.stringify(v)); },

  getConfig()   { return this.get('config') || defaultConfig(); },
  saveConfig(d) { this.set('config', d); },

  // ── Contratos: leitura assíncrona do Supabase ──
  async getContratosAsync() {
    try {
      const rows = await _sbFetch('ex_contratos?order=id.asc&select=*');
      // Retorna os dados do Supabase — mesmo que seja lista vazia
      return rows.map(_fromRow);
    } catch (e) {
      console.error('[CC] Falha ao carregar contratos do Supabase:', e);
      // fallback para localStorage se offline (sem seed)
      return this.get('contratos') || [];
    }
  },

  // ── Compatibilidade síncrona: retorna cache local ──
  getContratos() {
    return this.get('contratos') || [];
  },

  // ── Salvar: Supabase (upsert) + cache local ──
  async saveContratosAsync(lista) {
    try {
      if (!lista || !lista.length) return;

      // Garante que todos têm campo tipo e id
      const rows = lista.map(c => ({
        id:           c.id,
        tipo:         c.tipo,
        nome:         c.nome,
        empresa:      c.empresa,
        cargo:        c.cargo    || null,
        vt:           c.vt       || 'nao',
        valor_vt:     c.valorVT  || 0,
        bolsa:        c.bolsa    || null,
        salario:      c.salario  || null,
        taxa:         c.taxa     || 0,
        recrutador:   c.recrutador   || null,
        tipo_comissao: c.tipoComissao || 'none',
        comissao_rec: c.comissaoRec  ?? 0,
        comissao_fixo: c.comissaoFixo ?? 0,
        admissao:     c.admissao || null,
        inicio1:      c.inicio1  || null,
        periodo_atual:c.periodoAtual || null,
        situacao:     c.situacao || 'ativo',
        obs:          c.obs      || null,
      }));

      await _sbFetch('ex_contratos', {
        method: 'POST',
        body: JSON.stringify(rows),
        _prefer: 'resolution=merge-duplicates,return=minimal',
      });

      // atualiza cache local
      this.set('contratos', lista);
    } catch (e) {
      console.error('[CC] Falha ao salvar no Supabase:', e);
      // salva só localmente como fallback
      this.set('contratos', lista);
      throw e;
    }
  },

  // ── saveContratos síncrono: salva local + dispara async ──
  saveContratos(lista) {
    this.set('contratos', lista);
    this.saveContratosAsync(lista).catch(err =>
      console.error('[CC] saveContratosAsync falhou:', err)
    );
  },

  // ── Inserir um único contrato ──
  async insertContrato(dados) {
    // Garante que novos registros sempre tenham um id (Date.now() como bigint)
    if (!dados.id) dados = { ...dados, id: Date.now() };
    const row = _toRow(dados);
    const res = await _sbFetch('ex_contratos', {
      method: 'POST',
      body: JSON.stringify(row),
      _prefer: 'return=representation',
    });
    const novo = Array.isArray(res) ? res[0] : res;
    // atualiza cache
    const lista = this.get('contratos') || [];
    lista.push(_fromRow(novo));
    this.set('contratos', lista);
    return _fromRow(novo);
  },

  // ── Atualizar um único contrato ──
  async updateContrato(id, dados) {
    const row = _toRow(dados);
    await _sbFetch(`ex_contratos?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(row),
      _prefer: 'return=minimal',
    });
    // atualiza cache
    const lista = this.get('contratos') || [];
    const idx = lista.findIndex(c => String(c.id) === String(id));
    if (idx >= 0) lista[idx] = { ...lista[idx], ...dados };
    this.set('contratos', lista);
  },

  // ── Excluir um contrato ──
  async deleteContrato(id) {
    await _sbFetch(`ex_contratos?id=eq.${id}`, {
      method: 'DELETE',
      _prefer: 'return=minimal',
    });
    // atualiza cache
    const lista = (this.get('contratos') || []).filter(c => String(c.id) !== String(id));
    this.set('contratos', lista);
  },

  // ── init(): aguarda DOM + carrega dados do Supabase ──
  async init() {
    await new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
    _navInit();
    this._ready = true;

    // Carrega contratos do Supabase e atualiza cache
    try {
      const lista = await this.getContratosAsync();
      this.set('contratos', lista);
    } catch (e) {
      console.error('[CC] init: erro ao carregar contratos', e);
    }
  },
};

// ── Conversão snake_case (Supabase) ↔ camelCase (app) ──
function _toRow(c) {
  return {
    ...(c.id ? { id: c.id } : {}),
    tipo:          c.tipo,
    nome:          c.nome,
    empresa:       c.empresa,
    cargo:         c.cargo        || null,
    vt:            c.vt           || 'nao',
    valor_vt:      c.valorVT      ?? 0,
    bolsa:         c.bolsa        ?? null,
    salario:       c.salario      ?? null,
    taxa:          c.taxa         ?? 0,
    recrutador:    c.recrutador   || null,
    tipo_comissao: c.tipoComissao || c.tipo_comissao || 'none',
    comissao_rec:  c.comissaoRec  ?? c.comissao_rec ?? 0,
    comissao_fixo: c.comissaoFixo ?? c.comissao_fixo ?? 0,
    admissao:      c.admissao     || null,
    inicio1:       c.inicio1      || null,
    periodo_atual: c.periodoAtual ?? null,
    situacao:      c.situacao     || 'ativo',
    obs:           c.obs          || null,
  };
}

function _fromRow(r) {
  return {
    id:           r.id,
    tipo:         r.tipo,
    nome:         r.nome,
    empresa:      r.empresa,
    cargo:        r.cargo        || '',
    vt:           r.vt           || 'nao',
    valorVT:      r.valor_vt     ?? 0,
    bolsa:        r.bolsa        ?? 0,
    salario:      r.salario      ?? 0,
    taxa:         r.taxa         ?? 0,
    recrutador:   r.recrutador   || '',
    tipoComissao: r.tipo_comissao || 'none',
    comissaoRec:  r.comissao_rec  ?? 0,
    comissaoFixo: r.comissao_fixo ?? 0,
    admissao:     r.admissao     || null,
    inicio1:      r.inicio1      || null,
    periodoAtual: r.periodo_atual ?? 1,
    situacao:     r.situacao     || 'ativo',
    obs:          r.obs          || '',
  };
}

// ══════════════════════════════════════
// CONFIG PADRÃO
// ══════════════════════════════════════
function defaultConfig() {
  return {
    taxaEstPadrao:  15,
    taxaEstMin:     10,
    taxaEstMax:     15,
    taxaCLT:        50,
    alertaDias:     30,
    mesesPeriodo:   6,
    maxPeriodos:    4,
  };
}

// ══════════════════════════════════════
// SEED — dados iniciais (usados se banco vazio)
// ══════════════════════════════════════
function seedContratos() {
  const hoje = new Date();
  const sub = m => { const d = new Date(hoje); d.setMonth(d.getMonth()-m); return d.toISOString().slice(0,10); };
  return [
    { id:1,  tipo:'estagiario', nome:'Ana Claudia Ambos',         empresa:'Contagil',              vt:'sim',     valorVT:150, bolsa:800,  taxa:15, periodoAtual:1, inicio1:sub(2),  situacao:'ativo',  obs:'' },
    { id:2,  tipo:'estagiario', nome:'Alexia Rodrigues',          empresa:'Roque Contabilidade',   vt:'sim',     valorVT:120, bolsa:1200, taxa:10, periodoAtual:1, inicio1:sub(5),  situacao:'ativo',  obs:'' },
    { id:3,  tipo:'estagiario', nome:'Larissa Donay',             empresa:'TES Elevadores',        vt:'sim',     valorVT:130, bolsa:900,  taxa:12, periodoAtual:2, inicio1:sub(9),  situacao:'ativo',  obs:'NF' },
    { id:4,  tipo:'estagiario', nome:'Guilherme Souza Alves',     empresa:'Farina Condimentos',    vt:'sim',     valorVT:100, bolsa:600,  taxa:10, periodoAtual:1, inicio1:sub(1),  situacao:'ativo',  obs:'' },
    { id:5,  tipo:'estagiario', nome:'Laisla O. Silverio',        empresa:'Borges Promotoria',     vt:'sim',     valorVT:130, bolsa:900,  taxa:12, periodoAtual:1, inicio1:sub(4),  situacao:'ativo',  obs:'' },
    { id:6,  tipo:'estagiario', nome:'Maria Eduarda F. Santos',   empresa:'Borges Promotoria',     vt:'sim',     valorVT:130, bolsa:900,  taxa:12, periodoAtual:1, inicio1:sub(3),  situacao:'ativo',  obs:'' },
    { id:7,  tipo:'estagiario', nome:'Rafaella Capeletti',        empresa:'Escola Arteria',        vt:'sim',     valorVT:100, bolsa:590,  taxa:12, periodoAtual:1, inicio1:sub(5),  situacao:'ativo',  obs:'' },
    { id:8,  tipo:'estagiario', nome:'Tahiana Antunes Rodrigues', empresa:'FZ Cardiologia',        vt:'fretado', valorVT:0,   bolsa:2500, taxa:15, periodoAtual:1, inicio1:sub(1),  situacao:'ativo',  obs:'' },
    { id:9,  tipo:'estagiario', nome:'Eduarda Oliveira Almeida',  empresa:'Jessica Academy',       vt:'sim',     valorVT:110, bolsa:700,  taxa:15, periodoAtual:1, inicio1:sub(5),  situacao:'ativo',  obs:'' },
    { id:10, tipo:'clt', nome:'Carlos Eduardo Lima',    empresa:'Indústria Alfa Ltda',   vt:'sim',     valorVT:200, salario:3500, taxa:50, admissao:sub(18), situacao:'ativo', cargo:'Analista Adm.',  obs:'' },
    { id:11, tipo:'clt', nome:'Patrícia Mendes',        empresa:'Comércio Beta S.A.',    vt:'nao',     valorVT:0,   salario:2800, taxa:50, admissao:sub(8),  situacao:'ativo', cargo:'Auxiliar Adm.',  obs:'' },
    { id:12, tipo:'clt', nome:'Fernando Costa',         empresa:'Tech Gamma EIRELI',     vt:'fretado', valorVT:0,   salario:4200, taxa:50, admissao:sub(24), situacao:'ativo', cargo:'Supervisor',     obs:'' },
  ];
}

// ══════════════════════════════════════
// FORMATADORES
// ══════════════════════════════════════
const Fmt = {
  brl: v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }),
  pct: v => `${v}%`,
  dt:  v => { if (!v) return '—'; const d = new Date(v+'T12:00:00'); return d.toLocaleDateString('pt-BR'); },
  ini: s => { const n=(s||'').trim().split(/\s+/); return (n[0]?.[0]||'')+(n[1]?.[0]||''); },
  avCls: id => ['av-g','av-b','av-p','av-o','av-a'][id % 5],
};

// ══════════════════════════════════════
// CÁLCULOS
// ══════════════════════════════════════
const Calc = {
  receita(c) {
    if (c.tipo === 'estagiario') return (c.bolsa||0) * ((c.taxa||0)/100);
    return (c.salario||0) * ((c.taxa||0)/100);
  },

  addMeses(dateStr, m) {
    if (!dateStr) return null;
    const d = new Date(dateStr+'T12:00:00');
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  },

  diasAte(dateStr) {
    if (!dateStr) return null;
    return Math.round((new Date(dateStr+'T12:00:00') - new Date()) / 86400000);
  },

  mesesTrabalhados(admissao) {
    if (!admissao) return 0;
    const ini  = new Date(admissao+'T12:00:00');
    const hoje = new Date();
    return (hoje.getFullYear()-ini.getFullYear())*12 + (hoje.getMonth()-ini.getMonth());
  },

  periodos(contrato, cfg) {
    const resultado = [];
    for (let i = 1; i <= cfg.maxPeriodos; i++) {
      const inicio = i === 1
        ? contrato.inicio1
        : this.addMeses(contrato.inicio1, (i-1) * cfg.mesesPeriodo);
      const fim  = this.addMeses(inicio, cfg.mesesPeriodo);
      const dias = this.diasAte(fim);
      let status = 'futuro';
      if (i < parseInt(contrato.periodoAtual)) {
        status = 'ok';
      } else if (i === parseInt(contrato.periodoAtual)) {
        if (dias === null)               status = 'futuro';
        else if (dias < 0)               status = 'vencido';
        else if (dias <= cfg.alertaDias) status = 'warn';
        else                             status = 'ativo';
      }
      resultado.push({ num: i, inicio, fim, status, dias });
    }
    return resultado;
  },

  statusContrato(contrato, cfg) {
    const s = contrato.situacao;
    if (s === 'cancelado') return { cls:'tag-red',    txt:'Cancelado' };
    if (s === 'efetivado') return { cls:'tag-blue',   txt:'Efetivado CLT' };
    if (s === 'concluido') return { cls:'tag-gray',   txt:'Concluído' };
    if (s === 'desligado') return { cls:'tag-red',    txt:'Desligado' };
    if (s === 'licenca')   return { cls:'tag-orange', txt:'Em Licença' };
    if (contrato.tipo === 'estagiario') {
      const ps   = this.periodos(contrato, cfg);
      const venc = ps.find(p => p.status === 'vencido');
      const warn = ps.find(p => p.status === 'warn');
      if (venc && !warn) return { cls:'tag-red',    txt:'Período Vencido' };
      if (warn)          return { cls:'tag-orange', txt:`Vence em ${warn.dias}d` };
    }
    return { cls:'tag-green', txt:'Ativo' };
  },
};

// ══════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════
const UI = {
  val:    id => document.getElementById(id)?.value ?? '',
  setVal: (id, v) => { const el=document.getElementById(id); if(el) el.value=(v??''); },

  toast(msg, tipo='ok') {
    const ct = document.getElementById('toast-ct');
    if (!ct) return;
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.textContent = msg;
    ct.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    const modal = el.querySelector('.modal');
    if (modal) modal.scrollTop = 0;
  },

  closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
  },

  filtrar(tbodyId, q) {
    const trs = document.querySelectorAll(`#${tbodyId} tr`);
    const ql  = (q||'').toLowerCase().trim();
    trs.forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(ql) ? '' : 'none');
  },
};

// ══════════════════════════════════════
// EXPORTAÇÃO
// ══════════════════════════════════════
const Export = {
  csv(headers, rows, filename) {
    const bom = '\uFEFF', sep = ';';
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    const csv = bom + [headers, ...rows].map(r => r.map(esc).join(sep)).join('\r\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' })),
      download: filename,
    });
    a.click(); URL.revokeObjectURL(a.href);
    UI.toast('CSV exportado!', 'ok');
  },

  word(htmlContent, filename) {
    const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body{font-family:Arial,sans-serif;font-size:11pt}
        table{border-collapse:collapse;width:100%;margin-bottom:14pt}
        th{background:#1e40af;color:#fff;padding:5pt 8pt;font-size:9pt}
        td{padding:4pt 8pt;border:1pt solid #ddd;font-size:10pt}
        h2,h3{color:#1e40af}
      </style></head><body>${htmlContent}</body></html>`;
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['\ufeff', doc], { type:'application/msword' })),
      download: filename,
    });
    a.click(); URL.revokeObjectURL(a.href);
    UI.toast('Word exportado!', 'ok');
  },
};

// ══════════════════════════════════════
// NAV INIT (sidebar + topbar)
// ══════════════════════════════════════
function _navInit() {
  const toggle = document.getElementById('sb-toggle');
  if (toggle) {
    toggle.onclick = () => {
      if (window.innerWidth <= 768) {
        document.querySelector('.sb-nav')?.classList.toggle('mob-open');
      } else {
        document.querySelector('.sidebar')?.classList.toggle('collapsed');
      }
    };
  }

  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });

  document.querySelectorAll('.sb-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelector('.sb-nav')?.classList.remove('mob-open');
    });
  });

  const el = document.getElementById('tb-date');
  if (el) {
    const upd = () => el.textContent = new Date().toLocaleDateString('pt-BR',
      { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    upd(); setInterval(upd, 60000);
  }
}
