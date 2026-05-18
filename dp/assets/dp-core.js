/* ════════════════════════════════════════════
   dp-core.js — Agência Nexus · Depto. Pessoal
   Storage: Supabase (todas as páginas usam await DP.init())
   ════════════════════════════════════════════ */

'use strict';

const SB_URL = 'https://huycenqggwkfhvoynnhi.supabase.co';
const SB_KEY = 'sb_publishable_XPRq5RZwkFLToHc8cYcXXg_5YnPr-TA';

// ══════════════════════════════════════════
// 1. DP — STORAGE (Supabase com cache local)
// ══════════════════════════════════════════
const DP = {
  _sb: null,
  _cache: {
    colaboradores: null,
    pontos: null,
    ferias: null,
    faltas: null,
    afastamentos: null,
    folhas: null,
    config: null,
    documentos: null,
    admissoes: null,
    demissoes: null,
  },

  // ── Inicializa Supabase e carrega dados ──
  async init() {
    if (this._sb) return; // já iniciado
    if (!window.supabase) {
      await this._loadSDK();
    }
    this._sb = window.supabase.createClient(SB_URL, SB_KEY);
    await Promise.all([
      this._load('colaboradores'),
      this._load('config'),
    ]);
  },

  _loadSDK() {
    return new Promise((resolve) => {
      if (window.supabase) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });
  },

  // ── Carrega uma tabela do Supabase para cache ──
  async _load(tabela) {
    if (!this._sb) return;
    try {
      const nome = this._tbl(tabela);
      const { data, error } = await this._sb.from(nome).select('*').order('id');
      if (error) throw error;
      if (tabela === 'config') {
        this._cache.config = data?.[0] ? this._mapConfig(data[0]) : defaultConfig();
      } else {
        this._cache[tabela] = (data || []).map(r => this._mapFrom(tabela, r));
      }
    } catch (e) {
      console.warn(`[DP] Erro ao carregar ${tabela}:`, e.message);
      if (tabela === 'colaboradores') this._cache.colaboradores = defaultColabs();
      if (tabela === 'config') this._cache.config = defaultConfig();
    }
  },

  // ── Mapa nomes de tabela ──
  _tbl(k) {
    return { colaboradores:'dp_colaboradores', pontos:'dp_pontos', ferias:'dp_ferias',
             faltas:'dp_faltas', afastamentos:'dp_afastamentos', folhas:'dp_folhas',
             config:'dp_config', documentos:'dp_documentos',
             admissoes:'dp_admissoes', demissoes:'dp_demissoes' }[k] || ('dp_'+k);
  },

  // ── Converte colunas snake_case → camelCase para colaboradores ──
  _mapFrom(tabela, row) {
    if (tabela === 'colaboradores') {
      return {
        id: row.id, nome: row.nome, cpf: row.cpf, rg: row.rg,
        nasc: row.nasc, email: row.email, tel: row.tel, endereco: row.endereco,
        genero: row.genero, estadoCivil: row.estado_civil, escolaridade: row.escolaridade,
        tipo: row.tipo, cargo: row.cargo, cbo: row.cbo, depto: row.depto,
        admissao: row.admissao, salario: parseFloat(row.salario) || 0,
        regime: row.regime, ctps: row.ctps, pis: row.pis, banco: row.banco,
        situacao: row.situacao, dependentes: row.dependentes || 0,
        vt: parseFloat(row.vt) || 0, vr: parseFloat(row.vr) || 0,
        va: parseFloat(row.va) || 0, saude: row.saude, odonto: row.odonto,
        segVida: row.seg_vida, av: row.av, avc: row.avc,
        ies: row.ies, curso: row.curso, supervisor: row.supervisor,
        terminoEstagio: row.termino_estagio,
        regime_contrato: row.regime_contrato || 'Indeterminado',
        ultimoReajuste: row.ultimo_reajuste, obs: row.obs,
      };
    }
    return row;
  },

  // ── Converte camelCase → snake_case para salvar colaborador ──
  _mapTo(tabela, obj) {
    if (tabela === 'colaboradores') {
      const r = {
        nome: obj.nome, cpf: obj.cpf, rg: obj.rg, nasc: obj.nasc || null,
        email: obj.email, tel: obj.tel, endereco: obj.endereco,
        genero: obj.genero, estado_civil: obj.estadoCivil, escolaridade: obj.escolaridade,
        tipo: obj.tipo, cargo: obj.cargo, cbo: obj.cbo, depto: obj.depto,
        admissao: obj.admissao || null, salario: obj.salario || 0,
        regime: obj.regime, ctps: obj.ctps, pis: obj.pis, banco: obj.banco,
        situacao: obj.situacao || 'Ativo', dependentes: obj.dependentes || 0,
        vt: obj.vt || 0, vr: obj.vr || 0, va: obj.va || 0,
        saude: obj.saude || 'Não', odonto: obj.odonto || 'Não', seg_vida: obj.segVida || 'Não',
        av: obj.av, avc: obj.avc, ies: obj.ies, curso: obj.curso,
        supervisor: obj.supervisor, termino_estagio: obj.terminoEstagio || null,
        regime_contrato: obj.regime_contrato || 'Indeterminado',
        ultimo_reajuste: obj.ultimoReajuste || null, obs: obj.obs,
        atualizado_em: new Date().toISOString(),
      };
      if (obj.id) r.id = obj.id;
      return r;
    }
    return obj;
  },

  _mapConfig(row) {
    const cfg = defaultConfig();
    if (!row) return cfg;
    cfg.salarioMinimo = parseFloat(row.salario_minimo) || cfg.salarioMinimo;
    cfg.tetoINSS      = parseFloat(row.teto_inss) || cfg.tetoINSS;
    cfg.aliqFGTS      = parseFloat(row.aliq_fgts) || cfg.aliqFGTS;
    cfg.limiteDescVT  = parseFloat(row.limite_desc_vt) || cfg.limiteDescVT;
    cfg.aliqINSSPatronal = parseFloat(row.aliq_inss_patronal) || cfg.aliqINSSPatronal;
    cfg.aliqRAT       = parseFloat(row.aliq_rat) || cfg.aliqRAT;
    cfg.aliqTerceiros = parseFloat(row.aliq_terceiros) || cfg.aliqTerceiros;
    if (row.empresa)     cfg.empresa      = typeof row.empresa === 'string' ? JSON.parse(row.empresa) : row.empresa;
    if (row.tabela_inss) cfg.tabelaINSS   = typeof row.tabela_inss === 'string' ? JSON.parse(row.tabela_inss) : row.tabela_inss;
    if (row.tabela_irrf) cfg.tabelaIRRF   = typeof row.tabela_irrf === 'string' ? JSON.parse(row.tabela_irrf) : row.tabela_irrf;
    return cfg;
  },

  // ══ GET (retorna do cache) ══
  getColabs()    { return this._cache.colaboradores || []; },
  getPontos()    { return this._cache.pontos        || []; },
  getFerias()    { return this._cache.ferias        || []; },
  getFaltas()    { return this._cache.faltas        || []; },
  getAfas()      { return this._cache.afastamentos  || []; },
  getFolhas()    { return this._cache.folhas        || []; },
  getConfig()    { return this._cache.config        || defaultConfig(); },
  getDocs()      { return this._cache.documentos    || []; },
  getAdmissoes() { return this._cache.admissoes     || []; },
  getDemissoes() { return this._cache.demissoes     || []; },

  // ══ SAVE — colaboradores (upsert) ══
  async saveColabs(lista) {
    this._cache.colaboradores = lista;
    if (!this._sb) return;
    try {
      const rows = lista.map(c => this._mapTo('colaboradores', c));
      const { error } = await this._sb.from('dp_colaboradores').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    } catch(e) { console.error('[DP] saveColabs:', e.message); UI.toast('Erro ao salvar colaboradores', 'err'); }
  },

  async saveColab(colab) {
    if (!this._sb) return null;
    try {
      const row = this._mapTo('colaboradores', colab);
      const { data, error } = colab.id
        ? await this._sb.from('dp_colaboradores').update(row).eq('id', colab.id).select().single()
        : await this._sb.from('dp_colaboradores').insert(row).select().single();
      if (error) throw error;
      const mapped = this._mapFrom('colaboradores', data);
      // Atualiza cache
      const idx = this._cache.colaboradores.findIndex(c => c.id === mapped.id);
      if (idx >= 0) this._cache.colaboradores[idx] = mapped;
      else this._cache.colaboradores.push(mapped);
      return mapped;
    } catch(e) { console.error('[DP] saveColab:', e.message); UI.toast('Erro ao salvar colaborador', 'err'); return null; }
  },

  async deleteColab(id) {
    if (!this._sb) return;
    try {
      const { error } = await this._sb.from('dp_colaboradores').delete().eq('id', id);
      if (error) throw error;
      this._cache.colaboradores = this._cache.colaboradores.filter(c => c.id !== id);
    } catch(e) { console.error('[DP] deleteColab:', e.message); UI.toast('Erro ao excluir', 'err'); }
  },

  // ══ SAVE — tabelas genéricas ══
  async _saveGeneric(tabela, lista) {
    this._cache[tabela] = lista;
    if (!this._sb) return;
    try {
      const tbl = this._tbl(tabela);
      const { error } = await this._sb.from(tbl).upsert(lista, { onConflict: 'id' });
      if (error) throw error;
    } catch(e) { console.error(`[DP] save ${tabela}:`, e.message); }
  },

  async _insertGeneric(tabela, obj) {
    if (!this._sb) return obj;
    try {
      const tbl = this._tbl(tabela);
      const { data, error } = await this._sb.from(tbl).insert(obj).select().single();
      if (error) throw error;
      if (!this._cache[tabela]) this._cache[tabela] = [];
      this._cache[tabela].push(data);
      return data;
    } catch(e) { console.error(`[DP] insert ${tabela}:`, e.message); return null; }
  },

  async savePontos(d)    { await this._saveGeneric('pontos', d); },
  async saveFerias(d)    { await this._saveGeneric('ferias', d); },
  async saveFaltas(d)    { await this._saveGeneric('faltas', d); },
  async saveAfas(d)      { await this._saveGeneric('afastamentos', d); },
  async saveFolhas(d)    { await this._saveGeneric('folhas', d); },
  async saveDocs(d)      { await this._saveGeneric('documentos', d); },
  async saveAdmissoes(d) { await this._saveGeneric('admissoes', d); },
  async saveDemissoes(d) { await this._saveGeneric('demissoes', d); },

  async saveConfig(cfg) {
    this._cache.config = cfg;
    if (!this._sb) return;
    try {
      const { error } = await this._sb.from('dp_config').upsert({
        id: 1,
        salario_minimo: cfg.salarioMinimo,
        teto_inss: cfg.tetoINSS,
        aliq_fgts: cfg.aliqFGTS,
        limite_desc_vt: cfg.limiteDescVT,
        aliq_inss_patronal: cfg.aliqINSSPatronal,
        aliq_rat: cfg.aliqRAT,
        aliq_terceiros: cfg.aliqTerceiros,
        empresa: cfg.empresa,
        tabela_inss: cfg.tabelaINSS,
        tabela_irrf: cfg.tabelaIRRF,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) throw error;
    } catch(e) { console.error('[DP] saveConfig:', e.message); }
  },

  // ══ Carrega tabela lazy (sob demanda) ══
  async loadTabela(tabela) {
    if (this._cache[tabela] !== null) return this._cache[tabela];
    await this._load(tabela);
    return this._cache[tabela] || [];
  },
};

// ══════════════════════════════════════════
// 2. CONFIGURAÇÕES / TABELAS VIGENTES 2025
// ══════════════════════════════════════════
function defaultConfig() {
  return {
    empresa: {
      razao_social: 'AGÊNCIA EXITTUS COMUNICAÇÃO LTDA',
      nome_fantasia: 'Agência Nexus',
      cnpj: '00.000.000/0001-00',
      endereco: 'Rua das Agências, 100 — Guaíba/RS',
      telefone: '(51) 0000-0000',
      email: 'dp@agenciaexittus.com.br',
    },
    salarioMinimo: 1518.00,
    tetoINSS: 8157.41,
    tabelaINSS: [
      { ate: 1518.00,  aliq: 0.075 },
      { ate: 2793.88,  aliq: 0.09  },
      { ate: 4190.83,  aliq: 0.12  },
      { ate: 8157.41,  aliq: 0.14  },
    ],
    tabelaIRRF: [
      { ate: 2259.20,  aliq: 0,     deducao: 0      },
      { ate: 2826.65,  aliq: 0.075, deducao: 169.44 },
      { ate: 3751.05,  aliq: 0.15,  deducao: 381.44 },
      { ate: 4664.68,  aliq: 0.225, deducao: 662.77 },
      { ate: 999999,   aliq: 0.275, deducao: 896.00 },
    ],
    deducaoDependente: 189.59,
    limiteIsencaoIRRF: 2259.20,
    aliqFGTS: 0.08,
    aliqFGTSAprendiz: 0.02,
    multaFGTS: 0.40,
    multaFGTSComp: 0.20,
    aliqINSSPatronal: 0.20,
    aliqRAT: 0.02,
    aliqTerceiros: 0.058,
    limiteDescVT: 0.06,
    horasDiarias: 8,
    diasUteisMedia: 22,
    horasMensais: 220,
    periodoAquisitivo: 12,
  };
}

// ══════════════════════════════════════════
// 3. DADOS SEED (apenas se o banco estiver vazio)
// ══════════════════════════════════════════
function defaultColabs() {
  return [
    { id:1, nome:'Ana Lima', cpf:'123.456.789-00', rg:'12.345.678-9', nasc:'1990-05-15', email:'ana@agenciaexittus.com.br', tel:'(51)91234-5678', endereco:'Rua A, 100', genero:'F', estadoCivil:'Solteira', escolaridade:'Superior Completo', tipo:'CLT', cargo:'Designer Sênior', cbo:'2621-05', depto:'Criação', admissao:'2022-03-01', salario:5800, regime:'44h semanais', ctps:'111111/001-RS', pis:'123.45678.90-1', banco:'Nubank', situacao:'Ativo', dependentes:0, vt:330, vr:550, va:0, saude:'Premium', odonto:'Premium', segVida:'Não', av:'AL', avc:'av-a', regime_contrato:'Indeterminado' },
    { id:2, nome:'Carlos Mendes', cpf:'987.654.321-00', rg:'98.765.432-1', nasc:'1988-11-22', email:'carlos@agenciaexittus.com.br', tel:'(51)92345-6789', endereco:'Rua B, 200', genero:'M', estadoCivil:'Casado', escolaridade:'Superior Completo', tipo:'CLT', cargo:'Dev Full Stack', cbo:'2122-05', depto:'TI', admissao:'2021-06-15', salario:7200, regime:'44h semanais', ctps:'222222/001-RS', pis:'234.56789.01-2', banco:'Itaú', situacao:'Ativo', dependentes:2, vt:330, vr:550, va:0, saude:'Premium', odonto:'Básico', segVida:'Sim', av:'CM', avc:'av-b', regime_contrato:'Indeterminado' },
    { id:3, nome:'Fernanda Costa', cpf:'456.789.123-00', rg:'45.678.912-3', nasc:'1985-03-08', email:'fernanda@agenciaexittus.com.br', tel:'(51)93456-7890', endereco:'Rua C, 300', genero:'F', estadoCivil:'Casada', escolaridade:'Pós-Graduação', tipo:'CLT', cargo:'Gerente de Projetos', cbo:'1423-05', depto:'Administrativo', admissao:'2020-01-10', salario:6500, regime:'44h semanais', ctps:'333333/001-RS', pis:'345.67890.12-3', banco:'Bradesco', situacao:'Ativo', dependentes:1, vt:264, vr:550, va:0, saude:'Premium', odonto:'Básico', segVida:'Sim', av:'FC', avc:'av-p', regime_contrato:'Indeterminado' },
  ];
}

// ══════════════════════════════════════════
// 4. CÁLCULOS TRABALHISTAS
// ══════════════════════════════════════════
const Calc = {

  inss(salBruto) {
    const cfg = DP.getConfig();
    if (salBruto <= 0) return 0;
    let total = 0, baseAnt = 0;
    for (const faixa of cfg.tabelaINSS) {
      const baseFaixa = Math.min(salBruto, faixa.ate) - baseAnt;
      if (baseFaixa <= 0) break;
      total += baseFaixa * faixa.aliq;
      baseAnt = faixa.ate;
      if (salBruto <= faixa.ate) break;
    }
    return total;
  },

  irrf(baseCalculo, numDependentes = 0) {
    const cfg = DP.getConfig();
    const baseAjustada = baseCalculo - (numDependentes * cfg.deducaoDependente);
    if (baseAjustada <= cfg.limiteIsencaoIRRF) return 0;
    for (const faixa of cfg.tabelaIRRF) {
      if (baseAjustada <= faixa.ate) {
        return Math.max(0, baseAjustada * faixa.aliq - faixa.deducao);
      }
    }
    return 0;
  },

  fgts(salBruto, tipo = 'CLT') {
    const cfg = DP.getConfig();
    if (tipo === 'Estagiário') return 0;
    return salBruto * (tipo === 'Aprendiz' ? cfg.aliqFGTSAprendiz : cfg.aliqFGTS);
  },

  descontoVT(salBase, valorVT) {
    const cfg = DP.getConfig();
    return Math.min(valorVT, salBase * cfg.limiteDescVT);
  },

  liquido(colab, extras = {}) {
    const {
      horasExtras50 = 0, horasExtras100 = 0, adicNocturno = 0,
      adicPericulosidade = false, adicInsalubridade = 0,
      outrosProventos = 0, descFaltas = 0, descVT = true,
      adiantamento = 0, outrosDescontos = 0, numDependentes = null
    } = extras;
    const cfg  = DP.getConfig();
    const deps = numDependentes !== null ? numDependentes : (colab.dependentes || 0);
    const valorHora = colab.salario / cfg.horasMensais;

    const prov_salario    = colab.salario;
    const prov_hext50     = horasExtras50  * valorHora * 1.50;
    const prov_hext100    = horasExtras100 * valorHora * 2.00;
    const prov_noturno    = adicNocturno * valorHora * 1.20;
    const prov_periculoso = adicPericulosidade ? colab.salario * 0.30 : 0;
    const prov_insalubre  = adicInsalubridade > 0 ? (cfg.salarioMinimo * (adicInsalubridade / 100)) : 0;
    const prov_outros     = outrosProventos;
    const prov_vr         = colab.vr || 0;
    const prov_vt         = colab.vt || 0;

    const totalProv = prov_salario + prov_hext50 + prov_hext100 + prov_noturno + prov_periculoso + prov_insalubre + prov_outros;

    const desc_faltas = (colab.salario / 30) * descFaltas;
    const baseINSS    = totalProv - desc_faltas;
    const desc_inss   = this.inss(baseINSS);
    const baseIRRF    = baseINSS - desc_inss;
    const desc_irrf   = this.irrf(baseIRRF, deps);
    const desc_vt     = descVT ? this.descontoVT(colab.salario, colab.vt || 0) : 0;
    const desc_adiant = adiantamento;
    const desc_outros = outrosDescontos;
    const totalDesc   = desc_faltas + desc_inss + desc_irrf + desc_vt + desc_adiant + desc_outros;
    const fgts        = this.fgts(baseINSS, colab.tipo);
    const liquido     = totalProv + prov_vr + prov_vt - totalDesc;

    return {
      proventos: { salario:prov_salario, hext50:prov_hext50, hext100:prov_hext100, noturno:prov_noturno, periculoso:prov_periculoso, insalubre:prov_insalubre, outros:prov_outros, vr:prov_vr, vt:prov_vt },
      descontos: { faltas:desc_faltas, inss:desc_inss, irrf:desc_irrf, vt:desc_vt, adiantamento:desc_adiant, outros:desc_outros },
      totalProv, totalDesc, liquido, fgts, baseINSS, baseIRRF,
    };
  },

  ferias(colab, dias = 30, abonoPecuniario = false, adiantamento13 = false, numDependentes = null) {
    const cfg  = DP.getConfig();
    const deps = numDependentes !== null ? numDependentes : (colab.dependentes || 0);
    const diasAbono    = abonoPecuniario ? 10 : 0;
    const diasEfetivos = dias - diasAbono;
    const salDiario    = colab.salario / 30;
    const prov_ferias  = salDiario * diasEfetivos;
    const prov_terco   = prov_ferias / 3;
    const prov_abono   = diasAbono > 0 ? (salDiario * diasAbono) + ((salDiario * diasAbono) / 3) : 0;
    const prov_13      = adiantamento13 ? colab.salario / 2 : 0;
    const bruto        = prov_ferias + prov_terco + prov_abono + prov_13;
    const desc_inss    = this.inss(prov_ferias + prov_terco);
    const baseIR       = (prov_ferias + prov_terco) - desc_inss;
    const desc_irrf    = this.irrf(baseIR, deps);
    return { diasEfetivos, diasAbono, prov_ferias, prov_terco, prov_abono, prov_13, bruto, desc_inss, desc_irrf, liquido: bruto - desc_inss - desc_irrf };
  },

  decimoTerceiro(colab, mesesTrabalhados = 12, parcela = '2a', numDependentes = null) {
    const deps        = numDependentes !== null ? numDependentes : (colab.dependentes || 0);
    const proporcional = colab.salario * (mesesTrabalhados / 12);
    if (parcela === '1a') return { bruto: proporcional / 2, inss: 0, irrf: 0, liquido: proporcional / 2 };
    const inss    = this.inss(proporcional);
    const base    = proporcional - inss;
    const irrf    = this.irrf(base, deps);
    const liquido2a = proporcional / 2 - inss - irrf;
    return { proporcional, bruto: proporcional / 2, desc1a: proporcional / 2, inss, irrf, liquido: Math.max(0, liquido2a) };
  },

  rescisao(colab, dataDesligamento, motivoRescisao = 'sem_justa_causa', mesesFGTS = null) {
    const cfg = DP.getConfig();
    const admissao = new Date(colab.admissao);
    const demissao = new Date(dataDesligamento);
    const mesesTotal       = ((demissao - admissao) / (1000 * 60 * 60 * 24 * 30.44));
    const mesesTrabalhados = Math.floor(mesesTotal);
    const diasUltMes       = Math.round((mesesTotal - mesesTrabalhados) * 30);
    const mesesFGTSCalc    = mesesFGTS || mesesTrabalhados;
    const saldoSalario     = (colab.salario / 30) * diasUltMes;
    const aviso            = motivoRescisao !== 'pedido_demissao' ? colab.salario : 0;
    const feriasProp       = (colab.salario / 12) * (mesesTrabalhados % 12 || 12) + (colab.salario / 12) * (mesesTrabalhados % 12 || 12) / 3;
    const decimoTerceiro   = (colab.salario / 12) * (mesesTrabalhados % 12 || 12);
    const fgtsAcumulado    = colab.salario * cfg.aliqFGTS * mesesFGTSCalc;
    const multaFGTS        = motivoRescisao !== 'pedido_demissao' && motivoRescisao !== 'justa_causa' ? fgtsAcumulado * cfg.multaFGTS : 0;
    const multaFGTSComp    = multaFGTS > 0 ? fgtsAcumulado * cfg.multaFGTSComp : 0;
    const bruto            = saldoSalario + aviso + feriasProp + decimoTerceiro;
    const inss             = this.inss(bruto);
    const irrf             = this.irrf(bruto - inss, colab.dependentes || 0);
    return { saldoSalario, aviso, feriasProp, decimoTerceiro, fgtsAcumulado, multaFGTS, multaFGTSComp, bruto, inss, irrf, liquido: bruto - inss - irrf, mesesTrabalhados, diasUltMes };
  },

  encargosPatronais(salBruto) {
    const cfg = DP.getConfig();
    return {
      inssPatronal: salBruto * cfg.aliqINSSPatronal,
      rat:          salBruto * cfg.aliqRAT,
      terceiros:    salBruto * cfg.aliqTerceiros,
      fgts:         salBruto * cfg.aliqFGTS,
      total:        salBruto * (cfg.aliqINSSPatronal + cfg.aliqRAT + cfg.aliqTerceiros + cfg.aliqFGTS),
    };
  },

  horasExtras(salario, horas, percentual = 50) {
    const cfg = DP.getConfig();
    return (salario / cfg.horasMensais) * (1 + percentual / 100) * horas;
  },

  adicionalNoturno(salario, horasNoturnas) {
    const cfg = DP.getConfig();
    return (salario / cfg.horasMensais) * 1.20 * horasNoturnas;
  },

  diasFeriasPorFaltas(faltas) {
    if (faltas === 0) return 30; if (faltas <= 5) return 24;
    if (faltas <= 14) return 18; if (faltas <= 23) return 12;
    if (faltas <= 32) return 6;  return 0;
  },

  mesesTrabalhados(admissao, referencia = new Date()) {
    return Math.floor((new Date(referencia) - new Date(admissao)) / (1000 * 60 * 60 * 24 * 30.44));
  },

  saldoBancoHoras(horasTrabalhadas, horasDevidas) {
    const diff = horasTrabalhadas - horasDevidas;
    const h = Math.floor(Math.abs(diff));
    const m = Math.round((Math.abs(diff) - h) * 60);
    return { saldo: diff, str: `${diff >= 0 ? '+' : '-'}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` };
  },
};

// ══════════════════════════════════════════
// 5. FORMATAÇÃO
// ══════════════════════════════════════════
const Fmt = {
  brl(v)     { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }); },
  num(v, d=2){ return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits:d }); },
  date(d)    { if (!d) return '—'; const [y,m,dd] = String(d).split('-'); return `${dd}/${m}/${y}`; },
  dateISO(d) { if (!d) return ''; const [dd,mm,y] = String(d).split('/'); return `${y}-${mm}-${dd}`; },
  today()    { return new Date().toISOString().slice(0,10); },
  pct(v)     { return Number(v*100).toFixed(1) + '%'; },
  cpf(v)     { const n = String(v).replace(/\D/g,''); return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'); },
  initials(nome){ const p = (nome||'?').trim().split(' '); return (p[0][0] + (p[1]?p[1][0]:'')).toUpperCase(); },
  avColor(nome) { const c = ['av-g','av-b','av-p','av-o','av-r','av-a','av-c']; return c[(nome||'A').charCodeAt(0)%c.length]; },
  mes(m)     { return ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]; },
  competencia(iso){ const [y,m]=iso.split('-'); return `${Fmt.mes(+m)}/${y}`; },
};

