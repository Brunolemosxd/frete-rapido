/* Frete Rápido: ligação com o Firebase, login com Google e permissões (usado pelo mural e pelo painel) */

// Configuração do app da Web do projeto Firebase do mural (frete-rapido-5516e).
// Esses dados são públicos por natureza; a segurança fica nas regras do Firestore.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDqD2G_3j8mbwDmmg2aeDcAIbPivnYkHUc',
  authDomain: 'frete-rapido-5516e.firebaseapp.com',
  projectId: 'frete-rapido-5516e',
  storageBucket: 'frete-rapido-5516e.firebasestorage.app',
  messagingSenderId: '710414034000',
  appId: '1:710414034000:web:972c3aa8ca22d9e92e9d55'
};
const ADMIN_EMAIL = 'brunolemosxd@gmail.com';
const DIAS_FOTOS = 60; // fotos mais velhas que isso são apagadas sozinhas

const PERMS = {
  lancar: 'Lançar entregas (e editar as que ele lançou)',
  editarTodas: 'Editar entregas de todos',
  apagar: 'Apagar entregas',
  marcar: 'Marcar entregue / problema e passar de dia',
  verValores: 'Ver valores de frete',
  pasta: 'Pôr e tirar fotos na pasta de notas'
};
const FUNCOES = {
  gerente: { nome: 'Gerente', perms: { lancar: true, editarTodas: true, apagar: true, marcar: true, verValores: true, pasta: true } },
  vendedor: { nome: 'Vendedor', perms: { lancar: true, editarTodas: false, apagar: false, marcar: false, verValores: true, pasta: true } },
  entregador: { nome: 'Entregador', perms: { lancar: false, editarTodas: false, apagar: false, marcar: true, verValores: false, pasta: false } }
};
// motivos de problema: o Bruno cadastra mais no mural ou no painel (config/motivos)
const MOTIVOS_PADRAO = ['Cliente ausente', 'Endereço errado', 'Produto faltando', 'Produto avariado', 'Não coube no carro', 'Remarcar'];
// Tabela de fretes por localidade (valor null = consultar). O Bruno muda no painel (config/fretes).
function semAcento(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
const FRETES_PADRAO = [
  ['Capão da Canoa (Centro)', 70], ['Zona Nova', 70], ['Girassol', 70], ['Santa Luzia', 70], ['Santo Antônio', 70],
  ['São Jorge', 70], ['Morada do Sol', 70], ['Parque Antártica', 70], ['Quero-Quero', 70], ['Vale Verde', 70],
  ['Araçá', 70], ['Arco Íris', 70], ['Guarani', 70], ['Nova Guarani', 70],
  ['Jardim Beira-Mar', 80], ['Zona Norte', 80], ['Praia do Barco', 80],
  ['Capão Novo (Centro)', 90], ['Capão Novo (Village)', 100], ['Arroio Teixeira', 100], ['CTG João Sobrinho', 120],
  ['Estrada da Laguna', 120], ['Curumim (Centro)', 100], ['Novo Curumim', 110], ['Santa Rita de Cássia (Curumim)', 130],
  ['Arroio do Sal (Centro)', 200], ['Terra de Areia (Centro)', 200],
  ['Guará', 80], ['Atlântida', 80], ['Figueirinha', 90], ['Xangri-Lá (Centro)', 90], ['Nova Xangri-Lá', 90], ['Remanso', 90],
  ['Marina Maristela', 100], ['Arpoador', 100], ['Noiva do Mar', 100], ['Rainha do Mar', 100], ['Mariápolis', 120],
  ['Atlântida Sul', 120], ['Imbé', null], ['Tramandaí', null], ['Nova Tramandaí', null],
  ['Maquiné (Centro)', 200], ['Condomínio entre Rainha do Mar e Curumim (Centro)', 100]
].map(([nome, valor]) => ({ nome, valor, dir: direcaoPadrao(nome) }));
// Direção da entrega para aproveitar viagem: norte = Araçá até Terra de Areia (← azul),
// sul = Guará até Tramandaí (→ vermelha), centro = o resto (↑ cinza). O Bruno muda no painel.
function direcaoPadrao(nome) {
  const n = semAcento(nome);
  const NORTE = ['araca', 'arco iris', 'guarani', 'nova guarani', 'jardim beira-mar', 'zona norte', 'praia do barco', 'capao novo (centro)', 'capao novo (village)',
    'arroio teixeira', 'ctg joao sobrinho', 'estrada da laguna', 'curumim (centro)', 'novo curumim', 'santa rita de cassia (curumim)', 'arroio do sal (centro)', 'terra de areia (centro)'];
  const SUL = ['guara', 'atlantida', 'figueirinha', 'xangri-la (centro)', 'nova xangri-la', 'remanso', 'marina maristela', 'arpoador', 'noiva do mar', 'rainha do mar',
    'mariapolis', 'atlantida sul', 'imbe', 'tramandai', 'nova tramandai'];
  return NORTE.includes(n) ? 'norte' : SUL.includes(n) ? 'sul' : 'centro';
}
const DIRECOES = { norte: { seta: '←', nome: 'Lado de Araçá a Terra de Areia' }, centro: { seta: '↑', nome: 'Centro' }, sul: { seta: '→', nome: 'Lado de Guará a Tramandaí' } };
const AJUSTES = [-50, -40, -30, -20, -10, 10, 20, 30, 40, 50];
const PAGAMENTOS = { entrega: 'Cobrar na entrega', pix: 'Já pago no Pix', junto: 'Dinheiro junto com a nota', nota: 'Frete na nota', vendedor: 'Por conta do vendedor' };
// Ajuste de valor feito pelo vendedor (entregas antigas usavam aMaisPor/aMaisValor)
function ajusteDe(e) {
  if (e.freteAjuste !== undefined) return { valor: +e.freteAjuste || 0, por: e.ajustePor || '' };
  return e.aMaisPor ? { valor: +e.aMaisValor || 0, por: e.aMaisPor } : { valor: 0, por: '' };
}
function pagamentoDe(e) { return e.pagamento || (e.fretePor ? 'vendedor' : e.fretePago ? 'pago' : 'entrega'); }
// Ajustes gerais que o Bruno muda no painel (config/geral); estes são os valores de fábrica
const GERAL_PADRAO = {
  loja: 'Lojas Colombo',
  carregadores: ['Tiago', 'Bruno'],
  produtos: ['Geladeira', 'Freezer', 'Fogão', 'Cooktop', 'Forno elétrico', 'Micro-ondas', 'Coifa', 'Lava-louças', 'Máquina de lavar', 'Lava e seca', 'Tanquinho', 'Secadora',
    'Ar-condicionado', 'TV', 'Colchão', 'Cama box', 'Sofá', 'Guarda-roupa', 'Cômoda', 'Armário de cozinha', 'Mesa e cadeiras', 'Rack / painel'],
  condominio: 100
};
function geralDe(d) {
  d = d || {};
  const lista = (l, p) => Array.isArray(l) && l.length ? l : p;
  return { loja: String(d.loja || '').trim() || GERAL_PADRAO.loja, carregadores: lista(d.carregadores, GERAL_PADRAO.carregadores),
    produtos: lista(d.produtos, GERAL_PADRAO.produtos), condominio: Number(d.condominio) > 0 ? Number(d.condominio) : GERAL_PADRAO.condominio };
}

// Mensagem pronta do WhatsApp (config/mensagem). Palavras entre chaves são trocadas:
// {nome} primeiro nome do cliente · {cliente} nome completo · {apresentacao} "Meu nome é Bruno, freteiro da Lojas Colombo."
// {loja} · {valor} frete a cobrar · {pix} chave Pix · {cobrar} lugar da parte de cobrança (some quando o frete já está pago)
const MSG_PADRAO = {
  texto: 'Olá, tudo bom, {nome}? 😊 {apresentacao} Tenho uma entrega para você.\n\n🏠 Você está em casa a partir de agora para receber?\n🏢 É térreo, elevador ou escada? Por escada cobramos R$ 20 por andar, por item (a Colombo não se responsabiliza por avaria na escada).\n{cobrar}\n📦 Confira a mercadoria na entrega. Abrir a embalagem e descartar é com o cliente: não levamos as embalagens.',
  textoOutro: 'Olá, tudo bom? 😊 {apresentacao} Tenho uma entrega para {cliente}.\n\n🏠 Tem alguém em casa a partir de agora para receber?\n🏢 É térreo, elevador ou escada? Por escada cobramos R$ 20 por andar, por item (a Colombo não se responsabiliza por avaria na escada).\n{cobrar}\n📦 Confira a mercadoria na entrega. Abrir a embalagem e descartar é com o cliente: não levamos as embalagens.',
  textoCobrar: '💰 Frete: {valor} (o valor que te passaram na loja), no Pix ou dinheiro. Não aceitamos cartão.\n🔑 Pix: {pix}\n⚠️ Se não tiver ninguém para acertar na entrega, o frete precisa ser pago antes de sairmos do depósito.'
};
function mensagemDe(d) {
  d = d || {};
  const t = k => typeof d[k] === 'string' && d[k].trim() ? d[k] : MSG_PADRAO[k];
  const pixPor = {};
  for (const [n, v] of Object.entries(d.pixPor && typeof d.pixPor === 'object' ? d.pixPor : {})) if (String(v || '').trim()) pixPor[n] = String(v).trim();
  return { pix: String(d.pix || '').trim(), pixPor, texto: t('texto'), textoOutro: t('textoOutro'), textoCobrar: t('textoCobrar') };
}
// chave Pix própria do freteiro (pelo primeiro nome; Thiago = Tiago); '' quando ele usa a da loja
function pixDoFreteiro(m, nome) {
  const pn = t => semAcento(String(t || '').split(' ')[0]).replace(/^th/, 't');
  const k = Object.keys(m.pixPor || {}).find(x => pn(x) === pn(nome));
  return k ? m.pixPor[k] : '';
}
// v = {nome, cliente, apresentacao, loja, valor, pix, cobrar (true/false), textoCobrar}
function montarMsg(tpl, v) {
  const semPix = l => v.pix || !l.includes('{pix}');
  const troca = t => t.replace(/\{(\w+)\}/g, (m, k) => k !== 'cobrar' && k in v ? String(v[k] ?? '') : m);
  const bloco = v.cobrar ? String(v.textoCobrar || '').split('\n').filter(semPix).join('\n') : '';
  const linhas = [];
  for (const l of String(tpl || '').split('\n').filter(semPix)) {
    if (l.trim() === '{cobrar}') { if (bloco) linhas.push(...bloco.split('\n')); }
    else linhas.push(l.split('{cobrar}').join(bloco));
  }
  return linhas.map(l => troca(l).replace(/,\s*\?/g, '?').replace(/ {2,}/g, ' ').trimEnd()).join('\n').trim();
}

const TODAS = Object.fromEntries(Object.keys(PERMS).map(k => [k, true]));

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

const emailDe = u => String(u?.email || '').toLowerCase();
const ehAdmin = u => !!u && u.emailVerified && emailDe(u) === ADMIN_EMAIL;

function entrarComGoogle() {
  const p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return auth.signInWithPopup(p).catch(e => {
    if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
    // alguns navegadores de celular bloqueiam a janelinha; aí vai pela página inteira
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') return auth.signInWithRedirect(p);
    throw e;
  });
}

// Devolve {uid,email,nome,funcao,admin,perms} ou null quando o Bruno ainda não liberou o e-mail
async function carregarPerfil(u) {
  if (ehAdmin(u)) return { uid: u.uid, email: emailDe(u), nome: u.displayName || 'Bruno', funcao: 'admin', admin: true, perms: { ...TODAS } };
  if (!u.emailVerified) return null;
  const snap = await db.collection('usuarios').doc(emailDe(u)).get(); contarLeitura(1);
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.ativo !== true) return null;
  return { uid: u.uid, email: emailDe(u), nome: d.nome || u.displayName || emailDe(u), funcao: d.funcao, admin: false, perms: { ...(d.perms || {}) } };
}

