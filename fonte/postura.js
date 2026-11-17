/* ---------- desvios posturais: corpo posicionado, fios de prumo e ângulo Q ---------- */
const POST = DADOS.posturas; let desvioAtivo = null;
const CORES_P = { enc: '#ff8a3d', alo: '#4dabf7', ten: '#c084fc' };
const ROT_P = { enc: 'Encurtados', alo: 'Alongados ou enfraquecidos', ten: 'Tensionados (hiperativos)' };
const LOCAIS = ['Pé e tornozelo', 'Joelho', 'Quadril', 'Pelve e lombar', 'Pelve e tronco', 'Coluna torácica', 'Coluna (plano frontal)', 'Cintura escapular', 'Coluna cervical', 'Padrão global do tronco superior'];
// enquadramento [altura do alvo, distância] e direção da câmera
const QUADRO = { pernas: [0.56, 1.22], corpo: [0.9, 1.92], tronco: [1.22, 1.0], cabeca: [1.47, 0.62] };   // [altura do centro, altura visível] em metros
const VISTAS = { lat: [-1, 0.06, 0.14], post: [0.14, 0.08, -1], ant: [-0.22, 0.08, 1], obl: [0.8, 0.28, -1] };
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

const POSE = (() => {
  const V3 = THREE.Vector3, M4 = THREE.Matrix4, RAD = Math.PI / 180;
  const rX = a => new M4().makeRotationX(a * RAD), rY = a => new M4().makeRotationY(a * RAD), rZ = a => new M4().makeRotationZ(a * RAD);
  const tra = (a, b) => new M4().makeTranslation(a.x - (b ? b.x : 0), a.y - (b ? b.y : 0), a.z - (b ? b.z : 0));
  const em = (p, R) => tra(p).multiply(R).multiply(new M4().makeTranslation(-p.x, -p.y, -p.z));   // rotação R em torno do ponto p
  const NIV = [...[5, 4, 3, 2, 1].map(i => 'Vertebra L' + i), ...[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(i => 'Vertebra T' + i), ...[7, 6, 5, 4, 3].map(i => 'Vertebra C' + i), 'Axis (C2)', 'Atlas (C1)'];
  const REG = { lum: [0, 5], torI: [5, 6], torS: [11, 6], cerI: [17, 5], cerS: [22, 3] };   // [primeiro nível, nº de articulações]
  const LADOS = [['d', '.r', 1], ['e', '.l', -1]];   // sg = +1 no lado direito (x negativo no modelo)
  const S = { pronto: false, ativo: false, k: 0, def: {}, fer: new Set(), rig: [], campo: [], soft: new Map(), ligados: [], anim: null, mk: {}, A: {}, K: {}, H: {}, G: {}, Cs: {}, sc: {}, ac: {}, aoMudar: null };

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
  // ponto extremo num eixo (sinal +1 = máximo, -1 = mínimo): média dos vértices a até `tol` do extremo
  const ponta = (w, ax, sinal, tol, f = () => true) => { let e = -1e9; for (let i = 0; i < w.length; i += 3) if (f(w[i], w[i + 1], w[i + 2])) { const v = sinal * w[i + ax]; if (v > e) e = v; } return mediaSe(w, (x, y, z) => f(x, y, z) && sinal * (ax === 0 ? x : ax === 1 ? y : z) >= e - tol); };
  const um = b => Object.keys(MESH).find(n => E[n].c === 'ossos' && E[n].b === b);
  const osso = (b, suf) => MESH[b + suf] ? b + suf : um(b);

  function segDe(n) {
    const b = E[n].b, l = E[n].l === 'direito' ? 'd' : E[n].l === 'esquerdo' ? 'e' : '';
    if (/^(Hip bone|Sacrum|Coccyx)$/.test(b)) return 'pelve';
    if (/^(Femur|Patella)$/.test(b)) return 'coxa' + l;
    if (/^(Tibia|Fibula)$/.test(b)) return 'perna' + l;
    if (SEG_RE.pe.test(b)) return 'pe' + l;
    if (b === 'Scapula') return 'esc' + l; if (b === 'Clavicle') return 'cla' + l;
    if (SEG_RE.braco.test(b)) return 'braco' + l;
    if (/^Vertebra |^Atlas|^Axis/.test(b)) return 'v:' + b;
    if (/rib|sternum|Xiphoid|Hyoid|Thyroid|Cricoid|Arytenoid|Corniculate/.test(b)) return null;   // tronco flexível: segue a coluna pela altura
    return 'cabeca';
  }

  function preparar() {
    if (S.pronto) return;
    const mk = (id, p, seg) => { S.mk[id] = { r: p, seg, p: p.clone() }; };
    S.chao = faixa(W('Calcaneus.r'), 1)[0];
    for (const [l, suf, sg] of LADOS) {
      const lat = -sg, tib = W('Tibia' + suf), fem = W('Femur' + suf), fib = W('Fibula' + suf), esc = W('Scapula' + suf), cla = W('Clavicle' + suf), qd = W('Hip bone' + suf);
      const [ty0, ty1] = faixa(tib, 1), [fy0, fy1] = faixa(fem, 1), fb0 = faixa(fib, 1)[0], ey1 = faixa(esc, 1)[1];
      const A = mediaSe(tib, (x, y) => y < ty0 + 0.015); A.y = ty0 + 0.012; S.A[l] = A;
      const K = mediaSe(fem, (x, y) => y < fy0 + 0.03); K.y = fy0 + 0.022; S.K[l] = K;
      let sx = 0, c = 0; for (let i = 0; i < fem.length; i += 3) if (fem[i + 1] > fy1 - 0.05) { sx += Math.abs(fem[i]); c++; }
      const H = mediaSe(fem, (x, y) => y > fy1 - 0.05 && Math.abs(x) < sx / c); H.y = fy1 - 0.024; S.H[l] = H;
      mk('mal_' + l, mediaSe(fib, (x, y) => y < fb0 + 0.015), 'perna' + l); mk('joe_' + l, K.clone(), 'coxa' + l);
      mk('troc_' + l, ponta(fem, 0, lat, 0.006, (x, y) => y > fy1 - 0.12), 'coxa' + l);
      mk('acr_' + l, ponta(esc, 0, lat, 0.008, (x, y) => y > ey1 - 0.04), 'esc' + l);
      S.G[l] = ponta(esc, 0, lat, 0.012, (x, y) => y < ey1 - 0.05); S.Cs[l] = meio(esc);
      S.sc[l] = ponta(cla, 0, -lat, 0.01); S.ac[l] = ponta(cla, 0, lat, 0.01);
      mk('ore_' + l, ponta(W(osso('Temporal bone', suf)), 0, lat, 0.003), 'cabeca');
      mk('asis_' + l, ponta(qd, 2, 1, 0.005, (x, y) => y > H.y + 0.05), 'pelve'); mk('cri_' + l, ponta(qd, 1, 1, 0.006), 'pelve');
      mk('pat_' + l, meio(W('Patella' + suf)), 'coxa' + l);
      mk('tt_' + l, ponta(tib, 2, 1, 0.004, (x, y) => y < ty1 - 0.03 && y > ty1 - 0.075), 'perna' + l);
    }
    const esp = n => ponta(W(n), 2, -1, 0.004);
    mk('occ', ponta(W(osso('Occipital bone', '')), 2, -1, 0.005), 'cabeca'); mk('c7', esp('Vertebra C7'), 'v:Vertebra C7'); mk('t7', esp('Vertebra T7'), 'v:Vertebra T7');
    mk('l3p', esp('Vertebra L3'), 'v:Vertebra L3'); mk('sac', ponta(W(um('Sacrum')), 2, -1, 0.006), 'pelve');
    // coluna: centro e pivô de cada nível (L5 … C1) e da cabeça
    const cen = NIV.map(n => { const w = W(n), c = meio(w); c.z = faixa(w, 2)[1] - 0.018; return c; });
    S.piv = cen.map((c, i) => i ? c.clone().add(cen[i - 1]).multiplyScalar(0.5) : c.clone().sub(cen[1].clone().sub(c).multiplyScalar(0.5)));
    S.piv.push(cen[23].clone().add(new V3(0, 0.012, 0)));
    mk('l3', cen[2].clone(), 'v:Vertebra L3');
    const ys = meio(W(um('Sacrum'))).y; S.FY = [Math.min(ys, cen[0].y - 0.04), ...cen.map(c => c.y), cen[23].y + 0.035];
    S.Ct = new V3(0, S.Cs.d.y, cen[13].z + 0.07);   // eixo vertical do tórax, na altura de T4
    // ossos rígidos por segmento e ossos do tronco flexível
    const nomes = new Set();
    for (const [n, m] of Object.entries(MESH)) {
      if (m.userData.camada !== 'ossos') continue; const seg = segDe(n);
      if (seg) { m.updateWorldMatrix(true, false); S.rig.push({ m, seg, M0: m.matrixWorld.clone(), Pi: m.parent.matrixWorld.clone().invert() }); nomes.add(seg); }
      else S.campo.push(n);
    }
    S.SEGN = [...nomes]; const idx = Object.fromEntries(S.SEGN.map((s, i) => [s, i]));
    // grade espacial com amostras dos ossos (para ligar cada vértice de músculo ao osso mais próximo)
    const cel = 0.03, mapa = new Map(), px = [], py = [], pz = [], ps = [];
    const semear = (n, s) => { const w = W(n); for (let i = 0; i < w.length; i += 9) { const k = (Math.floor(w[i] / cel) + 512) | ((Math.floor(w[i + 1] / cel) + 512) << 10) | ((Math.floor(w[i + 2] / cel) + 512) << 20); let a = mapa.get(k); if (!a) mapa.set(k, a = []); a.push(px.length); px.push(w[i]); py.push(w[i + 1]); pz.push(w[i + 2]); ps.push(s); } };
    for (const r of S.rig) semear(r.m.name, idx[r.seg] + 1); for (const n of S.campo) semear(n, 0);
    S.grade = { cel, mapa, px: Float32Array.from(px), py: Float32Array.from(py), pz: Float32Array.from(pz), ps: Int16Array.from(ps), melhor: new Float32Array(S.SEGN.length + 1) };
    for (const n of S.campo) S.soft.set(n, prepSoft(MESH[n], true));
    montarFerr(); S.pronto = true;
    S.k = 0; S.def = {}; calc(); marcos(); S.q0 = { d: anguloQ('d'), e: anguloQ('e') };
  }

  /* --- malhas flexíveis: costelas, esterno e músculos (cada vértice segue os ossos vizinhos) --- */
  function prepSoft(m, soCampo) {
    const w0 = mundo(m), n = w0.length / 3, fi = new Uint8Array(n), ff = new Float32Array(n), FY = S.FY, U = FY.length - 1;
    for (let i = 0; i < n; i++) { const y = w0[3 * i + 1]; let j = 0; if (y >= FY[U]) { j = U - 1; ff[i] = 1; } else if (y > FY[0]) { while (y >= FY[j + 1]) j++; ff[i] = (y - FY[j]) / (FY[j + 1] - FY[j]); } fi[i] = j; }
    let ws = null, ww = null;
    if (!soCampo) {
      ws = new Int16Array(n * 3).fill(-1); ww = new Float32Array(n * 3);
      const { cel, mapa, px, py, pz, ps, melhor } = S.grade, lista = [];
      for (let i = 0; i < n; i++) {
        const x = w0[3 * i], y = w0[3 * i + 1], z = w0[3 * i + 2], ix = Math.floor(x / cel) + 512, iy = Math.floor(y / cel) + 512, iz = Math.floor(z / cel) + 512; lista.length = 0;
        for (const r of [1, 2, 4]) {
          for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) {
            const arr = mapa.get((ix + a) | ((iy + b) << 10) | ((iz + c) << 20)); if (!arr) continue;
            for (const q of arr) { const dx = px[q] - x, dy = py[q] - y, dz = pz[q] - z, d2 = dx * dx + dy * dy + dz * dz + 1e-9, s = ps[q]; if (melhor[s] === 0) { lista.push(s); melhor[s] = d2; } else if (d2 < melhor[s]) melhor[s] = d2; }
          }
          if (lista.length) break;
        }
        if (!lista.length) { ws[3 * i] = 0; ww[3 * i] = 1; continue; }
        lista.sort((a, b) => melhor[a] - melhor[b]); const dmin = Math.sqrt(melhor[lista[0]]), lim = (2.2 * dmin + 0.012) ** 2; let tot = 0, c = 0;
        for (const s of lista) { if (c < 3 && melhor[s] <= lim) { const p = 1 / (melhor[s] + 4e-5) ** 2; ws[3 * i + c] = s; ww[3 * i + c] = p; tot += p; c++; } melhor[s] = 0; }
        for (let k = 0; k < c; k++) ww[3 * i + k] /= tot;
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(w0), 3)); if (m.geometry.index) g.setIndex(m.geometry.index); g.computeVertexNormals();
    return { m, w0, ws, ww, fi, ff, g, g0: m.geometry, Pi: m.parent.matrixWorld.clone().invert() };
  }
  function deformar(s, fim) {
    const p = s.g.attributes.position.array, w0 = s.w0, n = w0.length / 3, FM = S.FM, ME = S.ME, { ws, ww, fi, ff } = s;
    for (let i = 0; i < n; i++) {
      const x = w0[3 * i], y = w0[3 * i + 1], z = w0[3 * i + 2]; let ox = 0, oy = 0, oz = 0;
      for (let k = 0; k < 3; k++) {
        let p1 = 1, sg = 0; if (ws) { sg = ws[3 * i + k]; if (sg < 0) break; p1 = ww[3 * i + k]; }
        if (sg === 0) {   // campo da coluna: mistura dos dois níveis vizinhos pela altura
          const a = FM[fi[i]], b = FM[fi[i] + 1], f = ff[i] * p1, g = p1 - f;
          ox += g * (a[0] * x + a[4] * y + a[8] * z + a[12]) + f * (b[0] * x + b[4] * y + b[8] * z + b[12]);
          oy += g * (a[1] * x + a[5] * y + a[9] * z + a[13]) + f * (b[1] * x + b[5] * y + b[9] * z + b[13]);
          oz += g * (a[2] * x + a[6] * y + a[10] * z + a[14]) + f * (b[2] * x + b[6] * y + b[10] * z + b[14]);
        } else { const a = ME[sg - 1]; ox += p1 * (a[0] * x + a[4] * y + a[8] * z + a[12]); oy += p1 * (a[1] * x + a[5] * y + a[9] * z + a[13]); oz += p1 * (a[2] * x + a[6] * y + a[10] * z + a[14]); }
        if (!ws) break;
      }
      p[3 * i] = ox; p[3 * i + 1] = oy; p[3 * i + 2] = oz;
    }
    s.g.attributes.position.needsUpdate = true; if (fim) { s.g.computeVertexNormals(); s.g.computeBoundingSphere(); s.g.computeBoundingBox(); }
  }
  const campoPt = p => { const FY = S.FY, U = FY.length - 1; let j = 0, f = 0; if (p.y >= FY[U]) { j = U - 1; f = 1; } else if (p.y > FY[0]) { while (p.y >= FY[j + 1]) j++; f = (p.y - FY[j]) / (FY[j + 1] - FY[j]); }
    const a = new V3().copy(p).applyMatrix4(new M4().fromArray(S.FM[j])), b = new V3().copy(p).applyMatrix4(new M4().fromArray(S.FM[j + 1])); return a.lerp(b, f); };

  /* --- cinemática: dos pés (fixos no chão) para cima --- */
  function calc() {
    const k = S.k, d = S.def, M = {}, Hn = {};
    const g = (grp, key, l) => { const o = d[grp]; if (!o || (o.lado && l && o.lado !== l)) return 0; let v = o[key]; if (v && typeof v === 'object') v = v[l]; return (v || 0) * k; };
    for (const [l, , sg] of LADOS) {
      const A = S.A[l], K = S.K[l], H = S.H[l], Ls = K.y - A.y, lean = g('perna', 'inclina', l);
      const gS = -Math.asin(sg * g('perna', 'dentro', l) / 100 / Ls) / RAD, tS = lean + Math.asin(-g('perna', 'tras', l) / 100 / Ls) / RAD;
      const Ms = em(A, rZ(gS).multiply(rX(tS)).multiply(rY(sg * g('perna', 'tibRot', l)))), K2 = K.clone().applyMatrix4(Ms);
      const v = H.clone().sub(K), rxy = Math.hypot(v.x, v.y), ryz = Math.hypot(v.z, v.y);   // a coxa devolve o quadril para cima do tornozelo
      const gT = (Math.atan2(v.x, v.y) - Math.asin((H.x - K2.x) / rxy)) / RAD, tT = (Math.asin((H.z + (H.y - A.y) * Math.sin(lean * RAD) - K2.z) / ryz) - Math.atan2(v.z, v.y)) / RAD;
      const Mc = tra(K2, K).multiply(em(K, rX(tT).multiply(rZ(gT)).multiply(rY(sg * g('perna', 'femRot', l)))));
      const Mp = em(A, rZ(-sg * g('pe', 'ev', l)).multiply(rY(-sg * g('pe', 'abd', l))));
      const comp = g('perna', 'comp', l) / 100;   // perna mais longa: estica o membro a partir do chão
      if (comp) { const Sc = em(new V3(0, S.chao, 0), new M4().makeScale(1, 1 + comp / (H.y - S.chao), 1)); Ms.premultiply(Sc); Mc.premultiply(Sc); Mp.premultiply(Sc); }
      M['perna' + l] = Ms; M['coxa' + l] = Mc; M['pe' + l] = Mp; Hn[l] = H.clone().applyMatrix4(Mc);
    }
    const Hm = S.H.d.clone().add(S.H.e).multiplyScalar(0.5), Hm2 = Hn.d.clone().add(Hn.e).multiplyScalar(0.5);
    const obl = (Math.atan2(Hn.e.y - Hn.d.y, Hn.e.x - Hn.d.x) - Math.atan2(S.H.e.y - S.H.d.y, S.H.e.x - S.H.d.x)) / RAD;
    M.pelve = tra(Hm2, Hm).multiply(em(Hm, rY(g('pelve', 'rot')).multiply(rZ(obl + g('pelve', 'obl'))).multiply(rX(g('pelve', 'ant')))));
    const col = d.col || {}, lv = []; let ant = M.pelve;
    for (let i = 0; i <= 24; i++) {
      let reg = 'cerS'; for (const [r, [a, n]] of Object.entries(REG)) if (i >= a && i < a + n) reg = r;
      const c = col[reg] || [], n = REG[reg][1]; let fr = (c[1] || 0) * k; if (reg === 'lum' && d.compLat) fr -= (obl + g('pelve', 'obl')) * d.compLat;
      ant = ant.clone().multiply(em(S.piv[i], rY((c[2] || 0) * k / n).multiply(rZ(fr / n)).multiply(rX((c[0] || 0) * k / n))));
      lv.push(ant); M[i < 24 ? 'v:' + NIV[i] : 'cabeca'] = ant;
    }
    S.FM = [M.pelve, ...lv].map(m => m.elements);
    for (const [l, , sg] of LADOS) {
      const Me = lv[13].clone().multiply(new M4().makeTranslation(0, g('esc', 'elev', l) / 100, 0)).multiply(em(S.Ct, rY(sg * g('esc', 'prot', l)))).multiply(em(S.G[l], rY(sg * g('esc', 'wing', l)))).multiply(em(S.Cs[l], rZ(sg * g('esc', 'rotInf', l)).multiply(rX(g('esc', 'tilt', l)))));
      M['esc' + l] = Me;
      M['braco' + l] = tra(S.G[l].clone().applyMatrix4(Me)).multiply(rY(sg * g('braco', 'rot', l))).multiply(new M4().makeTranslation(-S.G[l].x, -S.G[l].y, -S.G[l].z));
      const sc = S.sc[l], sc2 = campoPt(sc), ac2 = S.ac[l].clone().applyMatrix4(Me);
      const q = new THREE.Quaternion().setFromUnitVectors(S.ac[l].clone().sub(sc).normalize(), ac2.sub(sc2).normalize());
      M['cla' + l] = tra(sc2).multiply(new M4().makeRotationFromQuaternion(q)).multiply(new M4().makeTranslation(-sc.x, -sc.y, -sc.z));
    }
    S.M = M; S.ME = S.SEGN.map(s => (M[s] || new M4()).elements);
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
    for (const s of S.ligados) deformar(s, fim);
    atualizarFerr(); if (S.aoMudar) S.aoMudar(k);
  }
  function iniciar(def, fer, musculos) {
    preparar(); if (S.ativo) sair();
    S.def = def || {}; S.fer = new Set(fer || []); S.ativo = true; S.ligados = [];
    for (const n of [...S.campo, ...musculos]) { if (!MESH[n]) continue; let s = S.soft.get(n); if (!s) S.soft.set(n, s = prepSoft(MESH[n], false)); s.m.geometry = s.g; s.m.matrixAutoUpdate = false; s.m.matrix.copy(s.Pi); S.ligados.push(s); }
    aplicar(0);
  }
  function sair() {
    if (!S.ativo) return; S.ativo = false; S.anim = null; S.aoMudar = null;
    for (const r of S.rig) { r.m.matrixAutoUpdate = true; r.m.updateMatrix(); }
    for (const s of S.ligados) { s.m.geometry = s.g0; s.m.matrixAutoUpdate = true; s.m.updateMatrix(); }
    S.ligados = []; F.raiz.visible = false; const el = $('rot'); if (el.dataset.de === 'pose') { el.style.display = 'none'; el.innerHTML = ''; el.dataset.de = ''; }
  }
  const animar = (ate, vaivem = false) => { S.anim = { de: S.k, ate, t0: performance.now(), dur: 900 + 700 * Math.abs(ate - S.k), vaivem }; };
  function tick() {   // chamado a cada quadro; devolve true enquanto houver animação
    const a = S.anim; if (!S.ativo || !a) return false;
    const t = (performance.now() - a.t0) / a.dur; if (t < 0) return true;
    const u = Math.min(1, t), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    aplicar(a.de + (a.ate - a.de) * e, u >= 1);
    if (u >= 1) S.anim = a.vaivem ? { de: a.ate, ate: a.ate > 0.5 ? 0 : 1, t0: performance.now() + 700, dur: 1600, vaivem: true } : null;
    return true;
  }
  return { S, iniciar, sair, aplicar, animar, tick, rotulos, leituraHTML, atualizarFerr, get ativo() { return S.ativo; }, parar() { S.anim = null; } };
})();

