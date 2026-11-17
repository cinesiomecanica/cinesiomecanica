import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DADOS = await fetch('dados.json').then(r => r.json());
const E = DADOS.e, INFO = DADOS.info;

/* ---------- cena ---------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); renderer.setClearColor(0x000000, 0);   // o fundo vem do CSS (gradiente + malha)
const cam = new THREE.PerspectiveCamera(32, 1, 0.02, 30);
const ctl = new OrbitControls(cam, canvas); ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.minDistance = 0.25; ctl.maxDistance = 12; ctl.zoomSpeed = 0.9;
scene.add(new THREE.HemisphereLight('#dfefff', '#20262e', 1.4));
const sol = new THREE.DirectionalLight('#ffffff', 2.2); sol.position.set(1.5, 3, 2.5); scene.add(sol);
const rim = new THREE.DirectionalLight('#7fe9ff', 1.1); rim.position.set(-2, 2, -2.5); scene.add(rim);
const cam_l = new THREE.DirectionalLight('#ffffff', 0.6); cam.add(cam_l); scene.add(cam);
// piso sutil
const grid = new THREE.GridHelper(4, 40, '#3a4a7a', '#1c2545'); grid.material.transparent = true; grid.material.opacity = 0.6; scene.add(grid);
let painelAberto = false;
// desenha só quando algo muda (economiza bateria): cada interação pede alguns quadros
let suja = 120; const sujar = (n = 50) => { if (suja < n) suja = n; };
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'click', 'input', 'change', 'keydown', 'touchmove']) addEventListener(t, () => sujar(), { passive: true, capture: true });
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h;
  cam.updateProjectionMatrix(); sujar(); }
addEventListener('resize', resize); resize();

/* ---------- materiais ---------- */
const COR = { ossos: '#e9e2d2', musculos: '#c4473c', articulacoes: '#d9c27a' };
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
function material(nome, camada) {
  const e = E[nome] || {};
  if (camada === 'insercoes') return new THREE.MeshStandardMaterial({ color: e.t === 'origem' ? '#ef4b3f' : '#3d8bfd', roughness: 0.5, emissive: e.t === 'origem' ? '#5a0c08' : '#08214a', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const c = new THREE.Color(COR[camada]);
  if (camada === 'musculos') c.offsetHSL(((hash(e.b || nome) % 100) / 100) * 0.02, 0, ((hash((e.b || nome) + 'x') % 100) / 100) * 0.06 - 0.03);
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: camada === 'ossos' ? 0.62 : 0.5, metalness: 0 });
  if (camada === 'articulacoes') { m.transparent = true; m.opacity = 0.85; }
  return m;
}

/* ---------- carregamento por camadas ---------- */
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const CAMADAS = { ossos: null, musculos: null, insercoes: null, articulacoes: null };
const MESH = {};            // nome -> mesh
const visCamada = { ossos: true, musculos: true, insercoes: false, articulacoes: false };
const oculto = new Set();   // ocultados pelo usuário
let isolado = null, soDireito = false, filtroInsercao = null;
function carregar(nome, pct0, pct1) {
  return new Promise((ok, err) => loader.load(`modelo/${nome}.glb`, g => {
    const grp = g.scene; grp.name = nome;
    const J = g.parser.json, A = g.parser.associations;
    const nomeOrig = o => { for (const x of [o, o.parent]) { const a = x && A.get(x); if (a && a.nodes !== undefined) return J.nodes[a.nodes].name.replace(/\.\d{3}$/, ''); } return o.name; };
    grp.traverse(o => { if (o.isMesh) { const n = nomeOrig(o); if (!E[n]) { o.visible = false; return; } o.name = n; o.material = material(n, nome); o.userData.camada = nome; MESH[n] = o; } });
    scene.add(grp); CAMADAS[nome] = grp; sujar(); ok(grp);
  }, ev => { if (ev.total && $('cBar')) $('cBar').style.width = (pct0 + (pct1 - pct0) * ev.loaded / ev.total) + '%'; }, err));
}
const cargaMusc = carregar('musculos', 35, 90);   // ossos e músculos baixam ao mesmo tempo
await carregar('ossos', 0, 35);
const EIXO = new THREE.Box3().setFromObject(CAMADAS.ossos).getCenter(new THREE.Vector3());   // eixo do corpo (x, z)
$('cTxt').textContent = 'Carregando os músculos…';
await cargaMusc;
$('carga').style.opacity = 0; setTimeout(() => $('carga').remove(), 450);
setTimeout(() => { $('dica').style.opacity = 0; }, 6000);
// camadas extras ficam para quando forem ligadas
async function garantir(c) { if (!CAMADAS[c]) { await carregar(c, 0, 100); } }

/* ---------- visibilidade ---------- */
function aplicarVis() {
  for (const [n, m] of Object.entries(MESH)) {
    const e = E[n] || {}, c = m.userData.camada;
    let v = visCamada[c] && !oculto.has(n);
    if (MOV.on || AG.on) { m.visible = MOV.vis.has(n); continue; }
    if (window.POSE_ON && (c === 'insercoes' || c === 'articulacoes')) { m.visible = false; continue; }
    if (soDireito && e.l === 'esquerdo') v = false;
    if (isolado && c !== 'ossos' && !isolado.has(n) && !(c === 'insercoes' && filtroInsercao)) v = false;
    if (c === 'insercoes' && filtroInsercao) v = visCamada.insercoes && e.b === filtroInsercao && (!soDireito || e.l !== 'esquerdo');
    m.visible = v;
    // mostrando origem/inserção: o músculo fica translúcido para enxergar as marcas no osso
    if (c === 'musculos') { const tr = !!filtroInsercao && e.b === filtroInsercao; if (m.material.transparent !== tr) { m.material.transparent = tr; m.material.opacity = tr ? 0.33 : 1; m.material.depthWrite = !tr; m.material.needsUpdate = true; } }
  }
  if (window.POSE_ON) POSE.sinc();
}
$('camadas').addEventListener('click', async ev => {
  const b = ev.target.closest('.chip'); if (!b) return; const c = b.dataset.c;
  visCamada[c] = !visCamada[c]; b.classList.toggle('on', visCamada[c]);
  if (visCamada[c]) await garantir(c);
  if (c === 'insercoes' && !visCamada[c]) filtroInsercao = null;
  aplicarVis();
});

/* ---------- câmera ---------- */
const anim = { de: null, ate: null, t: 1, t0: 0 };
function voar(alvo, dist, dir = new THREE.Vector3(0.35, 0.12, 1), comPainel = true) {
  const t = new THREE.Vector3(...alvo);
  if (comPainel && innerWidth < 900) t.y -= 0.14 * dist;      // no celular o painel cobre a metade de baixo: sobe o objeto na tela
  const p = t.clone().add(dir.clone().normalize().multiplyScalar(dist));
  anim.de = { t: ctl.target.clone(), p: cam.position.clone() }; anim.ate = { t, p }; anim.t = 0; anim.t0 = performance.now();
}
cam.position.set(1.1, 1.2, 3.55); ctl.target.set(0, 0.9, 0); ctl.update();

function focar(nome, mult = 2.2) {
  const m = MESH[nome]; if (!m) return;
  const bx = new THREE.Box3().setFromObject(m), c = bx.getCenter(new THREE.Vector3()), r = bx.getSize(new THREE.Vector3()).length();
  const d = new THREE.Vector3(c.x - EIXO.x, 0, c.z - EIXO.z); if (d.length() < 0.04) d.copy(cam.position).sub(ctl.target).setY(0);
  d.normalize(); d.y = 0.28;
  voar(c.toArray(), Math.max(0.85, r * mult), d);
}
/* ---------- seleção ---------- */
let sel = null;
const HL = new THREE.Color('#ffb020');
function destacar(nome) {
  if (sel && MESH[sel]) MESH[sel].material.emissive.copy(MESH[sel].userData.em0 || new THREE.Color(0));
  sel = nome; const m = MESH[nome]; if (!m) return;
  if (!m.userData.em0) m.userData.em0 = m.material.emissive.clone();
  m.material.emissive.copy(HL).multiplyScalar(0.22);
}
const ray = new THREE.Raycaster(); const pt = new THREE.Vector2(); let down = null;
const mirar = e => { pt.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(pt, cam); };
const tocado = e => { mirar(e); const h = ray.intersectObjects([...Object.values(CAMADAS).filter(Boolean), ...(window.POSE_ON ? POSE.alvos() : [])], true).find(h => h.object.visible && h.object.isMesh); return h && h.object; };
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; if (MOV.on) movDown(e); else if (AG.on) agDown(e); });
canvas.addEventListener('pointermove', e => { if (MOV.arrastando) movMove(e); else if (AG.arrastando) agMove(e); });
canvas.addEventListener('pointerup', e => {
  if (MOV.arrastando || AG.arrastando) { MOV.arrastando = false; AG.arrastando = false; ctl.enabled = true; return; }
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  if (MOV.on || AG.on) return;
  const o = tocado(e);
  if (modoTirar) { if (o) tirar(o.name); return; }
  if (o) abrir(o.name); else fechar();
});

/* ---------- tirar / voltar / padrão ---------- */
let modoTirar = false; const hist = [];
const toast = t => { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 1900); };
function tirar(nome) {
  oculto.add(nome); hist.push(nome); if (sel === nome) fechar();
  aplicarVis(); $('bVoltar').disabled = false; toast('Tirado: ' + ((E[nome] || {}).n || nome));
}
$('bTirar').onclick = () => {
  modoTirar = !modoTirar; $('bTirar').classList.toggle('on', modoTirar); document.body.classList.toggle('tirar', modoTirar);
  if (modoTirar) { fechar(); toast('Toque nas estruturas para tirá-las'); }
};
$('bVoltar').onclick = () => {
  const n = hist.pop(); if (n) { oculto.delete(n); aplicarVis(); toast('Voltou: ' + ((E[n] || {}).n || n)); }
  $('bVoltar').disabled = !hist.length;
};
function padrao() {
  if (MOV.on) sairMov(); if (AG.on) sairAg(); limparDesvio();
  oculto.clear(); hist.length = 0; $('bVoltar').disabled = true; isolado = null; filtroInsercao = null; soDireito = false; $('bLado').classList.remove('on');
  if (modoTirar) $('bTirar').click();
  Object.assign(visCamada, { ossos: true, musculos: true, insercoes: false, articulacoes: false });
  document.querySelectorAll('#camadas .chip').forEach(b => b.classList.toggle('on', visCamada[b.dataset.c]));
  document.querySelectorAll('#regioes .chip').forEach(b => b.classList.remove('on'));
  fechar(); aplicarVis(); voar([0, 0.9, 0], 3.7, new THREE.Vector3(0.3, 0.1, 1), false); toast('Modelo padrão');
}
$('bPadrao').onclick = padrao;

/* ---------- painel ---------- */
const lado = e => e.l ? ` · lado ${e.l}` : '';
const CAM_NOME = { ossos: 'osso', musculos: 'músculo', insercoes: 'origem/inserção', articulacoes: 'ligamento/articulação' };
function abrir(nome) {
  const e = E[nome] || { n: nome, c: '' }; destacar(nome);
  const base = e.c === 'insercoes' ? e.b : e.b, inf = INFO[base];
  $('pT').textContent = e.n; $('pS').innerHTML = `<span class="tag">${CAM_NOME[e.c] || ''}</span>${esc(lado(e).replace(' · ', ''))}`;
  let h = '';
  if (inf) {
    h += `<p>${esc(inf.resumo)}</p>`;
    if (inf.origem) h += `<h3>Origem, inserção e inervação</h3><div class="oi"><span class="o">Origem</span><div>${esc(inf.origem)}</div><span class="e">Inserção</span><div>${esc(inf.insercao)}</div><span class="n">Inervação</span><div>${esc(inf.inervacao)}</div></div>`;
    if (inf.acoes) h += `<h3>Ações</h3><table class="ac"><tr><th>Movimento</th><th>Plano</th><th>Eixo</th></tr>${inf.acoes.map(a => `<tr><td><b>${esc(a.movimento)}</b><br><small style="color:var(--ink3)">${esc(a.articulacao)}</small></td><td>${a.plano.split('/').map(p => `<span class="pl ${p}">${esc(p)}</span>`).join(' ')}</td><td>${esc(a.eixo)}</td></tr>`).join('')}</table>`;
    if (inf.notas) h += `<h3>${inf.tipo === 'osso' ? 'Pontos importantes' : 'Na prática'}</h3><p>${esc(inf.notas)}</p>`;
  } else if (e.c === 'insercoes') {
    h += `<p>Área em que o músculo se prende ao osso: <b style="color:${e.t === 'origem' ? 'var(--ori)' : 'var(--ins)'}">${e.t}</b>. Na origem fica a parte que normalmente se move menos; na inserção, a que mais se move.</p>`;
  } else {
    h += `<p style="color:var(--ink3)">O conteúdo detalhado desta estrutura chega com as próximas regiões. Já estão completos o ombro, o cotovelo e o joelho.</p>`;
  }
  h += `<div class="acoes">`;
  if (e.c === 'musculos') h += `<button class="pri" data-a="oi">Ver origem e inserção</button>`;
  h += `<button data-a="iso">${isolado ? 'Mostrar todos' : 'Isolar'}</button><button data-a="ocu">Tirar</button></div>`;
  if (inf && inf.fontes) h += `<div class="fontes">Fontes: ${inf.fontes.map(esc).join(' · ')}</div>`;
  $('pB').innerHTML = h; $('painel').classList.add('on'); $('pB').scrollTop = 0; painelAberto = true; resize();
  $('pB').querySelector('.acoes').onclick = async ev => {
    const a = ev.target.closest('button'); if (!a) return;
    if (a.dataset.a === 'ocu') tirar(nome);
    if (a.dataset.a === 'iso') { isolado = isolado ? null : new Set([nome]); aplicarVis(); abrir(nome); }
    if (a.dataset.a === 'oi') { await garantir('insercoes'); visCamada.insercoes = true; document.querySelector('[data-c=insercoes]').classList.add('on'); filtroInsercao = e.b; isolado = new Set([nome]); aplicarVis(); abrir(nome);
      focar(nome, 2.4); }
  };
}
function fechar() { $('painel').classList.remove('on'); painelAberto = false; resize(); if (sel && MESH[sel]) MESH[sel].material.emissive.copy(MESH[sel].userData.em0 || new THREE.Color(0)); sel = null; }
$('pX').onclick = fechar;
$('bLado').onclick = () => { soDireito = !soDireito; $('bLado').classList.toggle('on', soDireito); aplicarVis(); };

/* ---------- regiões ---------- */
function regiao(r) {
  document.querySelectorAll('#regioes .chip').forEach(b => b.classList.toggle('on', b.dataset.r === r));
  if (MOV.on) sairMov(false); if (AG.on) sairAg(false);
  $('pB').onclick = null;
  if (r === 'postura') { listaPostura(); return; }
  if (r === 'movimento') { listaMov(); return; }
  limparDesvio();
  if (r === 'corpo') { isolado = null; aplicarVis(); voar([0, 0.9, 0], 3.7, undefined, false); fechar(); return; }
  const R = DADOS.regioes[r]; const itens = new Set(R.itens);
  isolado = new Set(Object.keys(E).filter(n => itens.has(E[n].b) && E[n].c === 'musculos'));
  let alvo = R.alvo;
  if (R.alvoMesh) { const bx = new THREE.Box3(); R.alvoMesh.forEach(n => MESH[n] && bx.expandByObject(MESH[n])); alvo = bx.getCenter(new THREE.Vector3()).toArray(); }
  aplicarVis(); voar(alvo, R.dist, new THREE.Vector3(-0.6, 0.25, 1));
  destacar(null);
  $('pT').textContent = R.nome; $('pS').innerHTML = '<span class="tag">região</span>';
  const ms = [...new Set(R.itens)].filter(b => INFO[b]);
  $('pB').innerHTML = `<p>${R.intro}</p>
    ${R.movimento ? `<div class="acoes"><button class="pri" id="bMov">▶ Mover o ${R.movimento} · ângulo e torque</button>${r === 'joelho' ? '<button class="pri" id="bAg">▶ Agachamento · quadril, joelho e tornozelo</button>' : ''}</div>` : ''}
    ${Object.entries(R.juntas).map(([k, t]) => `<h3>${esc(k)}</h3><p>${esc(t)}</p>`).join('')}
    ${R.seguranca || ''}
    <h3>Estruturas</h3><div class="lista">${ms.map(b => { const nm = Object.keys(E).find(n => E[n].b === b && E[n].l === 'direito') || Object.keys(E).find(n => E[n].b === b); return nm ? `<button data-n="${esc(nm)}"><i class="${E[nm].c === 'ossos' ? 'os' : ''}"></i>${esc(E[nm].n)}</button>` : ''; }).join('')}</div>`;
  $('painel').classList.add('on'); painelAberto = true; resize();
  if (R.movimento) $('bMov').onclick = () => entrarMov(R.movimento);
  if ($('bAg')) $('bAg').onclick = entrarAg;
  $('pB').querySelector('.lista').onclick = ev => { const b = ev.target.closest('button'); if (b) mostrar(b.dataset.n, 2.6); };
}
$('regioes').addEventListener('click', ev => { const b = ev.target.closest('.chip'); if (b) regiao(b.dataset.r); });

/* ---------- busca ---------- */
const IDX = []; const vistos = new Set();
for (const [n, e] of Object.entries(E)) { if (e.c === 'insercoes') continue; const k = e.n + '|' + e.l; if (vistos.has(k)) continue; vistos.add(k); IDX.push({ n, t: e.n, l: e.l, c: e.c, s: e.n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }); }
const sug = $('sug');
$('q').addEventListener('input', () => {
  const q = $('q').value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (q.length < 2) { sug.style.display = 'none'; return; }
  const R = IDX.filter(x => x.s.includes(q) && x.l !== 'esquerdo').slice(0, 30);
  sug.innerHTML = R.map(x => `<button data-n="${esc(x.n)}">${esc(x.t)}<small>${CAM_NOME[x.c]}</small></button>`).join('') || '<button disabled>Nada encontrado</button>';
  sug.style.display = 'block';
});
sug.addEventListener('click', ev => { const b = ev.target.closest('button[data-n]'); if (!b) return; sug.style.display = 'none'; $('q').value = ''; $('q').blur();
  mostrar(b.dataset.n); });
async function mostrar(n, mult) {
  const c = (E[n] || {}).c; if (c && !visCamada[c]) { await garantir(c); visCamada[c] = true; document.querySelector(`[data-c=${c}]`).classList.add('on'); }
  oculto.delete(n); if (isolado && c !== 'ossos') isolado.add(n); aplicarVis(); if (MESH[n]) focar(n, mult); abrir(n);
}
document.addEventListener('click', ev => { if (!ev.target.closest('.busca')) sug.style.display = 'none'; });