// ══════════════════════════════════════════
// 6. UI HELPERS
// ══════════════════════════════════════════
const UI = {
  toast(msg, type='ok') {
    const ct = document.getElementById('toast-ct') || (() => { const d=document.createElement('div'); d.id='toast-ct'; document.body.appendChild(d); return d; })();
    const t  = document.createElement('div');
    t.className = `toast ${type}`;
    const ico = { ok:'✓', err:'✗', inf:'ℹ', wrn:'⚠' };
    t.innerHTML = `<span>${ico[type]||'•'}</span><span>${msg}</span>`;
    ct.appendChild(t);
    setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateX(12px);transition:all .25s'; setTimeout(()=>t.remove(),250); }, 3200);
  },
  openModal(id)  { document.getElementById(id)?.classList.add('open'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },
  confirm(msg, cb) { if (window.confirm(msg)) cb(); },
  filtrarTabela(tbId, q) {
    q = q.toLowerCase();
    document.querySelectorAll(`#${tbId} tbody tr`).forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },
  val(id, def='') { return document.getElementById(id)?.value ?? def; },
  setVal(id, v)   { const el=document.getElementById(id); if(el) el.value = v; },
  txt(id, v)      { const el=document.getElementById(id); if(el) el.textContent = v; },
  setDate(id, val){ const el=document.getElementById(id); if(el) el.value = val || Fmt.today(); },
  renderSelect(selId, items, valKey='id', lblFn=null, placeholder='Selecione...') {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(i => `<option value="${i[valKey]}">${lblFn ? lblFn(i) : i.nome}</option>`).join('');
  },
};

// ══════════════════════════════════════════
// 7. MÁSCARAS
// ══════════════════════════════════════════
const Mask = {
  cpf(el)  { let v=el.value.replace(/\D/g,''); v=v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); el.value=v; },
  cnpj(el) { let v=el.value.replace(/\D/g,''); v=v.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2'); el.value=v; },
  tel(el)  { let v=el.value.replace(/\D/g,''); v=v.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2'); el.value=v; },
  cep(el)  { let v=el.value.replace(/\D/g,''); v=v.replace(/(\d{5})(\d{1,3})$/,'$1-$2'); el.value=v; },
  money(el){ let v=parseFloat(el.value.replace(/[^\d,]/g,'').replace(',','.'))||0; el.value=v.toFixed(2); },
  pis(el)  { let v=el.value.replace(/\D/g,''); v=v.replace(/(\d{3})(\d{5})(\d{2})(\d{1})$/,'$1.$2.$3-$4'); el.value=v; },
};

// ══════════════════════════════════════════
// 8. EXPORT
// ══════════════════════════════════════════
const Export = {
  printDiv(divId, title = '') {
    const el = document.getElementById(divId); if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>${title}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;padding:1.5rem;}table{width:100%;border-collapse:collapse;}
      th{background:#1e40af;color:#fff;padding:6px 10px;font-size:10px;}td{padding:5px 10px;border-bottom:1px solid #eee;}</style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close(); setTimeout(() => { w.print(); w.close(); }, 400);
  },
  tableToCSV(tableId, filename = 'export.csv') {
    const tb = document.getElementById(tableId); if (!tb) return;
    const csv = Array.from(tb.querySelectorAll('tr')).map(r =>
      Array.from(r.querySelectorAll('th,td')).map(c => `"${c.textContent.trim().replace(/"/g,'""')}"`).join(';')
    ).join('\n');
    this._download('\uFEFF' + csv, filename, 'text/csv;charset=utf-8;');
    UI.toast('CSV exportado!');
  },
  dataToCSV(headers, rows, filename = 'relatorio.csv') {
    const esc = v => `"${String(v).replace(/"/g,'""')}"`;
    const csv = esc + headers.map(esc).join(';') + '\n' + rows.map(r => r.map(esc).join(';')).join('\n');
    this._download('\uFEFF' + headers.map(esc).join(';') + '\n' + rows.map(r => r.map(esc).join(';')).join('\n'), filename, 'text/csv;charset=utf-8;');
    UI.toast('Planilha exportada!');
  },
  toWord(htmlContent, filename = 'documento.doc') {
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Agência Nexus</title>
      <style>body{font-family:Arial,sans-serif;font-size:11pt;}table{border-collapse:collapse;width:100%;}
      th{background:#1e40af;color:#fff;padding:6pt;}td{padding:5pt;border:1pt solid #ddd;}</style>
      </head><body>${htmlContent}</body></html>`;
    this._download('\ufeff' + html, filename, 'application/msword');
    UI.toast('Word gerado!');
  },
  _download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
  },
};

// ══════════════════════════════════════════
// 9. NAVEGAÇÃO
// ══════════════════════════════════════════
function DP_nav_init() {
  const cur = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sb-item').forEach(el => {
    const href = el.getAttribute('href');
    if (href === cur) el.classList.add('active');
  });
  const toggle = document.getElementById('sb-toggle');
  if (toggle) toggle.onclick = () => document.querySelector('.sidebar')?.classList.toggle('collapsed');
  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
  const tbDate = document.getElementById('tb-date');
  if (tbDate) {
    const update = () => tbDate.textContent = new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    update(); setInterval(update, 60000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DP_nav_init);
} else {
  DP_nav_init();
}

// ══════════════════════════════════════════
// 10. PAGINAÇÃO
// ══════════════════════════════════════════
const Paginator = {
  _state: {},
  init(id, data, renderRow, opts = {}) {
    const ps=opts.pageSize||50, tbId=opts.tbodyId||`tbody${id}`, pgId=opts.pagId||`pag${id}`, srId=opts.searchId||`search${id}`, sflds=opts.searchFields||['nome','cargo','depto'];
    this._state[id] = { data, renderRow, ps, tbId, pgId, srId, sflds, page:0, filtered:data };
    const srEl = document.getElementById(srId);
    if (srEl) srEl.addEventListener('input', e => this._search(id, e.target.value));
    this._render(id);
  },
  _search(id, query) {
    const st=this._state[id]; if(!st) return;
    const q=query.toLowerCase().trim();
    st.filtered = q ? st.data.filter(item => st.sflds.some(f => String(item[f]||'').toLowerCase().includes(q))) : st.data;
    st.page=0; this._render(id);
  },
  goTo(id, page) { const st=this._state[id]; if(!st) return; st.page=page; this._render(id); },
  _render(id) {
    const st=this._state[id]; if(!st) return;
    const { filtered, ps, page, renderRow, tbId, pgId } = st;
    const total=filtered.length, pages=Math.ceil(total/ps)||1, chunk=filtered.slice(page*ps, page*ps+ps);
    const tbody = document.getElementById(tbId);
    if (tbody) tbody.innerHTML = chunk.length===0 ? `<tr><td colspan="20"><div class="empty">🔍 Nenhum resultado</div></td></tr>` : chunk.map(renderRow).join('');
    const pgEl = document.getElementById(pgId);
    if (pgEl) {
      if (pages > 1) {
        let btns = `<button class="btn btn-sm btn-ghost" ${page===0?'disabled':''} onclick="Paginator.goTo('${id}',${page-1})">‹</button>`;
        for(let i=0;i<pages;i++) btns += `<button class="btn btn-sm ${i===page?'btn-primary':'btn-ghost'}" onclick="Paginator.goTo('${id}',${i})">${i+1}</button>`;
        btns += `<button class="btn btn-sm btn-ghost" ${page===pages-1?'disabled':''} onclick="Paginator.goTo('${id}',${page+1})">›</button>`;
        pgEl.innerHTML = `<div style="display:flex;align-items:center;gap:0.3rem;justify-content:center;padding:0.6rem 0"><span style="font-size:0.65rem;color:var(--muted)">${total} registros · Pág. ${page+1}/${pages}</span>${btns}</div>`;
      } else {
        pgEl.innerHTML = total>0 ? `<div style="text-align:center;font-size:0.65rem;color:var(--muted);padding:0.4rem">${total} registro(s)</div>` : '';
      }
    }
  },
  update(id, newData) { const st=this._state[id]; if(!st) return; st.data=newData; st.page=0; this._search(id, document.getElementById(st.srId)?.value||''); },
};

function debounce(fn, ms=300) { let t; return (...args) => { clearTimeout(t); t=setTimeout(()=>fn(...args),ms); }; }