function limparDesvio() {
  POSE.sair();
  for (const m of Object.values(MESH)) if (m.userData.cor0) { m.material.color.copy(m.userData.cor0); delete m.userData.cor0; }
  desvioAtivo = null;
}
const nomePt = b => { const n = Object.keys(E).find(k => E[k].b === b && E[k].c === 'musculos'); return n ? E[n].n : b; };
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
const chipsFer = () => `<div class="seg" id="pFer">${Object.entries(FER_N).map(([k, n]) => `<button data-f="${k}" class="${POSE.S.fer.has(k) ? 'on' : ''}">${n}</button>`).join('')}</div><div id="pLeit">${POSE.leituraHTML()}</div>`;
function ligarPainelP() {
  $('pB').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'bVoltaP') return listaPostura();
    if (b.dataset.d) return mostrarDesvio(b.dataset.d);
    if (b.dataset.t) return mostrarFerramenta(b.dataset.t);
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
function mostrarFerramenta(id) {
  limparDesvio(); const f = POST.ferramentas.find(x => x.id === id); if (!f) return; desvioAtivo = id;
  isolado = new Set(); POSE.iniciar({}, f.fer, []); aplicarVis(); destacar(null);
  enquadrarP(id === 'f-q' ? 'pernas' : 'corpo', id === 'f-lat' ? 'lat' : id === 'f-post' ? 'post' : 'ant');
  painelP(f.nome, '<span class="tag">avaliação postural</span>', `<div class="acoes" style="margin:0 0 8px"><button id="bVoltaP">← Postura</button></div>${chipsFer()}${f.texto}
    <div class="aviso">O modelo neutro serve de referência: os desvios são medidos em relação a ele. Em uma pessoa real, pequenas diferenças são normais.</div>`);
  ligarPainelP();
}
function mostrarDesvio(id) {
  limparDesvio(); const d = POST.lista.find(x => x.id === id); if (!d) return; desvioAtivo = id; const P = POSES[id] || {};
  isolado = new Set();
  for (const g of ['enc', 'alo', 'ten']) {
    const bases = new Set(d[g]);
    for (const [n, e] of Object.entries(E)) if (e.c === 'musculos' && bases.has(e.b) && MESH[n]) { isolado.add(n); const m = MESH[n]; if (!m.userData.cor0) m.userData.cor0 = m.material.color.clone(); m.material.color.set(CORES_P[g]); }
  }
  if (!visCamada.musculos) { visCamada.musculos = true; document.querySelector('[data-c=musculos]').classList.add('on'); }
  POSE.iniciar(P, P.fer || ['lat'], [...isolado]); aplicarVis(); destacar(null); enquadrarP(P.quadro, P.vista);
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