/* ---------- modo movimento (cotovelo, joelho): flexão e extensão com torque ---------- */
// Corpo rígido: o segmento distal gira em torno do eixo látero-lateral da articulação.
// Cada músculo é traçado em linha reta da origem à inserção (centro das áreas do modelo).
const G = 9.81, _v = new THREE.Vector3();
const vertsMundo = m => { m.updateWorldMatrix(true, false); const p = m.geometry.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)); return out; };
const media = vs => vs.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / vs.length);
const caixa = ms => { const b = new THREE.Box3(); ms.forEach(m => b.expandByObject(m)); return b; };
const extremo = (n, folga, alto = 0) => { const vs = vertsMundo(MESH[n]); const mn = Math.min(...vs.map(v => v.y)); const c = media(vs.filter(v => v.y < mn + folga)); c.y = mn + alto; return c; };
const JMOV = {
  cotovelo: {
    titulo: 'Cotovelo · biomecânica', eixo: 'eixo do cotovelo', s: -1, max: 145, seg: 'antebraço', ang0: 0, carga0: 8,
    distal: /^(Radius|Ulna)$|of hand|metacarpal|Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate/, fator: {},
    vis: ['Humerus.r', 'Scapula.r', 'Clavicle.r'],
    centro: () => extremo('Humerus.r', 0.022, 0.011),
    pontos(J) {   // W = punho, H = pegada (palma)
      const W = extremo('Radius.r', 0.012);
      const bm = caixa(J.dist.map(d => d.m).filter(m => new THREE.Box3().setFromObject(m).getCenter(_v).y < W.y - 0.01));
      const H = bm.getCenter(new THREE.Vector3()); H.y = bm.max.y - 0.045; return { W, H };
    },
    zonas: (a) => [
      a <= 5 && ['Extensão completa', 'O olécrano encaixa na fossa do olécrano. Estender até o fim é normal; evite "bater" na trava com carga e velocidade, e não force além do 0° em quem é hipermóvel.'],
      a >= 125 && ['Flexão profunda', 'O contato entre braço e antebraço limita o movimento (cerca de 145° ativos). Amplitude completa é segura e útil para hipertrofia.'],
    ],
    carga: 'H', segs: [[0.016, 'W', 0.43], [0.006, 'H', 1]], objeto: 'halter', rotCarga: 'Carga no halter', cargaMax: 40,
    musculos: [
      ['Long head of biceps brachii', 'Biceps brachii muscle', 'Bíceps (cabeça longa)', '#ff5d73'], ['Short head of biceps brachii', 'Biceps brachii muscle', 'Bíceps (cabeça curta)', '#ff8fa3'],
      ['Brachialis muscle', 'Brachialis muscle', 'Braquial', '#ff9f43'], ['Brachioradialis muscle', 'Brachioradialis muscle', 'Braquiorradial', '#ffd43b'],
      ['Pronator teres', 'Pronator teres', 'Pronador redondo', '#c084fc'], ['Extensor carpi radialis longus', 'Extensor carpi radialis longus', 'Extensor radial longo do carpo', '#94d82d'],
      ['Lateral head of triceps brachii', 'Triceps brachii muscle', 'Tríceps (cabeça lateral)', '#4dabf7', -0.02], ['Long head of triceps brachii', 'Triceps brachii muscle', 'Tríceps (cabeça longa)', '#74c0fc', -0.02],
      ['Medial head of triceps brachii', 'Triceps brachii muscle', 'Tríceps (cabeça medial)', '#a5d8ff', -0.02],
    ],
    posicoes: [[0, 'Em pé (braço ao lado do corpo)'], [45, 'Banco Scott (braço 45° à frente)'], [-30, 'Banco inclinado (braço 30° atrás)']],
    cam: { cel: [0, 0.08, 0.12, 1.75], pc: [0, -0.03, 0.17, 1.05] },
    texto: `<p><b>Torque</b> é a capacidade de uma força girar a articulação: τ = F × d⊥. A força é o peso (do halter e do próprio antebraço) e d⊥ é a distância perpendicular entre a linha da gravidade (seta amarela) e o eixo do cotovelo (linha verde-água). Com o antebraço perpendicular à gravidade, d⊥ é máxima e o exercício fica mais pesado.</p>
    <p><b>Braço de momento do músculo</b> é a mesma ideia do lado de dentro: a distância perpendicular entre a linha de tração do músculo e o eixo. Quanto maior, menos força o músculo precisa fazer para gerar o mesmo torque. O bíceps tem braço de momento pequeno com o cotovelo estendido e maior perto de 90° a 100°.</p>
    <p><b>Posição do braço muda tudo.</b> O pico de torque acontece quando o antebraço fica na horizontal. Em pé, isso acontece no meio da subida. No banco Scott (braço à frente), o pico vem bem antes e o fim da subida fica leve. No banco inclinado (braço atrás), o pico vem depois e o bíceps começa o movimento mais alongado no ombro. Teste as três posições e veja a curva amarela mudar.</p>`,
    aviso: 'cada músculo é traçado em linha reta da origem à inserção do modelo 3D (o tendão do tríceps contorna o olécrano, modelado como um cilindro de 2 cm em volta do eixo), e o peso do antebraço e da mão usa as proporções médias de Winter.',
    fontes: 'Neumann. Cinesiologia do aparelho musculoesquelético, caps. 1 e 6 · Winter. Biomechanics and Motor Control of Human Movement (parâmetros dos segmentos)',
  },
  joelho: {
    titulo: 'Joelho · biomecânica', eixo: 'eixo do joelho', s: 1, max: 140, seg: 'perna', ang0: 90, carga0: 20,
    distal: /^(Tibia|Fibula|Patella|Talus|Calcaneus|Navicular bone|Cuboid bone)$|cuneiform|metatarsal|of foot/, fator: { 'Patella.r': 0.6 },
    vis: ['Femur.r', 'Hip bone.r'],
    centro: () => extremo('Femur.r', 0.03, 0.022),
    pontos(J) {   // A = tornozelo (rolo do aparelho / caneleira), P = centro do pé
      const A = extremo('Tibia.r', 0.02, 0.045);
      const pe = J.dist.map(d => d.m).filter(m => !/Tibia|Fibula|Patella/.test(m.name));
      return { A, P: caixa(pe).getCenter(new THREE.Vector3()) };
    },
    zonas: (a, alfa) => [
      alfa === 90 && a <= 40 && ['0° a 40° na cadeira extensora', 'Faixa de maior tensão no LCA com carga no tornozelo, porque o quadríceps puxa a tíbia para a frente. Em joelho saudável é seguro; na reabilitação do LCA, essa faixa é liberada aos poucos.'],
      alfa === 90 && a <= 30 && ['Patelofemoral na cadeia aberta', 'O estresse entre a patela e o fêmur é maior perto da extensão na cadeira extensora (no agachamento é o contrário: maior com o joelho muito flexionado). Quem tem dor na frente do joelho pode usar a faixa sem dor.'],
      alfa !== 90 && a >= 90 && ['Isquiotibiais encurtados', 'Acima de 90° de flexão os isquiotibiais trabalham muito encurtados e perdem força (insuficiência ativa). Cãibra aqui é comum, não é sinal de lesão.'],
      a >= 125 && ['Flexão profunda', 'O contato da panturrilha com a coxa limita o movimento (cerca de 135° a 140°).'],
    ],
    carga: 'A', segs: [[0.0465, 'A', 0.433], [0.0145, 'P', 1]], objeto: 'rolo', rotCarga: 'Força da carga no tornozelo', cargaMax: 80,
    musculos: [
      ['Rectus femoris muscle', 'Quadriceps femoris muscle', 'Reto femoral', '#ff5d73', -0.04], ['Vastus lateralis muscle', 'Quadriceps femoris muscle', 'Vasto lateral', '#ff8fa3', -0.04],
      ['Vastus medialis muscle', 'Quadriceps femoris muscle', 'Vasto medial', '#ff9f43', -0.04], ['Vastus intermedius muscle', 'Quadriceps femoris muscle', 'Vasto intermédio', '#ffc078', -0.04],
      ['Long head of biceps femoris', 'Biceps femoris muscle', 'Bíceps femoral (cabeça longa)', '#4dabf7'], ['Semitendinosus muscle', 'Semitendinosus muscle', 'Semitendíneo', '#74c0fc'],
      ['Semimembranosus muscle', 'Semimembranosus muscle', 'Semimembranáceo', '#a5d8ff'], ['Gracilis muscle', 'Gracilis muscle', 'Grácil', '#c084fc'],
      ['Medial head of gastrocnemius', 'Triceps surae muscle', 'Gastrocnêmio (cabeça medial)', '#94d82d'], ['Lateral head of gastrocnemius', 'Triceps surae muscle', 'Gastrocnêmio (cabeça lateral)', '#b2f2bb'],
    ],
    posicoes: [[90, 'Sentado (cadeira extensora)'], [-90, 'Deitado de bruços (mesa flexora)'], [0, 'Em pé (flexão com caneleira)']],
    cam: { cel: [0, 0.0, 0.0, 2.3], pc: [0, -0.05, 0.12, 1.45] },
    texto: `<p><b>Torque externo</b> = peso × d⊥, a distância perpendicular entre a linha da gravidade (seta amarela) e o eixo do joelho (linha verde-água). O peso inclui a carga no tornozelo e a própria perna e pé.</p>
    <p><b>Cadeira extensora:</b> com a perna pendurada (90°), a gravidade passa quase pelo eixo e o torque é pequeno. Conforme o joelho estende, a perna fica horizontal e o torque chega ao máximo na extensão completa. É o oposto do agachamento, que pesa mais no fundo.</p>
    <p><b>Mesa flexora:</b> deitado, o torque é máximo com o joelho estendido e cai até perto de zero aos 90°. <b>Em pé</b> (caneleira), acontece o contrário: começa leve e fica pesado perto de 90°.</p>
    <p><b>Quadríceps e patela:</b> a patela afasta o tendão do eixo e aumenta o braço de momento do quadríceps (cerca de 4 a 5 cm). Os isquiotibiais e o gastrocnêmio puxam atrás do eixo, como flexores.</p>
    <p style="font-size:12.5px;color:var(--ink3)">O agachamento é uma cadeia fechada (pé no chão) e depende do quadril e do tronco: ele entra na próxima fase.</p>`,
    aviso: 'cada músculo é traçado em linha reta da origem à inserção do modelo 3D (o quadríceps contorna a patela, modelada como um cilindro de 4 cm em volta do eixo), a patela acompanha a tíbia de forma simplificada, e o peso da perna e do pé usa as proporções médias de Winter.',
    fontes: 'Neumann. Cinesiologia do aparelho musculoesquelético, caps. 1 e 13 · Winter. Biomechanics and Motor Control of Human Movement (parâmetros dos segmentos)',
  },
};
const MOV = { on: false, j: null, J: null, ang: 0, carga: 8, massa: 75, alfa: 0, arrastando: false, vis: new Set() };
const rotX = (C, ang) => new THREE.Matrix4().makeTranslation(C.x, C.y, C.z).multiply(new THREE.Matrix4().makeRotationX(ang * Math.PI / 180)).multiply(new THREE.Matrix4().makeTranslation(-C.x, -C.y, -C.z));
const rotacao = (ang, J = MOV.J, k = 1) => rotX(J.C, J.cfg.s * ang * k);
async function prepararMov(id) {
  const cfg = JMOV[id]; if (cfg.J) return cfg.J;
  await garantir('insercoes');
  const J = { cfg, dist: [], mus: [] };
  J.C = cfg.centro();
  for (const [n, m] of Object.entries(MESH)) {
    const e = E[n] || {};
    if (m.userData.camada !== 'ossos' || e.l !== 'direito' || !cfg.distal.test(e.b)) continue;
    m.updateWorldMatrix(true, false); J.dist.push({ m, k: cfg.fator[n] ?? 1, M0: m.matrixWorld.clone(), Pi: m.parent.matrixWorld.clone().invert() });
  }
  J.vis = new Set([...J.dist.map(d => d.m.name), ...cfg.vis]);
  J.P = cfg.pontos(J); const L = J.P[cfg.carga];
  J.phi0 = Math.atan2(L.z - J.C.z, -(L.y - J.C.y));
  const centro = (b, t) => {   // centro da área de origem/inserção do lado direito (se faltar, espelha o esquerdo)
    for (const [lado, sx] of [['direito', 1], ['esquerdo', -1]]) {
      const vs = []; for (const [n, e] of Object.entries(E)) if (e.c === 'insercoes' && e.b === b && e.t === t && e.l === lado && MESH[n]) vs.push(...vertsMundo(MESH[n]));
      if (vs.length) { const c = media(vs); c.x *= sx; return c; }
    }
    return null;
  };
  const grupo = new THREE.Group(); grupo.visible = false; scene.add(grupo); J.grupo = grupo;
  const cil = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), esf = new THREE.SphereGeometry(1, 16, 12);
  for (const [b, bi, nome, cor, min] of cfg.musculos) {
    const O = centro(b, 'origem'), I = centro(bi, 'inserção'); if (!O || !I) continue;
    const mat = new THREE.MeshBasicMaterial({ color: cor, depthTest: false, transparent: true, opacity: 0.8 });
    const tubo = new THREE.Mesh(cil, mat), po = new THREE.Mesh(esf, mat), pi = new THREE.Mesh(esf, mat);
    po.scale.setScalar(0.006); po.position.copy(O); pi.scale.setScalar(0.006); [tubo, po, pi].forEach(o => o.renderOrder = 10);
    grupo.add(tubo, po, pi); J.mus.push({ nome, cor, O, I0: I, I: I.clone(), tubo, pi, min });
  }
  const verde = new THREE.MeshBasicMaterial({ color: '#2fd3c6', depthTest: false });
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.18, 12).rotateZ(Math.PI / 2), verde); eixo.position.copy(J.C); eixo.renderOrder = 11; grupo.add(eixo);
  const bola = new THREE.Mesh(esf, verde); bola.scale.setScalar(0.008); bola.position.copy(J.C); bola.renderOrder = 11; grupo.add(bola);
  J.seta = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), L, 0.16, '#ffd43b', 0.03, 0.018);
  J.seta.traverse(o => { if (o.material) { o.material.depthTest = false; o.renderOrder = 12; } }); grupo.add(J.seta);
  J.perp = new THREE.Line(new THREE.BufferGeometry().setFromPoints([J.C, J.C]), new THREE.LineDashedMaterial({ color: '#ffd43b', dashSize: 0.008, gapSize: 0.006, depthTest: false })); J.perp.renderOrder = 12; grupo.add(J.perp);
  const ferro = new THREE.MeshStandardMaterial({ color: '#9aa6b5', metalness: 0.5, roughness: 0.3, emissive: '#1b2430' });
  const obj = new THREE.Group();
  if (cfg.objeto === 'halter') {
    obj.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 16).rotateZ(Math.PI / 2), ferro));
    for (const s of [-1, 1]) { const an = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 24).rotateZ(Math.PI / 2), ferro); an.position.x = s * 0.085; obj.add(an); }
  } else {   // rolo acolchoado do aparelho, encostado na frente do tornozelo
    const espuma = new THREE.MeshStandardMaterial({ color: '#2b3442', roughness: 0.8 });
    const rolo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 24).rotateZ(Math.PI / 2), espuma); rolo.position.z = 0.075; obj.add(rolo); J.rolo = rolo;
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 12).rotateZ(Math.PI / 2), ferro); haste.position.set(0.02, 0, 0.075); obj.add(haste); J.haste = haste;
  }
  obj.position.copy(L); obj.updateMatrix(); obj.matrixAutoUpdate = false; J.objM0 = obj.matrix.clone(); J.obj = obj; grupo.add(obj);
  cfg.J = J; return J;
}
function gravidade(alfa = MOV.alfa) { const a = alfa * Math.PI / 180; return new THREE.Vector3(0, -Math.cos(a), -Math.sin(a)); }
const torqueX = (r, F) => r.y * F.z - r.z * F.y;
function calcular(ang, alfa = MOV.alfa) {
  const J = MOV.J, cfg = J.cfg, R = rotacao(ang), C = J.C, g = gravidade(alfa), s = cfg.s;
  const pts = {}; for (const [k, p] of Object.entries(J.P)) pts[k] = p.clone().applyMatrix4(R).sub(C);
  const L = pts[cfg.carga];
  let mseg = 0; const com = new THREE.Vector3();
  for (const [f, k, frac] of cfg.segs) { com.addScaledVector(pts[k], f * frac * MOV.massa); mseg += f * MOV.massa; }
  com.multiplyScalar(1 / mseg);
  const tCarga = torqueX(L, g.clone().multiplyScalar(MOV.carga * G)), tSeg = torqueX(com, g.clone().multiplyScalar(mseg * G));
  const mus = J.mus.map(u => { const I = u.I0.clone().applyMatrix4(R).sub(C), O = u.O.clone().sub(C), F = O.clone().sub(I).normalize(); const ma = s * torqueX(I, F); return u.min ? Math.sign(u.min) * Math.max(Math.abs(ma), Math.abs(u.min)) : ma; }); // >0 flexor
  return { total: tCarga + tSeg, mus, dCarga: Math.abs(torqueX(L, g)), flexiona: s * (tCarga + tSeg) > 0 };
}
function movAplicar() {
  const J = MOV.J, C = J.C;
  // posição do corpo (sentado, deitado, banco Scott...): gira a cena em torno da articulação para a gravidade continuar "para baixo" na tela
  scene.matrixAutoUpdate = false; scene.matrix.copy(rotX(C, -MOV.alfa)); scene.matrixWorldNeedsUpdate = true; MOV.sInv = scene.matrix.clone().invert();
  const R = rotacao(MOV.ang);
  for (const d of J.dist) { d.m.matrixAutoUpdate = false; d.m.matrix.copy(d.Pi).multiply(d.k === 1 ? R : rotacao(MOV.ang, J, d.k)).multiply(d.M0); }
  J.obj.matrix.copy(R).multiply(J.objM0); J.obj.visible = MOV.carga > 0;
  if (J.rolo) { const z = MOV.alfa === 90 ? 0.075 : -0.06; J.rolo.position.z = z; J.haste.position.z = z; }   // extensora: rolo na frente; flexoras: atrás do tornozelo
  for (const u of J.mus) {
    u.I.copy(u.I0).applyMatrix4(R); u.pi.position.copy(u.I);
    const d = _v.subVectors(u.I, u.O), L = d.length();
    u.tubo.position.copy(u.O); u.tubo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize()); u.tubo.scale.set(0.002, 0.002, L);
  }
  const Lp = J.P[J.cfg.carga].clone().applyMatrix4(R), g = gravidade();
  J.seta.position.copy(Lp); J.seta.setDirection(g);
  const P = Lp.clone().addScaledVector(g, _v.subVectors(C, Lp).dot(g));
  J.perp.geometry.setFromPoints([C, P]); J.perp.computeLineDistances(); MOV.Pp = P;
  movPainel();
}
const f1 = (x, d = 1) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
function movPainel() {
  if (!$('mvA')) return;
  const J = MOV.J, r = calcular(MOV.ang); MOV.ult = r;
  $('mvA').textContent = Math.round(MOV.ang) + '°'; $('mvS').value = MOV.ang;
  $('mvT').innerHTML = f1(Math.abs(r.total)) + '<i>N·m</i>'; $('mvD').innerHTML = f1(r.dCarga * 100) + '<i>cm</i>';
  const quase = Math.abs(r.total) < 0.05, precisa = quase ? null : r.flexiona ? 'extensores' : 'flexores';
  $('mvQ').textContent = precisa ? `A gravidade tende a ${r.flexiona ? 'flexionar' : 'estender'} o ${J.cfg.titulo.split(' ')[0].toLowerCase()}: quem segura a carga são os ${precisa}.` : 'O segmento está alinhado com a gravidade: quase nenhum torque.';
  $('mvM').innerHTML = J.mus.map((u, i) => {
    const ma = r.mus[i], flex = ma > 0, util = precisa && ((precisa === 'flexores') === flex) && Math.abs(ma) > 0.004;
    const F = util ? Math.abs(r.total) / Math.abs(ma) : null;
    return `<tr><td><span class="dot" style="background:${u.cor}"></span>${esc(u.nome)}<br><small style="color:var(--ink3)">${flex ? 'flexor' : 'extensor'}</small></td><td>${f1(Math.abs(ma) * 100)} cm</td><td>${F ? f1(F, 0) + ' N<br><small style="color:var(--ink3)">≈ ' + f1(F / G, 0) + ' kgf</small>' : '—'}</td></tr>`;
  }).join('');
  desenharGraf();
  const pico = Math.max(...MOV.curva.map(c => c[1])), z = (J.cfg.zonas ? J.cfg.zonas(MOV.ang, MOV.alfa) : []).filter(Boolean);
  if (pico > 1 && Math.abs(r.total) >= 0.9 * pico) z.unshift(['Perto do pico de torque', 'Este é o ponto mais pesado do exercício nesta posição: é aqui que a carga "trava" e onde a técnica costuma se perder.', 1]);
  $('mvZ').innerHTML = z.map(([t, x, ok]) => `<div class="zona${ok ? ' ok' : ''}"><b>${t}</b><br>${x}</div>`).join('');
}
function desenharGraf() {
  const cv = $('graf'); if (!cv) return; const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const J = MOV.J, mx = J.cfg.max, chave = [MOV.j, MOV.carga, MOV.massa, MOV.alfa].join('|');
  if (MOV.curvaK !== chave) { MOV.curva = []; for (let a = 0; a <= mx; a += 2.5) { const r = calcular(a); MOV.curva.push([a, Math.abs(r.total), Math.abs(r.mus[0] || 0) * 100]); } MOV.curvaK = chave; }
  const pl = 34, pr = 34, pt = 10, pb = 22, W = w - pl - pr, H = h - pt - pb;
  const tMax = Math.max(1, ...MOV.curva.map(c => c[1])) * 1.1, mMax = Math.max(1, ...MOV.curva.map(c => c[2])) * 1.15;
  const X = a => pl + a / mx * W, Yt = t => pt + H - t / tMax * H, Ym = m => pt + H - m / mMax * H;
  x.font = '10px Instrument Sans, sans-serif'; x.fillStyle = '#73839a'; x.strokeStyle = '#243344'; x.lineWidth = 1;
  for (const a of [0, 45, 90, 135]) { if (a > mx) continue; x.beginPath(); x.moveTo(X(a), pt); x.lineTo(X(a), pt + H); x.stroke(); x.textAlign = 'center'; x.fillText(a + '°', X(a), h - 6); }
  x.textAlign = 'right'; x.fillText(f1(tMax / 1.1, 0), pl - 4, Yt(tMax / 1.1) + 3); x.fillText('0', pl - 4, pt + H + 3);
  x.textAlign = 'left'; x.fillText(f1(mMax / 1.15, 1), w - pr + 4, Ym(mMax / 1.15) + 3);
  const linha = (f, cor, lw) => { x.beginPath(); MOV.curva.forEach((c, i) => { const px = X(c[0]), py = f(c); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.strokeStyle = cor; x.lineWidth = lw; x.stroke(); };
  linha(c => Ym(c[2]), J.mus[0] ? J.mus[0].cor : '#ff5d73', 1.6); linha(c => Yt(c[1]), '#ffd43b', 2.4);
  x.strokeStyle = '#2fd3c6'; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(X(MOV.ang), pt); x.lineTo(X(MOV.ang), pt + H); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#ffd43b'; x.beginPath(); x.arc(X(MOV.ang), Yt(Math.abs(MOV.ult.total)), 4, 0, 7); x.fill();
}
function painelMov() {
  const J = MOV.J, c = J.cfg, art = c.titulo.split(' ')[0].toLowerCase();
  $('pT').textContent = c.titulo; $('pS').innerHTML = '<span class="tag">modo movimento</span>flexão e extensão';
  $('pB').innerHTML = `<div class="mv">
    <p style="margin-top:2px">Arraste a <b>${c.seg}</b> no modelo, ou use a barra abaixo.</p>
    <div class="mv-ang"><b id="mvA">0°</b><span>de flexão do ${art}<br>plano sagital · eixo látero-lateral</span></div>
    <input id="mvS" type="range" min="0" max="${c.max}" step="1" value="${MOV.ang}">
    <div class="mv-ctl"><span>${c.rotCarga}</span><output id="mvCo">${MOV.carga} kg</output><input id="mvC" type="range" min="0" max="${c.cargaMax}" step="1" value="${MOV.carga}"></div>
    <div class="mv-ctl"><span>Massa corporal (peso do próprio segmento)</span><output id="mvPo">${MOV.massa} kg</output><input id="mvP" type="range" min="40" max="140" step="1" value="${MOV.massa}"></div>
    <div class="seg" id="mvB">${c.posicoes.map(([a, t]) => `<button data-a="${a}" class="${a === MOV.alfa ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="kp"><div><small>Torque externo no ${art}</small><b id="mvT"></b></div><div><small>Distância perpendicular da carga até o eixo</small><b id="mvD"></b></div></div>
    <p id="mvQ" style="font-size:13px"></p><div id="mvZ"></div>
    <h3>Torque ao longo do movimento</h3>
    <div class="leg"><span><i style="background:#ffd43b"></i>torque externo (N·m)</span><span><i style="background:${J.mus[0] ? J.mus[0].cor : '#ff5d73'}"></i>braço de momento: ${esc(J.mus[0] ? J.mus[0].nome.toLowerCase() : '')} (cm)</span></div>
    <canvas id="graf"></canvas>
    <h3>Músculos: braço de momento e força</h3>
    <table class="ac mt"><tr><th>Músculo</th><th>Braço de momento</th><th>Força p/ equilibrar</th></tr><tbody id="mvM"></tbody></table>
    <p style="font-size:12px;color:var(--ink3)">"Força p/ equilibrar" é a força que o músculo teria que fazer se trabalhasse sozinho. Na prática, os músculos dividem a tarefa.</p>
    <h3>Como ler</h3>${c.texto}
    <div class="aviso">Valores aproximados para estudo: ${c.aviso}</div>
    <div class="fontes">Fontes: ${c.fontes} · Modelo 3D: Z-Anatomy (CC BY-SA 4.0).</div></div>`;
  $('painel').classList.add('on'); painelAberto = true; resize();
  $('mvS').oninput = e => { MOV.ang = +e.target.value; movAplicar(); };
  $('mvC').oninput = e => { MOV.carga = +e.target.value; $('mvCo').textContent = MOV.carga + ' kg'; movAplicar(); };
  $('mvP').oninput = e => { MOV.massa = +e.target.value; $('mvPo').textContent = MOV.massa + ' kg'; movAplicar(); };
  $('mvB').onclick = e => { const b = e.target.closest('button'); if (!b) return; MOV.alfa = +b.dataset.a; $('mvB').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); movAplicar(); enquadrar(); };
}
async function entrarMov(id = 'cotovelo') {
  if (typeof id !== 'string') id = 'cotovelo';
  toast('Preparando o modo movimento…'); const J = await prepararMov(id);
  if (MOV.on) sairMov(false); if (AG.on) sairAg(false);
  const c = J.cfg;
  Object.assign(MOV, { on: true, j: id, J, vis: J.vis, ang: c.ang0, carga: c.carga0, alfa: c.posicoes[0][0] });
  document.body.classList.add('mov'); if (modoTirar) $('bTirar').click();
  J.grupo.visible = true; grid.visible = false;
  $('rot').innerHTML = `<span id="rAng" style="color:#2fd3c6"></span><span id="rD" style="color:#ffd43b"></span><span id="rEixo" style="color:#2fd3c6;font-weight:500;font-size:11px">${c.eixo}</span>`; $('rot').style.display = '';
  aplicarVis(); destacar(null); painelMov(); movAplicar();
  enquadrar();
  toast(`Arraste a ${c.seg} para mover o ${c.titulo.split(' ')[0].toLowerCase()}`);
}
// enquadra a câmera (vista lateral direita) no braço/perna inteiro e em todo o arco do movimento, descontando o painel
function enquadrar() {
  const J = MOV.J, S = scene.matrix, b = new THREE.Box3();
  scene.updateMatrixWorld(true);
  for (const n of J.cfg.vis) if (MESH[n]) b.expandByObject(MESH[n]);
  b.expandByPoint(J.C.clone().applyMatrix4(S));
  for (let a = 0; a <= J.cfg.max; a += 10) for (const k of Object.keys(J.P)) b.expandByPoint(J.P[k].clone().applyMatrix4(rotacao(a)).applyMatrix4(S));
  const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  const W = innerWidth, H = innerHeight, cel = W < 900;
  const area = cel ? { x0: 0, x1: W, y0: 112, y1: H * 0.5 - 6 } : { x0: 0, x1: W - 430, y0: 60, y1: H - 60 };
  const t = Math.tan(cam.fov * Math.PI / 360), aw = (area.x1 - area.x0) / W, ah = (area.y1 - area.y0) / H;
  const dist = 1.12 * Math.max(sz.y / 2 / (t * ah), sz.z / 2 / (t * cam.aspect * aw)) + sz.x / 2;
  const dir = new THREE.Vector3(-1, 0.06, 0.06).normalize();
  const fwd = dir.clone().negate(), dir_r = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(dir_r, fwd);
  const wpp = 2 * dist * t / H, dx = (area.x0 + area.x1) / 2 - W / 2, dy = (area.y0 + area.y1) / 2 - H / 2;
  const alvo = c.clone().addScaledVector(dir_r, -dx * wpp).addScaledVector(up, dy * wpp);
  voar(alvo.toArray(), dist, dir, false);
}
function sairMov(fechaPainel = true) {
  const J = MOV.J; MOV.on = false; MOV.arrastando = false; ctl.enabled = true; document.body.classList.remove('mov');
  scene.matrix.identity(); scene.matrixAutoUpdate = true; scene.matrixWorldNeedsUpdate = true; grid.visible = true;
  if (J) { for (const d of J.dist) { d.m.matrixAutoUpdate = true; d.m.updateMatrix(); } J.grupo.visible = false; }
  $('rot').style.display = 'none'; aplicarVis(); if (fechaPainel) fechar();
}
$('bSairMov').onclick = () => { if (AG.on) { sairAg(); regiao('joelho'); return; } const j = MOV.j; sairMov(); regiao(j); };
$('bDados').onclick = () => { if (MOV.on) { painelMov(); movPainel(); } else if (AG.on) { painelAg(); agPainel(); } };
const planoSag = new THREE.Plane(), _p = new THREE.Vector3();
function movDown(e) {
  mirar(e); const J = MOV.J;
  if (!ray.intersectObjects([...J.dist.map(d => d.m), J.obj], true).length) return;
  MOV.arrastando = true; ctl.enabled = false; planoSag.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), J.C);
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
}
function movMove(e) {
  const J = MOV.J; mirar(e); if (!ray.ray.clone().applyMatrix4(MOV.sInv).intersectPlane(planoSag, _p)) return;
  let a = -J.cfg.s * (Math.atan2(_p.z - J.C.z, -(_p.y - J.C.y)) - J.phi0) * 180 / Math.PI;
  if (a < -60) a += 360; if (a > 300) a -= 360;
  const novo = Math.max(0, Math.min(J.cfg.max, a));
  if (Math.abs(novo - MOV.ang) > 0.2) { MOV.ang = novo; movAplicar(); }
}
const _s = new THREE.Vector3();
function movQuadro() {
  const J = MOV.J; if (!MOV.Pp) return;
  const pos = (id, v) => { const el = $(id); if (!el) return; _s.copy(v).applyMatrix4(scene.matrix).project(cam); el.style.display = _s.z < 1 ? '' : 'none'; el.style.left = (_s.x + 1) / 2 * innerWidth + 'px'; el.style.top = (1 - _s.y) / 2 * innerHeight + 'px'; };
  $('rAng').textContent = Math.round(MOV.ang) + '°'; pos('rAng', J.C.clone().add(new THREE.Vector3(0, 0.035, -0.04)));
  $('rD').textContent = 'd⊥ ' + f1((MOV.ult ? MOV.ult.dCarga : 0) * 100) + ' cm'; pos('rD', J.C.clone().lerp(MOV.Pp, 0.5).add(new THREE.Vector3(0, 0.02, 0)));
  pos('rEixo', J.C.clone().add(new THREE.Vector3(0.1, 0, 0)));
}

/* ---------- agachamento: cadeia fechada (tornozelo, joelho, quadril e tronco) ---------- */
// Modelo sagital de 4 segmentos rígidos: pé fixo no chão; perna gira no tornozelo; coxa no joelho; tronco (com cabeça) no quadril.
// O tronco se inclina o quanto for preciso para o centro de massa (corpo + barra) ficar sobre o meio do pé.
const AG = { on: false, k: 90, mob: 35, carga: 60, massa: 75, barra: 'alta', pronto: false, seg: { pe: [], perna: [], coxa: [], tronco: [] }, mus: [], vis: new Set() };
// [nome, altura em relação ao ombro, posição à frente(+)/atrás(-), quanto o joelho avança por grau de flexão]
const BARRAS = { alta: ['Barra alta', 0.045, -0.06, 0.4], baixa: ['Barra baixa', -0.025, -0.08, 0.3], frontal: ['Frontal', 0.05, 0.07, 0.5] };
const AG_MUS = [   // [origem, segmento, inserção, segmento, nome, cor]
  ['Gluteus maximus muscle', 'tronco', 'Gluteus maximus muscle', 'coxa', 'Glúteo máximo', '#ff5d73'],
  ['Adductor magnus', 'tronco', 'Adductor magnus', 'coxa', 'Adutor magno', '#c084fc'],
  ['Semitendinosus muscle', 'tronco', 'Semitendinosus muscle', 'perna', 'Isquiotibiais (semitendíneo)', '#4dabf7'],
  ['Rectus femoris muscle', 'tronco', 'Quadriceps femoris muscle', 'perna', 'Reto femoral', '#ff9f43'],
  ['Vastus lateralis muscle', 'coxa', 'Quadriceps femoris muscle', 'perna', 'Vasto lateral', '#ffd43b'],
  ['Soleus muscle', 'perna', 'Triceps surae muscle', 'pe', 'Sóleo', '#94d82d'],
  ['Medial head of gastrocnemius', 'coxa', 'Triceps surae muscle', 'pe', 'Gastrocnêmio', '#b2f2bb'],
];
const SEG_RE = { pe: /^(Talus|Calcaneus|Navicular bone|Cuboid bone)$|cuneiform|metatarsal|of foot/, perna: /^(Tibia|Fibula)$/, coxa: /^(Femur|Patella)$/,
  braco: /^(Humerus|Radius|Ulna)$|of hand|metacarpal|Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate/ };
const plano = v => new THREE.Vector3(0, v.y, v.z);   // eixo de todas as articulações é látero-lateral (X): só y e z importam
async function prepararAg() {
  if (AG.pronto) return;
  await garantir('insercoes');
  const mediaLados = (n, f) => plano(f(n + '.r').add(f(n + '.l')).multiplyScalar(0.5));
  AG.A = mediaLados('Tibia', n => { const vs = vertsMundo(MESH[n]); const mn = Math.min(...vs.map(v => v.y)); const c = media(vs.filter(v => v.y < mn + 0.015)); c.y = mn + 0.012; return c; });
  AG.K = mediaLados('Femur', n => { const vs = vertsMundo(MESH[n]); const mn = Math.min(...vs.map(v => v.y)); const c = media(vs.filter(v => v.y < mn + 0.03)); c.y = mn + 0.022; return c; });
  AG.H = mediaLados('Femur', n => {   // centro da cabeça do fêmur: parte mais alta e mais medial do fêmur
    const vs = vertsMundo(MESH[n]); const mx = Math.max(...vs.map(v => v.y)); const top = vs.filter(v => v.y > mx - 0.05);
    const mid = top.reduce((a, v) => a + Math.abs(v.x), 0) / top.length; const c = media(top.filter(v => Math.abs(v.x) < mid)); c.y = mx - 0.024; return c; });
  AG.S = mediaLados('Humerus', n => { const vs = vertsMundo(MESH[n]); const mx = Math.max(...vs.map(v => v.y)); const c = media(vs.filter(v => v.y > mx - 0.03)); c.y = mx - 0.02; return c; });
  for (const [n, m] of Object.entries(MESH)) {
    if (m.userData.camada !== 'ossos') continue; const b = (E[n] || {}).b || '';
    if (SEG_RE.braco.test(b)) continue;
    const s = SEG_RE.pe.test(b) ? 'pe' : SEG_RE.perna.test(b) ? 'perna' : SEG_RE.coxa.test(b) ? 'coxa' : 'tronco';
    m.updateWorldMatrix(true, false); AG.seg[s].push({ m, M0: m.matrixWorld.clone(), Pi: m.parent.matrixWorld.clone().invert() }); AG.vis.add(n);
  }
  const pe = caixa(AG.seg.pe.map(d => d.m)); AG.M = AG.A.clone(); AG.M.z += 0.045;   // meio do pé: cerca de 4 a 5 cm à frente do tornozelo AG.chao = pe.min.y;
  const centro = (b, t) => { const vs = []; for (const [n, e] of Object.entries(E)) if (e.c === 'insercoes' && e.b === b && e.t === t && e.l === 'direito' && MESH[n]) vs.push(...vertsMundo(MESH[n])); return vs.length ? media(vs) : null; };
  const grupo = new THREE.Group(); grupo.visible = false; scene.add(grupo); AG.grupo = grupo;
  const cil = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), esf = new THREE.SphereGeometry(1, 16, 12);
  for (const [bo, so, bi, si, nome, cor] of AG_MUS) {
    const O = centro(bo, 'origem'), I = centro(bi, 'inserção'); if (!O || !I) continue;
    const mat = new THREE.MeshBasicMaterial({ color: cor, depthTest: false, transparent: true, opacity: 0.85 });
    const tubo = new THREE.Mesh(cil, mat), po = new THREE.Mesh(esf, mat), pi = new THREE.Mesh(esf, mat); po.scale.setScalar(0.007); pi.scale.setScalar(0.007);
    [tubo, po, pi].forEach(o => o.renderOrder = 10); grupo.add(tubo, po, pi); AG.mus.push({ O, so, I, si, nome, cor, tubo, po, pi });
  }
  // barra olímpica (2,2 m) com anilhas
  const ferro = new THREE.MeshStandardMaterial({ color: '#9aa6b5', metalness: 0.6, roughness: 0.3, emissive: '#1b2430' });
  const anilha = new THREE.MeshStandardMaterial({ color: '#3b4a5e', roughness: 0.6, transparent: true, opacity: 0.28, depthWrite: false });
  const barra = new THREE.Group();
  barra.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.2, 16).rotateZ(Math.PI / 2), ferro));
  AG.anilhas = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.03, 32).rotateZ(Math.PI / 2), anilha); a.position.x = s * (0.6 + i * 0.035); barra.add(a); AG.anilhas.push(a); }
  barra.position.x = AG.H.x; grupo.add(barra); AG.barra3d = barra;
  // linha da gravidade da barra e distâncias horizontais até cada articulação
  const tr = (cor, dash) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), dash ? new THREE.LineDashedMaterial({ color: cor, dashSize: 0.012, gapSize: 0.008, depthTest: false }) : new THREE.LineBasicMaterial({ color: cor, depthTest: false })); l.renderOrder = 12; grupo.add(l); return l; };
  AG.linhaG = tr('#ffd43b'); AG.dH = tr('#ff5d73', 1); AG.dK = tr('#ff9f43', 1); AG.dA = tr('#94d82d', 1);
  const verde = new THREE.MeshBasicMaterial({ color: '#2fd3c6', depthTest: false });
  AG.juntas = ['A', 'K', 'H'].map(() => { const b = new THREE.Mesh(esf, verde); b.scale.setScalar(0.012); b.renderOrder = 11; grupo.add(b); return b; });
  AG.pronto = true;
}
const T = (P, ang, Pn = P) => new THREE.Matrix4().makeTranslation(0, Pn.y, Pn.z).multiply(new THREE.Matrix4().makeRotationX(ang * Math.PI / 180)).multiply(new THREE.Matrix4().makeTranslation(0, -P.y, -P.z));
// posição do corpo para uma flexão de joelho k; devolve transformações, ângulos, pontos e momentos
function agPose(k, u = null) {
  const s = Math.min(AG.mob, BARRAS[AG.barra][3] * k), t = k - s;                       // dorsiflexão (canela à frente) e inclinação da coxa
  const Mp = T(AG.A, s), Kp = AG.K.clone().applyMatrix4(Mp);
  const Mc = T(AG.K, -t, Kp), Hp = AG.H.clone().applyMatrix4(Mc);
  const B0 = (() => { const [, dy, dz] = BARRAS[AG.barra]; return new THREE.Vector3(0, AG.S.y + dy, AG.S.z + dz); })();
  const HAT0 = AG.H.clone().lerp(AG.S, 0.626);                           // centro de massa de cabeça, braços e tronco (Winter)
  const coxa0 = AG.H.clone().lerp(AG.K, 0.433), perna0 = AG.K.clone().lerp(AG.A, 0.433);
  const m = { barra: AG.carga, hat: 0.678 * AG.massa, coxa: 0.2 * AG.massa, perna: 0.093 * AG.massa };
  const montar = u => {
    const Mt = T(AG.H, u, Hp);
    const B = B0.clone().applyMatrix4(Mt), HAT = HAT0.clone().applyMatrix4(Mt), C = coxa0.clone().applyMatrix4(Mc), P = perna0.clone().applyMatrix4(Mp);
    const zcm = (m.barra * B.z + m.hat * HAT.z + m.coxa * C.z + m.perna * P.z) / (m.barra + m.hat + m.coxa + m.perna);
    return { Mt, B, HAT, C, P, zcm };
  };
  if (u === null) {   // equilíbrio: centro de massa sobre o meio do pé (busca binária na inclinação do tronco)
    let lo = -15, hi = 85;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; montar(mid).zcm > AG.M.z ? (hi = mid) : (lo = mid); }
    u = (lo + hi) / 2;
  }
  const r = montar(u), g = G;
  // momentos externos por perna (N·m); positivo = pede extensores no quadril e no joelho, flexores plantares no tornozelo
  const mQ = (m.barra * (r.B.z - Hp.z) + m.hat * (r.HAT.z - Hp.z)) * g / 2;
  const mJ = (m.barra * (Kp.z - r.B.z) + m.hat * (Kp.z - r.HAT.z) + m.coxa * (Kp.z - r.C.z)) * g / 2;
  const mT = (m.barra * (r.B.z - AG.A.z) + m.hat * (r.HAT.z - AG.A.z) + m.coxa * (r.C.z - AG.A.z) + m.perna * (r.P.z - AG.A.z)) * g / 2;
  return { s, t, u, k, quadril: t + u, Mp, Mc, Mt: r.Mt, Kp, Hp, B: r.B, mQ, mJ, mT };
}
function agAplicar() {
  const p = agPose(AG.k); AG.p = p;
  const M = { pe: new THREE.Matrix4(), perna: p.Mp, coxa: p.Mc, tronco: p.Mt };
  for (const [s, lst] of Object.entries(AG.seg)) for (const d of lst) { d.m.matrixAutoUpdate = false; d.m.matrix.copy(d.Pi).multiply(M[s]).multiply(d.M0); }
  for (const u of AG.mus) {
    const O = u.O.clone().applyMatrix4(M[u.so]), I = u.I.clone().applyMatrix4(M[u.si]); u.po.position.copy(O); u.pi.position.copy(I);
    const d = _v.subVectors(I, O); u.tubo.position.copy(O); u.tubo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize()); u.tubo.scale.set(0.0025, 0.0025, d.length());
  }
  const x = AG.H.x, B = p.B; AG.barra3d.position.set(0, B.y, B.z); AG.barra3d.visible = AG.carga > 0;
  const nAn = AG.carga <= 0 ? 0 : AG.carga <= 60 ? 1 : AG.carga <= 140 ? 2 : 3; AG.anilhas.forEach((a, i) => a.visible = (i % 3) < nAn);
  const v = (y, z) => new THREE.Vector3(x, y, z);
  AG.linhaG.geometry.setFromPoints([v(B.y, B.z), v(AG.chao, B.z)]);
  const hz = (L, P) => { L.geometry.setFromPoints([v(P.y, P.z), v(P.y, B.z)]); L.computeLineDistances(); };
  hz(AG.dH, p.Hp); hz(AG.dK, p.Kp); hz(AG.dA, AG.A);
  [AG.A, p.Kp, p.Hp].forEach((P, i) => AG.juntas[i].position.set(x, P.y, P.z));
  agPainel();
}
function agPainel() {
  if (!$('agK')) return; const p = AG.p;
  $('agK').textContent = Math.round(AG.k) + '°'; $('agS').value = AG.k;
  $('agAng').innerHTML = [['Tornozelo', p.s, 'dorsiflexão'], ['Joelho', p.k, 'flexão'], ['Quadril', p.quadril, 'flexão'], ['Tronco', p.u, 'inclinação à frente']].map(([n, a, d]) => `<div><small>${n} · ${d}</small><b>${Math.round(a)}°</b></div>`).join('');
  const mx = Math.max(10, Math.abs(p.mQ), Math.abs(p.mJ), Math.abs(p.mT));
  const barra = (nome, val, cor, quem, braco) => {
    const F = Math.abs(val) / braco;
    return `<div class="agm"><div class="agm-t"><span><i style="background:${cor}"></i>${nome}</span><b>${f1(Math.abs(val), 0)} N·m</b></div><div class="agm-b"><i style="width:${Math.abs(val) / mx * 100}%;background:${cor}"></i></div><small>${val >= 0 ? quem : 'pede o grupo oposto'} · força estimada ≈ ${f1(F, 0)} N (${f1(F / G, 0)} kgf)</small></div>`;
  };
  $('agM').innerHTML = barra('Quadril', p.mQ, '#ff5d73', 'extensores do quadril (glúteo máximo, adutor magno, isquiotibiais)', 0.07)
    + barra('Joelho', p.mJ, '#ff9f43', 'extensores do joelho (quadríceps)', 0.045) + barra('Tornozelo', p.mT, '#94d82d', 'flexores plantares (sóleo e gastrocnêmio)', 0.05);
  const soma = Math.abs(p.mQ) + Math.abs(p.mJ);
  $('agR').innerHTML = soma > 1 ? `Divisão do esforço entre quadril e joelho: <b style="color:#ff5d73">${Math.round(Math.abs(p.mQ) / soma * 100)}% quadril</b> · <b style="color:#ff9f43">${Math.round(Math.abs(p.mJ) / soma * 100)}% joelho</b>` : '';
  agGraf();
  const toe = Math.max(...AG.seg.pe.map(d => new THREE.Box3().setFromObject(d.m).max.z));
  const z = [
    p.k >= 100 && ['Agachamento profundo', 'A compressão no joelho aumenta com a flexão, mas fica abaixo da capacidade dos tecidos em pessoas treinadas. Com boa técnica e progressão, o agachamento profundo não aumenta o risco de lesão em joelhos saudáveis (Hartmann et al., 2013).', 1],
    p.Kp.z > toe && ['Joelho à frente da ponta do pé', 'É normal e esperado. Impedir o joelho de avançar diminui o torque no joelho, mas aumenta muito o do quadril e a inclinação do tronco (Fry et al., 2003).', 1],
    p.s >= AG.mob - 0.5 && p.k > 30 && ['Tornozelo no limite', 'A dorsiflexão chegou ao máximo: daqui em diante o tronco precisa inclinar mais para o corpo não cair para trás. Calço no calcanhar ou sapato de levantamento ajudam quem tem pouca mobilidade.'],
    p.u >= 45 && ['Tronco muito inclinado', 'Mais exigência para os extensores do quadril e da coluna. Observe se a lombar consegue manter a posição; se ela arredondar sob carga alta, reduza a profundidade ou a carga.'],
    p.quadril >= 115 && ['Fundo do agachamento', 'Com o quadril muito flexionado, a pelve pode girar para trás e a lombar arredondar no fundo. Pouca amplitude não é problema em si; a profundidade ideal é a que a pessoa controla sem dor.'],
  ].filter(Boolean);
  $('agZ').innerHTML = z.map(([t, x, ok]) => `<div class="zona${ok ? ' ok' : ''}"><b>${t}</b><br>${x}</div>`).join('');
}
function agGraf() {
  const cv = $('agG'); if (!cv) return; const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const chave = [AG.mob, AG.carga, AG.massa, AG.barra].join('|');
  if (AG.curvaK !== chave) { AG.curva = []; for (let k = 0; k <= 130; k += 5) { const p = agPose(k); AG.curva.push([k, p.mQ, p.mJ, p.mT]); } AG.curvaK = chave; }
  const pl = 34, pr = 10, pt = 10, pb = 22, W = w - pl - pr, H = h - pt - pb;
  const vals = AG.curva.flatMap(c => c.slice(1)), mx = Math.max(10, ...vals) * 1.1, mn = Math.min(0, ...vals) * 1.1;
  const X = k => pl + k / 130 * W, Y = v => pt + H - (v - mn) / (mx - mn) * H;
  x.font = '10px Instrument Sans, sans-serif'; x.fillStyle = '#73839a'; x.strokeStyle = '#243344'; x.lineWidth = 1;
  for (const k of [0, 45, 90, 120]) { x.beginPath(); x.moveTo(X(k), pt); x.lineTo(X(k), pt + H); x.stroke(); x.textAlign = 'center'; x.fillText(k + '°', X(k), h - 6); }
  x.beginPath(); x.moveTo(pl, Y(0)); x.lineTo(pl + W, Y(0)); x.stroke();
  x.textAlign = 'right'; x.fillText(f1(mx / 1.1, 0), pl - 4, Y(mx / 1.1) + 3); x.fillText('0', pl - 4, Y(0) + 3);
  [[1, '#ff5d73'], [2, '#ff9f43'], [3, '#94d82d']].forEach(([i, cor]) => { x.beginPath(); AG.curva.forEach((c, j) => { j ? x.lineTo(X(c[0]), Y(c[i])) : x.moveTo(X(c[0]), Y(c[i])); }); x.strokeStyle = cor; x.lineWidth = 2; x.stroke(); });
  x.strokeStyle = '#2fd3c6'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(X(AG.k), pt); x.lineTo(X(AG.k), pt + H); x.stroke(); x.setLineDash([]);
}
function painelAg() {
  $('pT').textContent = 'Agachamento · biomecânica'; $('pS').innerHTML = '<span class="tag">cadeia fechada</span>tornozelo, joelho e quadril';
  $('pB').innerHTML = `<div class="mv">
    <p style="margin-top:2px">Arraste o corpo para <b>cima e para baixo</b> no modelo, ou use a barra abaixo.</p>
    <div class="mv-ang"><b id="agK">0°</b><span>de flexão do joelho<br>(profundidade do agachamento)</span></div>
    <input id="agS" type="range" min="0" max="130" step="1" value="${AG.k}">
    <div class="kp ag4" id="agAng"></div>
    <div class="seg" id="agB">${Object.entries(BARRAS).map(([k, [t]]) => `<button data-b="${k}" class="${k === AG.barra ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="mv-ctl"><span>Carga na barra</span><output id="agCo">${AG.carga} kg</output><input id="agC" type="range" min="0" max="200" step="5" value="${AG.carga}"></div>
    <div class="mv-ctl"><span>Mobilidade de tornozelo (dorsiflexão máxima)</span><output id="agMo">${AG.mob}°</output><input id="agMob" type="range" min="10" max="45" step="1" value="${AG.mob}"></div>
    <div class="mv-ctl"><span>Massa corporal</span><output id="agPo">${AG.massa} kg</output><input id="agP" type="range" min="40" max="140" step="1" value="${AG.massa}"></div>
    <h3>Momento externo em cada articulação (por perna)</h3><div id="agM"></div><p id="agR" style="font-size:13px"></p><div id="agZ"></div>
    <h3>Ao longo da descida</h3>
    <div class="leg"><span><i style="background:#ff5d73"></i>quadril</span><span><i style="background:#ff9f43"></i>joelho</span><span><i style="background:#94d82d"></i>tornozelo</span><span>(N·m por perna × flexão do joelho)</span></div>
    <canvas id="agG" style="width:100%;height:170px;display:block;margin-top:6px"></canvas>
    <h3>Como ler</h3>
    <p>A <b>linha amarela</b> desce da barra até o chão. Para ficar em equilíbrio, o corpo se ajusta para o centro de massa (corpo + barra) ficar sobre o <b>meio do pé</b>. As linhas tracejadas mostram a <b>distância horizontal</b> de cada articulação até essa linha: quanto maior, maior o momento que os músculos daquela articulação precisam vencer.</p>
    <p><b>Barra alta x barra baixa x frontal:</b> com a barra mais baixa nas costas, o tronco inclina mais, o quadril se afasta da linha e o esforço vai para os extensores do quadril. Na frontal, o tronco fica mais vertical e o joelho avança mais (se a mobilidade de tornozelo permitir), e o quadríceps assume mais.</p>
    <p><b>Mobilidade de tornozelo:</b> diminua a dorsiflexão e veja o que acontece: o joelho avança menos, o tronco precisa inclinar mais para o corpo não cair para trás, e o esforço migra do joelho para o quadril e a lombar.</p>
    <p><b>Tornozelo:</b> como o centro de massa fica sempre sobre o meio do pé, o momento no tornozelo quase não muda com a profundidade. Ele cresce com o peso total (corpo + barra).</p>
    <p><b>Profundidade:</b> os momentos no quadril e no joelho aumentam conforme você desce. O joelho chega perto do máximo por volta da paralela e o quadril continua subindo.</p>
    <div class="aviso">Valores aproximados para estudo: modelo no plano sagital com segmentos rígidos (o tronco não flexiona a coluna), carga dividida igualmente entre as pernas, centro de massa dos segmentos e massas pelas proporções de Winter. A força estimada usa braços de momento médios: 7 cm para os extensores do quadril, 4,5 cm para o quadríceps e 5 cm para o tendão do calcâneo. As linhas coloridas mostram a linha de tração de alguns músculos do lado direito.</div>
    <div class="fontes">Fontes: Neumann. Cinesiologia do aparelho musculoesquelético, caps. 12 e 13 · Escamilla (2001), Knee biomechanics of the dynamic squat exercise, Med Sci Sports Exerc · Hartmann, Wirth e Klusemann (2013), Sports Med · Fry, Smith e Schilling (2003), J Strength Cond Res · Winter. Biomechanics and Motor Control of Human Movement · Modelo 3D: Z-Anatomy (CC BY-SA 4.0).</div></div>`;
  $('painel').classList.add('on'); painelAberto = true; resize();
  $('agS').oninput = e => { AG.k = +e.target.value; agAplicar(); };
  $('agC').oninput = e => { AG.carga = +e.target.value; $('agCo').textContent = AG.carga + ' kg'; agAplicar(); };
  $('agMob').oninput = e => { AG.mob = +e.target.value; $('agMo').textContent = AG.mob + '°'; agAplicar(); };
  $('agP').oninput = e => { AG.massa = +e.target.value; $('agPo').textContent = AG.massa + ' kg'; agAplicar(); };
  $('agB').onclick = e => { const b = e.target.closest('button'); if (!b) return; AG.barra = b.dataset.b; $('agB').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); agAplicar(); };
}
async function entrarAg() {
  toast('Preparando o agachamento…'); await prepararAg();
  if (MOV.on) sairMov(false);
  AG.on = true; MOV.vis = AG.vis; document.body.classList.add('mov'); if (modoTirar) $('bTirar').click();
  AG.grupo.visible = true; grid.visible = true; $('rot').innerHTML = '<span id="rA" style="color:#94d82d"></span><span id="rK" style="color:#ff9f43"></span><span id="rH" style="color:#ff5d73"></span>'; $('rot').style.display = '';
  aplicarVis(); destacar(null); painelAg(); agAplicar(); agEnquadrar();
  toast('Arraste o corpo para cima e para baixo');
}
function agEnquadrar() {
  // vista lateral direita do corpo inteiro em pé até o agachamento profundo, descontando o painel
  scene.updateMatrixWorld(true); const b = new THREE.Box3(); for (const lst of Object.values(AG.seg)) for (const d of lst) b.expandByObject(d.m);
  const pf = agPose(120); b.expandByPoint(pf.B.clone().setX(AG.H.x)); b.expandByPoint(pf.Hp.clone().setX(AG.H.x));
  const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()); sz.x = 0.3;
  const W = innerWidth, H = innerHeight, cel = W < 900, area = cel ? { x0: 0, x1: W, y0: 112, y1: H * 0.5 - 6 } : { x0: 0, x1: W - 430, y0: 60, y1: H - 60 };
  const t = Math.tan(cam.fov * Math.PI / 360), aw = (area.x1 - area.x0) / W, ah = (area.y1 - area.y0) / H;
  const dist = 1.08 * Math.max(sz.y / 2 / (t * ah), sz.z / 2 / (t * cam.aspect * aw)) + 0.3;
  const dir = new THREE.Vector3(-1, 0.05, 0.12).normalize(), fwd = dir.clone().negate(), dr = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(dr, fwd);
  const wpp = 2 * dist * t / H, dx = (area.x0 + area.x1) / 2 - W / 2, dy = (area.y0 + area.y1) / 2 - H / 2;
  voar(c.clone().addScaledVector(dr, -dx * wpp).addScaledVector(up, dy * wpp).toArray(), dist, dir, false);
}
function sairAg(fechaPainel = true) {
  AG.on = false; AG.arrastando = false; ctl.enabled = true; document.body.classList.remove('mov');
  for (const lst of Object.values(AG.seg)) for (const d of lst) { d.m.matrixAutoUpdate = true; d.m.updateMatrix(); }
  AG.grupo.visible = false; $('rot').style.display = 'none'; aplicarVis(); if (fechaPainel) fechar();
}
function agDown(e) {
  mirar(e); const alvos = Object.values(AG.seg).flat().map(d => d.m);
  if (!ray.intersectObjects([...alvos, AG.barra3d], true).length) return;
  AG.arrastando = { y: e.clientY, k: AG.k }; ctl.enabled = false; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
}
function agMove(e) {
  const d = AG.arrastando; const k = Math.max(0, Math.min(130, d.k + (e.clientY - d.y) * 0.45));
  if (Math.abs(k - AG.k) > 0.3) { AG.k = k; agAplicar(); }
}
function agQuadro() {
  const p = AG.p; if (!p) return;
  const pos = (id, P, txt, dx = 0.0) => { const el = $(id); el.textContent = txt; _s.set(AG.H.x - 0.06, P.y, P.z + dx).project(cam); el.style.left = (_s.x + 1) / 2 * innerWidth + 'px'; el.style.top = (1 - _s.y) / 2 * innerHeight + 'px'; };
  pos('rA', AG.A, 'tornozelo ' + Math.round(p.s) + '°', -0.07); pos('rK', p.Kp, 'joelho ' + Math.round(p.k) + '°', 0.09); pos('rH', p.Hp, 'quadril ' + Math.round(p.quadril) + '°', -0.1);
}

/* ---------- motor de pose (GPU): desvios posturais e corpo inteiro em movimento ---------- */
const POST = DADOS.posturas; let desvioAtivo = null;
const CORES_P = { enc: '#ff8a3d', alo: '#4dabf7', ten: '#c084fc' };
const ROT_P = { enc: 'Encurtados', alo: 'Alongados ou enfraquecidos', ten: 'Tensionados (hiperativos)' };
const LOCAIS = ['Pé e tornozelo', 'Joelho', 'Quadril', 'Pelve e lombar', 'Pelve e tronco', 'Coluna torácica', 'Coluna (plano frontal)', 'Cintura escapular', 'Coluna cervical', 'Padrão global do tronco superior'];
const QUADRO = { pes: [0.32, 0.78], ombro: [1.5, 1.5], pernas: [0.56, 1.22], corpo: [0.9, 1.92], alto: [1.08, 2.32], tronco: [1.22, 1.0], braco: [1.2, 1.25], cabeca: [1.47, 0.62] };   // [altura do centro, altura visível] em metros
const VISTAS = { lat: [-1, 0.06, 0.14], post: [0.14, 0.08, -1], ant: [-0.22, 0.08, 1], obl: [0.8, 0.28, -1], frente: [-0.75, 0.16, 0.65] };
// Pose de cada desvio no grau máximo (graus; cm em "dentro", "tras", "comp" e "elev"). col: [flexão(+)/extensão(-), inclinação lateral, rotação axial] somados na região.
const POSES = {
  'pe-plano': { pe: { ev: 10, abd: 6 }, perna: { tibRot: 7, femRot: 4, dentro: 1.2 }, pelve: { ant: 3 }, col: { lum: [-3] }, fer: ['post', 'q'], vista: 'post', quadro: 'pernas' },
  'pe-cavo': { pe: { ev: -8 }, perna: { tibRot: -4, dentro: -1 }, fer: ['post'], vista: 'post', quadro: 'pernas' },
  valgo: { perna: { dentro: 3.2, femRot: 5 }, pe: { ev: 6 }, fer: ['q', 'post'], vista: 'ant', quadro: 'pernas' },
  varo: { perna: { dentro: -4 }, pe: { ev: -4 }, fer: ['q', 'post'], vista: 'ant', quadro: 'pernas' },
  recurvato: { perna: { tras: 4.5 }, pelve: { ant: 4 }, col: { lum: [-4] }, fer: ['lat'], vista: 'lat', quadro: 'pernas' },
  'rot-medial-femur': { perna: { femRot: 18, dentro: 1.5 }, pe: { abd: -10, ev: 4 }, pelve: { ant: 4 }, col: { lum: [-4] }, fer: ['q'], vista: 'ant', quadro: 'pernas' },
  anteversao: { perna: { inclina: -2.2 }, pelve: { ant: 13 }, col: { lum: [-15], torI: [5], torS: [3], cerI: [2], cerS: [-8] }, fer: ['lat'], vista: 'lat', quadro: 'corpo' },
  retroversao: { pelve: { ant: -10 }, col: { lum: [10] }, fer: ['lat'], vista: 'lat', quadro: 'corpo' },
  obliquidade: { perna: { comp: { d: 2 } }, compLat: 1, fer: ['post'], vista: 'post', quadro: 'corpo' },
  swayback: { perna: { inclina: 4, tras: 2 }, pelve: { ant: -10 }, col: { lum: [-2], torI: [8], torS: [8], cerI: [8], cerS: [-12] }, fer: ['lat'], vista: 'lat', quadro: 'corpo' },
  cifose: { col: { lum: [-6], torI: [12], torS: [14], cerI: [6], cerS: [-26] }, esc: { prot: 8, tilt: 6 }, braco: { rot: 10 }, fer: ['lat'], vista: 'lat', quadro: 'corpo' },
  escoliose: { col: { lum: [0, -11, -5], torI: [0, 22, 9], torS: [0, -11, -4] }, fer: ['post'], vista: 'post', quadro: 'corpo' },
  ombros: { esc: { prot: 14, tilt: 10 }, braco: { rot: 22 }, col: { torS: [6], cerI: [4], cerS: [-10] }, fer: ['lat'], vista: 'lat', quadro: 'tronco' },
  'escapula-alada': { esc: { wing: 24, tilt: 7, lado: 'd' }, fer: ['post'], vista: 'obl', quadro: 'tronco' },
  'ombro-elevado': { esc: { elev: 2.6, rotInf: 6 }, col: { cerI: [6], cerS: [-6] }, fer: ['post'], vista: 'post', quadro: 'tronco' },
  cabeca: { col: { torS: [4], cerI: [24], cerS: [-28] }, fer: ['lat'], vista: 'lat', quadro: 'cabeca' },
  'cruzada-superior': { esc: { prot: 14, tilt: 10, elev: 1 }, braco: { rot: 22 }, col: { lum: [-4], torI: [6], torS: [12], cerI: [22], cerS: [-36] }, fer: ['lat'], vista: 'lat', quadro: 'tronco' },
};
const FER_N = { lat: 'Prumo lateral', post: 'Prumo posterior', q: 'Ângulo Q' };

// Pesos de pele (quanto cada vértice de músculo segue cada osso). Roda num Web Worker; o código vai para o worker pelo toString().
function* pesosGen(d) {
  const { px, py, pz, ps, cel, nseg, FY, malhas, segs } = d, U = FY.length - 1, mapa = new Map();
  const chave = (a, b, c) => (a + 512) | ((b + 512) << 10) | ((c + 512) << 20);
  for (let q = 0; q < px.length; q++) { const k = chave(Math.floor(px[q] / cel), Math.floor(py[q] / cel), Math.floor(pz[q] / cel)); let a = mapa.get(k); if (!a) mapa.set(k, a = []); a.push(q); }
  // cadeias dos membros: nível de cada segmento (escápula e clavícula → úmero → antebraço; pelve → coxa → perna → pé → dedos)
  const NIVEL = { esc: 0, cla: 0, umero: 1, antebraco: 2, coxa: 1, perna: 2, pe: 3, dedos: 4 };
  const info = ['campo', ...segs].map(n => { if (n === 'pelve') return { t: 'membro', c: '*', n: 0 }; const m = /^(esc|cla|umero|antebraco|coxa|perna|pe|dedos)([de])$/.exec(n); if (!m) return { t: 'tronco' }; return { t: 'membro', c: (m[1] === 'esc' || m[1] === 'cla' || m[1] === 'umero' || m[1] === 'antebraco' ? 'b' : 'p') + m[2], n: NIVEL[m[1]] }; });
  const melhor = new Float32Array(nseg + 1), lista = [], cb = new Int16Array(16), cp = new Float32Array(16), livre = new Uint8Array(nseg + 1); let nc = 0;
  const add = (b, p) => { if (p <= 1e-6) return; for (let t = 0; t < nc; t++) if (cb[t] === b) { cp[t] += p; return; } if (nc < 16) { cb[nc] = b; cp[nc++] = p; } };
  let fj = 0, ff = 0;
  const campoAdd = p => { add(nseg + fj, p * (1 - ff)); add(nseg + fj + 1, p * ff); };
  const seg1 = (s, p) => s === 0 ? campoAdd(p) : add(s - 1, p);
  // ossos mais próximos do ponto (só entre os segmentos liberados); escala tudo por "peso"
  function prox(x, y, z, peso, filtro) {
    const ix = Math.floor(x / cel), iy = Math.floor(y / cel), iz = Math.floor(z / cel); lista.length = 0;
    for (const r of [1, 2, 4]) {
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) {
        const arr = mapa.get(chave(ix + a, iy + b, iz + c)); if (!arr) continue;
        for (let t = 0; t < arr.length; t++) { const q = arr[t], s = ps[q]; if (filtro && !livre[s]) continue; const dx = px[q] - x, dy = py[q] - y, dz = pz[q] - z, d2 = dx * dx + dy * dy + dz * dz + 1e-9; if (melhor[s] === 0) { lista.push(s); melhor[s] = d2; } else if (d2 < melhor[s]) melhor[s] = d2; }
      }
      if (lista.length) break;
    }
    if (!lista.length) { if (filtro) return prox(x, y, z, peso, false); campoAdd(peso); return; }
    lista.sort((a, b) => melhor[a] - melhor[b]); const lim = (2.2 * Math.sqrt(melhor[lista[0]]) + 0.012) ** 2, sel = [], pw = []; let tot = 0;
    for (const s of lista) { if (sel.length < 3 && melhor[s] <= lim) { const p = 1 / (melhor[s] + 4e-5) ** 2; sel.push(s); pw.push(p); tot += p; } melhor[s] = 0; }
    for (let k = 0; k < sel.length; k++) seg1(sel[k], peso * pw[k] / tot);
  }
  function maisPerto(x, y, z) { prox(x, y, z, 1, false); let m = -1, best = -1; for (let t = 0; t < nc; t++) if (cp[t] > best) { best = cp[t]; m = cb[t]; } nc = 0; return m >= nseg ? 0 : m + 1; }
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let mi = 0; mi < malhas.length; mi++) {
    const { id, w, campo } = malhas[mi], n = w.length / 3, idx = new Uint8Array(n * 4), wt = new Float32Array(n * 4);
    // eixo mais longo do músculo e os ossos em cada ponta
    let modo = 'prox', ax = 1, lo = 0, hi = 1, sA = 0, sB = 0;
    if (!campo) {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const v = w[3 * i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
      ax = [0, 1, 2].reduce((a, b) => (mx[b] - mn[b] > mx[a] - mn[a] ? b : a), 0); lo = mn[ax]; hi = mx[ax];
      const votos = [new Map(), new Map()], passo = Math.max(1, Math.floor(n / 600));
      for (let i = 0; i < n; i += passo) { const s = (w[3 * i + ax] - lo) / (hi - lo || 1), e = s < 0.12 ? 0 : s > 0.88 ? 1 : -1; if (e < 0) continue; const y = w[3 * i + 1]; fj = 0; ff = 0; if (y >= FY[U]) { fj = U - 1; ff = 1; } else if (y > FY[0]) { while (y >= FY[fj + 1]) fj++; ff = (y - FY[fj]) / (FY[fj + 1] - FY[fj]); } const sg = maisPerto(w[3 * i], y, w[3 * i + 2]); votos[e].set(sg, (votos[e].get(sg) || 0) + 1); }
      const top = m => { let b = 0, c = -1; for (const [s, v] of m) if (v > c) { c = v; b = s; } return b; };
      sA = top(votos[0]); sB = top(votos[1]); const A = info[sA], B = info[sB];
      livre.fill(0);
      if (A.t === 'membro' && B.t === 'membro' && (A.c === B.c || A.c === '*' || B.c === '*')) {
        const ca = A.c === '*' ? B.c : A.c, dif = Math.abs(A.n - B.n);
        if (sA === sB) modo = 'rigido';
        else if (dif <= 1) modo = 'eixo';
        else { modo = 'cadeia'; const n0 = Math.min(A.n, B.n), n1 = Math.max(A.n, B.n); info.forEach((f, s) => { if (f.t === 'membro' && (f.c === ca || f.c === '*') && f.n >= n0 && f.n <= n1) livre[s] = 1; }); }
      } else if (A.t !== B.t) { modo = 'misto'; info.forEach((f, s) => { if (f.t === 'tronco') livre[s] = 1; }); if (A.t === 'membro') { const t = sA; sA = sB; sB = t; lo = hi + (hi = lo, 0); } }
    }
    for (let i = 0; i < n; i++) {
      const x = w[3 * i], y = w[3 * i + 1], z = w[3 * i + 2]; nc = 0;
      fj = 0; ff = 0; if (y >= FY[U]) { fj = U - 1; ff = 1; } else if (y > FY[0]) { while (y >= FY[fj + 1]) fj++; ff = (y - FY[fj]) / (FY[fj + 1] - FY[fj]); }
      if (campo) campoAdd(1);
      else if (modo === 'rigido') seg1(sA, 1);
      else if (modo === 'cadeia') prox(x, y, z, 1, true);
      else {
        const sv = (w[3 * i + ax] - lo) / (hi - lo || 1), wb = suave(0.3, 0.72, sv);
        if (modo === 'eixo') { seg1(sA, 1 - wb); seg1(sB, wb); }
        else if (modo === 'misto') { const wm = suave(0.55, 0.93, sv); prox(x, y, z, 1 - wm, true); seg1(sB, wm); }   // ponta no tronco segue a coluna; ponta no membro segue o osso
        else prox(x, y, z, 1, false);
      }
      let tot = 0;
      for (let k = 0; k < 4; k++) { let m = -1; for (let t = 0; t < nc; t++) if (cp[t] > 0 && (m < 0 || cp[t] > cp[m])) m = t; if (m < 0) break; idx[4 * i + k] = cb[m]; wt[4 * i + k] = cp[m]; tot += cp[m]; cp[m] = -1; }
      for (let k = 0; k < 4; k++) wt[4 * i + k] /= tot || 1;
    }
    yield { id, idx, wt, prog: (mi + 1) / malhas.length };
  }
}

const POSE = (() => {
  const V3 = THREE.Vector3, M4 = THREE.Matrix4, RAD = Math.PI / 180;
  const rX = a => new M4().makeRotationX(a * RAD), rY = a => new M4().makeRotationY(a * RAD), rZ = a => new M4().makeRotationZ(a * RAD);
  const tra = (a, b) => new M4().makeTranslation(a.x - (b ? b.x : 0), a.y - (b ? b.y : 0), a.z - (b ? b.z : 0));
  const neg = p => new M4().makeTranslation(-p.x, -p.y, -p.z);
  const em = (p, R) => tra(p).multiply(R).multiply(neg(p));   // rotação R em torno do ponto p
  const NIV = [...[5, 4, 3, 2, 1].map(i => 'Vertebra L' + i), ...[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(i => 'Vertebra T' + i), ...[7, 6, 5, 4, 3].map(i => 'Vertebra C' + i), 'Axis (C2)', 'Atlas (C1)'];
  const REG = { lum: [0, 5], torI: [5, 6], torS: [11, 6], cerI: [17, 5], cerS: [22, 3] };   // [primeiro nível, nº de articulações]
  const LADOS = [['d', '.r', 1], ['e', '.l', -1]];   // sg = +1 no lado direito (x negativo no modelo)
  const S = { pronto: false, ativo: false, k: 0, def: {}, gen: null, fer: new Set(), rig: [], campo: [], anim: null, mk: {}, A: {}, K: {}, H: {}, G: {}, Cs: {}, sc: {}, ac: {}, Hh: {}, Co: {}, MTP: {},
    pesos: new Map(), clones: new Map(), usar: new Set(), ang: {}, aoMudar: null, rotExtra: null };

  /* --- geometria em coordenadas do mundo (vetores tipados) --- */
  function mundo(m) {
    m.updateWorldMatrix(true, false); const p = m.geometry.attributes.position, n = p.count, o = new Float32Array(n * 3), e = m.matrixWorld.elements;
    for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); o[3 * i] = e[0] * x + e[4] * y + e[8] * z + e[12]; o[3 * i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; o[3 * i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
    return o;
  }
  const cacheW = {}; const W = n => cacheW[n] || (cacheW[n] = mundo(MESH[n]));
  const faixa = (w, ax) => { let a = 1e9, b = -1e9; for (let i = ax; i < w.length; i += 3) { if (w[i] < a) a = w[i]; if (w[i] > b) b = w[i]; } return [a, b]; };
  const meio = w => { const a = faixa(w, 0), b = faixa(w, 1), c = faixa(w, 2); return new V3((a[0] + a[1]) / 2, (b[0] + b[1]) / 2, (c[0] + c[1]) / 2); };
  const mediaSe = (w, f) => { let x = 0, y = 0, z = 0, c = 0; for (let i = 0; i < w.length; i += 3) if (f(w[i], w[i + 1], w[i + 2])) { x += w[i]; y += w[i + 1]; z += w[i + 2]; c++; } return c ? new V3(x / c, y / c, z / c) : meio(w); };
  const ponta = (w, ax, sinal, tol, f = () => true) => { let e = -1e9; for (let i = 0; i < w.length; i += 3) if (f(w[i], w[i + 1], w[i + 2])) { const v = sinal * w[i + ax]; if (v > e) e = v; } return mediaSe(w, (x, y, z) => f(x, y, z) && sinal * (ax === 0 ? x : ax === 1 ? y : z) >= e - tol); };
  const um = b => Object.keys(MESH).find(n => E[n].c === 'ossos' && E[n].b === b);
  const osso = (b, suf) => MESH[b + suf] ? b + suf : um(b);
  // cabeça do úmero ou do fêmur: centro da parte mais alta e mais medial do osso
  const cabeca = w => { const [, y1] = faixa(w, 1); let sx = 0, c = 0; for (let i = 0; i < w.length; i += 3) if (w[i + 1] > y1 - 0.045) { sx += Math.abs(w[i]); c++; } const p = mediaSe(w, (x, y) => y > y1 - 0.045 && Math.abs(x) < sx / c); p.y = y1 - 0.024; return p; };

  function segDe(n) {
    const b = E[n].b, l = E[n].l === 'direito' ? 'd' : E[n].l === 'esquerdo' ? 'e' : '';
    if (/^(Hip bone|Sacrum|Coccyx)$/.test(b)) return 'pelve';
    if (/^(Femur|Patella)$/.test(b)) return 'coxa' + l;
    if (/^(Tibia|Fibula)$/.test(b)) return 'perna' + l;
    if (SEG_RE.pe.test(b)) return (/phalanx/.test(b) ? 'dedos' : 'pe') + l;
    if (b === 'Scapula') return 'esc' + l; if (b === 'Clavicle') return 'cla' + l;
    if (b === 'Humerus') return 'umero' + l;
    if (SEG_RE.braco.test(b)) return 'antebraco' + l;
    if (/^Vertebra |^Atlas|^Axis/.test(b)) return 'v:' + b;
    if (/rib|sternum|Xiphoid|Hyoid|Thyroid|Cricoid|Arytenoid|Corniculate/.test(b)) return null;   // tronco flexível: segue a coluna pela altura
    return 'cabeca';
  }

  function preparar() {
    if (S.pronto) return;
    const mk = (id, p, seg) => { S.mk[id] = { r: p, seg, p: p.clone() }; };
    S.chao = faixa(W('Calcaneus.r'), 1)[0];
    for (const [l, suf, sg] of LADOS) {
      const lat = -sg, tib = W('Tibia' + suf), fem = W('Femur' + suf), fib = W('Fibula' + suf), esc = W('Scapula' + suf), cla = W('Clavicle' + suf), qd = W('Hip bone' + suf), hum = W('Humerus' + suf);
      const [ty0, ty1] = faixa(tib, 1), [fy0, fy1] = faixa(fem, 1), fb0 = faixa(fib, 1)[0], ey1 = faixa(esc, 1)[1], hy0 = faixa(hum, 1)[0];
      const A = mediaSe(tib, (x, y) => y < ty0 + 0.015); A.y = ty0 + 0.012; S.A[l] = A;
      const K = mediaSe(fem, (x, y) => y < fy0 + 0.03); K.y = fy0 + 0.022; S.K[l] = K;
      const H = cabeca(fem); S.H[l] = H; S.Hh[l] = cabeca(hum);
      const Co = mediaSe(hum, (x, y) => y < hy0 + 0.022); Co.y = hy0 + 0.011; S.Co[l] = Co;
      mk('mal_' + l, mediaSe(fib, (x, y) => y < fb0 + 0.015), 'perna' + l); mk('joe_' + l, K.clone(), 'coxa' + l);
      mk('troc_' + l, ponta(fem, 0, lat, 0.006, (x, y) => y > fy1 - 0.12), 'coxa' + l);
      mk('acr_' + l, ponta(esc, 0, lat, 0.008, (x, y) => y > ey1 - 0.04), 'esc' + l);
      S.G[l] = ponta(esc, 0, lat, 0.012, (x, y) => y < ey1 - 0.05); S.Cs[l] = meio(esc);
      S.sc[l] = ponta(cla, 0, -lat, 0.01); S.ac[l] = ponta(cla, 0, lat, 0.01);
      mk('ore_' + l, ponta(W(osso('Temporal bone', suf)), 0, lat, 0.003), 'cabeca');
      mk('asis_' + l, ponta(qd, 2, 1, 0.005, (x, y) => y > H.y + 0.05), 'pelve'); mk('cri_' + l, ponta(qd, 1, 1, 0.006), 'pelve');
      mk('pat_' + l, meio(W('Patella' + suf)), 'coxa' + l);
      mk('tt_' + l, ponta(tib, 2, 1, 0.004, (x, y) => y < ty1 - 0.03 && y > ty1 - 0.075), 'perna' + l);
      mk('cot_' + l, Co.clone(), 'umero' + l); mk('omb_' + l, S.Hh[l].clone(), 'umero' + l); mk('qua_' + l, H.clone(), 'coxa' + l);
    }
    S.Sm = S.Hh.d.clone().add(S.Hh.e).multiplyScalar(0.5);
    const esp = n => ponta(W(n), 2, -1, 0.004);
    mk('occ', ponta(W(osso('Occipital bone', '')), 2, -1, 0.005), 'cabeca'); mk('c7', esp('Vertebra C7'), 'v:Vertebra C7'); mk('t7', esp('Vertebra T7'), 'v:Vertebra T7');
    mk('l3p', esp('Vertebra L3'), 'v:Vertebra L3'); mk('sac', ponta(W(um('Sacrum')), 2, -1, 0.006), 'pelve');
    const cen = NIV.map(n => { const w = W(n), c = meio(w); c.z = faixa(w, 2)[1] - 0.018; return c; });
    S.piv = cen.map((c, i) => i ? c.clone().add(cen[i - 1]).multiplyScalar(0.5) : c.clone().sub(cen[1].clone().sub(c).multiplyScalar(0.5)));
    S.piv.push(cen[23].clone().add(new V3(0, 0.012, 0)));
    mk('l3', cen[2].clone(), 'v:Vertebra L3');
    const ys = meio(W(um('Sacrum'))).y; S.FY = [Math.min(ys, cen[0].y - 0.04), ...cen.map(c => c.y), cen[23].y + 0.035];
    S.Ct = new V3(0, S.Cs.d.y, cen[13].z + 0.07);   // eixo vertical do tórax, na altura de T4
    const nomes = new Set();
    for (const [n, m] of Object.entries(MESH)) {
      if (m.userData.camada !== 'ossos') continue; const seg = segDe(n);
      if (seg) { m.updateWorldMatrix(true, false); S.rig.push({ m, seg, M0: m.matrixWorld.clone(), Pi: m.parent.matrixWorld.clone().invert() }); nomes.add(seg); }
      else S.campo.push(n);
    }
    for (const [l, suf] of LADOS) {   // articulação metatarsofalângica: base das falanges proximais, no chão
      let z0 = 1e9; for (const r of S.rig) if (r.seg === 'dedos' + l && /Proximal/.test(E[r.m.name].b)) z0 = Math.min(z0, faixa(W(r.m.name), 2)[0]);
      S.MTP[l] = new V3(S.A[l].x, S.chao + 0.012, (z0 < 1e8 ? z0 : S.A[l].z + 0.14) + 0.006);
    }
    S.SEGN = [...nomes]; const idx = Object.fromEntries(S.SEGN.map((s, i) => [s, i]));
    // esqueleto de "ossos virtuais" para a GPU: um por segmento rígido e um por nível da coluna (tronco flexível)
    S.bones = [...S.SEGN, ...S.FY.map((_, j) => 'campo' + j)].map(() => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });
    S.esq = new THREE.Skeleton(S.bones, S.bones.map(() => new M4()));
    S.grupoPele = new THREE.Group(); scene.add(S.grupoPele);
    const cel = 0.03, px = [], py = [], pz = [], ps = [];
    const semear = (n, s) => { const w = W(n); for (let i = 0; i < w.length; i += 9) { px.push(w[i]); py.push(w[i + 1]); pz.push(w[i + 2]); ps.push(s); } };
    for (const r of S.rig) semear(r.m.name, idx[r.seg] + 1); for (const n of S.campo) semear(n, 0);
    S.grade = { cel, px: Float32Array.from(px), py: Float32Array.from(py), pz: Float32Array.from(pz), ps: Int16Array.from(ps) };
    montarFerr(); S.pronto = true;
    S.k = 0; S.def = {}; calc(); marcos(); S.q0 = { d: anguloQ('d'), e: anguloQ('e') };
  }

  /* --- pesos de pele: em segundo plano, uma vez por visita --- */
  function pele(onProg) {
    if (onProg) S.onProg = onProg;
    if (S.pele) return S.pele;
    preparar();
    const nomes = [...S.campo, ...Object.keys(MESH).filter(n => MESH[n].userData.camada === 'musculos')], campo = new Set(S.campo);
    const dados = () => ({ ...S.grade, segs: S.SEGN, nseg: S.SEGN.length, FY: S.FY, malhas: nomes.map(n => ({ id: n, w: mundo(MESH[n]), campo: campo.has(n) })) });
    S.pele = new Promise(ok => {
      const receber = r => { S.pesos.set(r.id, r); S.prog = r.prog; if (S.onProg) S.onProg(r.prog); };
      const fim = () => { S.peleOk = true; S.onProg = null; ok(); };
      const naPagina = () => { S.pesos.clear(); const it = pesosGen(dados()); const passo = () => { const t0 = performance.now(); let r = it.next(); while (!r.done) { receber(r.value); if (performance.now() - t0 > 14) return setTimeout(passo, 0); r = it.next(); } fim(); }; passo(); };
      let wk = null;
      try { wk = new Worker(URL.createObjectURL(new Blob([`const pesosGen = ${pesosGen.toString()};\nonmessage = e => { for (const r of pesosGen(e.data)) postMessage(r, [r.idx.buffer, r.wt.buffer]); postMessage({ fim: true }); };`], { type: 'text/javascript' }))); } catch (e) { wk = null; }
      if (!wk) return naPagina();
      wk.onmessage = e => { if (e.data.fim) { wk.terminate(); fim(); } else receber(e.data); };
      wk.onerror = () => { wk.terminate(); naPagina(); };
      const d = dados(); wk.postMessage(d, d.malhas.map(m => m.w.buffer));
    });
    return S.pele;
  }
  // cópia do músculo (ou costela) que a GPU deforma; o original fica escondido enquanto o motor está ativo
  function clonar(n) {
    let c = S.clones.get(n); if (c) return c;
    const r = S.pesos.get(n), m = MESH[n]; if (!r || !m) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(mundo(m), 3));
    const nm = m.geometry.attributes.normal;
    if (nm) { const N = new THREE.Matrix3().getNormalMatrix(m.matrixWorld), v = new V3(), a = new Float32Array(nm.count * 3); for (let i = 0; i < nm.count; i++) { v.set(nm.getX(i), nm.getY(i), nm.getZ(i)).applyMatrix3(N).normalize(); a[3 * i] = v.x; a[3 * i + 1] = v.y; a[3 * i + 2] = v.z; } g.setAttribute('normal', new THREE.BufferAttribute(a, 3)); }
    if (m.geometry.index) g.setIndex(m.geometry.index); if (!nm) g.computeVertexNormals();
    g.setAttribute('skinIndex', new THREE.BufferAttribute(r.idx, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(r.wt, 4));
    c = new THREE.SkinnedMesh(g, m.material); c.bind(S.esq, new M4()); c.frustumCulled = false; c.name = n; c.visible = false; c.userData.camada = m.userData.camada;
    S.grupoPele.add(c); S.clones.set(n, c); return c;
  }

  /* --- cinemática: dos pés (fixos no chão) para cima --- */
  function calc() {
    const d = S.gen ? S.gen(S.k) : S.def, k = S.gen ? 1 : S.k, mv = d.mov || {}, M = {}, Hn = {}, I = new M4(), A = S.ang;
    const g = (grp, key, l) => { const o = d[grp]; if (!o || (o.lado && l && o.lado !== l)) return 0; let v = o[key]; if (v && typeof v === 'object') v = v[l]; return (v || 0) * k; };
    for (const [l, , sg] of LADOS) {
      const Aa = S.A[l], K = S.K[l], H = S.H[l]; let Ms, Mc, Mp;
      if (mv.agach) {   // agachamento: canela avança até o limite do tornozelo, o resto vem da coxa
        const s = Math.min(mv.mob ?? 35, 0.4 * mv.agach), t = mv.agach - s; A.s = s; A.t = t;
        Ms = em(Aa, rX(s)); const K2 = K.clone().applyMatrix4(Ms); Mc = tra(K2).multiply(rX(-t)).multiply(neg(K)); Mp = new M4();
      } else {
        const Ls = K.y - Aa.y, lean = g('perna', 'inclina', l);
        const gS = -Math.asin(sg * g('perna', 'dentro', l) / 100 / Ls) / RAD, tS = lean + Math.asin(-g('perna', 'tras', l) / 100 / Ls) / RAD;
        Ms = em(Aa, rZ(gS).multiply(rX(tS)).multiply(rY(sg * g('perna', 'tibRot', l)))); const K2 = K.clone().applyMatrix4(Ms);
        const v = H.clone().sub(K), rxy = Math.hypot(v.x, v.y), ryz = Math.hypot(v.z, v.y);   // a coxa devolve o quadril para cima do tornozelo
        const gT = (Math.atan2(v.x, v.y) - Math.asin((H.x - K2.x) / rxy)) / RAD, tT = (Math.asin((H.z + (H.y - Aa.y) * Math.sin(lean * RAD) - K2.z) / ryz) - Math.atan2(v.z, v.y)) / RAD;
        Mc = tra(K2, K).multiply(em(K, rX(tT).multiply(rZ(gT)).multiply(rY(sg * g('perna', 'femRot', l)))));
        Mp = em(Aa, rZ(-sg * g('pe', 'ev', l)).multiply(rY(-sg * g('pe', 'abd', l))));
        const comp = g('perna', 'comp', l) / 100;   // perna mais longa: estica o membro a partir do chão
        if (comp) { const Sc = em(new V3(0, S.chao, 0), new M4().makeScale(1, 1 + comp / (H.y - S.chao), 1)); Ms.premultiply(Sc); Mc.premultiply(Sc); Mp.premultiply(Sc); }
      }
      M['perna' + l] = Ms; M['coxa' + l] = Mc; M['pe' + l] = Mp; M['dedos' + l] = Mp.clone(); Hn[l] = H.clone().applyMatrix4(Mc);
    }
    const Hm = S.H.d.clone().add(S.H.e).multiplyScalar(0.5), Hm2 = Hn.d.clone().add(Hn.e).multiplyScalar(0.5);
    const obl = (Math.atan2(Hn.e.y - Hn.d.y, Hn.e.x - Hn.d.x) - Math.atan2(S.H.e.y - S.H.d.y, S.H.e.x - S.H.d.x)) / RAD;
    let u = 0;
    if (mv.agach) {   // tronco inclina até o centro de massa (corpo) ficar sobre o meio do pé
      const HAT0 = Hm.clone().lerp(S.Sm, 0.626), pes = [], alvo = (S.A.d.z + S.A.e.z) / 2 + 0.045, braco = 0.1 * 0.3 * Math.sin((mv.flex || 0) * RAD);
      for (const [l] of LADOS) pes.push([0.1, S.H[l].clone().lerp(S.K[l], 0.433).applyMatrix4(M['coxa' + l]).z], [0.0465, S.K[l].clone().lerp(S.A[l], 0.433).applyMatrix4(M['perna' + l]).z]);
      const zcm = uu => { const h = HAT0.clone().applyMatrix4(tra(Hm2).multiply(rX(uu)).multiply(neg(Hm))); let s = 0.678 * h.z + braco, m = 0.678; for (const [a, z] of pes) { s += a * z; m += a; } return s / m; };
      let lo = -10, hi = 85; for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; zcm(mid) > alvo ? (hi = mid) : (lo = mid); } u = (lo + hi) / 2;
    }
    A.u = u;
    M.pelve = tra(Hm2, Hm).multiply(em(Hm, rY(g('pelve', 'rot')).multiply(rZ(obl + g('pelve', 'obl'))).multiply(rX(g('pelve', 'ant') + u))));
    const col = d.col || {}, lv = []; let ant = M.pelve;
    for (let i = 0; i <= 24; i++) {
      let reg = 'cerS'; for (const [r, [a, n]] of Object.entries(REG)) if (i >= a && i < a + n) reg = r;
      const c = col[reg] || [], n = REG[reg][1]; let fr = (c[1] || 0) * k, fl = (c[0] || 0) * k; if (reg === 'lum' && d.compLat) fr -= (obl + g('pelve', 'obl')) * d.compLat;
      if (reg === 'cerS' && mv.agach) fl -= u * 0.45;   // no agachamento o pescoço estende para manter o olhar à frente
      ant = ant.clone().multiply(em(S.piv[i], rY((c[2] || 0) * k / n).multiply(rZ(fr / n)).multiply(rX(fl / n))));
      lv.push(ant); M[i < 24 ? 'v:' + NIV[i] : 'cabeca'] = ant;
    }
    S.FM = [M.pelve, ...lv].map(m => m.elements);
    for (const [l, , sg] of LADOS) {
      const lado = !mv.lado || mv.lado === l, fl = lado ? mv.flex || 0 : 0, ab = lado ? mv.abd || 0 : 0, ct = lado ? mv.cot || 0 : 0;
      // ritmo escapuloumeral: até ~30° quase só a glenoumeral; depois a escápula gira para cima 1° a cada 2° do úmero
      const elev = Math.max(fl, ab), phi = Math.max(0, elev - 30) * 0.4, rl = Math.max(0, ab - 70) * 0.55; A['phi' + l] = phi; A['rl' + l] = rl;
      const Me = lv[13].clone().multiply(new M4().makeTranslation(0, g('esc', 'elev', l) / 100, 0)).multiply(em(S.Ct, rY(sg * g('esc', 'prot', l)))).multiply(em(S.G[l], rY(sg * g('esc', 'wing', l))))
        .multiply(em(S.ac[l], rZ(-sg * phi).multiply(rX(-phi * 0.3)))).multiply(em(S.Cs[l], rZ(sg * g('esc', 'rotInf', l)).multiply(rX(g('esc', 'tilt', l)))));   // rotação para cima em torno da acromioclavicular
      M['esc' + l] = Me;
      const Rel = fl ? rX(-fl) : ab ? rZ(-sg * ab).multiply(rY(-sg * rl)) : new M4();
      const Mu = tra(S.Hh[l].clone().applyMatrix4(Me)).multiply(rY(sg * g('braco', 'rot', l))).multiply(Rel).multiply(neg(S.Hh[l]));
      M['umero' + l] = Mu; M['antebraco' + l] = Mu.clone().multiply(em(S.Co[l], rX(-ct)));
      const sc = S.sc[l], sc2 = campoPt(sc), ac2 = S.ac[l].clone().applyMatrix4(Me);
      const q = new THREE.Quaternion().setFromUnitVectors(S.ac[l].clone().sub(sc).normalize(), ac2.sub(sc2).normalize());
      M['cla' + l] = tra(sc2).multiply(new M4().makeRotationFromQuaternion(q)).multiply(neg(sc));
    }
    if (mv.calc) {   // elevação dos calcanhares: o pé gira sobre a cabeça dos metatarsos e o corpo sobe junto
      const R = l => em(S.MTP[l], rX(mv.calc)), D = tra(S.A.d.clone().applyMatrix4(R('d')), S.A.d);
      for (const key of Object.keys(M)) if (!/^(pe|dedos)/.test(key)) M[key].premultiply(D);
      for (const [l] of LADOS) M['pe' + l] = R(l).multiply(M['pe' + l]);
    }
    S.M = M;
    S.SEGN.forEach((s, i) => S.bones[i].matrixWorld.copy(M[s] || I));
    S.FM.forEach((e, j) => S.bones[S.SEGN.length + j].matrixWorld.fromArray(e));
  }
  function campoPt(p) {
    const FY = S.FY, U = FY.length - 1; let j = 0, f = 0; if (p.y >= FY[U]) { j = U - 1; f = 1; } else if (p.y > FY[0]) { while (p.y >= FY[j + 1]) j++; f = (p.y - FY[j]) / (FY[j + 1] - FY[j]); }
    return p.clone().applyMatrix4(new M4().fromArray(S.FM[j])).lerp(p.clone().applyMatrix4(new M4().fromArray(S.FM[j + 1])), f);
  }
  const marcos = () => { for (const o of Object.values(S.mk)) o.p.copy(o.r).applyMatrix4(S.M[o.seg]); };
  function anguloQ(l) {   // no plano frontal: linha EIAS→patela contra patela→tuberosidade da tíbia
    const a = S.mk['asis_' + l].p, p = S.mk['pat_' + l].p, t = S.mk['tt_' + l].p, sg = l === 'd' ? 1 : -1;
    return sg * (Math.atan2(p.x - a.x, a.y - p.y) - Math.atan2(t.x - p.x, p.y - t.y)) / RAD;
  }

  /* --- fios de prumo, marcos e ângulo Q desenhados no modelo --- */
  const LAT = [['ore_d', 'Orelha'], ['acr_d', 'Acrômio'], ['l3', 'Lombar (L3)'], ['troc_d', 'Trocânter maior'], ['joe_d', 'Joelho'], ['mal_d', 'Maléolo lateral']];
  const POSTM = [['occ', 'Occipital'], ['c7', 'C7'], ['t7', 'T7'], ['l3p', 'L3'], ['sac', 'Sacro']];
  const PARES = [['ore', 'Orelhas'], ['acr', 'Acrômios'], ['cri', 'Cristas ilíacas'], ['joe', 'Joelhos'], ['mal', 'Maléolos']];
  const corD = cm => Math.abs(cm) < 1 ? '#3ddc97' : Math.abs(cm) < 3 ? '#ffd43b' : '#ff5d73';
  const F = { g: {}, lat: [], post: [], par: [], q: {} };
  function montarFerr() {
    const raiz = new THREE.Group(); raiz.visible = false; scene.add(raiz); F.raiz = raiz;
    const esf = new THREE.SphereGeometry(1, 14, 10), cil = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0);
    const mat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: o });
    const grupo = k => { const g = new THREE.Group(); raiz.add(g); F.g[k] = g; return g; };
    const bola = (g, c, r) => { const b = new THREE.Mesh(esf, mat(c)); b.scale.setScalar(r); b.renderOrder = 21; g.add(b); return b; };
    const cano = (g, c, r, o = 1) => { const m = new THREE.Mesh(cil, mat(c, o)); m.userData.r = r; m.renderOrder = 20; m.frustumCulled = false; g.add(m); return m; };
    const gl = grupo('lat'), gp = grupo('post'), gq = grupo('q');
    F.fioL = cano(gl, '#f2f5f7', 0.0022, 0.9); F.fioP = cano(gp, '#f2f5f7', 0.0022, 0.9);
    for (const [k, n] of LAT) F.lat.push({ k, n, fant: bola(gl, '#8fa0b3', 0.006), pt: bola(gl, '#3ddc97', 0.011), con: cano(gl, '#3ddc97', 0.0028) });
    for (const [k, n] of POSTM) F.post.push({ k, n, fant: bola(gp, '#8fa0b3', 0.006), pt: bola(gp, '#3ddc97', 0.011), con: cano(gp, '#3ddc97', 0.0028) });
    for (const [k, n] of PARES) F.par.push({ k, n, a: bola(gp, '#3ddc97', 0.009), b: bola(gp, '#3ddc97', 0.009), con: cano(gp, '#3ddc97', 0.0022, 0.9) });
    for (const [l] of LADOS) F.q[l] = { c1: cano(gq, '#ffd43b', 0.003), c2: cano(gq, '#ff8a3d', 0.003), ext: cano(gq, '#ffd43b', 0.0016, 0.45), pts: [bola(gq, '#ffd43b', 0.009), bola(gq, '#ffffff', 0.009), bola(gq, '#ff8a3d', 0.009)] };
  }
  const _y = new V3(0, 1, 0), _d = new V3();
  const liga = (m, a, b) => { _d.subVectors(b, a); const L = _d.length(); m.visible = L > 1e-4; if (!m.visible) return; m.position.copy(a); m.quaternion.setFromUnitVectors(_y, _d.multiplyScalar(1 / L)); m.scale.set(m.userData.r, L, m.userData.r); };
  const pintar = (o, c) => o.material.color.set(c);
  const cm1 = v => f1(Math.abs(v), 1) + ' cm';
  function atualizarFerr() {
    marcos(); const mk = S.mk, L = { lat: [], post: [], par: [], q: {} }, rot = [];
    F.raiz.visible = S.ativo && S.fer.size > 0; for (const k of ['lat', 'post', 'q']) F.g[k].visible = S.fer.has(k);
    if (S.fer.has('lat')) {
      const x = mk.mal_d.r.x - 0.035, z = mk.mal_d.r.z + 0.02, topo = mk.ore_d.r.y + 0.14;
      liga(F.fioL, new V3(x, S.chao, z), new V3(x, topo, z)); rot.push({ p: new V3(x, topo + 0.03, z), t: 'fio de prumo', c: '#f2f5f7' });
      for (const o of F.lat) { const m = mk[o.k], dz = (m.p.z - m.r.z) * 100, c = corD(dz); o.fant.position.copy(m.r); o.pt.position.copy(m.p); pintar(o.pt, c); pintar(o.con, c); liga(o.con, m.r, m.p);
        const t = Math.abs(dz) < 0.3 ? '' : cm1(dz) + (dz > 0 ? ' à frente' : ' atrás'); L.lat.push({ n: o.n, t: t || 'alinhado', c }); rot.push({ p: m.p, t: o.n + (t ? ' · ' + t : ''), c }); }
    }
    if (S.fer.has('post')) {
      const x = (S.A.d.x + S.A.e.x) / 2, z = mk.sac.r.z - 0.05, topo = mk.occ.r.y + 0.2;
      liga(F.fioP, new V3(x, S.chao, z), new V3(x, topo, z));
      for (const o of F.post) { const m = mk[o.k], dx = (m.p.x - m.r.x) * 100, c = corD(dx); o.fant.position.copy(m.r); o.pt.position.copy(m.p); pintar(o.pt, c); pintar(o.con, c); liga(o.con, m.r, m.p);
        const t = Math.abs(dx) < 0.3 ? '' : cm1(dx) + (dx < 0 ? ' à direita' : ' à esquerda'); L.post.push({ n: o.n, t: t || 'na linha', c }); rot.push({ p: m.p, t: o.n + (t ? ' · ' + t : ''), c }); }
      for (const o of F.par) { const a = mk[o.k + '_d'], b = mk[o.k + '_e'], dy = ((a.p.y - a.r.y) - (b.p.y - b.r.y)) * 100, c = corD(dy * 1.5); o.a.position.copy(a.p); o.b.position.copy(b.p); liga(o.con, a.p, b.p); [o.a, o.b, o.con].forEach(x => pintar(x, c));
        const t = Math.abs(dy) < 0.3 ? '' : (dy > 0 ? 'direito ' : 'esquerdo ') + cm1(dy) + ' mais alto'; L.par.push({ n: o.n, t: t || 'nivelados', c }); if (t) rot.push({ p: dy > 0 ? a.p : b.p, t: o.n + ' · ' + t, c, esq: dy <= 0 }); }
    }
    if (S.fer.has('q')) for (const [l] of LADOS) {
      const o = F.q[l], a = mk['asis_' + l].p, p = mk['pat_' + l].p, t = mk['tt_' + l].p, q = anguloQ(l);
      liga(o.c1, a, p); liga(o.c2, p, t); liga(o.ext, p, p.clone().add(p.clone().sub(a).normalize().multiplyScalar(0.13))); [a, p, t].forEach((v, i) => o.pts[i].position.copy(v));
      L.q[l] = { a: q, n: S.q0 ? S.q0[l] : q }; rot.push({ p, t: 'Q ' + Math.round(q) + '°', c: '#ffd43b' });
    }
    if (S.rotExtra) rot.push(...S.rotExtra(S.ang, S.mk));
    S.leit = L; S.rot = rot;
    const el = $('rot'); el.style.display = rot.length ? '' : 'none';
    if (el.childElementCount !== rot.length || el.dataset.de !== 'pose') { el.innerHTML = rot.map(() => '<span></span>').join(''); el.dataset.de = 'pose'; }
    rot.forEach((r, i) => { const s = el.children[i]; if (s.textContent !== r.t) s.textContent = r.t; s.style.color = r.c; });
  }
  const _r = new V3();
  function rotulos() {
    const el = $('rot'); if (!S.rot || el.dataset.de !== 'pose') return;
    S.rot.forEach((r, i) => { const s = el.children[i]; if (!s) return; _r.copy(r.p).project(cam); s.style.left = ((_r.x + 1) / 2 * innerWidth + (r.esq ? -12 : 12)) + 'px'; s.style.top = ((1 - _r.y) / 2 * innerHeight) + 'px'; s.style.transform = r.esq ? 'translate(-100%,-50%)' : 'translate(0,-50%)'; });
  }
  function leituraHTML() {
    const L = S.leit; if (!L) return ''; let h = '';
    const linhas = a => a.map(r => `<tr><td>${r.n}</td><td style="color:${r.c}">${r.t}</td></tr>`).join('');
    if (S.fer.has('q') && L.q.d) { const q = L.q.d, e = L.q.e, dif = Math.abs(q.a - e.a) > 0.6;
      h += `<div class="pq"><div><small>Ângulo Q${dif ? ' direito' : ''}</small><b>${f1(q.a, 0)}°</b></div>${dif ? `<div><small>Ângulo Q esquerdo</small><b>${f1(e.a, 0)}°</b></div>` : ''}<div><small>No alinhamento neutro do modelo</small><b>${f1(q.n, 0)}°</b></div></div>
      <p class="pnota">Referência em pé: cerca de 10° a 14° em homens e 15° a 17° em mulheres. ${q.a - q.n > 1.5 ? 'Este desvio <b>aumenta</b> o ângulo Q: a patela é puxada mais para fora.' : q.a - q.n < -1.5 ? 'Este desvio <b>diminui</b> o ângulo Q.' : ''}</p>`; }
    if (S.fer.has('lat')) h += `<table class="ac pleit"><tr><th>Fio de prumo lateral</th><th>Desvio em relação ao alinhamento</th></tr>${linhas(L.lat)}</table>`;
    if (S.fer.has('post')) h += `<table class="ac pleit"><tr><th>Fio de prumo posterior</th><th>Desvio em relação ao alinhamento</th></tr>${linhas(L.post)}${linhas(L.par)}</table>`;
    return h;
  }

  /* --- aplicar a pose --- */
  function aplicar(k, fim = true) {
    S.k = k; calc();
    for (const r of S.rig) { r.m.matrixAutoUpdate = false; r.m.matrix.copy(r.Pi).multiply(S.M[r.seg]).multiply(r.M0); }
    if (fim) for (const n of S.usar) { const c = S.clones.get(n); if (c) c.boundingSphere = null; }   // o toque recalcula a área do músculo na pose nova
    atualizarFerr(); if (S.aoMudar) S.aoMudar(k);
  }
  const todosMusculos = () => Object.keys(MESH).filter(n => MESH[n].userData.camada === 'musculos');
  function usar(musculos, todos) {
    S.todos = !!todos; S.usar = new Set([...S.campo, ...(todos ? todosMusculos() : musculos)]);
    for (const c of S.clones.values()) c.visible = false;
    for (const n of S.usar) clonar(n);
  }
  function iniciar(def, fer, musculos, op = {}) {
    preparar(); if (S.ativo) sair();
    S.def = def || {}; S.gen = op.gen || null; S.rotExtra = op.rot || null; S.fer = new Set(fer || []); S.ativo = true; window.POSE_ON = true;
    S.musculos = musculos; usar(musculos, op.todos);
    aplicar(op.k0 || 0);
  }
  function sinc() {   // depois de aplicarVis: a cópia deformada herda a visibilidade do original, que some
    for (const n of S.usar) { const c = S.clones.get(n), m = MESH[n]; if (!c || !m) continue; c.visible = m.visible; m.visible = false; }
  }
  function sair() {
    if (!S.ativo) return; S.ativo = false; window.POSE_ON = false; S.anim = null; S.aoMudar = null; S.rotExtra = null; S.gen = null;
    for (const r of S.rig) { r.m.matrixAutoUpdate = true; r.m.updateMatrix(); }
    for (const c of S.clones.values()) c.visible = false;
    S.usar = new Set(); F.raiz.visible = false; const el = $('rot'); if (el.dataset.de === 'pose') { el.style.display = 'none'; el.innerHTML = ''; el.dataset.de = ''; }
  }
  const animar = (ate, vaivem = false, dur) => { S.anim = { de: S.k, ate, t0: performance.now(), dur: dur || 900 + 700 * Math.abs(ate - S.k), vaivem, dv: dur }; };
  function tick() {   // chamado a cada quadro; devolve true enquanto houver animação
    const a = S.anim; if (!S.ativo || !a) return false;
    const t = (performance.now() - a.t0) / a.dur; if (t < 0) return true;
    const u = Math.min(1, t), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    aplicar(a.de + (a.ate - a.de) * e, u >= 1);
    if (u >= 1) S.anim = a.vaivem ? { de: a.ate, ate: a.ate > 0.5 ? 0 : 1, t0: performance.now() + 500, dur: a.dv || 1600, vaivem: true, dv: a.dv } : null;
    return true;
  }
  const alvos = () => S.ativo ? [...S.usar].map(n => S.clones.get(n)).filter(c => c && c.visible) : [];
  return { S, pele, iniciar, sair, sinc, aplicar, animar, tick, rotulos, leituraHTML, atualizarFerr, alvos, setTodos(on) { usar(S.musculos || [], on); aplicar(S.k); },
    get ativo() { return S.ativo; }, get pronta() { return !!S.peleOk; }, parar() { S.anim = null; } };
})();

