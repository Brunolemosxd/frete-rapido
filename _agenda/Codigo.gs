/* Robô do Google Agenda do Mural de Fretes.
   Roda na conta Google do Bruno (dono do projeto Firebase), a cada 5 minutos.
   Cada entrega nova vira um evento na Agenda do Bruno, com os freteiros convidados (lista do painel → Ajustes →
   "Avisos no Google Agenda"). Se a entrega muda de dia/turno, o evento muda junto; entregue ganha ✅; apagada some.
   Não mexe em nada no mural: só lê. Passo a passo em LEIA-ME.md. */

const PROJETO = 'frete-rapido-5516e';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJETO + '/databases/(default)/documents';
const MURAL = 'https://brunolemosxd.github.io/frete-rapido/';
const TURNOS = { manha: [8, 0, 12, 0, 'Manhã'], tarde: [13, 0, 18, 0, 'Tarde'], qualquer: [8, 0, 18, 0, 'Qualquer turno'] };

// Rode UMA vez (botão Executar com "instalar" escolhido): liga o robô a cada 5 minutos.
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

// Confere as entregas que mudaram desde a última vez (lê só elas, para gastar pouco do plano grátis).
function verificar() {
  const p = PropertiesService.getScriptProperties();
  const desde = Number(p.getProperty('ultima') || Date.now() - 864e5);
  const agora = Date.now();
  const docs = consulta({
    from: [{ collectionId: 'entregas' }],
    where: { fieldFilter: { field: { fieldPath: 'atualizadoEm' }, op: 'GREATER_THAN', value: { integerValue: String(desde) } } },
    limit: 300
  });
  if (!docs.length) { p.setProperty('ultima', String(agora)); return; }
  const emails = convidados();
  const eventos = JSON.parse(p.getProperty('eventos') || '{}');
  const cal = CalendarApp.getDefaultCalendar();
  for (const e of docs) {
    try { sincronizar(cal, e, eventos, emails); } catch (err) { Logger.log('Erro na entrega ' + e.id + ': ' + err); }
  }
  p.setProperty('eventos', JSON.stringify(eventos));
  p.setProperty('ultima', String(agora));
}

// Cria ou atualiza o evento de uma entrega.
function sincronizar(cal, e, eventos, emails) {
  if (!e.data) return;
  const hojeTxt = Utilities.formatDate(new Date(Date.now() - 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const reg = eventos[e.id];
  let ev = reg ? cal.getEventById(reg.ev) : null;
  if (!ev && e.data < hojeTxt) return; // entrega velha sem evento: deixa quieto
  const [ini, fim, turnoTxt] = horario(e);
  const marca = e.status === 'entregue' ? '✅ ' : e.status === 'problema' ? '⚠ ' : e.prioridade ? '⬆ ' : '';
  const titulo = marca + '🚚 ' + (e.cliente || 'Entrega') + (e.bairro ? ' — ' + e.bairro : '') + ' (' + turnoTxt + ')';
  const desc = descricao(e);
  if (!ev) {
    ev = cal.createEvent(titulo, ini, fim, { description: desc, location: endereco(e), guests: emails.join(','), sendInvites: emails.length > 0 });
    ev.removeAllReminders(); ev.addPopupReminder(30);
    ev.setColor(e.prioridade ? CalendarApp.EventColor.RED : CalendarApp.EventColor.BLUE);
  } else {
    if (ev.getTitle() !== titulo) ev.setTitle(titulo);
    if (ev.getDescription() !== desc) ev.setDescription(desc);
    if (ev.getStartTime().getTime() !== ini.getTime() || ev.getEndTime().getTime() !== fim.getTime()) ev.setTime(ini, fim);
    const ja = ev.getGuestList().map(g => g.getEmail().toLowerCase());
    emails.filter(m => ja.indexOf(m) < 0).forEach(m => ev.addGuest(m));
    if (e.status === 'entregue') ev.setColor(CalendarApp.EventColor.GREEN);
  }
  eventos[e.id] = { ev: ev.getId(), d: e.data };
}

// Uma vez por dia: apaga da Agenda as entregas que foram apagadas do mural e esquece as muito antigas.
function limparApagadas() {
  const p = PropertiesService.getScriptProperties();
  const eventos = JSON.parse(p.getProperty('eventos') || '{}');
  const limite = Utilities.formatDate(new Date(Date.now() - 60 * 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const cal = CalendarApp.getDefaultCalendar();
  for (const id of Object.keys(eventos)) {
    if (eventos[id].d < limite) { delete eventos[id]; continue; }
    const r = UrlFetchApp.fetch(BASE + '/entregas/' + encodeURIComponent(id), { headers: cabecalho(), muteHttpExceptions: true });
    if (r.getResponseCode() === 404) {
      const ev = cal.getEventById(eventos[id].ev);
      if (ev) ev.deleteEvent();
      delete eventos[id];
    }
  }
  p.setProperty('eventos', JSON.stringify(eventos));
}

// ---------- ajudantes ----------
function horario(e) {
  const [a, m, d] = e.data.split('-').map(Number);
  if (e.turno === 'apos' && /^\d{1,2}:\d{2}$/.test(e.hora || '')) {
    const [h, mi] = e.hora.split(':').map(Number);
    return [new Date(a, m - 1, d, h, mi), new Date(a, m - 1, d, h + 1, mi), 'depois das ' + e.hora];
  }
  const t = TURNOS[e.turno] || TURNOS.qualquer;
  return [new Date(a, m - 1, d, t[0], t[1]), new Date(a, m - 1, d, t[2], t[3]), t[4]];
}
function endereco(e) { return [e.endereco, e.complemento, e.bairro].filter(Boolean).join(' - '); }
function descricao(e) {
  const itens = (e.itens || []).map(i => (typeof i === 'string' ? i : ((i.qtd > 1 ? i.qtd + '× ' : '') + i.nome + (i.local ? ' (' + (i.local === 'deposito' ? 'Depósito' : 'Loja') + ')' : '')))).join(', ');
  return [
    'Cliente: ' + (e.cliente || ''),
    e.fone ? 'Telefone: ' + e.fone : '',
    'Endereço: ' + endereco(e),
    itens ? 'Produtos: ' + itens : '',
    e.observacao ? 'Obs.: ' + e.observacao : '',
    e.carregadoPor ? 'Quem carregou: ' + e.carregadoPor : '',
    e.criadoPorNome ? 'Lançada por: ' + e.criadoPorNome : ''
  ].filter(Boolean).join('\n') + '\n\nAbrir o mural: ' + MURAL;
}
function convidados() {
  const r = UrlFetchApp.fetch(BASE + '/privado/avisos', { headers: cabecalho(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return [];
  const d = valor({ mapValue: JSON.parse(r.getContentText()) });
  const eu = Session.getEffectiveUser().getEmail().toLowerCase();
  return Object.values(d.emails || {}).map(x => String(x).toLowerCase()).filter(x => x && x !== eu);
}
function cabecalho() { return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }; }
function consulta(q) {
  const r = UrlFetchApp.fetch(BASE + ':runQuery', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ structuredQuery: q }), headers: cabecalho(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Firestore respondeu ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText()).filter(x => x.document).map(x => {
    const o = valor({ mapValue: x.document });
    o.id = x.document.name.split('/').pop();
    return o;
  });
}
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
