import json, re
from nomes_pt import osso_pt, mus_pt
import conteudo_ombro as CO
import conteudo_cotovelo as CC
import conteudo_joelho as CJ
import conteudo_postura as CP
m = json.load(open('raw/meta.json'))
LIG_PT = {'Annular ligament of radius': 'Ligamento anular do rádio', 'Ulnar collateral ligament': 'Ligamento colateral ulnar (cotovelo)',
 'Articular capsule of elbow joint': 'Cápsula articular do cotovelo', 'Interosseous membrane of forearm': 'Membrana interóssea do antebraço',
 'Articular capsule of glenohumeral joint': 'Cápsula articular do ombro (glenoumeral)', 'Coracohumeral ligament': 'Ligamento coracoumeral',
 'Superior glenohumeral ligament': 'Ligamento glenoumeral superior', 'Middle glenohumeral ligament': 'Ligamento glenoumeral médio', 'Inferior glenohumeral ligament': 'Ligamento glenoumeral inferior',
 'Glenoid labrum': 'Lábio glenoidal', 'Transverse humeral ligament': 'Ligamento transverso do úmero', 'Articular capsule of acromioclavicular joint': 'Cápsula da articulação acromioclavicular',
 'Articular capsule of sternoclavicular joint': 'Cápsula da articulação esternoclavicular', 'Posterior sternoclavicular ligament': 'Ligamento esternoclavicular posterior',
 'Articular capsule of radiocarpal joint': 'Cápsula articular do punho (radiocárpica)', 'Radial collateral ligament of wrist joint': 'Ligamento colateral radial do punho',
 'Ulnar collateral ligament of wrist joint': 'Ligamento colateral ulnar do punho', 'Dorsal radiocarpal ligament': 'Ligamento radiocárpico dorsal',
 'Anterior cruciate ligament': 'Ligamento cruzado anterior (LCA)', 'Posterior cruciate ligament': 'Ligamento cruzado posterior (LCP)', 'Medial meniscus': 'Menisco medial', 'Lateral meniscus': 'Menisco lateral',
 'Superficial part of tibial collateral ligament': 'Ligamento colateral tibial (parte superficial)', 'Deep part of tibial collateral ligament': 'Ligamento colateral tibial (parte profunda)',
 'Articular capsule of knee joint': 'Cápsula articular do joelho', 'Transverse ligament of knee': 'Ligamento transverso do joelho', 'Oblique popliteal ligament': 'Ligamento poplíteo oblíquo',
 'Arcuate popliteal ligament': 'Ligamento poplíteo arqueado', 'Infrapatellar fat pad': 'Corpo adiposo infrapatelar', 'Meniscopatellar ligament': 'Ligamento meniscopatelar',
 'Anterior meniscotibial ligament (Lateral meniscus)': 'Ligamento meniscotibial anterior (menisco lateral)', 'Posterior meniscotibial ligament (Lateral meniscus)': 'Ligamento meniscotibial posterior (menisco lateral)',
 'Posterior meniscotibial ligament (Medial meniscus)': 'Ligamento meniscotibial posterior (menisco medial)', 'Ulnar collateral ligament': 'Ligamento colateral ulnar (cotovelo)'}
E = {}
for n, v in m.items():
    cam = v['camada']; lado = ''
    if cam == 'insercoes':
        mm = re.match(r'^(.*)\.([oe])(\d?)([lr])$', n)
        if not mm: continue
        base, tipo, _, s = mm.groups(); lado = 'direito' if s == 'r' else 'esquerdo'
        E[n] = {'c': cam, 'b': base, 't': 'origem' if tipo == 'o' else 'inserção', 'l': lado, 'n': ('Origem' if tipo == 'o' else 'Inserção') + ' · ' + mus_pt(base)}
        continue
    mm = re.match(r'^(.*)\.([lr])$', n); base = mm[1] if mm else n
    if mm: lado = 'direito' if mm[2] == 'r' else 'esquerdo'
    nome = osso_pt(base) if cam == 'ossos' else mus_pt(base) if cam == 'musculos' else LIG_PT.get(base, base)
    E[n] = {'c': cam, 'b': base, 'l': lado, 'n': nome}
info = {}
for k, v in CO.C.items(): info[k] = {**v, 'fontes': CO.F}
for k, v in CO.OSSOS_C.items(): info[k] = {**v, 'fontes': CO.F}
for M in (CC, CJ):
    for d in (M.C, M.OSSOS_C, M.LIG):
        for k, v in d.items(): info[k] = {**v, 'fontes': M.F}
bases = {v['b'] for v in E.values()}
print('faltando:', [k for k in CC.REGIAO + CJ.REGIAO if k not in bases])
regioes = {'ombro': {'nome': 'Ombro', 'itens': CO.REGIAO_OMBRO, 'alvo': [-0.17, 1.38, 0.0], 'dist': 0.9, 'juntas': CO.JUNTAS,
  'intro': 'O complexo do ombro reúne quatro articulações que trabalham juntas: <b>glenoumeral</b>, <b>escapulotorácica</b>, acromioclavicular e esternoclavicular.'},
 'cotovelo': {'nome': 'Cotovelo e antebraço', 'itens': CC.REGIAO, 'alvoMesh': ['Humerus.r', 'Radius.r', 'Ulna.r'], 'alvoY': 0.5, 'dist': 0.95, 'juntas': CC.JUNTAS, 'intro': CC.INTRO, 'movimento': 'cotovelo'},
 'joelho': {'nome': 'Joelho', 'itens': CJ.REGIAO, 'alvoMesh': ['Patella.r', 'Tibia.r'], 'dist': 1.0, 'juntas': CJ.JUNTAS, 'intro': CJ.INTRO, 'movimento': 'joelho'}}
for k in ('ombro', 'cotovelo', 'joelho'): regioes[k]['seguranca'] = CP.seg_html(k)
faltam = sorted({b for d in CP.D for b in d['enc'] + d['alo'] + d['ten'] if b not in bases} | {a for d in CP.D for a in d['alvo'] if a not in E})
print('postura faltando:', faltam)
posturas = {'lista': CP.D, 'nota': CP.NOTA, 'fontes': CP.F, 'ferramentas': CP.FERR}
json.dump({'posturas': posturas, 'e': E, 'info': info, 'regioes': regioes, 'creditos': 'Modelos 3D: Z-Anatomy (CC BY-SA 4.0), derivados do BodyParts3D (DBCLS, CC BY-SA 2.1 JP).'}, open('site/dados.json', 'w'), ensure_ascii=False, separators=(',', ':'))
import os; print(len(E), 'estruturas', os.path.getsize('site/dados.json') // 1024, 'KB', sum(1 for v in E.values() if v['n'] == v['b'] and v['c'] in ('ossos', 'musculos')), 'sem tradução')
