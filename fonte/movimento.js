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
let abaMov = 'art', filtroPl = '';
function listaMov(aba) {
  if (aba) abaMov = aba;
  limparDesvio(); isolado = null; filtroInsercao = null; aplicarVis(); destacar(null);
  document.querySelectorAll('#regioes .chip').forEach(b => b.classList.toggle('on', b.dataset.r === 'movimento'));
  enquadrarP('corpo', 'frente');
  let corpo = '';
  if (abaMov === 'art') {
    const grupos = {}; CAT.filter(m => !filtroPl || m.plano === filtroPl).forEach(m => (grupos[m.art] = grupos[m.art] || []).push(m));
    corpo = `<p>Todos os movimentos de cada articulação. Ao abrir um, o corpo se move e o <b>plano</b> (disco) e o <b>eixo</b> (linha) aparecem desenhados na articulação. O eixo é sempre perpendicular ao plano.</p>
      <div class="seg" id="fPl"><button data-pl="" class="${!filtroPl ? 'on' : ''}">Todos os planos</button>${Object.entries(PLANOS).map(([k, [n]]) => `<button data-pl="${k}" class="${filtroPl === k ? 'on' : ''}"><i class="dotp" style="background:${PLANOS[k][2]}"></i>${n[0].toUpperCase() + n.slice(1)}</button>`).join('')}</div>
      ${Object.entries(grupos).map(([g, ms]) => `<h3>${esc(g)}</h3><div class="lista">${ms.map(m => `<button data-a="${m.id}"><i style="background:${PLANOS[m.plano][2]}"></i><span class="lnome">${esc(m.nome)}</span><span class="pl ${PLANOS[m.plano][0]}">${PLANOS[m.plano][0]}</span></button>`).join('')}</div>`).join('')}
      <div class="aviso">O plano e o eixo descrevem o movimento a partir da posição em que ele começa. Quando o segmento muda de posição (por exemplo, a rotação do ombro com o braço ao lado do corpo ou abduzido a 90°), o plano muda junto.</div>`;
  } else {
    const grupos = {}; MOVS.forEach(m => (grupos[m.grupo] = grupos[m.grupo] || []).push(m));
    corpo = `<p>Movimentos de exercícios com várias articulações ao mesmo tempo. Os músculos que trabalham aparecem em <b style="color:${CORES_M.ag}">âmbar (agonistas)</b>, <b style="color:${CORES_M.sin}">rosa (sinergistas)</b> e <b style="color:${CORES_M.est}">verde-água (estabilizadores)</b>.</p>
      ${Object.entries(grupos).map(([g, ms]) => `<h3>${esc(g)}</h3><div class="lista">${ms.map(m => `<button data-m="${m.id}"><i style="background:${CORES_M.ag}"></i>${esc(m.nome)}</button>`).join('')}</div>`).join('')}`;
  }
  painelP('Corpo em movimento', '<span class="tag">cinesiologia</span>planos, eixos e músculos', `
    <div class="abas"><button data-aba="art" class="${abaMov === 'art' ? 'on' : ''}">Articulações (${CAT.length})</button><button data-aba="ex" class="${abaMov === 'ex' ? 'on' : ''}">Exercícios (${MOVS.length})</button></div>
    ${corpo}
    <div class="aviso">Modelo de estudo: os ossos seguem ângulos médios da literatura e os músculos se deformam acompanhando os ossos, sem simular contração.</div>`);
  $('pB').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.aba) return listaMov(b.dataset.aba);
    if (b.dataset.pl !== undefined) { filtroPl = b.dataset.pl; return listaMov(); }
    if (b.dataset.m) return mostrarMov(b.dataset.m);
    if (b.dataset.a) return mostrarArt(b.dataset.a);
  };
}
const EIXOS = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
async function mostrarArt(id) {
  const m = CAT.find(x => x.id === id); if (!m) return;
  await peleProntaToast(); limparDesvio(); movAtivo = m;
  const lado = /^(omb|esc|cot|ru|pun|qua|joe|tor-df|tor-pf|pe-)/.test(m.id) ? 'direito' : null, pl = PLANOS[m.plano];
  colorir({ ag: m.mus }, CORES_M, lado); isolado = null; filtroInsercao = null;
  if (!visCamada.musculos) { visCamada.musculos = true; document.querySelector('[data-c=musculos]').classList.add('on'); }
  const dir = new THREE.Vector3();
  const rot = (A, mk) => {
    const p = mk[m.piv].p; if (Array.isArray(m.eixo)) dir.subVectors(mk[m.eixo[1]].p, mk[m.eixo[0]].p); else dir.copy(EIXOS[m.eixo]);
    PE.atualizar(p, dir, pl[2], RAIO_PE[m.quadro] || 0.25);
    return [{ p, t: `${m.nome.split(' (')[0].toLowerCase()} ${Math.round(POSE.S.k * m.max)}°`, c: pl[2] }];
  };
  POSE.iniciar({}, [], [], { gen: k => m.gen(k * m.max), rot, todos: true }); PE.mostrar(true);
  aplicarVis(); destacar(null);
  const pv = POSE.S.mk[m.piv].p.clone(); if (m.quadro === 'antebraco') pv.y -= 0.06;
  enquadrarP(m.quadro, m.vista, /^(pes|antebraco|braco|cabeca)$/.test(m.quadro) ? pv : null);
  const irmaos = CAT.filter(x => x.art === m.art), i = irmaos.indexOf(m);
  painelP(m.nome, `<span class="tag">${esc(m.art)}</span>`, `
    <div class="acoes" style="margin:0 0 8px"><button id="bVoltaM">← Articulações</button>${i > 0 ? `<button data-a="${irmaos[i - 1].id}">‹ ${esc(irmaos[i - 1].nome.split(' (')[0])}</button>` : ''}${i < irmaos.length - 1 ? `<button data-a="${irmaos[i + 1].id}">${esc(irmaos[i + 1].nome.split(' (')[0])} ›</button>` : ''}</div>
    <div class="pe-cab" style="--pc:${pl[2]}"><div><small>Plano</small><b>${pl[0]}</b></div><div><small>Eixo</small><b>${pl[1]}</b></div></div>
    <div class="pctl"><div class="pctl-t"><span>Ângulo</span><output id="mK">0°</output></div>
      <input id="mKs" type="range" min="0" max="100" step="1" value="0" aria-label="Ângulo do movimento">
      <div class="seg"><button data-k="0">Início</button><button data-k="1">Fim</button><button id="mPlay" class="on">❚❚ Pausar</button></div></div>
    <div class="kp mt4"><div><small>Amplitude de referência</small><b style="font-size:16px">${esc(m.amp)}</b></div></div>
    <p>${esc(m.desc)}</p>
    <h3>Agonistas</h3><div class="pleg"><b style="color:${CORES_M.ag}"><i style="background:${CORES_M.ag}"></i>Músculos que fazem o movimento</b><span>${m.mus.map(b => esc(nomePt(b))).join(' · ')}</span></div>
    <h3>Como ler o desenho</h3>
    <p>O <b style="color:${pl[2]}">disco</b> é o plano em que o segmento se move; a <b style="color:${pl[2]}">linha</b> que o atravessa é o eixo, em torno do qual o segmento gira. Plano e eixo são sempre perpendiculares: movimentos no plano <span class="pl sagital">sagital</span> giram em torno do eixo látero-lateral, no <span class="pl frontal">frontal</span> em torno do anteroposterior e no <span class="pl transverso">transverso</span> em torno do longitudinal.</p>
    <div class="fontes">Fontes: ${FONTES_CAT.map(esc).join(' · ')} · Modelo 3D: Z-Anatomy (CC BY-SA 4.0).</div>`);
  POSE.S.aoMudar = k => {
    if (!$('mKs') || movAtivo !== m) return;
    $('mK').textContent = Math.round(k * m.max) + '°'; if (document.activeElement !== $('mKs')) $('mKs').value = Math.round(k * 100);
  };
  POSE.S.aoMudar(0);
  const dur = 1300 + m.max * 9;
  const play = on => { $('mPlay').classList.toggle('on', on); $('mPlay').textContent = on ? '❚❚ Pausar' : '▶ Reproduzir'; on ? POSE.animar(POSE.S.k > 0.5 ? 0 : 1, true, dur) : POSE.parar(); };
  $('pB').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'bVoltaM') return listaMov('art');
    if (b.dataset.a) return mostrarArt(b.dataset.a);
    if (b.id === 'mPlay') return play(!b.classList.contains('on'));
    if (b.dataset.k !== undefined) { play(false); POSE.animar(+b.dataset.k); }
  };
  $('mKs').oninput = e => { play(false); POSE.aplicar(e.target.value / 100, false); };
  $('mKs').onchange = e => POSE.aplicar(e.target.value / 100, true);
  POSE.animar(1, true, dur);
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
    if (b.id === 'bVoltaM') return listaMov('ex');
    if (b.id === 'mPlay') return play(!b.classList.contains('on'));
    if (b.dataset.k !== undefined) { play(false); POSE.animar(+b.dataset.k); }
  };
  $('mKs').oninput = e => { play(false); POSE.aplicar(e.target.value / 100, false); };
  $('mKs').onchange = e => POSE.aplicar(e.target.value / 100, true);
  POSE.animar(1, true, m.dur);
}
