/* Robô do Google Agenda do Mural de Fretes.
   Roda na conta Google do Bruno (dono do projeto Firebase), a cada 5 minutos. Só LÊ o mural.
   TUDO É CONFIGURADO NO PAINEL → Ajustes → "Avisos no Google Agenda" (quem recebe cada tipo de aviso, Agenda e/ou
   e-mail na hora, lembrete e horários dos turnos). Mudou lá, o robô já usa na próxima conferida: não precisa colar de novo.
   Tipos de aviso:
   - 🚚 Entrega nova: evento no dia e turno da entrega (muda junto se mudar no mural; ✅ quando entregue; some se apagada)
   - ✅ Entrega concluída, ✏ Alguém alterou uma entrega, ⚠ Problema (por motivo): aviso na hora
   Passo a passo em LEIA-ME.md. */

const PROJETO = 'frete-rapido-5516e';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJETO + '/databases/(default)/documents';
const MURAL = 'https://brunolemosxd.github.io/frete-rapido/';
const CRIADOR = '__criador';
const TURNOS_PADRAO = { manha: ['08:00', '12:00'], tarde: ['13:00', '18:00'], qualquer: ['08:00', '18:00'] };
const NOME_TURNO = { manha: 'Manhã', tarde: 'Tarde', qualquer: 'Qualquer turno' };

// Rode UMA vez (escolha "instalar" e toque em Executar): liga o robô a cada 5 minutos.
function instalar() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verificar').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('limparApagadas').timeBased().everyDays(1).atHour(6).create();
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('ultima')) p.setProperty('ultima', String(Date.now() - 2 * 864e5)); // pega as dos últimos 2 dias
  verificar();
  Logger.log('Robô ligado. Ele confere o mural a cada 5 minutos.');
}

// Para desligar o robô.
function desligar() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Robô desligado.');
}

// Confere o que mudou desde a última vez (lê só o que mudou, para gastar pouco do plano grátis).
function verificar() {
  const p = PropertiesService.getScriptProperties();
  migrarRegistro(p);
  // folga de 10 min: o relógio de algum celular pode estar atrasado (o que já foi avisado não repete)
  const desde = Number(p.getProperty('ultima') || Date.now() - 864e5) - 10 * 60000;
  const agora = Date.now();
  const vistos = JSON.parse(p.getProperty('hvistos') || '[]');
  const docs = consulta('entregas', 'atualizadoEm', desde);
  const hist = consulta('historico', 'em', desde);
  if (docs.length || hist.length) {
    const cfg = configuracao();
    const cal = CalendarApp.getDefaultCalendar();
    for (const e of docs) {
      const reg = JSON.parse(p.getProperty('e_' + e.id) || '{}');
      try { tratarEntrega(cal, cfg, e, reg); } catch (err) { Logger.log('Erro na entrega ' + e.id + ': ' + err); }
      p.setProperty('e_' + e.id, JSON.stringify(reg));
    }
    for (const h of hist) {
      if (vistos.indexOf(h.id) >= 0) continue;
      vistos.push(h.id);
      try { tratarAlteracao(cal, cfg, h); } catch (err) { Logger.log('Erro no histórico ' + h.id + ': ' + err); }
    }
    p.setProperty('hvistos', JSON.stringify(vistos.slice(-300)));
  }
  p.setProperty('ultima', String(agora));
}

