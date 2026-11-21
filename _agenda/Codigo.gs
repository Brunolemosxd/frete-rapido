/* Robô do Google Agenda do Mural de Fretes.
   Roda na conta Google do Bruno (dono do projeto Firebase), a cada 5 minutos. Só LÊ o mural.
   TUDO É CONFIGURADO NO PAINEL → Ajustes → "Avisos no Google Agenda" (quem recebe cada tipo de aviso, lembrete e
   horários dos turnos). Mudou lá, o robô já usa na próxima conferida: não precisa colar de novo.
   Avisos pelo Google Agenda e/ou pelo Telegram (sem e-mail, a pedido do Bruno). Botão "🔔 Enviar teste" do painel: o robô
   manda um aviso de teste e responde no painel.
   Telegram: o Bruno cria um robô no @BotFather e cola o código (token) no painel. Cada pessoa abre o link dela
   (t.me/robo?start=CODIGO) e toca em Iniciar; o robô liga o Telegram dessa pessoa (privado/telegram.ids).
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
  const av = documento('privado/avisos') || {};
  try { telegramConferir(av); } catch (err) { Logger.log('Erro no Telegram: ' + err); }
  try { testeDoPainel(av); } catch (err) { Logger.log('Erro no teste: ' + err); }
  const docs = consulta('entregas', 'atualizadoEm', desde);
  const hist = consulta('historico', 'em', desde);
  if (docs.length || hist.length) {
    const cfg = configuracao(av);
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
  if (primeiraVez && e.data >= ontem && cfg.canais.telegram) {
    const [, , turnoTxt] = horario(cfg, e);
    telegramPara(cfg, rn, e, '🚚 Nova entrega: ' + (e.cliente || '') + (e.bairro ? ' — ' + e.bairro : '') +
      (e.prioridade ? ' ⬆ PRIORIDADE' : '') + '\n📅 ' + e.data.split('-').reverse().slice(0, 2).join('/') + ' · ' + turnoTxt + '\n\n' + descricao(e));
  }
  // Agenda: SÓ na agenda do Bruno (18/11: os outros recebiam os convites por e-mail; agora eles recebem só pelo Telegram)
  if (!ev && primeiraVez && e.data >= ontem && cfg.canais.agenda && quemNova.indexOf(cfg.dono) >= 0) {
    const [ini, fim, turnoTxt] = horario(cfg, e);
    ev = cal.createEvent(tituloEntrega(e, turnoTxt), ini, fim, { description: descricao(e), location: endereco(e) });
    ev.removeAllReminders();
    ev.addPopupReminder(cfg.lembrete);
    ev.setColor(e.prioridade ? CalendarApp.EventColor.RED : CalendarApp.EventColor.BLUE);
  } else if (ev) {
    const [ini, fim, turnoTxt] = horario(cfg, e);
    const titulo = tituloEntrega(e, turnoTxt), desc = descricao(e);
    if (ev.getTitle() !== titulo) ev.setTitle(titulo);
    if (ev.getDescription() !== desc) ev.setDescription(desc);
    if (ev.getStartTime().getTime() !== ini.getTime() || ev.getEndTime().getTime() !== fim.getTime()) ev.setTime(ini, fim);
    if (e.status === 'entregue') ev.setColor(CalendarApp.EventColor.GREEN);
  }
  if (ev) reg.ev = ev.getId();

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

// Aviso na hora: evento na Agenda para quem estiver marcado no painel. Começa em 10 minutos e apita 2 vezes
// (uns 2 min e 10 min depois): se o celular demorar para baixar o evento da agenda, o 2º alarme ainda toca.
function avisar(cal, cfg, tipo, e, titulo, texto, cor) {
  const r = cfg.regras[tipo] || {};
  if (cfg.canais.telegram) telegramPara(cfg, r, e, titulo + '\n\n' + texto);
  if (!cfg.canais.agenda) return '';
  const quem = destinatarios(cfg, r, e).filter(m => m !== e._autor); // quem fez a alteração não precisa ser avisado
  return quem.length ? eventoNaHora(cal, cfg.dono, quem, titulo, texto, endereco(e), cor) : '';
}
function eventoNaHora(cal, dono, quem, titulo, texto, lugar, cor) {
  if (quem.indexOf(dono) < 0) return ''; // só na agenda do Bruno: ninguém mais é convidado (convite chegava por e-mail)
  const ini = new Date(Date.now() + 10 * 60000), fim = new Date(ini.getTime() + 15 * 60000);
  const ev = cal.createEvent(titulo, ini, fim, { description: texto, location: lugar || '' });
  ev.removeAllReminders();
  ev.addPopupReminder(8); ev.addPopupReminder(0);
  ev.setColor(cor);
  return ev.getId();
}

// 🔔 Botão "Enviar teste" do painel: grava o pedido em privado/teste; o robô cria o aviso e responde lá mesmo.
function testeDoPainel(av) {
  const t = documento('privado/teste');
  if (!t || !t.pedidoEm || (t.feitoEm || 0) >= t.pedidoEm) return;
  const canais = canaisDe(av);
  const dono = Session.getEffectiveUser().getEmail().toLowerCase();
  const para = canais.agenda ? (t.para || []).map(x => String(x).toLowerCase()).filter(Boolean) : [];
  const texto = 'Se este aviso apitou no seu celular, os avisos do mural estão funcionando. 👍\n\nAbrir o mural: ' + MURAL;
  const tg = [], erros = [];
  if (para.length) {
    try { eventoNaHora(CalendarApp.getDefaultCalendar(), dono, para, '🔔 Teste do Mural de Fretes', texto, '', CalendarApp.EventColor.YELLOW); }
    catch (err) { erros.push('Agenda: ' + String(err).slice(0, 150)); }
  }
  if (canais.telegram && av.tgToken) {
    const ids = (av._tg && av._tg.ids) || {};
    for (const n of t.nomes || []) {
      if (!ids[n]) continue;
      const r = telegramEnviar(av.tgToken, ids[n], '🔔 Teste do Mural de Fretes\n\n' + texto);
      if (r === true) tg.push(n); else erros.push('Telegram de ' + n + ': ' + r);
    }
  }
  gravar('privado/teste', { feitoEm: Date.now(), para: para, tg: tg, erro: erros.join(' · ').slice(0, 300) });
}

// ---------- ✈ Telegram ----------
function canaisDe(av) {
  const c = av.canais || {};
  return { agenda: c.agenda !== false, telegram: c.telegram !== false && !!av.tgToken };
}
function telegramApi(token, metodo, dados) {
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + metodo, { method: 'post', contentType: 'application/json',
    payload: JSON.stringify(dados || {}), muteHttpExceptions: true });
  let j = {};
  try { j = JSON.parse(r.getContentText()); } catch (err) { j = { ok: false, description: 'resposta estranha (' + r.getResponseCode() + ')' }; }
  return j;
}
function telegramEnviar(token, chat, texto) {
  const j = telegramApi(token, 'sendMessage', { chat_id: chat, text: String(texto).slice(0, 4000), disable_web_page_preview: true });
  return j.ok ? true : String(j.description || 'erro');
}
// A cada conferida: confere o código do robô e liga quem tocou em "Iniciar" pelo link do painel.
function telegramConferir(av) {
  const tg = documento('privado/telegram') || {};
  av._tg = tg;
  const token = String(av.tgToken || '').trim();
  if (!token) return;
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('tg_tok') !== token || !tg.bot) {
    const me = telegramApi(token, 'getMe');
    if (!me.ok) { gravar('privado/telegram', { bot: '', erro: 'O código do robô não funcionou: ' + (me.description || '') }); tg.bot = ''; return; }
    tg.bot = me.result.username;
    gravar('privado/telegram', { bot: tg.bot, erro: '' });
    p.setProperty('tg_tok', token); p.deleteProperty('tg_off');
  }
  const up = telegramApi(token, 'getUpdates', { offset: Number(p.getProperty('tg_off') || 0), timeout: 0, allowed_updates: ['message'] });
  if (!up.ok || !up.result.length) return;
  const ids = Object.assign({}, tg.ids || {}), cod = av.tgCod || {};
  let mudou = false;
  for (const u of up.result) {
    p.setProperty('tg_off', String(u.update_id + 1));
    const m = u.message;
    if (!m || !m.chat || !/^\/start/.test(m.text || '')) continue;
    const c = (m.text.split(' ')[1] || '').trim();
    const nome = Object.keys(cod).find(n => cod[n] && cod[n] === c);
    if (nome) {
      ids[nome] = String(m.chat.id); mudou = true;
      telegramEnviar(token, m.chat.id, '✅ Pronto, ' + nome + '! Os avisos do Mural de Fretes vão chegar aqui.\n\nDeixe as notificações do Telegram ligadas.');
    } else telegramEnviar(token, m.chat.id, 'Para receber os avisos do Mural de Fretes, abra o link que o Bruno mandou para você.');
  }
  if (mudou) { gravar('privado/telegram', { ids: ids }); tg.ids = ids; }
}
// manda a mensagem para quem está marcado na regra e tem o Telegram ligado (quem fez a mudança não recebe)
function telegramPara(cfg, regra, e, texto) {
  const ids = cfg.tg.ids || {};
  const nomes = [];
  for (const n of (regra && regra.pessoas) || []) {
    if (n === CRIADOR) {
      const m = (e.criadoPorEmail || cfg.usuarios[String(e.criadoPorNome || '').toLowerCase()] || '').toLowerCase();
      if (m) Object.keys(cfg.emails).filter(x => cfg.emails[x] === m).forEach(x => nomes.push(x));
    } else nomes.push(n);
  }
  const feitos = {};
  for (const n of nomes) {
    const m = cfg.emails[n] || '';
    if (!ids[n] || feitos[ids[n]] || (m && (cfg.inativos[m] || m === e._autor))) continue;
    feitos[ids[n]] = true;
    const r = telegramEnviar(cfg.tgToken, ids[n], texto);
    if (r !== true) Logger.log('Telegram de ' + n + ': ' + r);
  }
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
function configuracao(av) {
  const d = av || documento('privado/avisos') || {};
  const emails = {};
  for (const [n, m] of Object.entries(Object.assign({}, d.problemas || {}, d.emails || {}))) if (m) emails[n] = String(m).toLowerCase();
  let regras = d.regras;
  if (!regras) { // lista antiga (antes da personalização)
    regras = { nova: { pessoas: Object.keys(d.emails || {}), agenda: true } };
    regras['problema:__outro'] = { pessoas: Object.keys(d.problemas || {}), agenda: true };
  }
  const usuarios = {}, inativos = {};
  for (const u of lista('usuarios')) {
    if (u.nome) usuarios[String(u.nome).toLowerCase()] = u.id.toLowerCase();
    if (u.ativo === false) inativos[u.id.toLowerCase()] = true; // desativado em Pessoas (ex.: saiu da loja): não recebe nada
  }
  return { emails, regras, usuarios, inativos, canais: canaisDe(d), tgToken: d.tgToken || '', tg: d._tg || {}, dono: Session.getEffectiveUser().getEmail().toLowerCase(),
    lembrete: Number(d.lembrete) >= 0 && d.lembrete !== undefined && d.lembrete !== null ? Number(d.lembrete) : 30,
    turnos: Object.assign({}, TURNOS_PADRAO, d.turnos || {}) };
}
function destinatarios(cfg, regra, e) {
  const out = [];
  for (const n of (regra && regra.pessoas) || []) {
    let m = '';
    if (n === CRIADOR) m = (e.criadoPorEmail || cfg.usuarios[String(e.criadoPorNome || '').toLowerCase()] || '').toLowerCase();
    else m = cfg.emails[n] || '';
    if (m && !cfg.inativos[m] && out.indexOf(m) < 0) out.push(m);
  }
  return out;
}
function semDono(cfg, l) { return l.filter(m => m !== cfg.dono); }

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
    e.soCaminhao ? '🚛 A nota vai vir só no caminhão (não entregar ainda)' : '',
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
// grava campos num documento (como dono do projeto): resposta do teste e dados do Telegram (privado/...).
function gravar(caminho, campos) {
  const mask = Object.keys(campos).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = UrlFetchApp.fetch(BASE + '/' + caminho + '?' + mask, { method: 'patch', contentType: 'application/json',
    payload: JSON.stringify({ fields: paraFirestore(campos) }), headers: cabecalho(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) Logger.log('Não consegui gravar ' + caminho + ': ' + r.getContentText().slice(0, 200));
}
function paraFirestore(o) {
  const f = {};
  for (const k of Object.keys(o)) {
    const v = o[k];
    f[k] = typeof v === 'number' ? { integerValue: String(Math.round(v)) } : Array.isArray(v) ? { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } }
      : v && typeof v === 'object' ? { mapValue: { fields: paraFirestore(v) } } : { stringValue: String(v == null ? '' : v) };
  }
  return f;
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
