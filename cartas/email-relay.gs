// ═══════════════════════════════════════════════════════════════════
// EMAIL RELAY — Agência Nexus · Google Apps Script
// ═══════════════════════════════════════════════════════════════════
// COMO USAR:
//   1. Acesse script.google.com e crie um novo projeto
//   2. Cole este código inteiro
//   3. Clique em "Implantar" → "Nova implantação"
//   4. Tipo: "App da Web"
//   5. Executar como: Eu (sua conta Google)
//   6. Quem tem acesso: Qualquer pessoa
//   7. Copie a URL gerada e colte em novo-contrato.html e assinar.html
//      onde está: const APPS_SCRIPT_URL = 'COLE_AQUI';
// ═══════════════════════════════════════════════════════════════════

const ADMIN_EMAILS = ['adm@agencianexus.com', 'bancodetalentosnexus@gmail.com'];
const FROM_NAME    = 'Agência Nexus';
const BASE_URL     = 'https://agencianexus.github.io/cartas/';

// ── Ponto de entrada POST ────────────────────────────────────────
function doPost(e) {
  try {
    const tipo        = e.parameter.tipo        || '';
    const para        = e.parameter.para        || '';
    const nome        = e.parameter.nome        || '';
    const titulo      = e.parameter.titulo      || '';
    const url         = e.parameter.url         || '';
    const contratoId  = e.parameter.contrato_id || '';
    const sigJson     = e.parameter.signatarios || '[]';

    if (tipo === 'convite') {
      enviarConvite(para, nome, titulo, url);
    } else if (tipo === 'conclusao') {
      enviarConclusao(titulo, url, contratoId, sigJson);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('ERRO: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Health-check simples (GET)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', version: '2.0', from: FROM_NAME }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── E-mail de convite para signatário ────────────────────────────
function enviarConvite(para, nome, titulo, url) {
  const assunto = '✍️ Assinatura solicitada: ' + titulo;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)">
    <div style="background:linear-gradient(135deg,#3a5a0a,#1e40af,#5a8a18);padding:1.6rem 1.5rem;text-align:center">
      <div style="font-size:1.15rem;font-weight:800;color:#fff">Agência <span style="color:#d4f47c">Nexus</span></div>
      <div style="font-size:.65rem;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:2px;margin-top:.2rem">Assinatura Digital de Documentos</div>
    </div>
    <div style="background:#fff;padding:2rem 1.5rem">
      <p style="margin:0 0 1rem;font-size:.95rem;color:#1a1a1a">Olá, <strong>${nome}</strong>!</p>
      <p style="color:#555;line-height:1.7;margin:0 0 1.5rem;font-size:.88rem">
        Você foi convidado(a) a assinar o seguinte documento:
      </p>
      <div style="background:#f0f9e6;border-left:4px solid #60a5fa;border-radius:0 8px 8px 0;padding:.9rem 1.1rem;margin-bottom:1.5rem">
        <strong style="color:#1a1a1a;font-size:.95rem">${titulo}</strong>
      </div>
      <div style="text-align:center;margin:2rem 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#60a5fa);color:#fff;text-decoration:none;padding:.9rem 2.5rem;border-radius:10px;font-weight:800;font-size:.95rem;box-shadow:0 4px 16px rgba(30,64,175,.35)">
          ✍️ Ler e Assinar Documento
        </a>
      </div>
      <div style="background:#f9f9f7;border:1px solid #e0e0d8;border-radius:8px;padding:.8rem 1rem;font-size:.75rem;color:#666;line-height:1.7">
        🔒 <strong>Este link é pessoal e intransferível.</strong><br/>
        Sua assinatura será registrada com data, hora e endereço IP.<br/>
        Validade jurídica: Lei nº 14.063/2020 — Assinatura Eletrônica Simples.
      </div>
      <p style="font-size:.68rem;color:#aaa;margin:1rem 0 0;word-break:break-all">
        Link direto: ${url}
      </p>
    </div>
    <div style="background:#f4f9ee;border-top:1px solid #d0e4b0;padding:.8rem 1.5rem;text-align:center;font-size:.65rem;color:#888">
      Agência Nexus Comunicação Ltda · Guaíba/RS · adm@agencianexus.com
    </div>
  </div>`;

  const plain = 'Olá ' + nome + ', você foi convidado(a) a assinar "' + titulo + '".\n\nAcesse: ' + url + '\n\nAgência Nexus';

  GmailApp.sendEmail(para, assunto, plain, {
    htmlBody: html,
    name: FROM_NAME,
    replyTo: 'adm@agencianexus.com'
  });

  Logger.log('Convite enviado para: ' + para);
}

// ── E-mail de conclusão para admins ──────────────────────────────
function enviarConclusao(titulo, urlDoc, contratoId, signatariosJson) {
  let sigs = [];
  try { sigs = JSON.parse(signatariosJson); } catch(e) {}

  const papelLabel = {
    candidato: 'Candidato/Colaborador',
    empresa_nexus: 'Agência Nexus',
    empresa_cliente: 'Empresa Contratante',
    instituicao: 'Instituição de Ensino',
    supervisor: 'Supervisor/Responsável'
  };

  const linhas = sigs.map(function(s) {
    return '<tr style="border-bottom:1px solid #f0f0f0">' +
      '<td style="padding:.5rem .8rem;font-size:.8rem;font-weight:700;color:#1a1a1a">' + s.nome + '</td>' +
      '<td style="padding:.5rem .8rem;font-size:.8rem;color:#555">' + (papelLabel[s.papel] || s.papel) + '</td>' +
      '<td style="padding:.5rem .8rem;font-size:.78rem;color:#2e7d32">✅ ' + (s.data || 'Assinado') + '</td>' +
    '</tr>';
  }).join('');

  const assunto = '✅ Todos assinaram: ' + titulo;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)">
    <div style="background:linear-gradient(135deg,#2e7d32,#1e40af);padding:1.6rem 1.5rem;text-align:center">
      <div style="font-size:2rem;margin-bottom:.4rem">🎉</div>
      <div style="font-size:1.1rem;font-weight:800;color:#fff">Contrato 100% Assinado!</div>
      <div style="font-size:.7rem;color:rgba(255,255,255,.8);margin-top:.3rem">Agência Nexus — Sistema de Assinatura Digital</div>
    </div>
    <div style="background:#fff;padding:2rem 1.5rem">
      <p style="margin:0 0 .6rem;font-size:.9rem;color:#555">O seguinte contrato foi assinado por <strong>todas as partes</strong>:</p>
      <div style="background:#f0f9e6;border-left:4px solid #60a5fa;border-radius:0 8px 8px 0;padding:.9rem 1.1rem;margin:0 0 1.5rem;font-size:1rem;font-weight:800;color:#1a1a1a">
        ${titulo}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;border:1px solid #e0e0d8;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f0f9e6">
            <th style="padding:.5rem .8rem;font-size:.65rem;text-align:left;text-transform:uppercase;letter-spacing:.8px;color:#555">Signatário</th>
            <th style="padding:.5rem .8rem;font-size:.65rem;text-align:left;text-transform:uppercase;letter-spacing:.8px;color:#555">Papel</th>
            <th style="padding:.5rem .8rem;font-size:.65rem;text-align:left;text-transform:uppercase;letter-spacing:.8px;color:#555">Status</th>
          </tr>
        </thead>
        <tbody>${linhas || '<tr><td colspan="3" style="padding:.8rem;color:#aaa;font-size:.8rem">—</td></tr>'}</tbody>
      </table>
      <div style="text-align:center;margin:1.5rem 0">
        <a href="${urlDoc}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#60a5fa);color:#fff;text-decoration:none;padding:.9rem 2rem;border-radius:10px;font-weight:800;font-size:.9rem;box-shadow:0 4px 16px rgba(30,64,175,.3)">
          📄 Ver e Baixar Documento Assinado
        </a>
      </div>
      <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:8px;padding:.75rem 1rem;font-size:.75rem;color:#795548;line-height:1.7;text-align:center">
        ⏰ <strong>Atenção:</strong> O documento ficará destacado no sistema por 5 horas. Faça o download do PDF agora.
      </div>
    </div>
    <div style="background:#f4f9ee;border-top:1px solid #d0e4b0;padding:.8rem 1.5rem;text-align:center;font-size:.65rem;color:#888">
      Agência Nexus Comunicação Ltda · Guaíba/RS · adm@agencianexus.com
    </div>
  </div>`;

  const plain = 'CONTRATO ASSINADO: "' + titulo + '"\n\nBaixe o documento: ' + urlDoc + '\n\nAgência Nexus';

  ADMIN_EMAILS.forEach(function(email) {
    GmailApp.sendEmail(email, assunto, plain, {
      htmlBody: html,
      name: FROM_NAME
    });
    Logger.log('Notificação enviada para admin: ' + email);
  });
}
