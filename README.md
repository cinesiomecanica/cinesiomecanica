# Cinesiomecânica

Atlas 3D interativo de anatomia, cinesiologia, biomecânica e postura.

- **Atlas:** ossos, músculos, origens e inserções e ligamentos, com nomes em português.
- **Regiões:** ombro, cotovelo e joelho, com origem, inserção, inervação, ações por plano e eixo, amplitude e segurança.
- **Modo movimento:** arraste o cotovelo ou o joelho e veja ângulo, torque, braço de momento e força muscular.
- **Agachamento:** cadeia fechada com quadril, joelho e tornozelo, barra alta, baixa e frontal.
- **Movimento:** corpo inteiro com todos os músculos acompanhando os ossos (na GPU): elevação e abertura do braço com ritmo escapuloumeral, rosca, agachamento, flexão do tronco com ritmo lombopélvico e elevação dos calcanhares.
- **Postura:** 17 desvios com o corpo posicionado, fios de prumo e ângulo Q medidos ao vivo, cadeias e manejo.

Site estático (GitHub Pages). A pasta `fonte/` guarda os textos de cada região e os scripts que geram `dados.json`.

## Créditos

Modelos 3D: [Z-Anatomy](https://www.z-anatomy.com/) (CC BY-SA 4.0), derivados do BodyParts3D (DBCLS, CC BY-SA 2.1 JP).
Os arquivos da pasta `modelo/` são obras derivadas e seguem a licença CC BY-SA 4.0.
Biblioteca 3D: three.js (licença MIT, ver `lib/THREE-LICENSE`).