function limparDesvio() {
  POSE.sair();
  for (const m of Object.values(MESH)) if (m.userData.cor0) { m.material.color.copy(m.userData.cor0); delete m.userData.cor0; }
  desvioAtivo = null;
}
const nomePt = b => { const n = Object.keys(E).find(k => E[k].b === b && E[k].c === 'musculos'); return n ? E[n].n : b; };
function colorir(grupos, cores) {   // pinta os músculos de cada grupo; devolve os nomes das malhas
  const nomes = new Set();
  for (const [g, lista] of Object.entries(grupos)) {
    const bases = new Set(lista);
    for (const [n, e] of Object.entries(E)) if (e.c === 'musculos' && bases.has(e.b) && MESH[n]) { nomes.add(n); const m = MESH[n]; if (!m.userData.cor0) m.userData.cor0 = m.material.color.clone(); m.material.color.set(cores[g]); }
  }
  return nomes;
}
// espera os pesos de pele (calculados em segundo plano logo depois que o modelo carrega)
async function peleProntaToast() {
  if (POSE.pronta) return;
  const msg = p => { const el = $('toast'); el.textContent = `Preparando os músculos para se moverem · ${Math.round(p * 100)}%`; el.classList.add('on'); };
  msg(POSE.S.prog || 0); await POSE.pele(msg); $('toast').classList.remove('on');
}
// enquadra a faixa do corpo na área livre da tela (acima do painel no celular, à esquerda dele no computador)
function enquadrarP(quadro, vista) {
  const [y, alt] = QUADRO[quadro] || QUADRO.corpo, W = innerWidth, H = innerHeight, cel = W < 900;
  const area = cel ? { x0: 0, x1: W, y0: 140, y1: H * 0.5 - 66 } : { x0: 0, x1: W - 430, y0: 64, y1: H - 64 };
  const t = Math.tan(cam.fov * Math.PI / 360), aw = (area.x1 - area.x0) / W, ah = (area.y1 - area.y0) / H, larg = Math.max(0.62, alt * 0.48);
  const dist = 1.06 * Math.max(alt / 2 / (t * ah), larg / 2 / (t * cam.aspect * aw)) + 0.15;
  const dir = new THREE.Vector3(...VISTAS[vista] || VISTAS.lat).normalize(), fwd = dir.clone().negate(), dr = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(dr, fwd);
  const wpp = 2 * dist * t / H, dx = (area.x0 + area.x1) / 2 - W / 2, dy = (area.y0 + area.y1) / 2 - H / 2;
  voar(new THREE.Vector3(0, y, 0).addScaledVector(dr, -dx * wpp).addScaledVector(up, dy * wpp).toArray(), dist, dir, false);
}
function painelP(titulo, sub, html) { $('pT').textContent = titulo; $('pS').innerHTML = sub; $('pB').innerHTML = html; $('painel').classList.add('on'); painelAberto = true; resize(); $('pB').scrollTop = 0; }
const chipsFer = (todos = true) => `<div class="seg" id="pFer">${Object.entries(FER_N).map(([k, n]) => `<button data-f="${k}" class="${POSE.S.fer.has(k) ? 'on' : ''}">${n}</button>`).join('')}${todos ? `<button data-todos="1" class="${POSE.S.todos ? 'on' : ''}">Todos os músculos</button>` : ''}</div><div id="pLeit">${POSE.leituraHTML()}</div>`;
function ligarPainelP() {
  $('pB').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'bVoltaP') return listaPostura();
    if (b.dataset.d) return mostrarDesvio(b.dataset.d);
    if (b.dataset.t) return mostrarFerramenta(b.dataset.t);
    if (b.dataset.todos) { const on = b.classList.toggle('on'); POSE.setTodos(on); isolado = on ? null : new Set(POSE.S.musculos); aplicarVis(); return; }
    if (b.dataset.f) { const f = POSE.S.fer; f.has(b.dataset.f) ? f.delete(b.dataset.f) : f.add(b.dataset.f); b.classList.toggle('on'); POSE.atualizarFerr(); $('pLeit').innerHTML = POSE.leituraHTML(); return; }
    if (b.dataset.k !== undefined) { $('pCmp').classList.remove('on'); return POSE.animar(+b.dataset.k); }
    if (b.id === 'pCmp') { const on = b.classList.toggle('on'); on ? POSE.animar(POSE.S.k > 0.5 ? 0 : 1, true) : POSE.parar(); }
  };
}
function listaPostura() {
  limparDesvio(); isolado = null; filtroInsercao = null; aplicarVis(); destacar(null);
  document.querySelectorAll('#regioes .chip').forEach(b => b.classList.toggle('on', b.dataset.r === 'postura'));
  voar([0, 0.9, 0], 3.7, new THREE.Vector3(-0.5, 0.1, 1));
  const grupos = {}; POST.lista.forEach(d => (grupos[d.local] = grupos[d.local] || []).push(d));
  const ordem = Object.keys(grupos).sort((a, b) => LOCAIS.indexOf(a) - LOCAIS.indexOf(b));
  painelP('Postura', '<span class="tag">posturologia</span>do tornozelo à cervical', `
    <p>Escolha um desvio: o <b>corpo assume a postura</b> e você controla o grau. Os músculos aparecem <b style="color:${CORES_P.enc}">encurtados</b>, <b style="color:${CORES_P.alo}">alongados ou fracos</b> e <b style="color:${CORES_P.ten}">tensionados</b>, e o fio de prumo e o ângulo Q medem o desvio ao vivo.</p>
    <h3>Ferramentas de avaliação</h3><div class="lista">${POST.ferramentas.map(f => `<button data-t="${f.id}"><i style="background:#f2f5f7"></i>${esc(f.nome)}</button>`).join('')}</div>
    ${ordem.map(g => `<h3>${esc(g)}</h3><div class="lista">${grupos[g].map(d => `<button data-d="${d.id}"><i style="background:${CORES_P.enc}"></i>${esc(d.nome)}</button>`).join('')}</div>`).join('')}
    <div class="aviso">${esc(POST.nota)}</div>`);
  ligarPainelP();
}
async function mostrarFerramenta(id) {
  const f = POST.ferramentas.find(x => x.id === id); if (!f) return;
  await peleProntaToast(); limparDesvio(); desvioAtivo = id;
  isolado = new Set(); POSE.iniciar({}, f.fer, []); aplicarVis(); destacar(null);
  enquadrarP(id === 'f-q' ? 'pernas' : 'corpo', id === 'f-lat' ? 'lat' : id === 'f-post' ? 'post' : 'ant');
  painelP(f.nome, '<span class="tag">avaliação postural</span>', `<div class="acoes" style="margin:0 0 8px"><button id="bVoltaP">← Postura</button></div>${chipsFer(false)}${f.texto}
    <div class="aviso">O modelo neutro serve de referência: os desvios são medidos em relação a ele. Em uma pessoa real, pequenas diferenças são normais.</div>`);
  ligarPainelP();
}
async function mostrarDesvio(id) {
  const d = POST.lista.find(x => x.id === id); if (!d) return; const P = POSES[id] || {};
  await peleProntaToast(); limparDesvio(); desvioAtivo = id;
  const nomes = colorir({ enc: d.enc, alo: d.alo, ten: d.ten }, CORES_P); isolado = new Set(nomes);
  if (!visCamada.musculos) { visCamada.musculos = true; document.querySelector('[data-c=musculos]').classList.add('on'); }
  POSE.iniciar(P, P.fer || ['lat'], [...nomes]); aplicarVis(); destacar(null); enquadrarP(P.quadro, P.vista);
  const lista = g => d[g].length ? `<div class="pleg"><b style="color:${CORES_P[g]}"><i style="background:${CORES_P[g]}"></i>${ROT_P[g]}</b><span>${d[g].map(b => esc(nomePt(b))).join(' · ')}</span></div>` : '';
  const ul = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  painelP(d.nome, `<span class="tag">desvio postural</span>${esc(d.local)}`, `
    <div class="acoes" style="margin:0 0 8px"><button id="bVoltaP">← Postura</button></div>
    <div class="pctl"><div class="pctl-t"><span>Grau do desvio</span><output id="pK">0%</output></div>
      <input id="pKs" type="range" min="0" max="100" step="1" value="0" aria-label="Grau do desvio">
      <div class="seg"><button data-k="0">Alinhado</button><button data-k="1">Desvio</button><button id="pCmp">▶ Comparar</button></div></div>
    ${chipsFer()}
    <p>${esc(d.desc)}</p>
    <h3>O que o fio de prumo mostra</h3><p>${esc(d.prumo)}</p>
    <h3>Músculos no modelo</h3>${lista('enc')}${lista('alo')}${lista('ten')}
    <h3>Causas e fatores</h3><p>${esc(d.causas)}</p>
    <h3>Como avaliar</h3><p>${esc(d.avaliar)}</p>
    <h3>Cadeia ascendente (de baixo para cima)</h3><p>${esc(d.asc)}</p>
    <h3>Cadeia descendente (de cima para baixo)</h3><p>${esc(d.desc_cadeia)}</p>
    <h3>Lesões e queixas associadas</h3><p>${esc(d.lesoes)}</p>
    <h3>Manejo</h3><p>${esc(d.pratica)}</p>
    <div class="man"><div><b style="color:${CORES_P.enc}">Alongar e mobilizar</b>${ul(d.alongar)}</div><div><b style="color:${CORES_P.alo}">Fortalecer</b>${ul(d.fortalecer)}</div></div>
    <p><b>No treino:</b> ${esc(d.treino)}</p>
    <div class="aviso">${esc(POST.nota)}</div>
    <div class="fontes">Fontes: ${POST.fontes.map(esc).join(' · ')}</div>`);
  ligarPainelP();
  POSE.S.aoMudar = k => { if (!$('pKs')) return; $('pK').textContent = Math.round(k * 100) + '%'; if (document.activeElement !== $('pKs')) $('pKs').value = Math.round(k * 100); $('pLeit').innerHTML = POSE.leituraHTML(); };
  $('pKs').oninput = e => { POSE.parar(); $('pCmp').classList.remove('on'); POSE.aplicar(e.target.value / 100, false); };
  $('pKs').onchange = e => POSE.aplicar(e.target.value / 100, true);
  POSE.animar(1);
}

