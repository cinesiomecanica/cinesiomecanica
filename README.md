# Cinesiomecânica

Atlas 3D interativo de anatomia, cinesiologia, biomecânica e postura.

- **Atlas:** ossos, músculos, origens e inserções e ligamentos, com nomes em português.
- **Regiões:** ombro, cotovelo e joelho, com origem, inserção, inervação, ações por plano e eixo, amplitude e segurança.
- **Modo movimento:** arraste o cotovelo ou o joelho e veja ângulo, torque, braço de momento e força muscular.
- **Agachamento:** cadeia fechada com quadril, joelho e tornozelo, barra alta, baixa e frontal.
- **Articulações:** 57 movimentos (ombro, escápula, cotovelo, radioulnares, punho, quadril, joelho, tornozelo, pé, coluna cervical, torácica e lombar, pelve), cada um com plano e eixo desenhados no modelo, amplitude de referência e músculos agonistas.
- **Movimento:** corpo inteiro com todos os músculos acompanhando os ossos (na GPU): elevação e abertura do braço com ritmo escapuloumeral, rosca, agachamento, flexão do tronco com ritmo lombopélvico e elevação dos calcanhares.
- **Movimento livre:** controles para cada articulação em cada plano (ombro, escápula, cotovelo, antebraço, punho, quadril, joelho, tornozelo, coluna cervical, torácica e lombar, pelve), todos ao mesmo tempo, com plano e eixo desenhados, músculos do movimento coloridos e posições prontas de exercícios.
- **Marcha:** o ciclo completo nas 8 fases de Perry, com ângulos do quadril, joelho e tornozelo, balanço dos braços, rotação e queda da pelve, músculos ativos e tipo de contração em cada fase.
- **Deformação dos músculos:** músculos em leque (grande dorsal, peitoral, trapézio, glúteos) esticam ao longo das fibras; deltoide e manguito giram em volta da cabeça do úmero; a escápula contorna o gradil costal.
- **Postura:** 17 desvios com o corpo posicionado, fios de prumo e ângulo Q medidos ao vivo, cadeias e manejo.

Site estático (GitHub Pages). A pasta `fonte/` guarda os textos de cada região e os scripts que geram `dados.json`.

## Créditos

Modelos 3D: [Z-Anatomy](https://www.z-anatomy.com/) (CC BY-SA 4.0), derivados do BodyParts3D (DBCLS, CC BY-SA 2.1 JP).
Os arquivos da pasta `modelo/` são obras derivadas e seguem a licença CC BY-SA 4.0.
Biblioteca 3D: three.js (licença MIT, ver `lib/THREE-LICENSE`).