// Apaga as fotos com mais de DIAS_FOTOS dias. Só o administrador roda (uma vez por dia por aparelho).
async function limparFotosAntigas(forcar) {
  const k = 'freterapido_limpeza', hojeTxt = new Date().toDateString();
  try { if (!forcar && localStorage.getItem(k) === hojeTxt) return 0; } catch {}
  const limite = Date.now() - DIAS_FOTOS * 864e5;
  const d = new Date(limite), dataLimite = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  let n = 0;
  const velhasNotas = await db.collection('notasjuntas').where('data', '<', dataLimite).get();
  for (const doc of velhasNotas.docs) { await doc.ref.delete(); n++; }
  const velhasFotos = await db.collection('fotos').where('em', '<', limite).get();
  for (const doc of velhasFotos.docs) { await doc.ref.delete(); n++; }
  try { localStorage.setItem(k, hojeTxt); } catch {}
  return n;
}

function fotoParaTexto(blob) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }
function reduzir(file, max, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(b => b ? res(b) : rej(), 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(); };
    img.src = url;
  });
}
// Foto que vai dentro do banco de dados: precisa ficar bem abaixo de 1 MB por documento
async function fotoGrande(blob) { return fotoParaTexto(await reduzir(blob, 1200, 0.6)); }
async function fotoMiniatura(blob) { return fotoParaTexto(await reduzir(blob, 200, 0.6)); }

