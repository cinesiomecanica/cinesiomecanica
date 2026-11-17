# Conteúdo da região do joelho (Fase 3). Texto original, com base em Moore (Anatomia orientada para a clínica),
# Neumann (Cinesiologia do aparelho musculoesquelético, cap. 13) e Kapandji (vol. 2).
F = ['Moore, Dalley e Agur. Anatomia orientada para a clínica.', 'Neumann. Cinesiologia do aparelho musculoesquelético, cap. 13 (joelho).', 'Kapandji. Anatomia funcional, vol. 2 (membro inferior).']
SAG, FRO, TRA = 'sagital', 'frontal', 'transverso'
EML, EAP, ELO = 'látero-lateral (médio-lateral)', 'anteroposterior', 'longitudinal (vertical)'
def a(art, mov, plano, eixo): return {'articulacao': art, 'movimento': mov, 'plano': plano, 'eixo': eixo}
JO, QU, TO = 'joelho (tibiofemoral)', 'quadril', 'tornozelo (talocrural)'
def m(resumo, origem, insercao, inervacao, acoes, notas): return dict(tipo='músculo', resumo=resumo, origem=origem, insercao=insercao, inervacao=inervacao, acoes=acoes, notas=notas)
TQ = 'Base da patela e, pelo ligamento da patela, tuberosidade da tíbia.'
NF = 'Nervo femoral (L2–L4).'
C = {
 'Rectus femoris muscle': m('Reto femoral: a única parte do quadríceps que cruza o quadril. Fica no meio da coxa, por cima do vasto intermédio.',
  'Espinha ilíaca anteroinferior (cabeça reta) e região acima do acetábulo (cabeça refletida).', TQ, NF,
  [a(JO, 'Extensão', SAG, EML), a(QU, 'Flexão', SAG, EML)],
  'Biarticular: fica mais alongado com o quadril estendido e o joelho flexionado (afundo, extensora com o encosto reclinado). No agachamento profundo, o quadril flexiona enquanto o joelho flexiona, então o reto femoral muda pouco de comprimento e trabalha menos que os vastos.'),
 'Vastus lateralis muscle': m('Vasto lateral: a maior parte do quadríceps, na face lateral da coxa.',
  'Trocanter maior e lábio lateral da linha áspera do fêmur.', TQ, NF,
  [a(JO, 'Extensão', SAG, EML)],
  'Puxa a patela um pouco para fora. O equilíbrio com o vasto medial ajuda a manter a patela centrada no sulco do fêmur.'),
 'Vastus medialis muscle': m('Vasto medial: forma a "gota" na parte de dentro e de baixo da coxa.',
  'Linha intertrocantérica e lábio medial da linha áspera do fêmur.', TQ, NF,
  [a(JO, 'Extensão', SAG, EML), a('patelofemoral', 'Estabilização medial da patela (fibras oblíquas)', '—', '—')],
  'As fibras inferiores, mais horizontais (vasto medial oblíquo), puxam a patela para dentro. Ele não "trabalha só no fim da extensão": é ativo em toda a amplitude, junto com os outros vastos.'),
 'Vastus intermedius muscle': m('Vasto intermédio: a camada mais profunda do quadríceps, encostada no fêmur, por baixo do reto femoral.',
  'Faces anterior e lateral do corpo do fêmur.', TQ, NF,
  [a(JO, 'Extensão', SAG, EML)],
  'Logo abaixo dele fica o pequeno músculo articular do joelho, que puxa a cápsula para cima na extensão e evita que ela seja pinçada.'),
 'Long head of biceps femoris': m('Cabeça longa do bíceps femoral: o isquiotibial lateral que cruza o quadril.',
  'Túber isquiático (junto com o semitendíneo).', 'Cabeça da fíbula.', 'Nervo isquiático, divisão tibial (L5–S2).',
  [a(JO, 'Flexão', SAG, EML), a(JO, 'Rotação lateral da tíbia (com o joelho flexionado)', TRA, ELO), a(QU, 'Extensão', SAG, EML)],
  'Biarticular: fica mais alongada com o quadril flexionado (stiff, terra romeno, flexora sentada). É o local mais comum de estiramento dos isquiotibiais em corredores, na fase final do balanço da corrida.'),
 'Short head of biceps femoris': m('Cabeça curta do bíceps femoral: o único isquiotibial que não cruza o quadril.',
  'Lábio lateral da linha áspera do fêmur.', 'Cabeça da fíbula.', 'Nervo isquiático, divisão fibular comum (L5–S2).',
  [a(JO, 'Flexão', SAG, EML), a(JO, 'Rotação lateral da tíbia (com o joelho flexionado)', TRA, ELO)],
  'Monoarticular: trabalha igual com o quadril flexionado ou estendido. Por isso a mesa flexora (que flexiona o joelho) cobra bem dela, enquanto o stiff cobra pouco.'),
 'Semitendinosus muscle': m('Semitendíneo: isquiotibial medial superficial, com um tendão longo e fino na parte de baixo.',
  'Túber isquiático.', 'Face medial da parte superior da tíbia (pata de ganso).', 'Nervo isquiático, divisão tibial (L5–S2).',
  [a(JO, 'Flexão', SAG, EML), a(JO, 'Rotação medial da tíbia (com o joelho flexionado)', TRA, ELO), a(QU, 'Extensão', SAG, EML)],
  'Seu tendão, junto com o do grácil, é o mais usado como enxerto na reconstrução do ligamento cruzado anterior.'),
 'Semimembranosus muscle': m('Semimembranáceo: isquiotibial medial profundo, largo e achatado no alto.',
  'Túber isquiático.', 'Face posterior do côndilo medial da tíbia; expansões para a cápsula e o menisco medial.', 'Nervo isquiático, divisão tibial (L5–S2).',
  [a(JO, 'Flexão', SAG, EML), a(JO, 'Rotação medial da tíbia (com o joelho flexionado)', TRA, ELO), a(QU, 'Extensão', SAG, EML)],
  'Suas expansões puxam o menisco medial para trás durante a flexão, ajudando a protegê-lo de ser pinçado.'),
 'Gracilis muscle': m('Grácil: músculo longo e fino na face medial da coxa, o único adutor que cruza o joelho.',
  'Corpo e ramo inferior do púbis.', 'Face medial da parte superior da tíbia (pata de ganso).', 'Nervo obturatório (L2–L3).',
  [a(QU, 'Adução', FRO, EAP), a(JO, 'Flexão', SAG, EML), a(JO, 'Rotação medial da tíbia', TRA, ELO)],
  'Junto com o sartório e o semitendíneo, forma a pata de ganso, que ajuda a proteger o joelho contra o estresse em valgo.'),
 'Sartorius muscle': m('Sartório: o músculo mais longo do corpo, cruza a coxa na diagonal, de fora para dentro.',
  'Espinha ilíaca anterossuperior.', 'Face medial da parte superior da tíbia (pata de ganso).', 'Nervo femoral (L2–L3).',
  [a(QU, 'Flexão, abdução e rotação lateral', SAG, EML), a(JO, 'Flexão', SAG, EML), a(JO, 'Rotação medial da tíbia', TRA, ELO)],
  'O nome vem do alfaiate (sartor), que costurava sentado de pernas cruzadas: exatamente a soma das suas ações.'),
 'Popliteus muscle': m('Poplíteo: músculo pequeno e profundo atrás do joelho.',
  'Face lateral do côndilo lateral do fêmur e menisco lateral.', 'Face posterior da tíbia, acima da linha do sóleo.', 'Nervo tibial (L4–S1).',
  [a(JO, 'Rotação medial da tíbia (ou lateral do fêmur) para "destravar" o joelho', TRA, ELO), a(JO, 'Flexão (fraca)', SAG, EML)],
  'Com o joelho estendido e travado pela rotação terminal, é ele que inicia a flexão girando a tíbia de volta. Também puxa o menisco lateral para trás.'),
 'Lateral head of gastrocnemius': m('Cabeça lateral do gastrocnêmio, a "batata da perna" do lado de fora.',
  'Face lateral do côndilo lateral do fêmur.', 'Tuberosidade do calcâneo, pelo tendão do calcâneo (de Aquiles).', 'Nervo tibial (S1–S2).',
  [a(TO, 'Flexão plantar', SAG, EML), a(JO, 'Flexão', SAG, EML)],
  'Biarticular: com o joelho flexionado, fica frouxo e perde força na flexão plantar. Por isso a panturrilha sentada cobra mais do sóleo, e a em pé, do gastrocnêmio.'),
 'Medial head of gastrocnemius': m('Cabeça medial do gastrocnêmio, maior e mais baixa que a lateral.',
  'Face posterior do côndilo medial do fêmur.', 'Tuberosidade do calcâneo, pelo tendão do calcâneo (de Aquiles).', 'Nervo tibial (S1–S2).',
  [a(TO, 'Flexão plantar', SAG, EML), a(JO, 'Flexão', SAG, EML)],
  'Na corrida e no salto, trabalha junto com o quadríceps: transfere energia do joelho para o tornozelo.'),
}
OSSOS_C = {
 'Femur': dict(tipo='osso', resumo='Osso da coxa, o maior e mais forte do corpo.',
   notas='Embaixo, os côndilos medial e lateral apoiam na tíbia, e a face patelar (sulco troclear) recebe a patela. O côndilo medial é mais longo, o que explica a rotação terminal do joelho. Os epicôndilos recebem os ligamentos colaterais.'),
 'Tibia': dict(tipo='osso', resumo='Osso medial e principal da perna, que recebe o peso do corpo.',
   notas='O platô tibial (côndilos medial e lateral) recebe os côndilos do fêmur, com os meniscos no meio. A tuberosidade da tíbia recebe o ligamento da patela (quadríceps). A eminência intercondilar prende os ligamentos cruzados.'),
 'Fibula': dict(tipo='osso', resumo='Osso fino e lateral da perna. Quase não recebe o peso do corpo.',
   notas='Não participa da articulação do joelho, mas a cabeça da fíbula recebe o bíceps femoral e o ligamento colateral fibular. Embaixo, o maléolo lateral forma o tornozelo.'),
 'Patella': dict(tipo='osso', resumo='Patela: o maior osso sesamoide do corpo, dentro do tendão do quadríceps.',
   notas='Afasta o tendão do eixo do joelho e aumenta o braço de momento do quadríceps, principalmente entre 20° e 60° de flexão. Desliza no sulco troclear do fêmur (articulação patelofemoral).'),
}
LIG = {
 'Anterior cruciate ligament': dict(tipo='ligamento', resumo='Ligamento cruzado anterior (LCA): vai da frente da tíbia até a parte de trás do côndilo lateral do fêmur.',
   notas='Impede que a tíbia deslize para a frente sob o fêmur e limita a rotação. Rompe com frequência em mudanças de direção e aterrissagens com o joelho em valgo. Na cadeira extensora, o quadríceps puxa a tíbia para a frente nos últimos graus de extensão, o que tensiona o LCA.'),
 'Posterior cruciate ligament': dict(tipo='ligamento', resumo='Ligamento cruzado posterior (LCP): vai da parte de trás da tíbia até o côndilo medial do fêmur. Mais grosso que o LCA.',
   notas='Impede que a tíbia deslize para trás. Os isquiotibiais tensionam o LCP, principalmente com o joelho muito flexionado.'),
 'Medial meniscus': dict(tipo='ligamento', resumo='Menisco medial: disco de fibrocartilagem em forma de C, entre o fêmur e a tíbia, do lado de dentro.',
   notas='Distribui a carga, amortece e aumenta o encaixe. É mais preso (à cápsula e ao ligamento colateral tibial), por isso se lesiona mais que o lateral.'),
 'Lateral meniscus': dict(tipo='ligamento', resumo='Menisco lateral: disco de fibrocartilagem quase circular, do lado de fora.',
   notas='É mais móvel que o medial: o poplíteo o puxa para trás na flexão.'),
 'Superficial part of tibial collateral ligament': dict(tipo='ligamento', resumo='Ligamento colateral tibial (medial), parte superficial: do epicôndilo medial do fêmur até a tíbia.',
   notas='Principal estabilizador contra o estresse em valgo (joelho "para dentro"). Fica mais tenso com o joelho estendido.'),
 'Articular capsule of knee joint': dict(tipo='ligamento', resumo='Cápsula articular do joelho: envolve as articulações tibiofemoral e patelofemoral.', notas='É reforçada pelos ligamentos, pelos retináculos da patela e pelas expansões de vários músculos.'),
}
JUNTAS = {
 'tibiofemoral': 'Entre os côndilos do fêmur e o platô da tíbia, com os meniscos no meio. Dois graus de liberdade: flexão e extensão (plano sagital, eixo látero-lateral, de cerca de 0° a 140°) e rotação medial e lateral da tíbia (plano transverso, eixo longitudinal), que só aparece com o joelho flexionado.',
 'patelofemoral': 'A patela desliza no sulco do fêmur. A compressão entre os dois aumenta com a flexão e com a força do quadríceps: no agachamento profundo e no afundo é bem maior que na caminhada.',
 'rotação terminal (screw-home)': 'Nos últimos 30° de extensão, a tíbia gira cerca de 10° para fora (ou o fêmur para dentro, em pé). Isso "trava" o joelho estendido. O poplíteo destrava para começar a flexão.',
 'ângulo Q': 'Ângulo entre a linha de tração do quadríceps (da espinha ilíaca anterossuperior até a patela) e o ligamento da patela. Quanto maior, mais a patela é puxada para fora.',
}
INTRO = 'O joelho reúne duas articulações na mesma cápsula: <b>tibiofemoral</b> (fêmur com a tíbia) e <b>patelofemoral</b> (patela com o fêmur). A estabilidade vem muito mais dos ligamentos, meniscos e músculos que do encaixe dos ossos.'
REGIAO = list(C) + list(OSSOS_C) + list(LIG)
