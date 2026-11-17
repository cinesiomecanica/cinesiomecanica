# Nomes em português (Terminologia Anatômica, uso no Brasil) para ossos e músculos do Z-Anatomy.
import re
ORD = {'first': 'primeiro', 'second': 'segundo', 'third': 'terceiro', 'fourth': 'quarto', 'fifth': 'quinto', 'sixth': 'sexto', 'seventh': 'sétimo',
       'eighth': 'oitavo', 'ninth': 'nono', 'tenth': 'décimo', 'eleventh': 'décimo primeiro', 'twelfth': 'décimo segundo'}
ORDA = {k: v[:-1] + 'a' if v.endswith('o') else v for k, v in ORD.items()}
ORDA.update({'eleventh': 'décima primeira', 'twelfth': 'décima segunda'})
DEDO_M = {'first': 'polegar', 'second': 'indicador', 'third': 'médio', 'fourth': 'anular', 'fifth': 'mínimo'}
DEDO_P = {'first': 'hálux', 'second': '2º dedo do pé', 'third': '3º dedo do pé', 'fourth': '4º dedo do pé', 'fifth': '5º dedo do pé'}
OSSOS = {
 'Anterior cells of ethmoid bone': 'Células etmoidais anteriores', 'Arytenoid cartilage': 'Cartilagem aritenoide', 'Atlas (C1)': 'Atlas (C1)', 'Axis (C2)': 'Áxis (C2)',
 'Body of sternum': 'Corpo do esterno', 'Calcaneus': 'Calcâneo', 'Capitate bone': 'Capitato', 'Clavicle': 'Clavícula', 'Coccyx': 'Cóccix', 'Corniculate cartilage': 'Cartilagem corniculada',
 'Cricoid cartilage': 'Cartilagem cricoide', 'Cuboid bone': 'Cuboide', 'Ethmoid bone': 'Etmoide', 'Femur': 'Fêmur', 'Fibula': 'Fíbula', 'Frontal bone': 'Frontal', 'Hamate bone': 'Hamato',
 'Hip bone': 'Osso do quadril (ílio, ísquio e púbis)', 'Humerus': 'Úmero', 'Hyoid bone': 'Hioide', 'Incus': 'Bigorna', 'Inferior nasal concha bone': 'Concha nasal inferior',
 'Intermediate cuneiform bone': 'Cuneiforme intermédio', 'Lacrimal bone': 'Lacrimal', 'Lateral cuneiform bone': 'Cuneiforme lateral', 'Lateral process of nasal septal cartilage': 'Processo lateral da cartilagem do septo nasal',
 'Lunate bone': 'Semilunar', 'Major alar cartilage': 'Cartilagem alar maior', 'Malleus': 'Martelo', 'Mandible': 'Mandíbula', 'Manubrium of sternum': 'Manúbrio do esterno', 'Maxilla': 'Maxila',
 'Medial cuneiform bone': 'Cuneiforme medial', 'Middle cells of ethmoid bone': 'Células etmoidais médias', 'Nasal bone': 'Nasal', 'Nasal septal cartilage': 'Cartilagem do septo nasal', 'Navicular bone': 'Navicular',
 'Occipital bone': 'Occipital', 'Palatine bone': 'Palatino', 'Parietal bone': 'Parietal', 'Patella': 'Patela', 'Pisiform bone': 'Pisiforme', 'Posterior cells of ethmoid bone': 'Células etmoidais posteriores',
 'Radius': 'Rádio', 'Sacrum': 'Sacro', 'Scaphoid bone': 'Escafoide', 'Scapula': 'Escápula', 'Sesamoid bones of foot': 'Ossos sesamoides do pé', 'Sinus of frontal bone': 'Seio frontal',
 'Sinus of sphenoid bone': 'Seio esfenoidal', 'Sphenoid bone': 'Esfenoide', 'Stapes': 'Estribo', 'Talus': 'Tálus', 'Temporal bone': 'Temporal', 'Thyroid cartilage': 'Cartilagem tireoide', 'Tibia': 'Tíbia',
 'Trapezium bone': 'Trapézio (osso)', 'Trapezoid bone': 'Trapezoide', 'Triquetrum bone': 'Piramidal', 'Ulna': 'Ulna', 'Vomer': 'Vômer', 'Xiphoid process': 'Processo xifoide', 'Zygomatic bone': 'Zigomático',
 'Upper canine': 'Canino superior', 'Lower canine': 'Canino inferior', 'Upper medial incisor': 'Incisivo central superior', 'Lower medial incisor': 'Incisivo central inferior',
 'Upper lateral incisor': 'Incisivo lateral superior', 'Lower lateral incisor': 'Incisivo lateral inferior', 'Upper first premolar': '1º pré-molar superior', 'Upper second premolar': '2º pré-molar superior',
 'Lower first premolar': '1º pré-molar inferior', 'Lower second premolar': '2º pré-molar inferior', 'Upper first molar tooth': '1º molar superior', 'Upper second molar tooth': '2º molar superior',
 'Lower first molar tooth': '1º molar inferior', 'Lower second molar tooth': '2º molar inferior'}
