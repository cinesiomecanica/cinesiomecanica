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
  x.font = '10px Poppins, sans-serif'; x.fillStyle = '#73839a'; x.strokeStyle = '#243344'; x.lineWidth = 1;
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