/* ---------- corpo inteiro em movimento ---------- */
const CORES_M = { ag: '#ffb938', sin: '#ff6b8b', est: '#2fd3c6' };
const ROT_M = { ag: 'Agonistas: fazem o movimento', sin: 'Sinergistas: ajudam o agonista', est: 'Estabilizadores: seguram as articulações' };
const PL = { s: ['sagital', 'látero-lateral'], f: ['frontal', 'anteroposterior'], t: ['transverso', 'longitudinal'] };
const ombroAg = { flex: ['Clavicular part of deltoid muscle', 'Clavicular head of pectoralis major muscle', 'Coracobrachialis muscle', 'Long head of biceps brachii'], abd: ['Acromial part of deltoid muscle', 'Supraspinatus muscle'] };
const escap = ['Serratus anterior muscle', 'Descending part of trapezius muscle', 'Ascending part of trapezius muscle'];
const lombo = t => { const th = 110 * t, lf = 45 * (1 - (1 - th / 110) ** 2); return { th, lf, hip: th - lf }; };
const MOVS = [
  { id: 'flexao-ombro', grupo: 'Membro superior', nome: 'Elevação do braço à frente (flexão do ombro)', quadro: 'ombro', vista: 'lat', dur: 2600,
    gen: t => ({ mov: { flex: 180 * t } }),
    tiles: (t, A) => [['Elevação do braço', 180 * t], ['Glenoumeral', 180 * t - A.phid], ['Escápula (rotação para cima)', A.phid]],
    rot: (A, mk) => [{ p: mk.cot_d.p, t: 'ombro ' + Math.round(POSE.S.k * 180) + '°', c: '#ffb938' }, { p: mk.acr_d.p, t: 'escápula ' + Math.round(A.phid) + '°', c: '#2fd3c6' }],
    fase: sobe => sobe ? 'Subindo: o deltoide (parte clavicular) e o peitoral maior (parte clavicular) trabalham em ação concêntrica, e o serrátil anterior e o trapézio giram a escápula para cima.' : 'Descendo: os mesmos músculos freiam o braço em ação excêntrica. Sem carga, a gravidade faz o movimento e eles só controlam a velocidade.',
    ag: ombroAg.flex, sin: escap, est: ['Supraspinatus muscle', 'Infraspinatus muscle', 'Teres minor muscle', 'Subscapularis muscle'],
    juntas: [['Glenoumeral', 'Flexão', 's', '0 a cerca de 120°'], ['Escapulotorácica', 'Rotação para cima', 'f', '0 a cerca de 60°'], ['Acromioclavicular e esternoclavicular', 'Elevação e rotação da clavícula', 't', 'acompanham a escápula']],
    texto: `<p><b>Ritmo escapuloumeral.</b> O braço só chega a 180° porque duas articulações dividem o trabalho. Nos primeiros 30° quase tudo vem da glenoumeral. Depois, para cada 2° do úmero a escápula gira cerca de 1° para cima (proporção média de 2:1, descrita por Inman em 1944). No fim: cerca de 120° na glenoumeral e 60° na escapulotorácica.</p>
      <p><b>Por que a escápula precisa girar.</b> Ao girar para cima, ela leva a cavidade glenoidal junto: a cabeça do úmero continua centrada, o deltoide mantém um comprimento bom para gerar força e o acrômio sai da frente do tubérculo maior, deixando espaço para os tendões do manguito.</p>
      <p><b>Quem gira a escápula:</b> um binário de forças. O trapézio descendente puxa a clavícula e o acrômio para cima, o ascendente puxa a espinha da escápula para baixo e o serrátil anterior puxa o ângulo inferior para a frente e para fora. Os três juntos fazem a escápula rodar em torno de um eixo perto da articulação acromioclavicular.</p>
      <p><b>Manguito rotador:</b> enquanto o deltoide eleva, o supraespinal, o infraespinal, o redondo menor e o subescapular comprimem a cabeça do úmero contra a glenoide e impedem que ela suba e bata no acrômio.</p>`,
    atencao: ['Se a escápula não gira (serrátil ou trapézio fracos, cifose, peitoral menor encurtado), sobra menos espaço abaixo do acrômio: é a base do arco doloroso entre 60° e 120°.', 'Encolher o ombro logo no início (antes de 60°) costuma indicar trapézio superior dominando o movimento.', 'Arredondar ou arquear a lombar para "ganhar" altura no fim do movimento compensa falta de mobilidade torácica ou de ombro.'],
    fontes: ['Inman, Saunders e Abbott (1944), J Bone Joint Surg: função da articulação do ombro (ritmo escapuloumeral).', 'Neumann. Cinesiologia do aparelho musculoesquelético, cap. 5.', 'Ludewig e Reynolds (2009), J Orthop Sports Phys Ther: cinemática da escápula e disfunção do ombro.'] },
  { id: 'abducao-ombro', grupo: 'Membro superior', nome: 'Abertura lateral do braço (abdução do ombro)', quadro: 'ombro', vista: 'ant', dur: 2600,
    gen: t => ({ mov: { abd: 180 * t } }),
    tiles: (t, A) => [['Abdução', 180 * t], ['Glenoumeral', 180 * t - A.phid], ['Escápula (rotação para cima)', A.phid], ['Rotação lateral do úmero', A.rld]],
    rot: (A, mk) => [{ p: mk.cot_d.p, t: 'abdução ' + Math.round(POSE.S.k * 180) + '°', c: '#ffb938' }, { p: mk.acr_d.p, t: 'escápula ' + Math.round(A.phid) + '°', c: '#2fd3c6', esq: true }],
    fase: sobe => sobe ? 'Subindo: deltoide (parte acromial) e supraespinal em ação concêntrica; acima de 90° o úmero gira para fora para o tubérculo maior passar por baixo do acrômio.' : 'Descendo: deltoide e supraespinal em ação excêntrica, controlando a volta do braço.',
    ag: ombroAg.abd, sin: escap, est: ['Infraspinatus muscle', 'Teres minor muscle', 'Subscapularis muscle'],
    juntas: [['Glenoumeral', 'Abdução', 'f', '0 a cerca de 120°'], ['Glenoumeral', 'Rotação lateral (acima de 90°)', 't', 'cerca de 30° a 50°'], ['Escapulotorácica', 'Rotação para cima', 'f', '0 a cerca de 60°']],
    texto: `<p><b>Supraespinal e deltoide dividem a tarefa.</b> O supraespinal participa de toda a abdução, não só do começo: ele estabiliza a cabeça do úmero enquanto o deltoide gera a maior parte do torque. Com o braço ao lado do corpo, a linha de tração do deltoide é quase vertical e tende a puxar o úmero para cima; o manguito compensa essa tendência.</p>
      <p><b>Rotação lateral obrigatória.</b> Para abduzir acima de cerca de 90° com o braço em rotação neutra, o tubérculo maior do úmero precisa passar por baixo do acrômio. Por isso o úmero gira para fora durante a subida (no modelo, a palma vira para a frente). Tente elevar o braço com o polegar para baixo e veja como a amplitude fica limitada e desconfortável.</p>
      <p><b>Ritmo escapuloumeral:</b> a mesma proporção média de 2:1 da flexão. No fim, cerca de 120° vêm da glenoumeral e 60° da escápula.</p>`,
    atencao: ['Elevação lateral com rotação medial ("derramando a jarra") aproxima o tubérculo maior do acrômio: prefira o polegar neutro ou para cima.', 'No plano da escápula (cerca de 30° à frente do plano frontal) a cápsula fica mais relaxada e o movimento costuma ser mais confortável.', 'Dor entre 60° e 120° que alivia acima disso é o arco doloroso típico de tendinopatia do manguito ou bursite subacromial.'],
    fontes: ['Neumann. Cinesiologia do aparelho musculoesquelético, cap. 5.', 'Inman, Saunders e Abbott (1944), J Bone Joint Surg.', 'Reinold, Escamilla e Wilk (2009), J Orthop Sports Phys Ther: ativação do manguito rotador e do deltoide em exercícios.'] },
  { id: 'rosca', grupo: 'Membro superior', nome: 'Flexão do cotovelo (rosca)', quadro: 'braco', vista: 'lat', dur: 2000,
    gen: t => ({ mov: { cot: 145 * t } }),
    tiles: t => [['Flexão do cotovelo', 145 * t]],
    rot: (A, mk) => [{ p: mk.cot_d.p, t: 'cotovelo ' + Math.round(POSE.S.k * 145) + '°', c: '#ffb938' }],
    fase: sobe => sobe ? 'Subindo: bíceps, braquial e braquiorradial em ação concêntrica. Com halter, o torque externo é máximo com o antebraço na horizontal (perto de 90°).' : 'Descendo: os flexores trabalham em ação excêntrica, freando o antebraço.',
    ag: ['Long head of biceps brachii', 'Short head of biceps brachii', 'Brachialis muscle', 'Brachioradialis muscle'], sin: ['Superficial head of pronator teres', 'Deep head of pronator teres'], est: ['Clavicular part of deltoid muscle', 'Descending part of trapezius muscle', 'Transverse part of trapezius muscle', 'Rhomboid major muscle'],
    juntas: [['Umeroulnar e umerorradial', 'Flexão', 's', '0 a cerca de 145°']],
    texto: `<p><b>Três flexores com papéis diferentes.</b> O braquial insere na ulna e flexiona com a mesma eficiência em qualquer posição do antebraço. O bíceps insere no rádio: é também supinador e perde eficiência com o antebraço pronado. O braquiorradial tem o maior braço de momento e trabalha mais com o antebraço em posição neutra (rosca martelo).</p>
      <p><b>Estabilizadores:</b> durante a rosca, o ombro e a escápula precisam ficar parados para o esforço ir para o cotovelo. Se o deltoide anterior entra para "jogar" o braço à frente, parte da carga sai dos flexores do cotovelo.</p>
      <p>Para estudar torque e braço de momento ângulo a ângulo, abra <b>Cotovelo</b> e toque em "Mover o cotovelo".</p>`,
    atencao: ['Balançar o tronco ou levar o cotovelo à frente transfere a carga para a lombar e o ombro.', 'Estender por completo é seguro e útil para a hipertrofia; o cuidado é não deixar o peso "cair" no fim da descida.'],
    fontes: ['Neumann. Cinesiologia do aparelho musculoesquelético, cap. 6.', 'Kapandji. Anatomia funcional, vol. 1.'] },
  { id: 'agachamento', grupo: 'Membro inferior e tronco', nome: 'Agachamento livre (braços à frente)', quadro: 'corpo', vista: 'frente', dur: 2600,
    gen: t => ({ mov: { agach: 120 * t, flex: Math.min(90, 160 * t) } }),
    tiles: (t, A) => [['Joelho · flexão', 120 * t], ['Quadril · flexão', (A.t || 0) + (A.u || 0)], ['Tornozelo · dorsiflexão', A.s || 0], ['Tronco · inclinação', A.u || 0]],
    rot: (A, mk) => [{ p: mk.joe_d.p, t: 'joelho ' + Math.round(POSE.S.k * 120) + '°', c: '#ffb938' }, { p: mk.qua_d.p, t: 'quadril ' + Math.round((A.t || 0) + (A.u || 0)) + '°', c: '#ff6b8b' }, { p: mk.mal_d.p, t: 'tornozelo ' + Math.round(A.s || 0) + '°', c: '#2fd3c6' }],
    fase: sobe => sobe ? 'Descendo: quadríceps, glúteo máximo e adutor magno trabalham em ação excêntrica, freando a descida. O tronco inclina para o centro de massa continuar sobre o meio do pé.' : 'Subindo: os mesmos extensores trabalham em ação concêntrica. Quadril e joelho estendem juntos, sem o quadril subir antes.',
    ag: ['Rectus femoris muscle', 'Vastus lateralis muscle', 'Vastus medialis muscle', 'Vastus intermedius muscle', 'Gluteus maximus muscle', 'Adductor magnus'], sin: ['Soleus muscle', 'Semitendinosus muscle', 'Semimembranosus muscle', 'Long head of biceps femoris'],
    est: ['Iliocostalis lumborum muscle', 'Longissimus thoracis muscle', 'Multifidus lumborum muscle', 'Rectus abdominis muscle', 'External abdominal oblique muscle', 'Internal abdominal oblique muscle', 'Transversus abdominis muscle'],
    juntas: [['Joelho', 'Flexão (descida) e extensão (subida)', 's', '0 a cerca de 120°'], ['Quadril', 'Flexão e extensão', 's', '0 a cerca de 100°'], ['Tornozelo', 'Dorsiflexão', 's', 'até cerca de 35°'], ['Coluna lombar', 'Mantida neutra pelos estabilizadores', '—', '—']],
    texto: `<p><b>Cadeia fechada:</b> o pé fica fixo no chão e três articulações se movem juntas. O tornozelo deixa a canela avançar, o joelho e o quadril flexionam, e o tronco inclina o quanto for preciso para o centro de massa ficar sobre o meio do pé. Os braços à frente ajudam: deslocam parte do peso para a frente e deixam o tronco mais vertical.</p>
      <p><b>Quem trabalha.</b> O quadríceps estende o joelho; o glúteo máximo e o adutor magno estendem o quadril. Os isquiotibiais cruzam quadril e joelho e mudam pouco de comprimento: ajudam a estender o quadril e protegem o joelho, mas não são os principais motores. O sóleo controla a canela avançando.</p>
      <p><b>Estabilizadores do tronco:</b> eretores da espinha, multífidos e o abdômen (com o transverso e os oblíquos aumentando a pressão dentro do abdômen) mantêm a coluna estável enquanto o tronco inclina.</p>
      <p>Para ver os momentos em cada articulação e mudar barra, carga e mobilidade, abra <b>Joelho</b> e toque em "Agachamento".</p>`,
    atencao: ['O joelho passar da ponta do pé é normal; impedir isso aumenta muito a exigência no quadril e na lombar.', 'Pouca dorsiflexão faz o tronco inclinar mais. Calço no calcanhar ou sapato de levantamento ajudam.', 'Joelho entrando (valgo) na subida pede mais controle de glúteo médio e máximo.', 'A profundidade ideal é a que a pessoa controla com a lombar estável e sem dor.'],
    fontes: ['Schoenfeld (2010), J Strength Cond Res: cinemática do agachamento e aplicações no treino.', 'Escamilla (2001), Med Sci Sports Exerc: biomecânica do joelho no agachamento.', 'Hartmann, Wirth e Klusemann (2013), Sports Med: profundidade do agachamento.', 'Neumann, caps. 12 e 13.'] },
  { id: 'flexao-tronco', grupo: 'Membro inferior e tronco', nome: 'Flexão do tronco (ritmo lombopélvico)', quadro: 'corpo', vista: 'lat', dur: 2800,
    gen: t => { const { th, lf, hip } = lombo(t); return { pelve: { ant: hip }, col: { lum: [lf], torI: [th * 0.1] }, perna: { inclina: -hip * 0.14 } }; },
    tiles: t => { const { th, lf, hip } = lombo(t); return [['Tronco · flexão total', th], ['Coluna lombar', lf], ['Quadril (pelve)', hip]]; },
    rot: (A, mk) => { const { lf, hip } = lombo(POSE.S.k); return [{ p: mk.l3.p, t: 'lombar ' + Math.round(lf) + '°', c: '#2fd3c6' }, { p: mk.qua_d.p, t: 'quadril ' + Math.round(hip) + '°', c: '#ffb938' }]; },
    fase: sobe => sobe ? 'Descendo: eretores da espinha, glúteo máximo e isquiotibiais trabalham em ação excêntrica, freando a flexão. A coluna lombar flexiona mais no começo e a pelve gira mais no fim.' : 'Subindo: os extensores do quadril começam a volta girando a pelve; os eretores completam a extensão da coluna.',
    ag: ['Gluteus maximus muscle', 'Semitendinosus muscle', 'Semimembranosus muscle', 'Long head of biceps femoris', 'Adductor magnus'], sin: ['Iliocostalis lumborum muscle', 'Longissimus thoracis muscle', 'Multifidus lumborum muscle', 'Spinalis thoracis muscle'], est: ['Transversus abdominis muscle', 'Internal abdominal oblique muscle', 'Soleus muscle'],
    juntas: [['Coluna lombar', 'Flexão', 's', 'até cerca de 40° a 50°'], ['Quadril (rotação da pelve sobre os fêmures)', 'Flexão', 's', 'até cerca de 70°'], ['Tornozelo', 'Pequena flexão plantar (quadril vai para trás)', 's', 'alguns graus']],
    texto: `<p><b>Ritmo lombopélvico.</b> Inclinar o tronco à frente com os joelhos estendidos é a soma de duas partes: a flexão da coluna lombar e a rotação da pelve sobre os fêmures (flexão do quadril). No começo a lombar contribui mais; no fim, a maior parte vem do quadril. No modelo, cerca de 45° vêm da lombar e 65° do quadril.</p>
      <p><b>Quem controla.</b> A gravidade faz a descida; glúteo máximo, isquiotibiais e eretores da espinha freiam em ação excêntrica. Perto da flexão máxima, os eretores quase param de disparar e os tecidos passivos (ligamentos e fáscia toracolombar) assumem parte da carga: é o fenômeno de flexão-relaxamento.</p>
      <p><b>O quadril vai para trás</b> para o centro de massa continuar sobre os pés.</p>
      <p><b>Isquiotibiais encurtados</b> limitam a rotação da pelve: para chegar ao chão, a lombar precisa flexionar mais. Por isso o ritmo lombopélvico muda de pessoa para pessoa e ajuda a avaliar.</p>`,
    atencao: ['Para levantar cargas (terra, stiff), mantenha a lombar perto do neutro e use mais o quadril: a flexão lombar sob carga alta concentra o esforço nos tecidos passivos.', 'Sem carga, flexionar a coluna é um movimento normal e saudável.', 'Quem sente dor ao levantar costuma usar pouco o quadril; treinar o movimento de "dobradiça" do quadril ajuda.'],
    fontes: ['Neumann, caps. 9 e 12.', 'Esola et al. (1996), Spine: ritmo lombopélvico na flexão do tronco.', 'McGill. Low Back Disorders: evidence-based prevention and rehabilitation.'] },
  { id: 'panturrilha', grupo: 'Membro inferior e tronco', nome: 'Elevação dos calcanhares (flexão plantar)', quadro: 'pernas', vista: 'lat', dur: 1800,
    gen: t => ({ mov: { calc: 32 * t } }),
    tiles: t => [['Tornozelo · flexão plantar', 32 * t], ['Calcanhar sobe', 32 * t]],
    rot: (A, mk) => [{ p: mk.mal_d.p, t: 'tornozelo ' + Math.round(POSE.S.k * 32) + '°', c: '#ffb938' }],
    fase: sobe => sobe ? 'Subindo: gastrocnêmio e sóleo em ação concêntrica puxam o calcâneo pelo tendão do calcâneo; o pé vira uma alavanca apoiada na cabeça dos metatarsos.' : 'Descendo: os mesmos músculos trabalham em ação excêntrica até o calcanhar voltar ao chão.',
    ag: ['Medial head of gastrocnemius', 'Lateral head of gastrocnemius', 'Soleus muscle'], sin: ['Tibialis posterior muscle', 'Fibularis longus muscle', 'Fibularis brevis muscle', 'Flexor hallucis longus'], est: [],
    juntas: [['Talocrural (tornozelo)', 'Flexão plantar', 's', '0 a cerca de 45° a 50°'], ['Metatarsofalângicas', 'Extensão (dedos ficam no chão)', 's', 'até cerca de 60°']],
    texto: `<p><b>Alavanca de segunda classe.</b> O apoio fica na cabeça dos metatarsos, a resistência (o peso do corpo) passa pela tíbia e a força muscular entra pelo tendão do calcâneo, mais longe do apoio. Por isso uma força relativamente pequena levanta o corpo todo.</p>
      <p><b>Gastrocnêmio x sóleo.</b> O gastrocnêmio cruza o joelho: com o joelho estendido (em pé), ele está alongado e contribui bastante. Com o joelho flexionado (panturrilha sentada), fica frouxo e o sóleo assume a maior parte do trabalho.</p>
      <p><b>Sinergistas:</b> o tibial posterior e os fibulares estabilizam o pé, e o flexor longo do hálux ajuda a empurrar pelo dedão.</p>`,
    atencao: ['Use amplitude completa: descer o calcanhar abaixo do degrau alonga o tríceps sural sob carga, útil para hipertrofia e para a saúde do tendão.', 'O peso deve passar entre o primeiro e o segundo dedo; jogar o peso para o dedinho sobrecarrega a borda lateral do tornozelo.'],
    fontes: ['Neumann, cap. 14.', 'Kapandji. Anatomia funcional, vol. 2.'] },
];
let movAtivo = null;
function listaMov() {
  limparDesvio(); isolado = null; filtroInsercao = null; aplicarVis(); destacar(null);
  document.querySelectorAll('#regioes .chip').forEach(b => b.classList.toggle('on', b.dataset.r === 'movimento'));
  voar([0, 0.9, 0], 3.7, new THREE.Vector3(-0.5, 0.1, 1));
  const grupos = {}; MOVS.forEach(m => (grupos[m.grupo] = grupos[m.grupo] || []).push(m));
  painelP('Corpo em movimento', '<span class="tag">cinesiologia</span>o corpo inteiro, com todos os músculos', `
    <p>Escolha um movimento: todos os ossos e músculos se movem juntos. Os que trabalham aparecem em <b style="color:${CORES_M.ag}">âmbar (agonistas)</b>, <b style="color:${CORES_M.sin}">rosa (sinergistas)</b> e <b style="color:${CORES_M.est}">verde-água (estabilizadores)</b>, com os ângulos de cada articulação ao vivo.</p>
    ${Object.entries(grupos).map(([g, ms]) => `<h3>${esc(g)}</h3><div class="lista">${ms.map(m => `<button data-m="${m.id}"><i style="background:${CORES_M.ag}"></i>${esc(m.nome)}</button>`).join('')}</div>`).join('')}
    <div class="aviso">O movimento é um modelo de estudo: cada osso segue ângulos médios da literatura e os músculos se deformam acompanhando os ossos vizinhos, sem simular contração.</div>`);
  $('pB').onclick = ev => { const b = ev.target.closest('button[data-m]'); if (b) mostrarMov(b.dataset.m); };
}
async function mostrarMov(id) {
  const m = MOVS.find(x => x.id === id); if (!m) return;
  await peleProntaToast(); limparDesvio(); movAtivo = m;
  colorir({ ag: m.ag, sin: m.sin, est: m.est }, CORES_M); isolado = null; filtroInsercao = null;
  if (!visCamada.musculos) { visCamada.musculos = true; document.querySelector('[data-c=musculos]').classList.add('on'); }
  POSE.iniciar({}, [], [], { gen: m.gen, rot: m.rot, todos: true }); aplicarVis(); destacar(null); enquadrarP(m.quadro, m.vista);
  const lista = g => m[g].length ? `<div class="pleg"><b style="color:${CORES_M[g]}"><i style="background:${CORES_M[g]}"></i>${ROT_M[g]}</b><span>${m[g].map(b => esc(nomePt(b))).join(' · ')}</span></div>` : '';
  painelP(m.nome, `<span class="tag">movimento</span>${esc(m.grupo)}`, `
    <div class="acoes" style="margin:0 0 8px"><button id="bVoltaM">← Movimentos</button></div>
    <div class="pctl"><div class="pctl-t"><span>Amplitude</span><output id="mK">0%</output></div>
      <input id="mKs" type="range" min="0" max="100" step="1" value="0" aria-label="Amplitude do movimento">
      <div class="seg"><button data-k="0">Início</button><button data-k="1">Fim</button><button id="mPlay" class="on">❚❚ Pausar</button></div></div>
    <div class="kp mt4" id="mAng"></div>
    <div class="zona ok" id="mFase"></div>
    <h3>Músculos</h3>${lista('ag')}${lista('sin')}${lista('est')}
    <h3>Articulações, planos e eixos</h3>
    <table class="ac"><tr><th>Articulação</th><th>Movimento</th><th>Plano · eixo</th><th>Amplitude</th></tr>${m.juntas.map(([a, mv, p, amp]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(mv)}</td><td>${PL[p] ? `<span class="pl ${PL[p][0]}">${PL[p][0]}</span><br><small>${PL[p][1]}</small>` : '—'}</td><td>${esc(amp)}</td></tr>`).join('')}</table>
    <h3>Como funciona</h3>${m.texto}
    <h3>Pontos de atenção</h3><ul>${m.atencao.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="fontes">Fontes: ${m.fontes.map(esc).join(' · ')} · Modelo 3D: Z-Anatomy (CC BY-SA 4.0).</div>`);
  let ult = 0, sobe = true;
  POSE.S.aoMudar = k => {
    if (!$('mKs') || movAtivo !== m) return;
    if (Math.abs(k - ult) > 1e-4) sobe = k > ult; ult = k;
    $('mK').textContent = Math.round(k * 100) + '%'; if (document.activeElement !== $('mKs')) $('mKs').value = Math.round(k * 100);
    $('mAng').innerHTML = m.tiles(k, POSE.S.ang).map(([n, v]) => `<div><small>${esc(n)}</small><b>${Math.round(v)}°</b></div>`).join('');
    const f = m.fase(sobe); if ($('mFase').textContent !== f) $('mFase').textContent = f;
  };
  POSE.S.aoMudar(0);
  const play = on => { $('mPlay').classList.toggle('on', on); $('mPlay').textContent = on ? '❚❚ Pausar' : '▶ Reproduzir'; on ? POSE.animar(POSE.S.k > 0.5 ? 0 : 1, true, m.dur) : POSE.parar(); };
  $('pB').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'bVoltaM') return listaMov();
    if (b.id === 'mPlay') return play(!b.classList.contains('on'));
    if (b.dataset.k !== undefined) { play(false); POSE.animar(+b.dataset.k); }
  };
  $('mKs').oninput = e => { play(false); POSE.aplicar(e.target.value / 100, false); };
  $('mKs').onchange = e => POSE.aplicar(e.target.value / 100, true);
  POSE.animar(1, true, m.dur);
}

/* ---------- laço ---------- */
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
renderer.setAnimationLoop(() => {
  const voando = anim.t < 1;
  if (voando) { anim.t = Math.min(1, (performance.now() - anim.t0) / 900); const k = ease(anim.t); ctl.target.lerpVectors(anim.de.t, anim.ate.t, k); cam.position.lerpVectors(anim.de.p, anim.ate.p, k); }
  const posando = POSE.tick();
  if (ctl.update()) sujar(2);
  if (!voando && !posando && suja <= 0) return;
  if (suja > 0) suja--;
  if (MOV.on) movQuadro(); if (AG.on) agQuadro(); if (POSE.ativo) POSE.rotulos();
  renderer.render(scene, cam);
});
// painel no celular: tocar no cabeçalho recolhe ou expande a folha
$('painel').querySelector('.p-h').addEventListener('click', e => { if (innerWidth < 900 && !e.target.closest('#pX')) $('painel').classList.toggle('min'); });
new MutationObserver(() => $('painel').classList.remove('min')).observe($('pT'), { childList: true, characterData: true, subtree: true });
// prepara em segundo plano os pesos que deixam os músculos acompanharem os ossos
setTimeout(() => POSE.pele(), 1200);
aplicarVis();
window.__cm = { MESH, E, get iso() { return isolado; }, regiao, MOV, setAng: a => { MOV.ang = a; movAplicar(); }, entrarMov, padrao, cam, ctl, THREE, AG, entrarAg, POSE, mostrarMov, listaMov, mostrarDesvio, mostrarFerramenta, listaPostura, setK: k => { AG.k = k; agAplicar(); } };