def osso_pt(n):
    if n in OSSOS: return OSSOS[n]
    m = re.match(r'Vertebra ([CTL])(\d+)', n)
    if m: return f'Vértebra {m[1]}{m[2]} ({ {"C": "cervical", "T": "torácica", "L": "lombar"}[m[1]] })'
    m = re.match(r'(\w+) rib$', n)
    if m: return f'{ORDA[m[1].lower()].capitalize()} costela'
    m = re.match(r'Costal cartilage of (\w+) rib', n)
    if m: return f'Cartilagem costal da {ORDA[m[1].lower()]} costela'
    m = re.match(r'(\w+) (metacarpal|metatarsal) bone', n)
    if m: return f'{ORD[m[1].lower()].capitalize()} {"metacarpal" if m[2] == "metacarpal" else "metatarsal"}'
    m = re.match(r'(Distal|Middle|Proximal) phalanx of (\w+) finger of (hand|foot)', n)
    if m:
        f = {'Distal': 'distal', 'Middle': 'média', 'Proximal': 'proximal'}[m[1]]
        d = (DEDO_M if m[3] == 'hand' else DEDO_P)[m[2].lower()]
        return f'Falange {f} do {d}' if not d[0].isdigit() else f'Falange {f} do {d}'
    return n
MUS = {
 '(Abdominal part of pectoralis major muscle)': 'Parte abdominal do peitoral maior', '(Adductor minimus)': 'Adutor mínimo', '(Opponens digiti minimi muscle of foot)': 'Oponente do dedo mínimo do pé',
 'Abductor digiti minimi of foot': 'Abdutor do dedo mínimo do pé', 'Abductor digiti minimi of hand': 'Abdutor do dedo mínimo da mão', 'Abductor hallucis': 'Abdutor do hálux',
 'Abductor pollicis brevis': 'Abdutor curto do polegar', 'Abductor pollicis longus': 'Abdutor longo do polegar', 'Acromial part of deltoid muscle': 'Deltoide, parte acromial (média)',
 'Adductor brevis': 'Adutor curto', 'Adductor longus': 'Adutor longo', 'Adductor magnus': 'Adutor magno', 'Anconeus muscle': 'Ancôneo', 'Anterior belly of digastric muscle': 'Ventre anterior do digástrico',
 'Anterior intermuscular septum of leg': 'Septo intermuscular anterior da perna', 'Ary-epiglottic part of oblique arytenoid muscle': 'Parte ariepiglótica do aritenóideo oblíquo',
 'Ascending part of trapezius muscle': 'Trapézio, parte ascendente (inferior)', 'Brachialis muscle': 'Braquial', 'Brachioradialis muscle': 'Braquiorradial', 'Bucinator': 'Bucinador',
 'Calcaneal tendon': 'Tendão do calcâneo (Aquiles)', 'Clavicular head of pectoralis major muscle': 'Peitoral maior, parte clavicular', 'Clavicular part of deltoid muscle': 'Deltoide, parte clavicular (anterior)',
 'Coccygeus muscle': 'Isquiococcígeo', 'Common tendinous ring': 'Anel tendíneo comum', 'Coracobrachialis muscle': 'Coracobraquial', 'Corrugator supercilii': 'Corrugador do supercílio',
 'Deep head of flexor pollicis brevis': 'Cabeça profunda do flexor curto do polegar', 'Deep head of pronator teres': 'Cabeça ulnar do pronador redondo', 'Deep part of masseter': 'Masseter, parte profunda',
 'Depressor anguli oris': 'Abaixador do ângulo da boca', 'Depressor labii inferioris': 'Abaixador do lábio inferior', 'Depressor septi nasi': 'Abaixador do septo nasal',
 'Descending part of trapezius muscle': 'Trapézio, parte descendente (superior)', 'Diaphragm': 'Diafragma', 'Dorsal interossei muscles of foot': 'Interósseos dorsais do pé',
 'Dorsal interossei muscles of hand': 'Interósseos dorsais da mão', 'Dorsal parts of lateral intertransversarii lumborum muscles': 'Intertransversários laterais lombares, partes dorsais',
 'Epicranial aponeurosis': 'Aponeurose epicrânica (gálea)', 'Extensor carpi radialis brevis': 'Extensor radial curto do carpo', 'Extensor carpi radialis longus': 'Extensor radial longo do carpo',
 'Extensor digiti minimi': 'Extensor do dedo mínimo', 'Extensor digitorum': 'Extensor dos dedos', 'Extensor digitorum brevis': 'Extensor curto dos dedos', 'Extensor digitorum longus': 'Extensor longo dos dedos',
 'Extensor hallucis brevis': 'Extensor curto do hálux', 'Extensor hallucis longus': 'Extensor longo do hálux', 'Extensor indicis': 'Extensor do indicador', 'Extensor pollicis brevis': 'Extensor curto do polegar',
 'Extensor pollicis longus': 'Extensor longo do polegar', 'External abdominal oblique muscle': 'Oblíquo externo do abdome', 'External anal sphincter': 'Esfíncter externo do ânus',
 'External intercostal muscles': 'Intercostais externos', 'External part of thyro-arytenoid muscle': 'Tireoaritenóideo, parte externa', 'Fibularis brevis muscle': 'Fibular curto',
 'Fibularis longus muscle': 'Fibular longo', 'Fibularis tertius muscle': 'Fibular terceiro', 'Flexor carpi radialis': 'Flexor radial do carpo', 'Flexor digiti minimi of foot': 'Flexor curto do dedo mínimo do pé',
 'Flexor digiti minimi of hand': 'Flexor curto do dedo mínimo da mão', 'Flexor digitorum brevis': 'Flexor curto dos dedos', 'Flexor digitorum longus': 'Flexor longo dos dedos',
 'Flexor digitorum profundus': 'Flexor profundo dos dedos', 'Flexor hallucis longus': 'Flexor longo do hálux', 'Flexor pollicis longus': 'Flexor longo do polegar', 'Frontalis muscle': 'Frontal (ventre frontal do occipitofrontal)',
 'Genioglossus muscle': 'Genioglosso', 'Geniohyoid muscle': 'Gênio-hióideo', 'Gluteus maximus muscle': 'Glúteo máximo', 'Gluteus medius muscle': 'Glúteo médio', 'Gluteus minimus muscle': 'Glúteo mínimo',
 'Gracilis muscle': 'Grácil', 'Humeral head of extensor carpi ulnaris': 'Extensor ulnar do carpo, cabeça umeral', 'Humeral head of flexor carpi ulnaris': 'Flexor ulnar do carpo, cabeça umeral',
 'Humero-ulnar head of flexor digitorum superficialis': 'Flexor superficial dos dedos, cabeça umeroulnar', 'Hyoglossus muscle': 'Hioglosso', 'Iliacus muscle': 'Ilíaco', 'Iliococcygeus muscle': 'Iliococcígeo',
 'Iliocostalis colli muscle': 'Iliocostal do pescoço', 'Iliocostalis lumborum muscle': 'Iliocostal do lombo', 'Iliocostalis thoracis muscle': 'Iliocostal do tórax', 'Iliopectineal arch': 'Arco iliopectíneo',
 'Iliotibial tract': 'Trato iliotibial', 'Inferior gemellus muscle': 'Gêmeo inferior', 'Inferior head of lateral pterygoid muscle': 'Pterigóideo lateral, cabeça inferior', 'Inferior oblique muscle': 'Oblíquo inferior do olho',
 'Inferior pharyngeal constrictor': 'Constritor inferior da faringe', 'Inferior rectus muscle': 'Reto inferior do olho', 'Inferior tarsus': 'Tarso inferior', 'Infraspinatus muscle': 'Infraespinal',
 'Inguinal ligament': 'Ligamento inguinal', 'Innermost intercostal muscles': 'Intercostais íntimos', 'Intermediate tendon of digastric muscle': 'Tendão intermédio do digástrico',
 'Internal abdominal oblique muscle': 'Oblíquo interno do abdome', 'Internal intercostal muscles': 'Intercostais internos', 'Interspinales colli muscles': 'Interespinais do pescoço',
 'Interspinales lumborum muscles': 'Interespinais do lombo', 'Interspinales thoracis muscles': 'Interespinais do tórax', 'Lateral crico-arytenoid muscle': 'Cricoaritenóideo lateral',
 'Lateral femoral intermuscular septum': 'Septo intermuscular lateral da coxa', 'Lateral head of flexor hallucis brevis': 'Flexor curto do hálux, cabeça lateral', 'Lateral head of gastrocnemius': 'Gastrocnêmio, cabeça lateral',
 'Lateral head of triceps brachii': 'Tríceps braquial, cabeça lateral', 'Lateral intermuscular septum of arm': 'Septo intermuscular lateral do braço', 'Lateral rectus muscle': 'Reto lateral do olho',
 'Latissimus dorsi muscle': 'Latíssimo do dorso', 'Levator anguli oris': 'Levantador do ângulo da boca', 'Levator labii superioris': 'Levantador do lábio superior', 'Levator nasolabialis': 'Levantador do lábio superior e da asa do nariz',
 'Levator palpebrae superioris': 'Levantador da pálpebra superior', 'Levator scapulae': 'Levantador da escápula', 'Levatores breves costarum': 'Levantadores curtos das costelas', 'Levatores longi costarum': 'Levantadores longos das costelas',
 'Linea alba': 'Linha alba', 'Long head of biceps brachii': 'Bíceps braquial, cabeça longa', 'Long head of biceps femoris': 'Bíceps femoral, cabeça longa', 'Long head of triceps brachii': 'Tríceps braquial, cabeça longa',
 'Longissimus capitis muscle': 'Longuíssimo da cabeça', 'Longissimus colli muscle': 'Longuíssimo do pescoço', 'Longissimus thoracis muscle': 'Longuíssimo do tórax', 'Longus capitis muscle': 'Longo da cabeça',
 'Longus colli muscle': 'Longo do pescoço', 'Lumbrical muscles of foot': 'Lumbricais do pé', 'Lumbrical muscles of hand': 'Lumbricais da mão', 'Medial femoral intermuscular septum': 'Septo intermuscular medial da coxa',
 'Medial head of flexor hallucis brevis': 'Flexor curto do hálux, cabeça medial', 'Medial head of gastrocnemius': 'Gastrocnêmio, cabeça medial', 'Medial head of triceps brachii': 'Tríceps braquial, cabeça medial',
 'Medial intermuscular septum of arm': 'Septo intermuscular medial do braço', 'Medial pterygoid muscle': 'Pterigóideo medial', 'Medial rectus muscle': 'Reto medial do olho', 'Mentalis muscle': 'Mentual',
 'Middle pharyngeal constrictor': 'Constritor médio da faringe', 'Multifidus colli muscle': 'Multífido do pescoço', 'Multifidus lumborum muscle': 'Multífido do lombo', 'Multifidus thoracis muscle': 'Multífido do tórax',
 'Mylohyoid muscle': 'Milo-hióideo', 'Nasalis muscle': 'Nasal (músculo)', 'Oblique head of adductor hallucis': 'Adutor do hálux, cabeça oblíqua', 'Oblique head of adductor pollicis': 'Adutor do polegar, cabeça oblíqua',
 'Oblique part of cricothyroid muscle': 'Cricotireóideo, parte oblíqua', 'Obliquus inferior capitis muscle': 'Oblíquo inferior da cabeça', 'Obliquus superior capitis muscle': 'Oblíquo superior da cabeça',
 'Obturator externus': 'Obturador externo', 'Obturator internus': 'Obturador interno', 'Occipitalis muscle': 'Occipital (ventre occipital do occipitofrontal)', 'Omohyoid muscle': 'Omo-hióideo',
 'Opponens digiti minimi muscle of hand': 'Oponente do dedo mínimo', 'Opponens pollicis muscle': 'Oponente do polegar', 'Orbicularis oris muscle': 'Orbicular da boca', 'Orbital part of orbicularis oculi': 'Orbicular do olho, parte orbital',
 'Palatopharyngeus muscle': 'Palatofaríngeo', 'Palmar aponeurosis': 'Aponeurose palmar', 'Palmar interossei muscles': 'Interósseos palmares', 'Palmaris longus muscle': 'Palmar longo',
 'Palpebral part of orbicularis oculi': 'Orbicular do olho, parte palpebral', 'Pectineus muscle': 'Pectíneo', 'Pectoralis minor muscle': 'Peitoral menor', 'Piriformis muscle': 'Piriforme',
 'Plantar aponeurosis': 'Aponeurose plantar', 'Plantar interossei muscles': 'Interósseos plantares', 'Plantaris muscle': 'Plantar', 'Platysma': 'Platisma', 'Popliteus muscle': 'Poplíteo',
 'Posterior belly of digastric muscle': 'Ventre posterior do digástrico', 'Posterior crico-arytenoid muscle': 'Cricoaritenóideo posterior', 'Posterior intermuscular septum of leg': 'Septo intermuscular posterior da perna',
 'Procerus muscle': 'Prócero', 'Pronator quadratus': 'Pronador quadrado', 'Psoas major': 'Psoas maior', 'Pubo-analis muscle': 'Puboanal', 'Pubococcygeus muscle': 'Pubococcígeo', 'Pyramidalis muscle': 'Piramidal do abdome',
 'Quadratus femoris muscle': 'Quadrado femoral', 'Quadratus lumborum muscle': 'Quadrado do lombo', 'Quadratus plantae muscle': 'Quadrado plantar', 'Radial head of flexor digitorum superficialis': 'Flexor superficial dos dedos, cabeça radial',
 'Rectus abdominis muscle': 'Reto do abdome', 'Rectus anterior capitis muscle': 'Reto anterior da cabeça', 'Rectus femoris muscle': 'Reto femoral', 'Rectus lateralis capitis muscle': 'Reto lateral da cabeça',
 'Rectus posterior major capitis muscle': 'Reto posterior maior da cabeça', 'Rectus posterior minor capitis muscle': 'Reto posterior menor da cabeça', 'Rhomboid major muscle': 'Romboide maior', 'Rhomboid minor muscle': 'Romboide menor',
 'Risorius muscle': 'Risório', 'Rotatores': 'Rotadores', 'Sartorius muscle': 'Sartório', 'Scalenus anterior muscle': 'Escaleno anterior', 'Scalenus medius muscle': 'Escaleno médio', 'Scalenus posterior muscle': 'Escaleno posterior',
 'Scapular spinal part of deltoid muscle': 'Deltoide, parte espinal (posterior)', 'Semimembranosus muscle': 'Semimembranáceo', 'Semispinalis colli muscle': 'Semiespinal do pescoço', 'Semispinalis thoracis muscle': 'Semiespinal do tórax',
 'Semitendinosus muscle': 'Semitendíneo', 'Serratus anterior muscle': 'Serrátil anterior', 'Serratus posterior inferior muscle': 'Serrátil posterior inferior', 'Serratus posterior superior muscle': 'Serrátil posterior superior',
 'Short head of biceps brachii': 'Bíceps braquial, cabeça curta', 'Short head of biceps femoris': 'Bíceps femoral, cabeça curta', 'Soleus muscle': 'Sóleo', 'Spinalis capitis muscle': 'Espinal da cabeça',
 'Spinalis colli muscle': 'Espinal do pescoço', 'Spinalis thoracis muscle': 'Espinal do tórax', 'Splenius capitis muscle': 'Esplênio da cabeça', 'Splenius colli muscle': 'Esplênio do pescoço',
 'Sternocleidomastoid muscle': 'Esternocleidomastóideo', 'Sternocostal head of pectoralis major muscle': 'Peitoral maior, parte esternocostal', 'Sternohyoid muscle': 'Esterno-hióideo', 'Sternothyroid muscle': 'Esternotireóideo',
 'Straight part of cricothyroid muscle': 'Cricotireóideo, parte reta', 'Stylohyoid muscle': 'Estilo-hióideo', 'Stylopharyngeus muscle': 'Estilofaríngeo', 'Subclavius muscle': 'Subclávio', 'Subscapularis muscle': 'Subescapular',
 'Superficial head of flexor pollicis brevis': 'Flexor curto do polegar, cabeça superficial', 'Superficial head of pronator teres': 'Pronador redondo, cabeça umeral', 'Superficial part of masseter': 'Masseter, parte superficial',
 'Superficial transverse metacarpal ligament': 'Ligamento metacarpal transverso superficial', 'Superficial transverse metatarsal ligament': 'Ligamento metatarsal transverso superficial', 'Superior gemellus muscle': 'Gêmeo superior',
 'Superior head of lateral pterygoid muscle': 'Pterigóideo lateral, cabeça superior', 'Superior oblique muscle': 'Oblíquo superior do olho', 'Superior pharyngeal constrictor': 'Constritor superior da faringe',
 'Superior rectus muscle': 'Reto superior do olho', 'Superior tarsus': 'Tarso superior', 'Supinator': 'Supinador', 'Supraspinatus muscle': 'Supraespinal', 'Temporalis muscle': 'Temporal (músculo)',
 'Temporoparietalis muscle': 'Temporoparietal', 'Tendon of extensor digitorum longus': 'Tendão do extensor longo dos dedos', 'Teres major muscle': 'Redondo maior', 'Teres minor muscle': 'Redondo menor',
 'Thyro-epiglottic part of thyro-arytenoid muscle': 'Tireoaritenóideo, parte tireoepiglótica', 'Thyrohyoid muscle': 'Tíreo-hióideo', 'Tibialis anterior muscle': 'Tibial anterior', 'Tibialis posterior muscle': 'Tibial posterior',
 'Transverse arytenoid muscle': 'Aritenóideo transverso', 'Transverse head of adductor hallucis': 'Adutor do hálux, cabeça transversa', 'Transverse head of adductor pollicis': 'Adutor do polegar, cabeça transversa',
 'Transverse intermuscular septum of leg': 'Septo intermuscular transverso da perna', 'Transverse part of trapezius muscle': 'Trapézio, parte transversa (média)', 'Transversus abdominis muscle': 'Transverso do abdome',
 'Transversus thoracis muscle': 'Transverso do tórax', 'Trochlea of superior oblique muscle': 'Tróclea do oblíquo superior', 'Ulnar head of extensor carpi ulnaris': 'Extensor ulnar do carpo, cabeça ulnar',
 'Ulnar head of flexor carpi ulnaris': 'Flexor ulnar do carpo, cabeça ulnar', 'Vastus intermedius muscle': 'Vasto intermédio', 'Vastus lateralis muscle': 'Vasto lateral', 'Vastus medialis muscle': 'Vasto medial',
 'Ventral parts of lateral intertransversarii lumborum muscles': 'Intertransversários laterais lombares, partes ventrais', 'Zygomaticus major muscle': 'Zigomático maior', 'Zygomaticus minor muscle': 'Zigomático menor'}
def mus_pt(n): return MUS.get(n, n)