// Tema: automático (segue o celular) → claro → escuro. Botões com o atributo data-tema.
const TEMAS = [['', '🌓 Automático'], ['light', '☀️ Claro'], ['dark', '🌙 Escuro']];
function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  try { t ? localStorage.setItem('freterapido_tema', t) : localStorage.removeItem('freterapido_tema'); } catch {}
  const nome = TEMAS.find(x => x[0] === t)[1];
  document.querySelectorAll('[data-tema]').forEach(b => { b.textContent = nome; b.setAttribute('aria-label', 'Tema: ' + nome.split(' ')[1] + '. Toque para trocar'); });
}
document.querySelectorAll('[data-tema]').forEach(b => b.addEventListener('click', () => {
  const atual = document.documentElement.dataset.theme || '';
  aplicarTema(TEMAS[(TEMAS.findIndex(x => x[0] === atual) + 1) % TEMAS.length][0]);
}));
aplicarTema(document.documentElement.dataset.theme || '');

/* ---------- uso do plano grátis (estimativa) ----------
   O Firebase não informa ao app quanto do limite diário já foi usado. Cada aparelho conta
   as leituras e gravações que faz e soma no documento uso/{dia} a cada minuto.
   O dia é o mesmo do Firebase: vira à meia-noite do horário do Pacífico. */
