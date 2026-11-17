/* ---------- motor de pose (GPU): desvios posturais e corpo inteiro em movimento ---------- */
const POST = DADOS.posturas; let desvioAtivo = null;
const CORES_P = { enc: '#ff8a3d', alo: '#4dabf7', ten: '#c084fc' };
const ROT_P = { enc: 'Encurtados', alo: 'Alongados ou enfraquecidos', ten: 'Tensionados (hiperativos)' };
const LOCAIS = ['Pé e tornozelo', 'Joelho', 'Quadril', 'Pelve e lombar', 'Pelve e tronco', 'Coluna torácica', 'Coluna (plano frontal)', 'Cintura escapular', 'Coluna cervical', 'Padrão global do tronco superior'];
const QUADRO = { pes: [0.25, 0.75, -0.1], antebraco: [0.86, 0.62, -0.24], ombro: [1.5, 1.5], pernas: [0.56, 1.22], corpo: [0.9, 1.92], alto: [1.08, 2.32], tronco: [1.22, 1.0], braco: [1.2, 1.1, -0.12], cabeca: [1.47, 0.62] };   // [altura do centro, altura visível] em metros
const VISTAS = { lat: [-1, 0.06, 0.14], post: [0.14, 0.08, -1], ant: [-0.22, 0.08, 1], obl: [0.8, 0.28, -1], frente: [-0.75, 0.16, 0.65], alto: [-0.55, 1.15, 0.8] };
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
  const { px, py, pz, ps, cel, nseg, FY, malhas, segs, pares } = d, U = FY.length - 1, mapa = new Map();
  const chave = (a, b, c) => (a + 512) | ((b + 512) << 10) | ((c + 512) << 20);
  for (let q = 0; q < px.length; q++) { const k = chave(Math.floor(px[q] / cel), Math.floor(py[q] / cel), Math.floor(pz[q] / cel)); let a = mapa.get(k); if (!a) mapa.set(k, a = []); a.push(q); }
  // cadeias dos membros: nível de cada segmento (escápula e clavícula → úmero → antebraço; pelve → coxa → perna → pé → dedos)
  const NIVEL = { esc: 0, cla: 0, umero: 1, ulna: 2, radio: 2, mao: 3, coxa: 1, perna: 2, pe: 3, dedos: 4 };
  const info = ['campo', ...segs].map(n => { if (n === 'pelve') return { t: 'membro', c: '*', n: 0 }; const m = /^(esc|cla|umero|ulna|radio|mao|coxa|perna|pe|dedos)([de])$/.exec(n); if (!m) return { t: 'tronco' }; return { t: 'membro', c: (/^(esc|cla|umero|ulna|radio|mao)$/.test(m[1]) ? 'b' : 'p') + m[2], n: NIVEL[m[1]] }; });
  // ossos intermediários de cada articulação (1/4, 1/2 e 3/4 da rotação): evitam que o músculo "murche" quando a articulação gira muito
  const idxSeg = new Map(['campo', ...segs].map((n, i) => [n, i])), parMap = new Map();
  idxSeg.set('tord', -2); idxSeg.set('tore', -3);   // tronco (para pares tronco → úmero)
  for (const p of pares) { const a = idxSeg.get(p.a) ?? -1, b = idxSeg.get(p.b), o = { P: p.P, D: p.D, ombro: /^(esc|cla)/.test(p.a) }; parMap.set(a + '|' + b, { a, b, h: p.h, ...o, inv: false }); parMap.set(b + '|' + a, { a: b, b: a, h: [...p.h].reverse(), ...o, inv: true }); }
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
  // distribui "peso" ao longo da cadeia sa → (3 intermediários) → sb, na fração f (0 = sa, 1 = sb); noTronco: a ponta sa segue os ossos do tronco mais próximos
  function cadeia(p, f, peso, x, y, z, noTronco) {
    const k = Math.min(3, Math.floor(f * 4)), t = f * 4 - k;
    const no = (j, w) => { if (w <= 1e-6) return; if (j === 0) { if (noTronco) prox(x, y, z, w, true); else seg1(p.a, w); } else if (j === 4) seg1(p.b, w); else add(nseg + U + 1 + p.h[j - 1], w); };
    no(k, peso * (1 - t)); no(k + 1, peso * t);
  }
  // depois da proximidade: se os dois ossos principais forem os dois lados de uma articulação, troca pela cadeia de intermediários
  function converter(x, y, z) {
    let i1 = -1, i2 = -1; for (let t = 0; t < nc; t++) { if (cb[t] >= nseg) continue; if (i1 < 0 || cp[t] > cp[i1]) { i2 = i1; i1 = t; } else if (i2 < 0 || cp[t] > cp[i2]) i2 = t; }
    if (i1 < 0 || i2 < 0) return; const p = parMap.get((cb[i1] + 1) + '|' + (cb[i2] + 1)); if (!p) return;
    const w1 = cp[i1], w2 = cp[i2]; cp[i1] = 0; cp[i2] = 0; let f = w2 / (w1 + w2);
    if (!p.ombro && p.P) { const fd = suave(-0.035, 0.035, (x - p.P[0]) * p.D[0] + (y - p.P[1]) * p.D[1] + (z - p.P[2]) * p.D[2]); f = 0.35 * f + 0.65 * (p.inv ? 1 - fd : fd); }
    cadeia(p, f, w1 + w2, x, y, z, false);
  }
  const parTronco = sb => parMap.get((idxSeg.get(/^umero/.test(['campo', ...segs][sb]) ? 'tor' + ['campo', ...segs][sb].slice(-1) : 'pelve') ?? -9) + '|' + sb);
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let mi = 0; mi < malhas.length; mi++) {
    const { id, w, campo } = malhas[mi], n = w.length / 3, idx = new Uint8Array(n * 4), wt = new Float32Array(n * 4);
    // eixo mais longo do músculo e os ossos em cada ponta
    let modo = 'prox', ax = 1, lo = 0, hi = 1, sA = 0, sB = 0, ptA = [0, 0, 0], ptB = [0, 0, 0], raioB = 0.15;
    if (!campo) {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const v = w[3 * i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
      ax = [0, 1, 2].reduce((a, b) => (mx[b] - mn[b] > mx[a] - mn[a] ? b : a), 0); lo = mn[ax]; hi = mx[ax];
      const votos = [new Map(), new Map()], passo = Math.max(1, Math.floor(n / 600)), pont = [[0, 0, 0, 0], [0, 0, 0, 0]];
      for (let i = 0; i < n; i += passo) { const s = (w[3 * i + ax] - lo) / (hi - lo || 1), e = s < 0.12 ? 0 : s > 0.88 ? 1 : -1; if (e < 0) continue; const y = w[3 * i + 1]; fj = 0; ff = 0; if (y >= FY[U]) { fj = U - 1; ff = 1; } else if (y > FY[0]) { while (y >= FY[fj + 1]) fj++; ff = (y - FY[fj]) / (FY[fj + 1] - FY[fj]); } const sg = maisPerto(w[3 * i], y, w[3 * i + 2]); votos[e].set(sg, (votos[e].get(sg) || 0) + 1); const pp = pont[e]; pp[0] += w[3 * i]; pp[1] += y; pp[2] += w[3 * i + 2]; pp[3]++; }
      const tip = e => { const pp = pont[e]; return [pp[0] / (pp[3] || 1), pp[1] / (pp[3] || 1), pp[2] / (pp[3] || 1)]; }; ptA = tip(0); ptB = tip(1); raioB = Math.min(0.2, Math.max(0.08, 0.45 * (hi - lo)));
      const top = m => { let b = 0, c = -1; for (const [s, v] of m) if (v > c) { c = v; b = s; } return b; };
      sA = top(votos[0]); sB = top(votos[1]); const A = info[sA], B = info[sB];
      livre.fill(0);
      const braco = f => f.t === 'membro' && f.c[0] === 'b';
      if ((A.c === '*' && braco(B)) || (B.c === '*' && braco(A))) {   // pelve → braço (grande dorsal): a pelve conta como tronco
        modo = 'misto'; info.forEach((f, s) => { if (f.t === 'tronco' || f.c === '*') livre[s] = 1; });
        if (braco(A)) { const t = sA; sA = sB; sB = t; lo = hi + (hi = lo, 0); ptB = tip(0); }
      } else if (A.t === 'membro' && B.t === 'membro' && (A.c === B.c || A.c === '*' || B.c === '*')) {
        const ca = A.c === '*' ? B.c : A.c, dif = Math.abs(A.n - B.n);
        if (sA === sB) modo = 'rigido';
        else if (dif <= 1) modo = 'eixo';
        else { modo = 'cadeia'; const n0 = Math.min(A.n, B.n), n1 = Math.max(A.n, B.n); info.forEach((f, s) => { if (f.t === 'membro' && (f.c === ca || f.c === '*') && f.n >= n0 && f.n <= n1) livre[s] = 1; }); }
      } else if (A.t !== B.t) { modo = 'misto'; info.forEach((f, s) => { if (f.t === 'tronco' || f.c === '*') livre[s] = 1; }); if (A.t === 'membro') { const t = sA; sA = sB; sB = t; lo = hi + (hi = lo, 0); ptB = tip(0); } }
    }
    for (let i = 0; i < n; i++) {
      const x = w[3 * i], y = w[3 * i + 1], z = w[3 * i + 2]; nc = 0;
      fj = 0; ff = 0; if (y >= FY[U]) { fj = U - 1; ff = 1; } else if (y > FY[0]) { while (y >= FY[fj + 1]) fj++; ff = (y - FY[fj]) / (FY[fj + 1] - FY[fj]); }
      if (campo) campoAdd(1);
      else if (modo === 'rigido') seg1(sA, 1);
      else if (modo === 'cadeia') { prox(x, y, z, 1, true); converter(x, y, z); }
      else {
        const sv = (w[3 * i + ax] - lo) / (hi - lo || 1), wb = suave(0.3, 0.72, sv);
        if (modo === 'eixo') {
          const p = parMap.get(sA + '|' + sB);
          if (!p) { seg1(sA, 1 - wb); seg1(sB, wb); }
          else if (p.ombro) {   // ombro: só a parte perto do tendão no úmero acompanha o braço
            const um = p.inv ? ptA : ptB, f = 1 - suave(0.015, raioB, Math.hypot(x - um[0], y - um[1], z - um[2])); cadeia(p, p.inv ? 1 - f : f, 1, x, y, z, false);
          } else {   // demais articulações: o que está além da articulação segue o osso de baixo, com transição de ~3,5 cm
            const fd = suave(-0.035, 0.035, (x - p.P[0]) * p.D[0] + (y - p.P[1]) * p.D[1] + (z - p.P[2]) * p.D[2]); cadeia(p, p.inv ? 1 - fd : fd, 1, x, y, z, false);
          }
        }
        else if (modo === 'misto') {   // ponta no tronco segue a coluna; ponta no membro segue o osso, passando pelos intermediários
          const p = parTronco(sB);
          const dB = Math.hypot(x - ptB[0], y - ptB[1], z - ptB[2]), fm = 1 - suave(0.015, raioB, dB);
          if (p) cadeia(p, fm, 1, x, y, z, true); else { prox(x, y, z, 1 - fm, true); seg1(sB, fm); }
        }
        else { prox(x, y, z, 1, false); converter(x, y, z); }
      }
      let tot = 0;
      for (let k = 0; k < 4; k++) { let m = -1; for (let t = 0; t < nc; t++) if (cp[t] > 0 && (m < 0 || cp[t] > cp[m])) m = t; if (m < 0) break; idx[4 * i + k] = cb[m]; wt[4 * i + k] = cp[m]; tot += cp[m]; cp[m] = -1; }
      for (let k = 0; k < 4; k++) wt[4 * i + k] /= tot || 1;
    }
    yield { id, idx, wt, prog: (mi + 1) / malhas.length, diag: modo + ' ' + (['campo', ...segs][sA] || sA) + '>' + (['campo', ...segs][sB] || sB) };
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
  const S = { Rh: {}, Uh: {}, Wr: {}, pronto: false, ativo: false, k: 0, def: {}, gen: null, fer: new Set(), rig: [], campo: [], anim: null, mk: {}, A: {}, K: {}, H: {}, G: {}, Cs: {}, sc: {}, ac: {}, Hh: {}, Co: {}, MTP: {},
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
    if (b === 'Radius') return 'radio' + l; if (b === 'Ulna') return 'ulna' + l;
    if (SEG_RE.braco.test(b)) return 'mao' + l;
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
      const rad = W('Radius' + suf), uln = W('Ulna' + suf), [ry0, ry1] = faixa(rad, 1), uy0 = faixa(uln, 1)[0];
      S.Rh[l] = mediaSe(rad, (x, y) => y > ry1 - 0.012); S.Uh[l] = mediaSe(uln, (x, y) => y < uy0 + 0.014);   // cabeça do rádio e cabeça da ulna: eixo da pronação
      const Wr = mediaSe(rad, (x, y) => y < ry0 + 0.016); Wr.x = (Wr.x + S.Uh[l].x) / 2; Wr.y = ry0 - 0.004; S.Wr[l] = Wr;   // centro do punho
      mk('mal_' + l, mediaSe(fib, (x, y) => y < fb0 + 0.015), 'perna' + l); mk('joe_' + l, K.clone(), 'coxa' + l);
      mk('troc_' + l, ponta(fem, 0, lat, 0.006, (x, y) => y > fy1 - 0.12), 'coxa' + l);
      mk('acr_' + l, ponta(esc, 0, lat, 0.008, (x, y) => y > ey1 - 0.04), 'esc' + l);
      S.G[l] = ponta(esc, 0, lat, 0.012, (x, y) => y < ey1 - 0.05); S.Cs[l] = meio(esc);
      S.sc[l] = ponta(cla, 0, -lat, 0.01); S.ac[l] = ponta(cla, 0, lat, 0.01);
      mk('ore_' + l, ponta(W(osso('Temporal bone', suf)), 0, lat, 0.003), 'cabeca');
      mk('asis_' + l, ponta(qd, 2, 1, 0.005, (x, y) => y > H.y + 0.05), 'pelve'); mk('cri_' + l, ponta(qd, 1, 1, 0.006), 'pelve');
      mk('pat_' + l, meio(W('Patella' + suf)), 'coxa' + l);
      mk('tt_' + l, ponta(tib, 2, 1, 0.004, (x, y) => y < ty1 - 0.03 && y > ty1 - 0.075), 'perna' + l);
      mk('cot_' + l, Co.clone(), 'umero' + l); mk('pun_' + l, S.Wr[l].clone(), 'radio' + l); mk('mao_' + l, S.Wr[l].clone().add(new V3(0, -0.09, 0)), 'mao' + l); mk('omb_' + l, S.Hh[l].clone(), 'umero' + l); mk('qua_' + l, H.clone(), 'coxa' + l);
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
    // articulações com ossos intermediários: [segmento de cima, segmento de baixo, pivô]
    S.pares = []; let h = 0;
    for (const [l] of LADOS) for (const [a, b, P] of [['esc', 'umero', S.Hh], ['cla', 'umero', S.Hh], ['tor', 'umero', S.Hh], ['umero', 'ulna', S.Co], ['umero', 'radio', S.Co], ['ulna', 'radio', S.Rh], ['radio', 'mao', S.Wr], ['ulna', 'mao', S.Wr],
      ['pelve', 'coxa', S.H], ['coxa', 'perna', S.K], ['perna', 'pe', S.A], ['pe', 'dedos', S.MTP]]) {
      const an = a === 'pelve' ? a : a + l; if (!(b + l in idx) || (a !== 'tor' && !(an in idx))) continue;
      const cb = new V3(); let nb = 0; for (const r of S.rig) if (r.seg === b + l) { const w = W(r.m.name); cb.add(meio(w)); nb++; }
      const D = nb ? cb.multiplyScalar(1 / nb).sub(P[l]).normalize() : new V3(0, -1, 0);
      S.pares.push({ a: an, b: b + l, P: P[l], D, h: [h, h + 1, h + 2] }); h += 3;
    }
    // esqueleto de "ossos virtuais" para a GPU: um por segmento rígido, um por nível da coluna (tronco flexível) e os intermediários
    S.bones = [...S.SEGN, ...S.FY.map((_, j) => 'campo' + j), ...Array(h).fill(0)].map(() => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });
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
    const dados = () => ({ ...S.grade, segs: S.SEGN, pares: S.pares.map(p => ({ a: p.a, b: p.b, h: p.h, P: p.P.toArray(), D: p.D.toArray() })), nseg: S.SEGN.length, FY: S.FY, malhas: nomes.map(n => ({ id: n, w: mundo(MESH[n]), campo: campo.has(n) })) });
    S.pele = new Promise(ok => {
      const receber = r => { S.pesos.set(r.id, r); (S.diag = S.diag || {})[r.id] = r.diag; S.prog = r.prog; if (S.onProg) S.onProg(r.prog); };
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
      if (mv.perna && (mv.perna.lado || 'd') === l) { Hn[l] = H.clone(); continue; }   // perna livre: calculada depois da pelve
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
    if (mv.agach && !mv.perna) {   // tronco inclina até o centro de massa (corpo) ficar sobre o meio do pé
      const HAT0 = Hm.clone().lerp(S.Sm, 0.626), pes = [], alvo = (S.A.d.z + S.A.e.z) / 2 + 0.045, braco = 0.1 * 0.3 * Math.sin((mv.flex || 0) * RAD);
      for (const [l] of LADOS) pes.push([0.1, S.H[l].clone().lerp(S.K[l], 0.433).applyMatrix4(M['coxa' + l]).z], [0.0465, S.K[l].clone().lerp(S.A[l], 0.433).applyMatrix4(M['perna' + l]).z]);
      const zcm = uu => { const h = HAT0.clone().applyMatrix4(tra(Hm2).multiply(rX(uu)).multiply(neg(Hm))); let s = 0.678 * h.z + braco, m = 0.678; for (const [a, z] of pes) { s += a * z; m += a; } return s / m; };
      let lo = -10, hi = 85; for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; zcm(mid) > alvo ? (hi = mid) : (lo = mid); } u = (lo + hi) / 2;
    }
    A.u = u;
    M.pelve = tra(Hm2, Hm).multiply(em(Hm, rY(g('pelve', 'rot')).multiply(rZ(obl + g('pelve', 'obl'))).multiply(rX(g('pelve', 'ant') + u))));
    if (mv.perna) {   // cadeia aberta: quadril → joelho → tornozelo, com a pelve parada
      const P = mv.perna, l = P.lado || 'd', sg = l === 'd' ? 1 : -1;
      const Mc = M.pelve.clone().multiply(em(S.H[l], rY(sg * (P.qa || 0)).multiply(rZ(-sg * (P.qb || 0))).multiply(rY(sg * (P.qr || 0)))));
      const Ms = Mc.clone().multiply(em(S.K[l], rX(P.joe || 0).multiply(rY(sg * (P.joeRot || 0)))));
      const Mp = Ms.clone().multiply(em(S.A[l], rX(-(P.df || 0)).multiply(rZ(sg * (P.inv || 0))).multiply(rY(sg * (P.add || 0)))));
      M['coxa' + l] = Mc; M['perna' + l] = Ms; M['pe' + l] = Mp; M['dedos' + l] = Mp.clone();
    }
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
      const lado = !mv.lado || mv.lado === l, v = k => lado ? mv[k] || 0 : 0;
      // ombro: plano de elevação (0 = frontal/abdução, 90 = sagital/flexão), elevação no plano e rotação axial (medial +)
      const om = lado && mv.omb ? mv.omb : mv.flex && lado ? { a: 90, b: mv.flex } : mv.abd && lado ? { a: 0, b: mv.abd, rl: 1 } : { a: 0, b: 0 };
      // ritmo escapuloumeral: até ~30° quase só a glenoumeral; depois a escápula gira para cima 1° a cada 2° do úmero
      const phi = Math.max(0, (om.b || 0) - 30) * 0.4 + v('escRot'), rl = om.rl ? Math.max(0, om.b - 70) * 0.55 : 0; A['phi' + l] = phi; A['rl' + l] = rl;
      const Me = lv[13].clone().multiply(new M4().makeTranslation(0, (g('esc', 'elev', l) + v('escElev')) / 100, 0)).multiply(em(S.Ct, rY(sg * (g('esc', 'prot', l) + v('escProt'))))).multiply(em(S.G[l], rY(sg * g('esc', 'wing', l))))
        .multiply(em(S.ac[l], rZ(-sg * phi).multiply(rX(-phi * 0.3)))).multiply(em(S.Cs[l], rZ(sg * g('esc', 'rotInf', l)).multiply(rX(g('esc', 'tilt', l)))));   // rotação para cima em torno da acromioclavicular
      M['esc' + l] = Me;
      const Rel = rY(sg * (om.a || 0)).multiply(rZ(-sg * (om.b || 0))).multiply(rY(sg * ((om.r || 0) - rl)));
      const Mu = tra(S.Hh[l].clone().applyMatrix4(Me)).multiply(rY(sg * g('braco', 'rot', l))).multiply(Rel).multiply(neg(S.Hh[l]));
      const Mul = Mu.clone().multiply(em(S.Co[l], rX(-v('cot'))));
      const eixoPr = S.Uh[l].clone().sub(S.Rh[l]).normalize();   // pronação: o rádio gira em volta da ulna (da cabeça do rádio à cabeça da ulna)
      const Mr = Mul.clone().multiply(tra(S.Rh[l])).multiply(new M4().makeRotationAxis(eixoPr, -sg * v('pron') * RAD)).multiply(neg(S.Rh[l]));
      M['umero' + l] = Mu; M['ulna' + l] = Mul; M['radio' + l] = Mr; M['mao' + l] = Mr.clone().multiply(em(S.Wr[l], rX(-v('punF')).multiply(rZ(-sg * v('punD')))));
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
    // intermediários: o segmento de cima girado 1/4, 1/2 e 3/4 do caminho até o de baixo, em torno do pivô da articulação
    const base = S.SEGN.length + S.FM.length, q = new THREE.Quaternion(), qi = new THREE.Quaternion(), pos = new V3(), esc = new V3(), Ma = new M4(), Rl = new M4();
    for (const p of S.pares) {
      Ma.copy(p.a.startsWith('tor') ? M['v:Vertebra T4'] : M[p.a] || I); const Mb = M[p.b] || I;
      Rl.copy(Ma).invert().multiply(Mb); Rl.decompose(pos, q, esc); const P2 = p.P.clone().applyMatrix4(Rl);
      for (let j = 0; j < 3; j++) { const t = (j + 1) / 4; qi.identity().slerp(q, t); S.bones[base + p.h[j]].matrixWorld.copy(Ma).multiply(tra(p.P.clone().lerp(P2, t))).multiply(new M4().makeRotationFromQuaternion(qi)).multiply(neg(p.P)); }
    }
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
  POSE.sair(); PE.mostrar(false);
  for (const m of Object.values(MESH)) if (m.userData.cor0) { m.material.color.copy(m.userData.cor0); delete m.userData.cor0; }
  desvioAtivo = null;
}
const nomePt = b => { const n = Object.keys(E).find(k => E[k].b === b && E[k].c === 'musculos'); return n ? E[n].n : b; };
function colorir(grupos, cores, lado) {   // pinta os músculos de cada grupo; devolve os nomes das malhas
  const nomes = new Set();
  for (const [g, lista] of Object.entries(grupos)) {
    const bases = new Set(lista);
    for (const [n, e] of Object.entries(E)) if (e.c === 'musculos' && bases.has(e.b) && MESH[n] && (!lado || e.l === lado)) { nomes.add(n); const m = MESH[n]; if (!m.userData.cor0) m.userData.cor0 = m.material.color.clone(); m.material.color.set(cores[g]); }
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
function enquadrarP(quadro, vista, centro) {
  let [y, alt, x0 = 0] = QUADRO[quadro] || QUADRO.corpo, z0 = 0; if (centro) { x0 = centro.x; y = centro.y; z0 = centro.z; }
  const W = innerWidth, H = innerHeight, cel = W < 900;
  const area = cel ? { x0: 0, x1: W, y0: 140, y1: H * 0.5 - 66 } : { x0: 0, x1: W - 430, y0: 64, y1: H - 64 };
  const t = Math.tan(cam.fov * Math.PI / 360), aw = (area.x1 - area.x0) / W, ah = (area.y1 - area.y0) / H, larg = Math.max(0.62, alt * 0.48);
  const dist = 1.06 * Math.max(alt / 2 / (t * ah), larg / 2 / (t * cam.aspect * aw)) + 0.15;
  const dir = new THREE.Vector3(...VISTAS[vista] || VISTAS.lat).normalize(), fwd = dir.clone().negate(), dr = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(dr, fwd);
  const wpp = 2 * dist * t / H, dx = (area.x0 + area.x1) / 2 - W / 2, dy = (area.y0 + area.y1) / 2 - H / 2;
  voar(new THREE.Vector3(x0, y, z0).addScaledVector(dr, -dx * wpp).addScaledVector(up, dy * wpp).toArray(), dist, dir, false);
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
  enquadrarP('corpo', 'frente');
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
