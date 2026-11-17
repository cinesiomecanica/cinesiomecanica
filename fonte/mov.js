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
  x.font = '10px Poppins, sans-serif'; x.fillStyle = '#73839a'; x.strokeStyle = '#243344'; x.lineWidth = 1;
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
  $('rot').innerHTML = `<span id="rAng" style="color:var(--ac)"></span><span id="rD" style="color:#ffd43b"></span><span id="rEixo" style="color:var(--ac);font-weight:500;font-size:11px">${c.eixo}</span>`; $('rot').style.display = '';
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
