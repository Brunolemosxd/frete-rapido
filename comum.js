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
  const snap = await db.collection('usuarios').doc(emailDe(u)).get();
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