// ---------- uma entrega que mudou ----------
function tratarEntrega(cal, cfg, e, reg) {
  if (!e.data) return;
  const ontem = Utilities.formatDate(new Date(Date.now() - 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const primeiraVez = !reg.visto;
  reg.visto = true; reg.d = e.data;

  // 🚚 entrega nova: evento no dia e turno da entrega
  const rn = cfg.regras.nova || {};
  const quemNova = destinatarios(cfg, rn, e);
  let ev = reg.ev ? cal.getEventById(reg.ev) : null;
  if (!ev && primeiraVez && e.data >= ontem && rn.agenda !== false && quemNova.length) {
    const [ini, fim, turnoTxt] = horario(cfg, e);
    ev = cal.createEvent(tituloEntrega(e, turnoTxt), ini, fim, { description: descricao(e), location: endereco(e),
      guests: semDono(cfg, quemNova).join(','), sendInvites: semDono(cfg, quemNova).length > 0 });
    ev.removeAllReminders();
    if (quemNova.indexOf(cfg.dono) >= 0) ev.addPopupReminder(cfg.lembrete);
    ev.setColor(e.prioridade ? CalendarApp.EventColor.RED : CalendarApp.EventColor.BLUE);
  } else if (ev) {
    const [ini, fim, turnoTxt] = horario(cfg, e);
    const titulo = tituloEntrega(e, turnoTxt), desc = descricao(e);
    if (ev.getTitle() !== titulo) ev.setTitle(titulo);
    if (ev.getDescription() !== desc) ev.setDescription(desc);
    if (ev.getStartTime().getTime() !== ini.getTime() || ev.getEndTime().getTime() !== fim.getTime()) ev.setTime(ini, fim);
    const ja = ev.getGuestList().map(g => g.getEmail().toLowerCase());
    semDono(cfg, quemNova).filter(m => ja.indexOf(m) < 0).forEach(m => ev.addGuest(m));
    if (e.status === 'entregue') ev.setColor(CalendarApp.EventColor.GREEN);
  }
  if (ev) reg.ev = ev.getId();
  if (primeiraVez && rn.email && e.data >= ontem)
    email(quemNova, '🚚 Nova entrega: ' + (e.cliente || '') + (e.bairro ? ' — ' + e.bairro : ''), descricao(e));

  // ✅ entrega concluída (só quando muda para entregue)
  if (e.status === 'entregue' && reg.st && reg.st !== 'entregue')
    avisar(cal, cfg, 'entregue', e, '✅ Entregue: ' + (e.cliente || 'Entrega') + (e.carregadoPor ? ' (por ' + e.carregadoPor + ')' : ''), descricao(e), CalendarApp.EventColor.GREEN);

  // ⚠ problema (um aviso por motivo; resolvido = "✔ Resolvido")
  const motivo = e.obs || 'Problema na entrega';
  if (e.status === 'problema' && reg.pb !== motivo) {
    const velho = reg.pev ? cal.getEventById(reg.pev) : null;
    if (velho && velho.getTitle().indexOf('⚠') === 0) velho.setTitle('↺ Trocado — ' + velho.getTitle().replace(/^⚠ /, ''));
    const tipo = cfg.regras['problema:' + motivo] ? 'problema:' + motivo : 'problema:__outro';
    reg.pev = avisar(cal, cfg, tipo, e, '⚠ Problema: ' + (e.cliente || 'Entrega') + ' — ' + motivo, 'Problema: ' + motivo + '\n\n' + descricao(e), CalendarApp.EventColor.ORANGE) || '';
    reg.pb = motivo;
  } else if (e.status !== 'problema' && reg.pb) {
    const ev2 = reg.pev ? cal.getEventById(reg.pev) : null;
    if (ev2 && ev2.getTitle().indexOf('✔ Resolvido') !== 0) ev2.setTitle('✔ Resolvido — ' + ev2.getTitle().replace(/^⚠ /, ''));
    delete reg.pev; delete reg.pb;
  }
  reg.st = e.status;
}

// ---------- ✏ alguém alterou (vem do histórico que o mural grava) ----------
function tratarAlteracao(cal, cfg, h) {
  if (!/Alterou|Apagou|Voltou para pendente/.test(h.acao || '')) return; // lançou/entregue/problema têm aviso próprio
  const mud = (h.mudancas || []).map(m => '• ' + m.campo + ': ' + m.antes + ' → ' + m.depois).join('\n');
  const texto = (h.por || 'Alguém') + ' — ' + h.acao + '\nCliente: ' + (h.cliente || '') + (h.dia ? '\nEntrega do dia: ' + h.dia.split('-').reverse().join('/') : '') +
    (mud ? '\n\n' + mud : '') + '\n\nAbrir o mural: ' + MURAL;
  const e = { cliente: h.cliente, criadoPorEmail: '', _autor: String(h.porEmail || '').toLowerCase() };
  // quem lançou a nota: procura a entrega para saber
  const ent = documento('entregas/' + h.entregaId);
  if (ent) { e.criadoPorEmail = ent.criadoPorEmail || ''; e.criadoPorNome = ent.criadoPorNome || ''; }
  avisar(cal, cfg, 'alteracao', e, '✏ ' + (h.por || 'Alguém') + ' ' + String(h.acao).toLowerCase() + ': ' + (h.cliente || ''), texto, CalendarApp.EventColor.GRAY);
}

// Aviso na hora: evento que apita em 2 minutos (📅) e/ou e-mail (📧), para quem estiver marcado no painel.
function avisar(cal, cfg, tipo, e, titulo, texto, cor) {
  const r = cfg.regras[tipo] || {};
  const quem = destinatarios(cfg, r, e).filter(m => m !== e._autor); // quem fez a alteração não precisa ser avisado
  if (!quem.length) return '';
  let id = '';
  if (r.agenda !== false) {
    const ini = new Date(Date.now() + 2 * 60000), fim = new Date(ini.getTime() + 15 * 60000);
    const convidados = semDono(cfg, quem);
    const ev = cal.createEvent(titulo, ini, fim, { description: texto, location: endereco(e), guests: convidados.join(','), sendInvites: convidados.length > 0 });
    ev.removeAllReminders();
    if (quem.indexOf(cfg.dono) >= 0) ev.addPopupReminder(0);
    ev.setColor(cor);
    id = ev.getId();
  }
  if (r.email) email(quem, titulo, texto);
  return id;
}

// Uma vez por dia: apaga da Agenda as entregas que foram apagadas do mural e esquece as muito antigas.
function limparApagadas() {
  const p = PropertiesService.getScriptProperties();
  migrarRegistro(p);
  const limite = Utilities.formatDate(new Date(Date.now() - 60 * 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const cal = CalendarApp.getDefaultCalendar();
  const todas = p.getProperties();
  for (const k of Object.keys(todas)) {
    if (k.indexOf('e_') !== 0) continue;
    const reg = JSON.parse(todas[k] || '{}');
    if (reg.d && reg.d < limite) { p.deleteProperty(k); continue; }
    const r = UrlFetchApp.fetch(BASE + '/entregas/' + encodeURIComponent(k.slice(2)), { headers: cabecalho(), muteHttpExceptions: true });
    if (r.getResponseCode() === 404) {
      [reg.ev, reg.pev].forEach(id => { const ev = id ? cal.getEventById(id) : null; if (ev) ev.deleteEvent(); });
      p.deleteProperty(k);
    }
  }
}

// ---------- configuração do painel ----------
function configuracao() {
  const d = documento('privado/avisos') || {};
  const emails = {};
  for (const [n, m] of Object.entries(Object.assign({}, d.problemas || {}, d.emails || {}))) if (m) emails[n] = String(m).toLowerCase();
  let regras = d.regras;
  if (!regras) { // lista antiga (antes da personalização)
    regras = { nova: { pessoas: Object.keys(d.emails || {}), agenda: true } };
    regras['problema:__outro'] = { pessoas: Object.keys(d.problemas || {}), agenda: true };
  }
  const usuarios = {};
  for (const u of lista('usuarios')) if (u.nome) usuarios[String(u.nome).toLowerCase()] = u.id.toLowerCase();
  return { emails, regras, usuarios, dono: Session.getEffectiveUser().getEmail().toLowerCase(),
    lembrete: Number(d.lembrete) >= 0 && d.lembrete !== undefined && d.lembrete !== null ? Number(d.lembrete) : 30,
    turnos: Object.assign({}, TURNOS_PADRAO, d.turnos || {}) };
}
function destinatarios(cfg, regra, e) {
  const out = [];
  for (const n of (regra && regra.pessoas) || []) {
    let m = '';
    if (n === CRIADOR) m = (e.criadoPorEmail || cfg.usuarios[String(e.criadoPorNome || '').toLowerCase()] || '').toLowerCase();
    else m = cfg.emails[n] || '';
    if (m && out.indexOf(m) < 0) out.push(m);
  }
  return out;
}
function semDono(cfg, l) { return l.filter(m => m !== cfg.dono); }
function email(para, assunto, texto) {
  if (!para.length) return;
  try {
    if (MailApp.getRemainingDailyQuota() < para.length) { Logger.log('Limite de e-mails do dia acabou'); return; }
    MailApp.sendEmail({ to: para.join(','), subject: assunto, body: texto + '\n\n— Mural de Fretes' });
  } catch (err) { Logger.log('Erro no e-mail: ' + err); }
}

// ---------- ajudantes ----------
function horario(cfg, e) {
  const [a, m, d] = e.data.split('-').map(Number);
  const hm = t => String(t || '0:0').split(':').map(Number);
  if (e.turno === 'apos' && /^\d{1,2}:\d{2}$/.test(e.hora || '')) {
    const [h, mi] = hm(e.hora);
    return [new Date(a, m - 1, d, h, mi), new Date(a, m - 1, d, h + 1, mi), 'depois das ' + e.hora];
  }
  const k = cfg.turnos[e.turno] ? e.turno : 'qualquer';
  const [h1, m1] = hm(cfg.turnos[k][0]), [h2, m2] = hm(cfg.turnos[k][1]);
  return [new Date(a, m - 1, d, h1, m1), new Date(a, m - 1, d, h2, m2), NOME_TURNO[k]];
}
function tituloEntrega(e, turnoTxt) {
  const marca = e.status === 'entregue' ? '✅ ' : e.status === 'problema' ? '⚠ ' : e.prioridade ? '⬆ ' : '';
  return marca + '🚚 ' + (e.cliente || 'Entrega') + (e.bairro ? ' — ' + e.bairro : '') + ' (' + turnoTxt + ')';
}
function endereco(e) { return [e.endereco, e.complemento, e.bairro].filter(Boolean).join(' - '); }
function descricao(e) {
  const itens = (e.itens || []).map(i => (typeof i === 'string' ? i : ((i.qtd > 1 ? i.qtd + '× ' : '') + i.nome + (i.local ? ' (' + (i.local === 'deposito' ? 'Depósito' : 'Loja') + ')' : '')))).join(', ');
  return [
    'Cliente: ' + (e.cliente || ''),
    e.fone ? 'Telefone: ' + e.fone : '',
    'Endereço: ' + endereco(e),
    itens ? 'Produtos: ' + itens : '',
    e.aguardaCaminhao ? '🚛 Aguardando outra nota do caminhão (não entregar ainda)' : '',
    e.observacao ? 'Obs.: ' + e.observacao : '',
    e.carregadoPor ? 'Quem carregou: ' + e.carregadoPor : '',
    e.criadoPorNome ? 'Lançada por: ' + e.criadoPorNome : ''
  ].filter(Boolean).join('\n') + '\n\nAbrir o mural: ' + MURAL;
}
// versão anterior guardava tudo numa propriedade só ("eventos"), que tem limite de tamanho: passa para uma por entrega
function migrarRegistro(p) {
  const velho = p.getProperty('eventos');
  if (!velho) return;
  const ev = JSON.parse(velho || '{}'), novo = {};
  for (const id of Object.keys(ev)) novo['e_' + id] = JSON.stringify(Object.assign({ visto: true }, ev[id]));
  if (Object.keys(novo).length) p.setProperties(novo);
  p.deleteProperty('eventos');
}
// X-Goog-User-Project: a leitura conta no projeto do Firebase (sem isso o Google pode reclamar de API não ativada)
function cabecalho() { return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': PROJETO }; }
function consulta(colecao, campo, desde) {
  const q = { from: [{ collectionId: colecao }], where: { fieldFilter: { field: { fieldPath: campo }, op: 'GREATER_THAN', value: { integerValue: String(desde) } } }, limit: 300 };
  const r = UrlFetchApp.fetch(BASE + ':runQuery', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ structuredQuery: q }), headers: cabecalho(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Firestore respondeu ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText()).filter(x => x.document).map(x => doc(x.document));
}
function documento(caminho) {
  const r = UrlFetchApp.fetch(BASE + '/' + caminho, { headers: cabecalho(), muteHttpExceptions: true });
  return r.getResponseCode() === 200 ? doc(JSON.parse(r.getContentText())) : null;
}
function lista(colecao) {
  const r = UrlFetchApp.fetch(BASE + '/' + colecao + '?pageSize=300', { headers: cabecalho(), muteHttpExceptions: true });
  return r.getResponseCode() === 200 ? (JSON.parse(r.getContentText()).documents || []).map(doc) : [];
}
function doc(d) { const o = valor({ mapValue: d }); o.id = d.name.split('/').pop(); return o; }
// converte o formato do Firestore (stringValue, integerValue...) em objeto normal
function valor(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor);
  if ('mapValue' in v) { const o = {}; const f = v.mapValue.fields || {}; for (const k in f) o[k] = valor(f[k]); return o; }
  return null;
}