const LIMITE_LEITURAS = 50000, LIMITE_GRAVACOES = 20000;
const usoPendente = { l: 0, g: 0 };
const diaUso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
function contarLeitura(n) { usoPendente.l += n; }
function contarGravacao(n) { usoPendente.g += n; }
// docChanges() traz tudo na 1ª vez e só o que mudou depois, igual ao que o Firebase cobra
function contarSnap(snap) { contarLeitura(snap.docChanges ? snap.docChanges().length : snap.docs.length); }
function enviarUso() {
  if (!auth.currentUser || (!usoPendente.l && !usoPendente.g)) return;
  const inc = firebase.firestore.FieldValue.increment, l = usoPendente.l, g = usoPendente.g + 1;
  usoPendente.l = 0; usoPendente.g = 0;
  db.collection('uso').doc(diaUso()).set({ leituras: inc(l), gravacoes: inc(g), atualizadoEm: Date.now() }, { merge: true })
    .catch(() => { usoPendente.l += l; usoPendente.g += g - 1; });
}
setInterval(enviarUso, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarUso(); });
// Só o administrador acompanha. Chama mostrar({leituras, gravacoes}) a cada mudança.
function ouvirUso(mostrar) {
  return db.collection('uso').doc(diaUso()).onSnapshot(d => mostrar(d.exists ? d.data() : { leituras: 0, gravacoes: 0 }), () => {});
}
function textoUso(u) {
  const pl = Math.round((u.leituras || 0) / LIMITE_LEITURAS * 100), pg = Math.round((u.gravacoes || 0) / LIMITE_GRAVACOES * 100), p = Math.max(pl, pg);
  return { p, pl, pg, nivel: p >= 90 ? 'alto' : p >= 70 ? 'medio' : 'ok' };
}
