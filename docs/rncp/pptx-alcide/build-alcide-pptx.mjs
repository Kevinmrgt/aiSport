import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const {
  Presentation,
  PresentationFile,
  layers,
  text,
  image,
  shape,
  rule,
  fill,
  hug,
  wrap,
} = await loadArtifactTool();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;
const ASSET_DIR = path.join(__dirname, "assets");
const PREVIEW_DIR = path.join(__dirname, "preview-oral-final-bloc1-corrections-finales");
const OUTPUT_DIR = path.join(OUT_DIR, "output");
const PPTX_OUT = path.join(OUTPUT_DIR, "alcide-bloc1-soutenance-jury-final-bloc1-corrections-finales.pptx");

await fs.mkdir(PREVIEW_DIR, { recursive: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const W = 1920;
const H = 1080;

async function loadArtifactTool() {
  try {
    return await import("@oai/artifact-tool");
  } catch (error) {
    const userProfile = globalThis.process?.env?.USERPROFILE;
    if (!userProfile) throw error;

    const bundledPath = path.join(
      userProfile,
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
      "@oai",
      "artifact-tool",
      "dist",
      "artifact_tool.mjs",
    );

    return await import(pathToFileURL(bundledPath).href);
  }
}

const C = {
  bg: "#070909",
  bg2: "#111414",
  lime: "#B6FF00",
  lime2: "#D9FF4A",
  white: "#F6F8F2",
  muted: "#B8C2B5",
  grey: "#7D867C",
  black: "#000000",
  amber: "#F4B23C",
  red: "#FF4D4D",
  cyan: "#35F4D3",
};

const OPENAI_COST_ROWS = [
  ["Essentiel", "Modèle léger", "défaut pilote", "coût le plus bas"],
  ["Standard", "Modèle intermédiaire", "qualité renforcée", "arbitrage qualité/coût"],
  ["Expert", "Modèle avancé", "cas exigeants", "usage borné"],
];

let autoSlideNumber = 1;

async function asset(name) {
  const bytes = await fs.readFile(path.join(ASSET_DIR, name));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const hero = await asset("alcide-hero-ai-coach.png");
const paper = await asset("dark-paper-grid.png");
const strips = await asset("lime-torn-strips.png");
const halftone = await asset("lime-halftone.png");

function tx(value, x, y, w, h, opts = {}) {
  return text(value, {
    name: opts.name,
    width: w,
    height: h ?? hug,
    position: { left: x, top: y },
    style: {
      fontSize: opts.size ?? 34,
      bold: opts.bold ?? false,
      color: opts.color ?? C.white,
      italic: opts.italic ?? false,
      alignment: opts.align ?? "left",
    },
  });
}

function rect(x, y, w, h, fillColor, opts = {}) {
  return shape({
    name: opts.name,
    width: w,
    height: h,
    fill: fillColor,
    line: opts.line ? { color: opts.line, weight: opts.weight ?? 2 } : undefined,
    borderRadius: opts.radius ?? 0,
    position: { left: x, top: y },
  });
}

function hr(x, y, w, color = C.lime, weight = 6) {
  return rule({
    name: "rule",
    width: w,
    height: weight,
    stroke: color,
    weight,
    position: { left: x, top: y },
  });
}

function bg(slide, number, opts = {}) {
  const base = [
    image({ dataUrl: paper, width: W, height: H, fit: "cover", position: { left: 0, top: 0 }, alt: "Dark paper grid texture" }),
    rect(0, 0, W, H, opts.tint ?? "#00000020"),
    image({ dataUrl: halftone, width: W, height: H, fit: "cover", position: { left: 0, top: 0 }, alt: "Lime halftone accent" }),
  ];
  if (opts.strips !== false) {
    base.push(image({ dataUrl: strips, width: W, height: H, fit: "cover", position: { left: 0, top: 0 }, alt: "Lime torn paper strips" }));
  }
  base.push(
    tx("ALCIDE / BLOC 1", 82, 1016, 420, 32, { size: 20, color: "#CFE1C8", bold: true }),
    tx(String(number).padStart(2, "0"), 1770, 1010, 78, 38, { size: 22, color: C.lime, bold: true, align: "right" }),
    hr(82, 994, 112, C.lime, 5),
  );
  return base;
}

function title(slide, kicker, main, sub, number, opts = {}) {
  const pageNumber = ++autoSlideNumber;
  return [
    ...bg(slide, pageNumber, opts.bg ?? {}),
    tx(kicker.toUpperCase(), 86, 74, 620, 42, { size: 24, color: C.lime, bold: true }),
    tx(main.toUpperCase(), 82, 125, opts.titleW ?? 1220, opts.titleH ?? 155, { size: opts.size ?? 68, bold: true, color: opts.color ?? C.white }),
    sub ? tx(sub, 86, opts.subY ?? 285, opts.subW ?? 1160, opts.subH ?? 78, { size: opts.subSize ?? 30, color: opts.subColor ?? C.muted }) : undefined,
  ].filter(Boolean);
}

function note(slide, content) {
  slide.speakerNotes.setText(content);
}

function slideRoot(slide, children) {
  slide.compose(layers({ name: "root", width: fill, height: fill }, children), {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
}

function stat(label, value, x, y, w, color = C.lime) {
  return [
    tx(value, x, y, w, 90, { size: 70, bold: true, color }),
    tx(label.toUpperCase(), x + 4, y + 88, w, 48, { size: 20, bold: true, color: C.muted }),
  ];
}

function miniCard(titleText, body, x, y, w, h, opts = {}) {
  return [
    rect(x, y, w, h, opts.fill ?? "#0D1010E8", { line: opts.line ?? "#334033", weight: 2, radius: opts.radius ?? 0 }),
    rect(x, y, 10, h, opts.accent ?? C.lime),
    tx(titleText.toUpperCase(), x + 28, y + 22, w - 48, 38, { size: opts.titleSize ?? 24, bold: true, color: opts.titleColor ?? C.lime }),
    tx(body, x + 28, y + 66, w - 54, h - 78, { size: opts.bodySize ?? 22, color: opts.bodyColor ?? C.white }),
  ];
}

function arrow(x1, y, x2, label, color = C.lime) {
  return [
    hr(x1, y, x2 - x1 - 28, color, 4),
    tx(">", x2 - 42, y - 27, 42, 58, { size: 46, bold: true, color }),
    label ? tx(label, x1, y + 18, x2 - x1, 34, { size: 17, color: C.muted, bold: true }) : undefined,
  ].filter(Boolean);
}

function slide1(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    image({ dataUrl: hero, width: W, height: H, fit: "cover", position: { left: 0, top: 0 }, alt: "Alcide AI coach running in urban gym" }),
    rect(0, 0, 1180, H, "#000000B8"),
    rect(0, 0, W, H, "#00000012"),
    tx("BLOC 1 / CADRAGE PROJET LOGICIEL", 88, 78, 760, 44, { size: 24, color: C.lime, bold: true }),
    tx("ALCIDE", 82, 150, 880, 190, { size: 165, color: C.white, bold: true }),
    tx("COACH IA PERSONNEL", 92, 332, 760, 70, { size: 54, color: C.lime, bold: true }),
    tx("Il transforme un objectif sportif en séance ou programme personnalisé, sauvegardé et exécutable.", 96, 435, 830, 126, { size: 34, color: C.muted }),
    rect(96, 612, 566, 74, C.lime),
    tx("GO PILOTE SOUS CONDITIONS", 122, 628, 520, 42, { size: 26, bold: true, color: C.black }),
    tx("Soutenance jury - 20 minutes", 96, 732, 560, 38, { size: 24, color: C.white, bold: true }),
    tx("Kevin - Lead full-stack & responsable technique", 96, 776, 780, 38, { size: 22, color: C.muted }),
    hr(96, 824, 330, C.lime, 5),
  ]);
  note(slide, "Ouverture : présenter Alcide comme un produit professionnel. Message : ce n'est pas juste une IA, c'est un coach IA nommé, cadré, sécurisé et prêt pour un pilote.");
}

function slidePlan(p) {
  const slide = p.slides.add();
  const items = [
    ["01", "Référentiel", "Les 5 compétences éliminatoires et l'objectif du support."],
    ["02", "Diagnostic", "Demande, existant, persona et opportunités."],
    ["03", "Cadrage", "Acteurs, périmètre, risques, charge et budget."],
    ["04", "Technique", "Veille, architecture, IA, données et CI/CD."],
    ["05", "Décision", "Les preuves projet et la recommandation finale."],
  ];
  const elems = [];
  items.forEach((it, i) => {
    const y = 345 + i * 112;
    elems.push(
      rect(124, y, 112, 64, i === 4 ? C.lime : "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(it[0], 126, y - 4, 96, 58, { size: 44, color: i === 4 ? C.black : C.lime, bold: true, align: "center" }),
      tx(it[1].toUpperCase(), 270, y + 2, 420, 42, { size: 34, color: C.white, bold: true }),
      tx(it[2], 690, y + 8, 950, 36, { size: 25, color: C.muted }),
      hr(270, y + 62, 1220, i === 4 ? C.lime : "#384036", 2),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Plan", "Le fil de la soutenance", "Du besoin client à la décision de lancement.", 2, { size: 68, titleW: 1320 }),
    rect(116, 320, 1540, 590, "#05070780", { line: "#334033", weight: 2 }),
    ...elems,
    rect(1120, 828, 520, 68, C.lime),
    tx("OBJECTIF : DÉFENDRE UN GO PILOTE", 1150, 846, 470, 34, { size: 26, bold: true, color: C.black, align: "center" }),
  ]);
  note(slide, "Plan : annoncer le déroulé en cinq temps. Dire au jury que l'objectif n'est pas de tout montrer, mais de démontrer qu'Alcide est cadré comme un vrai projet client.");
}

function slideEliminatories(p) {
  const slide = p.slides.add();
  const items = [
    ["C1.1.1", "Acteurs", "commanditaire, utilisateurs, rôles, implication"],
    ["C1.2.2", "Faisabilité", "contraintes, moyens, budget, go/no-go"],
    ["C1.3.2", "Architecture", "comparaison, sécurité, solution retenue"],
    ["C1.4.1", "Charge", "fonctionnalités, priorisation, estimation JH"],
    ["C1.6", "Décision", "argumentaire client et validation pilote"],
  ];
  const elems = [];
  items.forEach((it, i) => {
    const x = 110 + i * 348;
    elems.push(
      rect(x, 420, 286, 310, i === 4 ? C.lime : "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(it[0], x + 24, 452, 220, 48, { size: 40, color: i === 4 ? C.black : C.lime, bold: true }),
      tx(it[1].toUpperCase(), x + 24, 540, 230, 42, { size: 28, color: i === 4 ? C.black : C.white, bold: true }),
      tx(it[2], x + 24, 622, 230, 72, { size: 22, color: i === 4 ? C.black : C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Référentiel", "Les 5 points éliminatoires sont verrouillés", "Chaque point du Bloc 1 a une slide, une preuve projet et un message client.", 0, { size: 58, titleW: 1460 }),
    ...elems,
    rect(190, 850, 1380, 70, C.lime),
    tx("Objectif oral : montrer le cadrage client, pas seulement le code.", 220, 867, 1320, 34, { size: 30, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Dire explicitement que ces cinq compétences sont éliminatoires. Chaque point est ensuite traité dans le support : acteurs, faisabilité, architecture, charge et décision client.");
}

function slideAuditExisting(p) {
  const slide = p.slides.add();
  const rows = [
    ["Existant applicatif", "Pas d'application Alcide en production : projet greenfield", "Pas de migration, mais tout le socle produit est à cadrer"],
    ["Besoin client", "Transformer un objectif sportif en séance/programme exécutable", "Priorité au parcours court : profil -> génération -> exécution"],
    ["Infrastructure", "Hébergement web, PostgreSQL, API IA, CI/CD", "Dépendances fortes : Vercel, Neon, OpenAI, GitHub"],
    ["Données", "Profil sportif, objectifs, historique, sessions", "Minimisation, pas de diagnostic médical"],
    ["Sécurité", "Auth, isolation userId, secrets serveur", "Tests 401/403, Zod, clé IA jamais côté navigateur"],
    ["Budget", "81 JH, 42 818 EUR HT, coût IA variable", "Go pilote avec plafond IA et suivi tokens"],
    ["Délai", "6 semaines pour arriver au pilote", "MVP limité, pas de paiement ni mobile natif"],
    ["Avis faisabilité", "Faisable sous conditions", "Go pilote limité, pas go marché"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 358 + i * 62;
    elems.push(
      rect(92, y, 360, 52, i === 7 ? C.lime : "#0D1010E8", { line: i === 7 ? C.lime : "#334033", weight: 2 }),
      tx(r[0], 114, y + 13, 310, 22, { size: 18, color: i === 7 ? C.black : C.lime, bold: true }),
      rect(472, y, 610, 52, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 495, y + 10, 555, 30, { size: 17, color: C.white }),
      rect(1102, y, 720, 52, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 1125, y + 10, 665, 30, { size: 17, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.2.2", "Audit de l'existant et faisabilité", "Contraintes techniques, budgétaires, humaines et calendaires.", 0, { size: 54, titleW: 1500, titleH: 96, subY: 245, subW: 1450, subH: 40, subSize: 24 }),
    tx("Axe audité", 112, 318, 260, 24, { size: 18, color: C.lime, bold: true }),
    tx("Constat", 495, 318, 260, 24, { size: 18, color: C.lime, bold: true }),
    tx("Impact sur Alcide", 1125, 318, 330, 24, { size: 18, color: C.lime, bold: true }),
    ...elems,
    rect(170, 900, 1580, 72, C.lime),
    tx("Conclusion audit : faisable car le périmètre est limité, l'architecture maîtrisée et les risques bornés. Lancement en pilote contrôlé, pas en ouverture commerciale.", 205, 916, 1510, 36, { size: 24, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Cette slide prouve C1.2.2. Dire : l'audit couvre l'existant applicatif, le besoin client, l'infrastructure, les données, la sécurité, le budget, le délai et l'avis de faisabilité. Conclusion : go pilote limité, pas go marché.");
}

function slideAlternativesDecision(p) {
  const slide = p.slides.add();
  const rows = [
    ["ChatGPT / Le Chat / Claude", "rapide", "pas de workflow, persistance ni contrôle applicatif"],
    ["Bibliothèque statique", "contenu maîtrisé", "peu personnalisé et maintenance éditoriale"],
    ["No-code", "livraison rapide", "limites sécurité, tests et architecture"],
    ["Mobile natif", "adapté au sport", "coût initial et complexité trop élevés"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 390 + i * 118;
    elems.push(
      rect(120, y, 430, 80, i === 3 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0].toUpperCase(), 145, y + 22, 380, 30, { size: 22, color: i === 3 ? C.black : C.white, bold: true, align: "center" }),
      rect(580, y, 330, 80, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 610, y + 22, 270, 30, { size: 23, color: C.lime, bold: true, align: "center" }),
      rect(940, y, 790, 80, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 975, y + 18, 730, 38, { size: 23, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Décision produit", "Pourquoi créer Alcide plutôt qu'assembler l'existant ?", "Les options rapides ne donnent pas assez de maîtrise produit pour un pilote fiable.", 0, { size: 55, titleW: 1500 }),
    ...elems,
    rect(230, 870, 1320, 64, C.lime),
    tx("Décision : MVP web full-stack, IA contrôlée, PostgreSQL, timer et suivi.", 260, 886, 1260, 30, { size: 28, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Comparer les alternatives sans les demonter. Le choix retenu est le MVP web parce qu'il donne un produit mesurable, securise et defendable en cadrage client.");
}

function slideStakeholderMap(p) {
  const slide = p.slides.add();
  const rows = [
    ["Commanditaire", "Coach / structure sportive", "valide besoin, budget, go pilote", "forte", "forte"],
    ["Utilisateurs", "sportifs et coachs", "génération, timer, suivi, retours", "forte usage", "moyenne"],
    ["Équipe projet", "PO, lead, QA, sécurité, sport", "priorise, livre, contrôle", "forte", "forte technique"],
    ["Acteurs externes", "OpenAI API, Vercel, Neon, Google, GitHub", "IA, hosting, auth, CI/CD, validation", "ponctuelle", "forte faisabilité"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 384 + i * 120;
    elems.push(
      rect(100, y, 300, 82, i === 0 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0].toUpperCase(), 126, y + 24, 250, 30, { size: 22, color: i === 0 ? C.black : C.white, bold: true, align: "center" }),
      rect(430, y, 390, 82, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 458, y + 18, 340, 38, { size: 22, color: C.white, bold: true }),
      rect(850, y, 470, 82, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 878, y + 18, 420, 38, { size: 22, color: C.muted }),
      rect(1350, y, 170, 82, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[3], 1370, y + 24, 130, 28, { size: 21, color: C.lime, bold: true, align: "center" }),
      rect(1550, y, 230, 82, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[4], 1570, y + 24, 190, 28, { size: 21, color: C.lime, bold: true, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.1.1", "Cartographie des acteurs", "Le périmètre Alcide est cadré par les rôles, l'implication et l'influence.", 0, { size: 66, titleW: 1250 }),
    tx("Acteur", 128, 335, 240, 28, { size: 20, color: C.lime, bold: true, align: "center" }),
    tx("Rôle / profil", 456, 335, 340, 28, { size: 20, color: C.lime, bold: true }),
    tx("Contribution", 880, 335, 420, 28, { size: 20, color: C.lime, bold: true }),
    tx("Implication", 1360, 335, 150, 28, { size: 20, color: C.lime, bold: true, align: "center" }),
    tx("Influence", 1580, 335, 170, 28, { size: 20, color: C.lime, bold: true, align: "center" }),
    ...elems,
    tx("Décision cadrée : lancer un MVP pilote sous conditions de coût IA, sécurité, monitoring et limites non médicales.", 130, 890, 1580, 44, { size: 30, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Cette slide répond directement à C1.1.1. Distinguer commanditaire, utilisateurs finaux, équipe projet et acteurs externes, avec rôle, implication et influence.");
}

function slideOpportunitiesThreats(p) {
  const slide = p.slides.add();
  const rows = [
    ["Opportunités", "Coach IA différenciant, carnet d'entraînement, dashboard", "MVP pilote centré génération + suivi", C.lime],
    ["Menaces", "sorties IA incohérentes, coût variable, données sportives sensibles", "Zod + retry, rate limit, revue OWASP", C.red],
    ["Adhérences", "OpenAI API, Vercel, Neon, Google OAuth, GitHub Actions", "services découplés, Docker, multi-provider IA", C.cyan],
    ["Impact env.", "cloud et appels IA, mesure encore limitée", "suivre appels, tokens, coût, volume DB", C.amber],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 398 + i * 116;
    elems.push(
      rect(120, y, 300, 76, r[3]),
      tx(r[0].toUpperCase(), 145, y + 22, 250, 30, { size: 24, color: C.black, bold: true, align: "center" }),
      rect(460, y, 610, 76, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 490, y + 18, 550, 38, { size: 22, color: C.white }),
      rect(1105, y, 650, 76, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 1135, y + 18, 590, 38, { size: 22, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.2.1", "Opportunités, menaces et adhérences", "Le pilote est viable si les dépendances, le coût IA et la sobriété sont suivis.", 0, { size: 58, titleW: 1450 }),
    tx("Axe", 160, 348, 220, 28, { size: 20, color: C.lime, bold: true, align: "center" }),
    tx("Constat", 490, 348, 520, 28, { size: 20, color: C.lime, bold: true }),
    tx("Action de cadrage", 1135, 348, 520, 28, { size: 20, color: C.lime, bold: true }),
    ...elems,
    tx("Je ne promets pas un bilan carbone complet : je propose des mesures pilote simples et vérifiables.", 190, 875, 1500, 42, { size: 30, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Répondre à C1.2.1 : opportunités, menaces, adhérences et impact environnemental. Dire que chaque point mène à une action observable pendant le pilote.");
}

function slideWatchMethod(p) {
  const slide = p.slides.add();
  const rows = [
    ["IA générative", "Docs API IA, pricing, retours dev", "IA côté serveur, estimation coût, quotas"],
    ["Sécurité web", "OWASP, Auth, revues code", "Secrets serveur, tests 401/403, validation entrées"],
    ["Données perso.", "CNIL / RGPD, minimisation", "Pas de collecte médicale, données limitées"],
    ["Architecture web", "Next.js, Hono, PostgreSQL, Drizzle", "Stack TypeScript maintenable et testable"],
    ["Hébergement", "Vercel, Neon, GitHub Actions", "Previews, CI/CD, coût pilote maîtrisé"],
    ["Accessibilité", "RGAA / WCAG, composants standards", "Parcours lisible et UX prise en compte"],
    ["Sobriété", "Suivi tokens, volume DB, appels IA", "Mesure : appels, tokens, stockage"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 365 + i * 70;
    elems.push(
      rect(110, y, 310, 54, i === 0 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0], 132, y + 15, 260, 22, { size: 18, color: i === 0 ? C.black : C.white, bold: true, align: "center" }),
      rect(448, y, 570, 54, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 472, y + 13, 520, 24, { size: 18, color: C.white }),
      rect(1045, y, 760, 54, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 1070, y + 13, 710, 24, { size: 18, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.3.1", "Veille technique, réglementaire et économique", "La veille réduit l'incertitude avant lancement : architecture, coût, données, exploitation.", 0, { size: 54, titleW: 1540 }),
    tx("Axe de veille", 135, 322, 220, 24, { size: 18, color: C.lime, bold: true }),
    tx("Sources / outils", 472, 322, 280, 24, { size: 18, color: C.lime, bold: true }),
    tx("Ce que ça change dans le projet", 1070, 322, 430, 24, { size: 18, color: C.lime, bold: true }),
    ...elems,
    rect(215, 900, 1490, 66, C.lime),
    tx("Objectif de la veille : sécuriser les choix d'architecture, de coût, de données et d'exploitation avant le pilote.", 250, 917, 1420, 30, { size: 25, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Dire que la veille a un objectif opérationnel : réduire l'incertitude avant lancement. Les sources ne sont pas citées pour faire joli ; elles changent les décisions sur l'IA, la sécurité, les données, la stack, l'hébergement, l'accessibilité et la sobriété.");
}

function slideComparedOptions(p) {
  const slide = p.slides.add();
  const rows = [
    ["Sécurité", "Peu de contrôle", "Dépend plateforme", "Contrôle complexe", "Secrets serveur, auth, tests"],
    ["Données", "Pas de produit", "Verrouillage possible", "Bonne maîtrise", "PostgreSQL, userId, migrations"],
    ["Maintenabilité", "Faible", "Moyenne", "Coût iOS/Android", "TypeScript, tests, CI/CD"],
    ["Coût / délai", "Très rapide, pas produit", "Rapide, limites", "Coût initial élevé", "Coût pilote maîtrisé"],
    ["Accessibilité", "Outil externe", "Variable", "Spécifique mobile", "Web responsive, standards"],
    ["Réseau / infra", "Dépend service IA", "Dépend plateforme", "Stores + backend", "Vercel, Neon, API IA, GHA"],
    ["Impact env.", "Non mesurable", "Mesure limitée", "Deux apps", "Suivi tokens, appels, DB"],
    ["Décision", "Rejeté", "Rejeté MVP critique", "Rejeté lancement", "Retenu"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 360 + i * 59;
    const isDecision = i === rows.length - 1;
    elems.push(
      rect(88, y, 230, 50, isDecision ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0], 108, y + 14, 190, 22, { size: 16, color: isDecision ? C.black : C.lime, bold: true, align: "center" }),
      rect(338, y, 330, 50, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 360, y + 10, 286, 26, { size: 15, color: C.muted, align: "center" }),
      rect(690, y, 330, 50, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 712, y + 10, 286, 26, { size: 15, color: C.muted, align: "center" }),
      rect(1042, y, 330, 50, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[3], 1064, y + 10, 286, 26, { size: 15, color: C.muted, align: "center" }),
      rect(1394, y, 438, 50, isDecision ? C.lime : "#0D1010E8", { line: C.lime, weight: isDecision ? 3 : 2 }),
      tx(r[4], 1418, y + 10, 390, 26, { size: 15, color: isDecision ? C.black : C.white, bold: isDecision, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.3.2", "Comparatif des solutions techniques", "Sécurité, données, coût, maintenabilité, accessibilité, réseau et impact.", 0, { size: 51, titleW: 1580, titleH: 96, subY: 245, subW: 1500, subH: 40, subSize: 24 }),
    tx("Critère", 120, 322, 150, 22, { size: 16, color: C.lime, bold: true, align: "center" }),
    tx("Chatbot IA libre", 360, 322, 280, 22, { size: 16, color: C.lime, bold: true, align: "center" }),
    tx("No-code / SaaS", 712, 322, 280, 22, { size: 16, color: C.lime, bold: true, align: "center" }),
    tx("Mobile natif", 1064, 322, 280, 22, { size: 16, color: C.lime, bold: true, align: "center" }),
    tx("MVP web full-stack", 1418, 322, 390, 22, { size: 16, color: C.lime, bold: true, align: "center" }),
    ...elems,
    rect(190, 900, 1540, 66, C.lime),
    tx("Choix retenu : MVP web full-stack, meilleur compromis entre sécurité, délai, coût, maintenabilité et test réel.", 225, 916, 1470, 30, { size: 25, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Cette slide prouve C1.3.2. Dire que le chatbot libre, le no-code et le mobile natif ont été comparés mais rejetés pour ce MVP. Le MVP web full-stack est retenu car il équilibre sécurité, délai, coût, maintenabilité, accessibilité, infra et capacité à piloter.");
}

function slideTechnicalResources(p) {
  const slide = p.slides.add();
  const rows = [
    ["Développement", "Poste dev, Node.js, TypeScript, IDE, Git"],
    ["Code source", "GitHub, branches, pull requests, GitHub Actions"],
    ["Frontend", "Next.js, Auth.js, composants web"],
    ["API métier", "Hono, services, repositories, validation Zod"],
    ["Données", "Neon PostgreSQL, Drizzle, migrations"],
    ["IA", "OpenAI API côté serveur, cle sécurisée, suivi tokens"],
    ["Déploiement", "Vercel, variables d'environnement, HTTPS"],
    ["Qualité", "Tests unitaires/API, lint, build, scénarios recette"],
    ["Sécurité", "Revue OWASP, tests ownership, logs, rate limit"],
    ["Humain", "Lead full-stack, QA, sécurité, référent sport, commanditaire"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const col = i % 2;
    const x = col === 0 ? 115 : 995;
    const y = 365 + Math.floor(i / 2) * 94;
    elems.push(
      rect(x, y, 245, 64, i === 9 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0].toUpperCase(), x + 18, y + 20, 205, 24, { size: 17, color: i === 9 ? C.black : C.lime, bold: true, align: "center" }),
      rect(x + 270, y, 580, 64, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], x + 294, y + 13, 520, 34, { size: 18, color: C.white }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Faisabilité", "Ressources nécessaires au pilote", "Peu d'infrastructure propre, mais une forte exigence de contrôle sur les dépendances externes.", 0, { size: 58, titleW: 1450 }),
    tx("Type", 135, 320, 150, 22, { size: 18, color: C.lime, bold: true }),
    tx("Ressources nécessaires", 410, 320, 300, 22, { size: 18, color: C.lime, bold: true }),
    tx("Type", 1015, 320, 150, 22, { size: 18, color: C.lime, bold: true }),
    tx("Ressources nécessaires", 1290, 320, 300, 22, { size: 18, color: C.lime, bold: true }),
    ...elems,
    rect(245, 890, 1430, 66, C.lime),
    tx("Moyens compatibles avec un pilote : stack cloud standard, ressources humaines ciblées, dépendances surveillées.", 280, 906, 1360, 30, { size: 25, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Dire : les moyens nécessaires sont compatibles avec un pilote. Il y a peu d'infrastructure propre, mais un vrai besoin de contrôle des dépendances externes : OpenAI, Vercel, Neon, GitHub Actions.");
}

function slideAiEndToEnd(p) {
  const slide = p.slides.add();
  const steps = [
    ["Utilisateur", "profil et objectif"],
    ["Next.js", "server-only"],
    ["Hono API", "auth + service secret"],
    ["OpenAI API", "JSON strict"],
    ["Zod", "validation + retry"],
    ["Neon", "persistance userId"],
  ];
  const elems = [];
  steps.forEach((s, i) => {
    const x = 95 + i * 294;
    elems.push(
      rect(x, 510, 232, 150, i === 4 ? C.lime : "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(s[0].toUpperCase(), x + 18, 542, 196, 32, { size: 22, color: i === 4 ? C.black : C.white, bold: true, align: "center" }),
      tx(s[1], x + 18, 596, 196, 34, { size: 20, color: i === 4 ? C.black : C.muted, align: "center" }),
      i < steps.length - 1 ? tx(">", x + 240, 548, 40, 52, { size: 42, color: C.lime, bold: true }) : undefined,
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.5", "Flux IA bout-en-bout", "L'application valide avant toute persistance : Zod, retry, logs et refus propre.", 0, { size: 62, titleW: 1420 }),
    ...elems.filter(Boolean),
    rect(250, 790, 320, 72, C.red),
    tx("CAS D'ÉCHEC", 280, 810, 260, 30, { size: 25, color: C.black, bold: true, align: "center" }),
    rect(590, 790, 1080, 72, C.lime),
    tx("Réponse IA invalide : pas de sauvegarde, retry limité, message utilisateur propre, log technique exploitable.", 620, 808, 1020, 34, { size: 26, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Renforcer C1.5 : architecture logique et flux IA. L'IA est une source externe non fiable ; Alcide valide avant de sauvegarder.");
}

function slideOpenAiStrategy(p) {
  const slide = p.slides.add();
  const cards = [
    ["01", "Choix modèle", "L'utilisateur choisit un niveau de qualité, pas une clé technique.", C.lime],
    ["02", "Clé Alcide", "La clé OpenAI reste dans l'API : jamais dans le navigateur.", C.cyan],
    ["03", "Budget borné", "Quotas, rate limit, logs et alerte coût pendant le pilote.", C.amber],
  ];
  const elems = [];
  cards.forEach((c, i) => {
    const x = 130 + i * 570;
    elems.push(
      rect(x, 438, 475, 258, "#0D1010E8", { line: c[3], weight: 3 }),
      tx(c[0], x + 28, 466, 86, 58, { size: 50, color: c[3], bold: true }),
      tx(c[1].toUpperCase(), x + 130, 478, 300, 38, { size: 30, color: C.white, bold: true }),
      tx(c[2], x + 32, 568, 400, 82, { size: 27, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Stratégie IA", "La clé API appartient à Alcide", "Le produit prend en charge l'IA : expérience plus simple pour l'utilisateur et coût mieux pilote.", 0, { size: 60, titleW: 1500 }),
    ...elems,
    rect(205, 820, 1510, 76, C.lime),
    tx("Message jury : ce choix transforme une contrainte technique en décision produit et économique.", 240, 838, 1440, 34, { size: 29, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Dire clairement : au départ, l'utilisateur pouvait fournir sa clé. La décision produit est maintenant inverse : Alcide gère la clé OpenAI, affiche l'estimation et protège le budget avec quotas et monitoring.");
}

function slideGenerationCost(p) {
  const slide = p.slides.add();
  const rows = [];
  OPENAI_COST_ROWS.forEach((r, i) => {
    const y = 390 + i * 72;
    rows.push(
      rect(125, y, 300, 54, i === 0 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0].toUpperCase(), 148, y + 16, 250, 22, { size: 18, color: i === 0 ? C.black : C.white, bold: true, align: "center" }),
      rect(455, y, 420, 54, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 480, y + 16, 365, 22, { size: 19, color: C.lime, bold: true }),
      rect(905, y, 440, 54, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 930, y + 16, 390, 22, { size: 19, color: C.white, bold: true, align: "center" }),
      rect(1375, y, 410, 54, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[3], 1400, y + 16, 360, 22, { size: 18, color: C.muted, bold: true, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Coût IA + business model", "Rentable sans cacher le coût", "Méthode : estimation avant génération, mesure serveur, quotas et plafond mensuel.", 0, { size: 56, titleW: 1580, subW: 1580, subH: 42, subSize: 27 }),
    tx("Niveau", 148, 350, 180, 22, { size: 17, color: C.lime, bold: true }),
    tx("Modèle", 480, 350, 180, 22, { size: 17, color: C.lime, bold: true }),
    tx("Usage", 930, 350, 180, 22, { size: 17, color: C.lime, bold: true }),
    tx("Pilotage", 1400, 350, 180, 22, { size: 17, color: C.lime, bold: true }),
    ...rows,
    rect(125, 625, 500, 160, "#0D1010E8", { line: "#334033", weight: 2 }),
    tx("FREE", 155, 655, 180, 32, { size: 28, color: C.grey, bold: true }),
    tx("3 générations / mois", 155, 710, 360, 28, { size: 23, color: C.white, bold: true }),
    tx("acquisition et preuve d'usage", 155, 750, 380, 24, { size: 18, color: C.muted }),
    rect(710, 625, 500, 160, C.lime),
    tx("PRO", 740, 655, 180, 32, { size: 28, color: C.black, bold: true }),
    tx("9,99 EUR / mois", 740, 710, 360, 28, { size: 24, color: C.black, bold: true }),
    tx("quota mensuel + historique avancé", 740, 750, 390, 24, { size: 18, color: C.black }),
    rect(1295, 625, 500, 160, "#0D1010E8", { line: C.cyan, weight: 2 }),
    tx("COACH", 1325, 655, 180, 32, { size: 28, color: C.cyan, bold: true }),
    tx("49-99 EUR / mois", 1325, 710, 360, 28, { size: 23, color: C.white, bold: true }),
    tx("clients, quotas Équipe, pilotage B2B", 1325, 750, 390, 24, { size: 18, color: C.muted }),
    rect(185, 855, 1550, 70, C.lime),
    tx("Prix exacts vérifiés sur source officielle au lancement. Ce qui compte ici : formule, mesure réelle, quotas et plafond.", 220, 872, 1480, 32, { size: 24, color: C.black, bold: true, align: "center" }),
    tx("Hypothèse de pilote : valider usage, coût réel, qualité et taux de conversion avant scaling.", 260, 940, 1400, 28, { size: 22, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Ne pas figer les prix ni les noms exacts des modèles. Dire : les prix exacts sont vérifiés sur la source officielle au moment du lancement. Le cadrage porte surtout sur la méthode : estimation avant génération, mesure réelle côté serveur, quotas, rate limit et plafond mensuel. Le business model reste une hypothèse de pilote, pas une vérité marché.");
}

function slideBusinessModel(p) {
  const slide = p.slides.add();
  const offers = [
    ["Free", "3 générations / mois", "acquisition et preuve d'usage", C.grey],
    ["Pro", "9,99 EUR / mois", "40 séances + historique avancé", C.lime],
    ["Coach", "49-99 EUR / mois", "gestion de clients et quotas Équipe", C.cyan],
  ];
  const elems = [];
  offers.forEach((o, i) => {
    const x = 105 + i * 575;
    elems.push(
      rect(x, 405, 500, 236, i === 1 ? C.lime : "#0D1010E8", { line: i === 1 ? C.lime : "#334033", weight: 3 }),
      tx(o[0].toUpperCase(), x + 32, 438, 210, 44, { size: 34, color: i === 1 ? C.black : o[3], bold: true }),
      tx(o[1], x + 32, 512, 420, 38, { size: 30, color: i === 1 ? C.black : C.white, bold: true }),
      tx(o[2], x + 32, 575, 410, 44, { size: 22, color: i === 1 ? C.black : C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Business model", "Rendre Alcide rentable sans cacher le coût IA", "Le modèle repose sur abonnements, quotas et coût marginal suivi par génération.", 0, { size: 58, titleW: 1480 }),
    ...elems,
    rect(155, 735, 720, 150, "#0D1010E8", { line: C.lime, weight: 3 }),
    tx("Unité économique Pro", 190, 770, 360, 34, { size: 29, color: C.lime, bold: true }),
    tx("40 séances x $0.009 = $0.36 de coût IA mini", 190, 822, 620, 30, { size: 24, color: C.white }),
    rect(955, 735, 720, 150, "#0D1010E8", { line: C.amber, weight: 3 }),
    tx("Garde-fous rentabilité", 990, 770, 420, 34, { size: 29, color: C.amber, bold: true }),
    tx("quota mensuel, modèle par défaut, alerte coût, upsell B2B", 990, 822, 610, 30, { size: 24, color: C.white }),
    tx("À présenter comme une hypothèse de pilote : on valide l'usage, le coût réel et le taux de conversion avant scaling.", 178, 940, 1520, 34, { size: 26, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Dire que le business model n'est pas une promesse de marché. C'est une hypothèse de rentabilité : acquisition en free, offre Pro à 9,99 euros, offre B2B coach. Le point important est le coût marginal bas mais surveillé.");
}

function slide2(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Problème", "S'entraîner sans plan, c'est perdre le fil", "L'utilisateur veut progresser, mais il ne sait pas toujours quoi faire, dans quel ordre, ni comment adapter la séance.", 3, { titleW: 1320, size: 60 }),
    tx("AVANT", 120, 438, 240, 42, { size: 30, color: C.grey, bold: true }),
    tx("APRÈS ALCIDE", 1210, 438, 360, 42, { size: 30, color: C.lime, bold: true }),
    ...miniCard("Objectif flou", "Reprendre le sport, préparer une course, gagner en régularité.", 120, 510, 410, 205, { accent: C.grey, line: "#303630" }),
    ...miniCard("Plans génériques", "Pas assez adaptés au niveau, au matériel et au temps disponible.", 120, 750, 410, 205, { accent: C.grey, line: "#303630" }),
    ...arrow(572, 690, 1200, "Transformation du besoin utilisateur", C.lime),
    ...miniCard("Séance claire", "Échauffement, blocs, récupération et consignes en langage simple.", 1210, 510, 520, 205, { accent: C.lime }),
    ...miniCard("Programme suivi", "Historique, timer et session terminée pour créer une continuité.", 1210, 750, 520, 205, { accent: C.lime }),
    tx("IDÉE CLÉ", 742, 548, 300, 30, { size: 22, color: C.lime, bold: true, align: "center" }),
    tx("Alcide rapproche l'utilisateur de l'IA en lui donnant un coach identifiable.", 650, 590, 480, 110, { size: 34, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Expliquer la tension utilisateur : motivation présente, mais plan absent. Alcide transforme l'intention en plan actionnable, avec une relation de coach plutôt qu'une requête technique.");
}

function slide3(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Promesse produit", "Un parcours simple : profil, IA contrôlée, séance", "La valeur du MVP tient dans une chaîne courte et compréhensible.", 4, { size: 58, titleW: 1340 }),
    rect(96, 452, 420, 330, "#0D1010E8", { line: C.lime, weight: 3 }),
    rect(750, 452, 420, 330, "#0D1010E8", { line: C.lime, weight: 3 }),
    rect(1404, 452, 420, 330, "#0D1010E8", { line: C.lime, weight: 3 }),
    tx("01", 126, 480, 90, 64, { size: 48, bold: true, color: C.lime }),
    tx("PROFIL", 126, 560, 330, 46, { size: 36, bold: true, color: C.white }),
    tx("Sport, niveau, objectif, durée, contraintes.", 126, 628, 330, 90, { size: 28, color: C.muted }),
    tx("02", 780, 480, 90, 64, { size: 48, bold: true, color: C.lime }),
    tx("IA CONTRÔLÉE", 780, 560, 350, 46, { size: 34, bold: true, color: C.white }),
    tx("OpenAI API, JSON structure, Zod, retry et erreur propre.", 780, 628, 340, 110, { size: 27, color: C.muted }),
    tx("03", 1434, 480, 90, 64, { size: 48, bold: true, color: C.lime }),
    tx("ACTION", 1434, 560, 330, 46, { size: 36, bold: true, color: C.white }),
    tx("Séance sauvegardée, consultable et exécutable au timer.", 1434, 628, 340, 110, { size: 28, color: C.muted }),
    ...arrow(520, 610, 745, "", C.lime),
    ...arrow(1174, 610, 1398, "", C.lime),
    tx("Ce n'est pas un prompt : c'est un produit avec un contrat de données.", 210, 870, 1500, 60, { size: 42, bold: true, color: C.white, align: "center" }),
  ]);
  note(slide, "Montrer que le MVP est volontairement concentré. La différence avec un prompt libre : parcours, validation, persistance, exécution.");
}

function slide4(p) {
  const slide = p.slides.add();
  const people = [
    ["Camille", "Sponsor"],
    ["Nora", "Product owner"],
    ["Kevin", "Lead full-stack"],
    ["Inès", "UX/UI"],
    ["Hugo", "Backend / DevOps"],
    ["Manon", "QA"],
    ["Thomas", "Sécurité / RGPD"],
    ["Laura", "Référente sport"],
  ];
  const cells = [];
  people.forEach((ppl, i) => {
    const x = 106 + (i % 4) * 430;
    const y = 430 + Math.floor(i / 4) * 230;
    cells.push(
      rect(x, y, 368, 160, "#0B0E0EEA", { line: i === 2 ? C.lime : "#334033", weight: i === 2 ? 4 : 2 }),
      tx(ppl[0].toUpperCase(), x + 24, y + 28, 310, 42, { size: 30, color: i === 2 ? C.lime : C.white, bold: true }),
      tx(ppl[1], x + 24, y + 82, 310, 42, { size: 22, color: C.muted, bold: true }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Gouvernance", "Une équipe projet fictive, mais crédible", "Je présente Alcide comme un projet produit : responsabilités, arbitrages, validation et qualité.", 5, { size: 58, titleW: 1280 }),
    ...cells,
    tx("RACI", 126, 890, 130, 50, { size: 36, bold: true, color: C.lime }),
    tx("Sponsor valide / PO priorise / Lead technique livre / QA sécurise la recette", 250, 898, 1320, 42, { size: 28, color: C.white }),
  ]);
  note(slide, "Insister sur la posture professionnelle : ce n'est pas un projet isolé. L'équipe fictive sert à démontrer la cartographie des acteurs et la gouvernance.");
}

function slide5(p) {
  const slide = p.slides.add();
  const rows = [
    ["MUST", "Auth, génération séance, persistance, liste/détail, sécurité, déploiement", C.lime],
    ["SHOULD", "Programmes, timer, suivi de session, dashboard, paramètres IA", C.cyan],
    ["COULD", "Monitoring avancé, export PDF, PWA", C.amber],
    ["WON'T MVP", "Paiement, mobile natif, conseil médical", C.red],
  ];
  const items = [];
  rows.forEach((r, i) => {
    const y = 392 + i * 136;
    items.push(
      rect(130, y, 275, 86, r[2]),
      tx(r[0], 154, y + 20, 230, 40, { size: 31, bold: true, color: C.black, align: "center" }),
      rect(432, y, 1320, 86, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 470, y + 22, 1240, 42, { size: 28, color: C.white }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Périmètre MVP", "Choisir, c'est protéger le lancement", "Le MVP valide la valeur centrale avant d'ajouter paiement, mobile ou usages sensibles.", 6, { size: 58, titleW: 1220 }),
    ...items,
    tx("Arbitrage client", 130, 930, 320, 34, { size: 24, bold: true, color: C.lime }),
    tx("Le périmètre réduit le risque réglementaire, le budget et le délai.", 442, 930, 1140, 34, { size: 26, color: C.muted }),
  ]);
  note(slide, "Faire le lien avec le chiffrage : les fonctionnalités sont priorisées pour estimer la charge et décider du lancement.");
}

function slide6(p) {
  const slide = p.slides.add();
  const boxes = [
    ["Next.js", "Interface", 120, 450],
    ["Auth.js", "Session", 120, 690],
    ["Hono API", "Métier", 540, 570],
    ["Services", "Contrats", 930, 570],
    ["OpenAI API", "IA", 1320, 450],
    ["PostgreSQL", "Données", 1320, 690],
  ];
  const elems = [];
  boxes.forEach(([a, b, x, y]) => {
    elems.push(
      rect(x, y, 280, 118, "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(a.toUpperCase(), x + 20, y + 24, 240, 34, { size: 27, color: C.white, bold: true, align: "center" }),
      tx(b, x + 20, y + 66, 240, 28, { size: 20, color: C.muted, bold: true, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Architecture", "Séparer pour sécuriser", "Le navigateur n'accède ni aux secrets IA, ni directement à la base.", 7, { size: 64 }),
    ...elems,
    ...arrow(400, 510, 540, "server-only", C.lime),
    ...arrow(820, 630, 930, "repositories", C.lime),
    ...arrow(1210, 565, 1320, "JSON mode", C.lime),
    ...arrow(1210, 715, 1320, "Drizzle", C.lime),
    rect(150, 846, 1620, 110, "#0D1010E8", { line: C.lime, weight: 2 }),
    tx("LÉGENDE", 182, 872, 150, 24, { size: 18, color: C.lime, bold: true }),
    tx("Formalisme : C4 simplifié", 350, 872, 300, 24, { size: 17, color: C.white, bold: true }),
    tx("Rectangle = composant interne", 660, 872, 310, 24, { size: 17, color: C.muted }),
    tx("Nuage = service externe", 980, 872, 300, 24, { size: 17, color: C.muted }),
    tx("Cylindre = stockage données", 1350, 872, 310, 24, { size: 17, color: C.muted }),
    tx("Flèche pleine = flux HTTPS applicatif", 350, 918, 370, 24, { size: 17, color: C.muted }),
    tx("Flèche pointillée = pipeline CI/CD", 740, 918, 360, 24, { size: 17, color: C.muted }),
    tx("Cadenas = secret côté serveur uniquement", 1120, 918, 420, 24, { size: 17, color: C.muted }),
  ]);
  note(slide, "Expliquer le formalisme : diagramme d'architecture applicative type C4 simplifié. Rectangle : composant interne. Nuage : service externe. Cylindre : stockage de données. Flèche pleine : flux HTTPS applicatif. Flèche pointillée : pipeline CI/CD. Cadenas : secret côté serveur uniquement.");
}

function slide7(p) {
  const slide = p.slides.add();
  const steps = [
    ["1", "PROMPT CADRÉ"],
    ["2", "JSON MODE"],
    ["3", "VALIDATION ZOD"],
    ["4", "RETRY"],
    ["5", "ERREUR PROPRE"],
  ];
  const elems = [];
  steps.forEach((s, i) => {
    const x = 110 + i * 350;
    elems.push(
      rect(x, 560, 240, 112, i === 2 ? C.lime : "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(s[0], x + 20, 584, 54, 50, { size: 42, bold: true, color: i === 2 ? C.black : C.lime, align: "center" }),
      tx(s[1], x + 76, 595, 145, 38, { size: 20, bold: true, color: i === 2 ? C.black : C.white, align: "center" }),
    );
    if (i < steps.length - 1) elems.push(...arrow(x + 244, 610, x + 348, "", C.lime));
  });
  slideRoot(slide, [
    ...title(slide, "IA", "Contrôlée, pas magique", "La sortie IA est traitée comme une donnée externe à valider, pas comme une vérité.", 8, { size: 76 }),
    rect(108, 370, 705, 95, C.lime),
    tx("MISTRAL PAR DÉFAUT", 134, 392, 640, 42, { size: 36, color: C.black, bold: true }),
    tx("OpenAI et Anthropic restent possibles via paramètres utilisateur.", 860, 392, 820, 54, { size: 30, color: C.white }),
    ...elems,
    tx("Preuve à citer : ADR-003, mistral.service.ts, packages/shared/src/schémas", 118, 840, 1450, 42, { size: 26, color: C.muted }),
  ]);
  note(slide, "Dire que la vraie compétence est l'encadrément de l'IA : JSON mode, validation Zod, retry et refus propre si la donnée est invalide.");
}

function slide8(p) {
  const slide = p.slides.add();
  const risks = [
    ["Sortie IA invalide", "JSON + Zod + retry", "ÉLEVÉ"],
    ["Accès croisé données", "Auth + userId + repository", "ÉLEVÉ"],
    ["Coût IA variable", "Rate limit + plafond", "MOYEN"],
    ["Conseil sportif sensible", "Limites non médicales", "ÉLEVÉ"],
  ];
  const elems = [];
  risks.forEach((r, i) => {
    const y = 396 + i * 132;
    const color = r[2] === "ÉLEVÉ" ? C.red : C.amber;
    elems.push(
      rect(112, y, 420, 86, "#0D1010E8", { line: color, weight: 3 }),
      tx(r[0], 140, y + 25, 360, 34, { size: 25, bold: true, color: C.white }),
      rect(590, y, 750, 86, "#111717D8", { line: "#334033", weight: 2 }),
      tx(r[1], 620, y + 25, 680, 34, { size: 25, color: C.muted }),
      rect(1404, y, 250, 86, color),
      tx(r[2], 1430, y + 25, 198, 34, { size: 26, bold: true, color: C.black, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Risques", "La confiance est le vrai enjeu", "Un coach IA doit être utile sans être dangereux, personnalisé sans collecter trop, et automatisé sans être opaque.", 9, { size: 63, titleW: 1240 }),
    ...elems,
    tx("Le cadrage ne vend pas une IA magique : il pose les garde-fous du pilote.", 124, 930, 1400, 40, { size: 30, color: C.white, bold: true }),
  ]);
  note(slide, "Présenter les risques comme une preuve de maturité. Le jury doit entendre que l'IA, la sécurité et les coûts sont anticipés.");
}

function slideRiskControls(p) {
  const slide = p.slides.add();
  const risks = [
    ["Sortie IA invalide", "Élevée", "% rejets Zod", "> 5 %", "Ajuster prompt/schéma, analyser logs"],
    ["Coût IA hors budget", "Élevée", "Coût / plafond", "> 70 %", "Réduire modèle, limiter quotas"],
    ["Accès croisé données", "Critique", "Tests 401/403", "1 échec", "Bloquer déploiement, corriger accès"],
    ["Conseil médicalisé", "Élevée", "Signalements", "1 cas sérieux", "Corriger wording, disclaimer, prompt"],
    ["Migration DB oubliée", "Élevée", "Healthcheck/logs", "échec migration", "Rollback, migration manuelle"],
    ["Indispo fournisseur", "Moyenne", "Erreurs API / timeout", "> 15 min", "Message utilisateur, retry, dégradé"],
  ];
  const elems = [];
  risks.forEach((r, i) => {
    const y = 355 + i * 78;
    const color = r[1] === "Critique" || r[1] === "Élevée" ? C.red : C.amber;
    elems.push(
      rect(82, y, 315, 58, "#0D1010E8", { line: color, weight: 2 }),
      tx(r[0], 104, y + 17, 270, 24, { size: 18, bold: true, color: C.white }),
      rect(420, y, 180, 58, color),
      tx(r[1].toUpperCase(), 438, y + 17, 144, 24, { size: 16, bold: true, color: C.black, align: "center" }),
      rect(622, y, 300, 58, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 645, y + 17, 255, 24, { size: 17, color: C.muted, bold: true, align: "center" }),
      rect(944, y, 220, 58, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[3], 965, y + 17, 178, 24, { size: 17, color: C.lime, bold: true, align: "center" }),
      rect(1188, y, 640, 58, "#111717D8", { line: "#334033", weight: 2 }),
      tx(r[4], 1212, y + 12, 590, 30, { size: 17, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "C1.2.3", "Risques, indicateurs et suivi incidents", "Chaque risque a un indicateur, un seuil d'alerte et une action incident.", 0, { size: 56, titleW: 1500 }),
    tx("Risque", 105, 315, 180, 22, { size: 17, color: C.lime, bold: true }),
    tx("Criticité", 438, 315, 144, 22, { size: 17, color: C.lime, bold: true, align: "center" }),
    tx("Indicateur", 645, 315, 255, 22, { size: 17, color: C.lime, bold: true, align: "center" }),
    tx("Seuil", 965, 315, 178, 22, { size: 17, color: C.lime, bold: true, align: "center" }),
    tx("Action incident", 1212, 315, 260, 22, { size: 17, color: C.lime, bold: true }),
    ...elems,
    rect(170, 895, 1580, 66, C.lime),
    tx("Suivi incident : chaque incident est qualifié, priorisé, affecté à un responsable et suivi jusqu'à correction ou arbitrage client.", 205, 911, 1510, 30, { size: 24, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Cette slide transforme la liste de risques en référentiel de suivi. Dire : je ne dis pas seulement que les risques existent ; je définis comment les mesurer, à partir de quel seuil alerter et quelle action lancer.");
}

function slide9(p) {
  const slide = p.slides.add();
  const bars = [
    ["Cadrage", 3],
    ["UX/UI", 4],
    ["Frontend", 10],
    ["Backend", 9],
    ["IA", 5],
    ["Tests", 6],
    ["CI/CD", 3],
    ["Doc", 4],
    ["Risque", 7],
  ];
  const elems = [];
  bars.forEach((b, i) => {
    const x = 118 + i * 185;
    const h = b[1] * 24;
    elems.push(
      rect(x, 780 - h, 92, h, i === 2 || i === 3 ? C.lime : "#3D453B", { line: "#65705F", weight: 1 }),
      tx(String(b[1]) + "j", x, 792, 92, 32, { size: 22, bold: true, color: C.white, align: "center" }),
      tx(b[0].toUpperCase(), x - 24, 834, 140, 36, { size: 15, bold: true, color: C.muted, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Budget", "51 j.h pour lancer un pilote", "Le chiffrage donne au sponsor une décision possible, pas une promesse floue.", 10, { size: 66, titleW: 1150 }),
    ...stat("Charge totale estimée", "51 j.h", 120, 350, 360, C.lime),
    ...stat("Budget projet", "22 950 €", 610, 350, 420, C.white),
    ...stat("Durée cible", "6 semaines", 1130, 350, 470, C.lime),
    tx("Répartition de charge", 120, 590, 440, 36, { size: 28, color: C.white, bold: true }),
    ...elems,
    tx("Hypothèses : TJM 450 €, marge risque 15 %, coût IA pilote 100 à 300 €/mois.", 124, 930, 1340, 40, { size: 26, color: C.muted }),
  ]);
  note(slide, "Dire que ce budget est une estimation professionnelle de cadrage. Insister sur le Go conditionnel et le suivi du coût IA.");
}

function slideBudgetCanonical(p) {
  const slide = p.slides.add();
  const bars = [
    ["Cadrage", 13, C.lime],
    ["Frontend", 12, C.cyan],
    ["Back/DB/IA", 23, C.lime],
    ["Secu/tests", 14, C.amber],
    ["CI/CD", 5, C.grey],
    ["Doc/MCO", 14, C.amber],
  ];
  const elems = [];
  bars.forEach((b, i) => {
    const x = 130 + i * 260;
    const h = b[1] * 11;
    elems.push(
      rect(x, 760 - h, 120, h, b[2], { line: "#65705F", weight: 1 }),
      tx(String(b[1]) + " JH", x - 10, 775, 140, 30, { size: 21, bold: true, color: C.white, align: "center" }),
      tx(b[0].toUpperCase(), x - 30, 812, 180, 34, { size: 15, bold: true, color: C.muted, align: "center" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Charge et budget", "C1.4.1 / C1.4.2 — Macro-chiffrage du MVP pilote : 81 JH", "Fonctions recensées, priorisées et estimées en jours-homme par lot.", 0, { size: 49, titleW: 1720, titleH: 120 }),
    ...stat("Charge", "81 JH", 120, 350, 300, C.lime),
    ...stat("Temps", "567 h", 470, 350, 300, C.white),
    ...stat("Humain", "36 450 EUR HT", 820, 350, 460, C.lime),
    ...stat("Total", "42 818 EUR HT", 1330, 350, 500, C.white),
    tx("Répartition macro de la charge", 130, 565, 600, 36, { size: 28, color: C.white, bold: true }),
    ...elems,
    rect(965, 582, 800, 260, "#0D1010E8", { line: C.lime, weight: 3 }),
    tx("Hypothèses budget", 1000, 612, 360, 34, { size: 28, color: C.lime, bold: true }),
    tx("TJM : 450 EUR HT / JH", 1000, 668, 520, 30, { size: 23, color: C.white }),
    tx("Marge risque 15 % : 5 468 EUR HT", 1000, 710, 580, 30, { size: 23, color: C.white }),
    tx("Mise en service pilote : 900 EUR HT", 1000, 752, 580, 30, { size: 23, color: C.white }),
    tx("Fonctionnement : 0-50 EUR/mois prototype ; 55-180 EUR/mois pilote pro", 1000, 794, 720, 30, { size: 21, color: C.muted }),
    tx("À dire au jury : c'est une valorisation prévisionnelle pour raisonner client, pas une facture réelle.", 170, 918, 1560, 36, { size: 27, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Remplacer le chiffrage 51 JH par le chiffrage canonique du dossier Bloc 1 : 81 JH, 36 450 EUR HT humain, 5 468 EUR HT de marge, 900 EUR HT de mise en service, total 42 818 EUR HT. Préciser que ce n'est pas une facture réelle.");
}

function slideBudgetFinal(p) {
  const slide = p.slides.add();
  const rows = [
    ["Cadrage / conception / architecture", "13 JH", "16 %"],
    ["Frontend", "12 JH", "15 %"],
    ["Backend / DB / IA", "23 JH", "28 %"],
    ["Sécurité / tests / accessibilité", "14 JH", "17 %"],
    ["Déploiement / CI/CD", "5 JH", "6 %"],
    ["Documentation / maintenance initiale", "14 JH", "17 %"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 520 + i * 56;
    elems.push(
      rect(120, y, 660, 44, i === 2 ? C.lime : "#0D1010E8", { line: i === 2 ? C.lime : "#334033", weight: 2 }),
      tx(r[0], 145, y + 12, 430, 20, { size: 18, color: i === 2 ? C.black : C.white, bold: i === 2 }),
      tx(r[1], 598, y + 12, 90, 20, { size: 18, color: i === 2 ? C.black : C.lime, bold: true, align: "center" }),
      tx(r[2], 704, y + 12, 60, 20, { size: 18, color: i === 2 ? C.black : C.muted, bold: true, align: "right" }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Charge et budget", "C1.4.1 / C1.4.2 — Macro-chiffrage du MVP pilote : 81 JH", "Fonctions recensées, priorisées et estimées en jours-homme par lot.", 0, { size: 49, titleW: 1720, titleH: 120 }),
    ...stat("Charge", "81 JH", 120, 350, 300, C.lime),
    ...stat("Temps", "567 h", 470, 350, 300, C.white),
    ...stat("Humain", "36 450 EUR HT", 820, 350, 460, C.lime),
    ...stat("Total", "42 818 EUR HT", 1330, 350, 500, C.white),
    tx("Répartition macro de la charge", 122, 475, 600, 30, { size: 26, color: C.white, bold: true }),
    ...elems,
    rect(900, 520, 850, 340, "#0D1010E8", { line: C.lime, weight: 3 }),
    tx("Méthode d'estimation", 940, 550, 420, 34, { size: 30, color: C.lime, bold: true }),
    tx("MoSCoW + découpage fonctionnel + estimation JH par lot", 940, 600, 720, 30, { size: 22, color: C.white }),
    tx("Hypothèses budget", 940, 660, 360, 30, { size: 26, color: C.lime, bold: true }),
    tx("TJM : 450 EUR HT / JH", 940, 704, 520, 28, { size: 23, color: C.white }),
    tx("Marge risque 15 % : 5 468 EUR HT", 940, 744, 590, 28, { size: 23, color: C.white }),
    tx("Mise en service pilote : 900 EUR HT", 940, 784, 590, 28, { size: 23, color: C.white }),
    tx("Fonctionnement pilote : hébergement + IA + monitoring bornés", 940, 824, 720, 24, { size: 20, color: C.muted }),
    tx("À dire au jury : c'est une valorisation prévisionnelle pour raisonner client, pas une facture réelle.", 170, 918, 1560, 36, { size: 27, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Budget harmonisé avec le dossier Bloc 1 : 81 JH, 567 h, 36 450 EUR HT humain, 5 468 EUR HT de marge, 900 EUR HT de mise en service, total 42 818 EUR HT. Méthode : priorisation MoSCoW, découpage fonctionnel, estimation en JH par lot. Détail : cadrage/audit/exigences 7 JH ; architecture et modèle de données 6 JH ; authentification et sécurité de base 6 JH ; profil et objectif utilisateur 6 JH ; génération IA structurée 10 JH ; validation Zod, retry, logs IA 5 JH ; persistance séances/programmes 8 JH ; liste, détail, historique 5 JH ; timer et suivi de session 7 JH ; dashboard pilote 3 JH ; coût IA, quotas, monitoring 3 JH ; tests, recette, accessibilité, sécurité 8 JH ; CI/CD et déploiement 4 JH ; documentation et livraison 3 JH ; total 81 JH. Phrase : je ne donne pas seulement un budget global, je le relie à des lots fonctionnels priorisés.");
}

function slide10(p) {
  const slide = p.slides.add();
  const items = [
    ["70", "tests passés"],
    ["81.57%", "couverture API"],
    ["7", "ADR"],
    ["33", "scénarios recette"],
  ];
  const elems = [];
  items.forEach((it, i) => {
    const x = 112 + i * 430;
    elems.push(
      rect(x, 410, 330, 210, "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(it[0], x + 30, 438, 270, 86, { size: 70, color: C.lime, bold: true, align: "center" }),
      tx(it[1].toUpperCase(), x + 30, 540, 270, 40, { size: 22, color: C.white, bold: true, align: "center" }),
    );
  });
  const pipeY = 760;
  slideRoot(slide, [
    ...title(slide, "Preuves", "Le cadrage s'appuie sur des preuves projet", "Je montre peu de fichiers pendant l'oral, mais je sais lesquels ouvrir si le jury questionne.", 11, { size: 58, titleW: 1340 }),
    ...elems,
    rect(180, pipeY, 260, 74, C.lime),
    tx("LINT", 210, pipeY + 18, 200, 34, { size: 28, bold: true, color: C.black, align: "center" }),
    ...arrow(448, pipeY + 35, 628, "", C.lime),
    rect(640, pipeY, 260, 74, "#111717", { line: C.lime, weight: 3 }),
    tx("TESTS", 670, pipeY + 18, 200, 34, { size: 28, bold: true, color: C.white, align: "center" }),
    ...arrow(908, pipeY + 35, 1088, "", C.lime),
    rect(1100, pipeY, 260, 74, "#111717", { line: C.lime, weight: 3 }),
    tx("BUILD", 1130, pipeY + 18, 200, 34, { size: 28, bold: true, color: C.white, align: "center" }),
    ...arrow(1368, pipeY + 35, 1548, "", C.lime),
    rect(1560, pipeY, 260, 74, "#111717", { line: C.lime, weight: 3 }),
    tx("DEPLOY", 1590, pipeY + 18, 200, 34, { size: 28, bold: true, color: C.white, align: "center" }),
  ]);
  note(slide, "Les chiffres viennent du README et des docs du projet. Montrer que le cadrage est relié à de vraies preuves : tests, ADR, sécurité, recette, CI/CD.");
}

function slide11(p) {
  const slide = p.slides.add();
  const files = [
    ["README.md", "Pitch, stack, commandes"],
    ["docs/adr/", "Choix techniques"],
    ["mistral.service.ts", "Contrat IA"],
    ["schémas/", "Validation Zod"],
    ["owasp-review.md", "Sécurité"],
    ["ci.yml", "Qualité automatisée"],
  ];
  const elems = [];
  files.forEach((f, i) => {
    const x = 122 + (i % 3) * 560;
    const y = 430 + Math.floor(i / 3) * 186;
    elems.push(
      rect(x, y, 480, 120, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(f[0], x + 28, y + 24, 420, 34, { size: 26, color: C.lime, bold: true }),
      tx(f[1], x + 28, y + 70, 420, 30, { size: 21, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Oral", "Une preuve par question, pas dix fichiers ouverts", "Le PPTX rythme la soutenance ; les preuves servent surtout pendant l'échange jury.", 12, { size: 58, titleW: 1420 }),
    ...elems,
    rect(120, 862, 1420, 76, C.lime),
    tx("RÈGLE : JE PARLE D'ALCIDE COMME D'UN PRODUIT CLIENT, PAS COMME D'UN DEVOIR.", 150, 882, 1360, 36, { size: 30, bold: true, color: C.black, align: "center" }),
  ]);
  note(slide, "Conseil oral : ne pas perdre le jury dans le dépôt. Citer les preuves, ouvrir seulement si demandé ou pour démontrer un point très précis.");
}

function slidePositioning(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Positionnement", "Alcide n'est pas une app de sport générique", "Le produit se positionne comme un coach IA identifiable, encadré et actionnable.", 0, { size: 58, titleW: 1400 }),
    tx("01", 126, 410, 110, 70, { size: 58, color: C.lime, bold: true }),
    tx("Un coach nommé", 250, 420, 560, 52, { size: 42, color: C.white, bold: true }),
    tx("Le nom Alcide cree une relation plus simple qu'un assistant anonyme.", 250, 482, 900, 46, { size: 27, color: C.muted }),
    hr(250, 550, 1120, C.lime, 3),
    tx("02", 126, 600, 110, 70, { size: 58, color: C.lime, bold: true }),
    tx("Une IA encadrée", 250, 610, 560, 52, { size: 42, color: C.white, bold: true }),
    tx("La génération est validée, sauvegardée et transformée en expérience produit.", 250, 672, 950, 46, { size: 27, color: C.muted }),
    hr(250, 740, 1120, C.lime, 3),
    tx("03", 126, 790, 110, 70, { size: 58, color: C.lime, bold: true }),
    tx("Une décision de pilote", 250, 800, 650, 52, { size: 42, color: C.white, bold: true }),
    tx("Le bon objectif n'est pas de tout ouvrir : il faut d'abord vérifier la valeur en usage réel limité.", 250, 862, 1120, 46, { size: 27, color: C.muted }),
  ]);
  note(slide, "Cette slide sert à poser le vocabulaire. Dire : Alcide n'est pas seulement un générateur de séances, c'est un coach IA nommé, donc un produit avec une relation utilisateur.");
}

function slideProblemPositioning(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Problème + positionnement", "S'entraîner sans plan, c'est perdre le fil", "Alcide n'est pas une app de sport générique : c'est un coach IA nommé, encadré et actionnable.", 0, { size: 58, titleW: 1500 }),
    tx("AVANT", 110, 420, 240, 38, { size: 28, color: C.grey, bold: true }),
    ...miniCard("Objectif flou", "L'utilisateur veut progresser, mais ne sait pas quoi faire aujourd'hui.", 110, 485, 410, 170, { accent: C.grey, line: "#303630", bodySize: 23 }),
    ...miniCard("Plans génériques", "Peu adaptés au temps, au niveau et aux contraintes.", 110, 700, 410, 170, { accent: C.grey, line: "#303630", bodySize: 23 }),
    ...arrow(565, 650, 1065, "", C.lime),
    tx("ALCIDE", 705, 520, 230, 64, { size: 52, color: C.lime, bold: true, align: "center" }),
    tx("coach IA identifiable", 640, 595, 360, 40, { size: 28, color: C.white, bold: true, align: "center" }),
    tx("parcours court + validation + sauvegarde + timer", 605, 660, 430, 62, { size: 24, color: C.muted, align: "center" }),
    tx("APRÈS", 1180, 420, 260, 38, { size: 28, color: C.lime, bold: true }),
    ...miniCard("Séance claire", "Échauffement, blocs, récupération et consignes simples.", 1180, 485, 520, 170, { accent: C.lime, bodySize: 23 }),
    ...miniCard("Décision pilote", "On vérifie l'usage réel avant d'ouvrir plus largement.", 1180, 700, 520, 170, { accent: C.cyan, bodySize: 23 }),
    tx("Message clé : le produit ne vend pas une IA magique ; il transforme une intention sportive en action contrôlée.", 220, 928, 1480, 36, { size: 28, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Fusion problème et positionnement. Dire : l'utilisateur a une intention mais pas un plan. Alcide apporte un coach IA nommé, un parcours court et une décision de pilote plutôt qu'une promesse de marché.");
}

function slidePersona(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Utilisateur cible", "Je cadre d'abord un usage concret", "Un bon MVP part d'un utilisateur prioritaire, pas d'une liste infinie de fonctionnalités.", 0, { size: 60, titleW: 1320 }),
    rect(120, 390, 500, 410, "#0D1010E8", { line: C.lime, weight: 3 }),
    tx("PERSONA", 154, 426, 260, 38, { size: 26, color: C.lime, bold: true }),
    tx("Nina, 29 ans", 154, 492, 380, 56, { size: 44, color: C.white, bold: true }),
    tx("Reprise sportive, peu de temps, besoin de clarté et de régularité.", 154, 572, 390, 118, { size: 28, color: C.muted }),
    tx("Objectif : tenir 3 séances par semaine sans se blesser.", 154, 720, 390, 58, { size: 24, color: C.white, bold: true }),
    ...miniCard("Besoin", "Savoir quoi faire aujourd'hui.", 740, 390, 430, 145, { accent: C.lime }),
    ...miniCard("Frein", "Les plans génériques ne collent pas à son temps disponible.", 740, 580, 430, 145, { accent: C.amber }),
    ...miniCard("Valeur", "Alcide transforme l'objectif en séance exécutable.", 740, 770, 430, 145, { accent: C.cyan }),
    rect(1260, 444, 360, 360, C.lime),
    tx("1", 1300, 474, 280, 150, { size: 140, color: C.black, bold: true, align: "center" }),
    tx("usage prioritaire", 1300, 646, 280, 44, { size: 28, color: C.black, bold: true, align: "center" }),
    tx("Je limite le MVP pour mieux prouver la valeur.", 1292, 718, 300, 54, { size: 24, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Prendre 30 secondes sur Nina. L'intérèt est de montrer que le cadrage part d'un usage réel : reprise, manque de temps, besoin de régularité.");
}

function slideStakeholderDemand(p) {
  const slide = p.slides.add();
  const rows = [
    ["Commanditaire", "Tester un coach IA utile sans risque excessif", "Valider la valeur avant investissement", "Pilote limité, coût plafonné, critères de succès"],
    ["Utilisateur sportif", "Savoir quoi faire aujourd'hui simplement", "Régularité, clarté, motivation", "Séance générée, sauvegardée, timer"],
    ["Coach / expert", "Garder un cadre sérieux et non médical", "Éviter conseils dangereux ou génériques", "Limites explicites, feedback pilote"],
    ["Équipe projet", "Construire vite sans dette excessive", "Maintenabilité, sécurité, testabilité", "Next.js, Hono, PostgreSQL, Zod, CI/CD"],
    ["Fournisseurs", "API IA, hébergement, base, OAuth", "Coût, disponibilité, dépendance", "Quotas, logs, monitoring, multi-provider"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 388 + i * 92;
    elems.push(
      rect(100, y, 330, 68, i === 0 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0].toUpperCase(), 122, y + 20, 286, 26, { size: 19, color: i === 0 ? C.black : C.white, bold: true, align: "center" }),
      rect(455, y, 455, 68, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 480, y + 12, 405, 36, { size: 18, color: C.white }),
      rect(935, y, 365, 68, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[2], 958, y + 12, 320, 36, { size: 18, color: C.muted }),
      rect(1325, y, 500, 68, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[3], 1350, y + 12, 450, 36, { size: 18, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Analyse de la demande", "Par partie prenante", "Je relie chaque attente à une réponse de cadrage : périmètre, architecture, budget, risques et décision.", 0, { size: 62, titleW: 1280 }),
    tx("Partie prenante", 120, 342, 260, 24, { size: 18, color: C.lime, bold: true }),
    tx("Besoin / attente", 480, 342, 260, 24, { size: 18, color: C.lime, bold: true }),
    tx("Enjeu", 958, 342, 180, 24, { size: 18, color: C.lime, bold: true }),
    tx("Réponse Alcide", 1350, 342, 260, 24, { size: 18, color: C.lime, bold: true }),
    ...elems,
    rect(185, 900, 1550, 62, C.lime),
    tx("À l'oral : je ne pars pas seulement d'une idée produit ; je transforme chaque demande en arbitrage de cadrage.", 220, 915, 1480, 30, { size: 25, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Dire : je ne pars pas seulement d'une idée produit. Je relie chaque attente à une réponse de cadrage : périmètre, architecture, budget, risques et décision de pilote.");
}

function slideUserJourney(p) {
  const slide = p.slides.add();
  const steps = [
    ["01", "Profil", "sport, niveau, contraintes"],
    ["02", "Objectif", "durée, intensité, fréquence"],
    ["03", "Génération", "séance IA structurée"],
    ["04", "Exécution", "timer et consignes"],
    ["05", "Suivi", "historique et progression"],
  ];
  const elems = [];
  steps.forEach((s, i) => {
    const x = 108 + i * 348;
    elems.push(
      rect(x, 505, 285, 245, "#0D1010E8", { line: i === 2 ? C.lime : "#334033", weight: i === 2 ? 4 : 2 }),
      tx(s[0], x + 24, 532, 96, 56, { size: 46, color: C.lime, bold: true }),
      tx(s[1].toUpperCase(), x + 24, 612, 230, 42, { size: 28, color: C.white, bold: true }),
      tx(s[2], x + 24, 674, 230, 52, { size: 22, color: C.muted }),
      i < steps.length - 1 ? tx(">", x + 300, 610, 40, 60, { size: 44, color: C.lime, bold: true }) : undefined,
    );
  });
  slideRoot(slide, [
    ...title(slide, "Parcours utilisateur", "Une expérience courte, guidante, réutilisable", "La promesse tient parce que chaque étape a un role produit clair.", 0, { size: 58, titleW: 1380 }),
    ...elems.filter(Boolean),
    tx("Ce parcours Évite l'effet demo gadget : l'utilisateur ressort avec une séance utilisable.", 180, 840, 1500, 54, { size: 36, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Utiliser cette slide pour ralentir : lire les cinq étapes, puis dire que la valeur vient de l'enchaînement complet, pas seulement de la génération IA.");
}

function slideProductFlow(p) {
  const slide = p.slides.add();
  const steps = [
    ["01", "Profil", "sport, niveau, contraintes"],
    ["02", "Objectif", "durée, intensité, fréquence"],
    ["03", "IA contrôlée", "JSON, Zod, retry"],
    ["04", "Exécution", "timer et consignes"],
    ["05", "Suivi", "historique et progression"],
  ];
  const elems = [];
  steps.forEach((s, i) => {
    const x = 110 + i * 346;
    elems.push(
      rect(x, 500, 280, 238, i === 2 ? C.lime : "#0D1010E8", { line: i === 2 ? C.lime : "#334033", weight: i === 2 ? 4 : 2 }),
      tx(s[0], x + 24, 530, 86, 52, { size: 44, color: i === 2 ? C.black : C.lime, bold: true }),
      tx(s[1].toUpperCase(), x + 24, 606, 226, 36, { size: 24, color: i === 2 ? C.black : C.white, bold: true }),
      tx(s[2], x + 24, 666, 220, 44, { size: 21, color: i === 2 ? C.black : C.muted }),
      i < steps.length - 1 ? tx(">", x + 294, 594, 40, 58, { size: 44, color: C.lime, bold: true }) : undefined,
    );
  });
  slideRoot(slide, [
    ...title(slide, "Promesse produit", "Profil, IA contrôlée, séance exécutable", "Ce n'est pas un prompt : c'est un produit avec un contrat de données et un parcours réutilisable.", 0, { size: 58, titleW: 1500 }),
    ...elems.filter(Boolean),
    rect(210, 835, 1500, 72, C.lime),
    tx("La valeur vient de l'enchaînement complet : demande claire, génération bornée, sauvegarde, exécution, suivi.", 245, 853, 1430, 32, { size: 27, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Fusion promesse + parcours. Lire les cinq étapes puis dire que l'objectif est d'Éviter l'effet demo gadget : l'utilisateur ressort avec une séance utilisable.");
}

function slideDecisionRoles(p) {
  const slide = p.slides.add();
  const rows = [
    ["Sponsor", "Valide le budget et le go pilote"],
    ["Product owner", "Priorise le MVP et arbitre le périmètre"],
    ["Lead technique", "Garantit faisabilité, qualité et livraison"],
    ["QA / Sécurité", "Vérifie recette, risques et données"],
  ];
  const elems = [];
  rows.forEach((r, i) => {
    const y = 398 + i * 120;
    elems.push(
      rect(146, y, 360, 76, i === 2 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(r[0].toUpperCase(), 178, y + 20, 300, 32, { size: 25, color: i === 2 ? C.black : C.white, bold: true, align: "center" }),
      rect(548, y, 1030, 76, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(r[1], 590, y + 22, 920, 32, { size: 27, color: C.white }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Gouvernance", "Chaque décision a un propriétaire", "Je présente l'équipe fictive comme une organisation projet, pas comme une liste de noms.", 0, { size: 58, titleW: 1320 }),
    ...elems,
    tx("Message jury : je sais qui décide, qui produit, qui contrôle.", 180, 888, 1280, 52, { size: 34, color: C.lime, bold: true }),
  ]);
  note(slide, "Cette slide t'aide à parler plus longtemps sur la gouvernance. Dire clairement qui valide, qui priorise, qui livre et qui contrôle.");
}

function slideRoadmap(p) {
  const slide = p.slides.add();
  const weeks = [
    ["S1", "Cadrage", "besoin, MVP, risques"],
    ["S2", "UX + data", "parcours, schémas, contrat"],
    ["S3", "Core produit", "auth, génération, stockage"],
    ["S4", "Exécution", "timer, historique, programmes"],
    ["S5", "Qualité", "tests, recette, sécurité"],
    ["S6", "Pilote", "déploiement, mesure, retours"],
  ];
  const elems = [];
  weeks.forEach((w, i) => {
    const x = 110 + i * 292;
    elems.push(
      rect(x, 485, 232, 238, i === 5 ? C.lime : "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(w[0], x + 24, 512, 180, 54, { size: 44, color: i === 5 ? C.black : C.lime, bold: true, align: "center" }),
      tx(w[1].toUpperCase(), x + 20, 595, 190, 34, { size: 24, color: i === 5 ? C.black : C.white, bold: true, align: "center" }),
      tx(w[2], x + 22, 654, 188, 44, { size: 19, color: i === 5 ? C.black : C.muted, align: "center" }),
      i < weeks.length - 1 ? hr(x + 236, 604, 54, C.lime, 3) : undefined,
    );
  });
  slideRoot(slide, [
    ...title(slide, "Planning", "Six semaines pour arriver au pilote", "La feuille de route transforme le cadrage en exécution mesurable.", 0, { size: 62, titleW: 1320 }),
    ...elems.filter(Boolean),
    tx("Le pilote n'est pas la fin du projet : c'est le point de contrôle avant élargissement.", 180, 850, 1460, 52, { size: 34, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Prendre le temps de parcourir les six semaines. Cette slide te donne une respiration et montre que le projet est pilote dans le temps.");
}

function slideDataSecurity(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Données", "Collecter peu, protéger mieux", "La personnalisation ne doit pas devenir une collecte inutile.", 0, { size: 64, titleW: 1260 }),
    ...miniCard("Collecte utile", "Sport, niveau, objectif, durée, contraintes d'entraînement.", 132, 430, 470, 245, { accent: C.lime, titleSize: 30, bodySize: 26 }),
    ...miniCard("Limite volontaire", "Pas de diagnostic, pathologie, blessure médicalisée ni recommandation de santé.", 724, 430, 470, 245, { accent: C.red, titleSize: 30, bodySize: 24 }),
    ...miniCard("Contrôle technique", "Auth, userId, repository, validation schéma et séparation front/API.", 1316, 430, 470, 245, { accent: C.cyan, titleSize: 30, bodySize: 26 }),
    rect(238, 790, 1320, 74, C.lime),
    tx("RÈGLE PRODUIT : PERSONNALISER SANS MÉDICALISER", 260, 808, 1280, 34, { size: 30, color: C.black, bold: true, align: "center" }),
    tx("Le MVP collecte uniquement les données d'entraînement nécessaires : sport, niveau, objectif, durée et contraintes non médicales.", 205, 890, 1510, 36, { size: 24, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Dire clairement : le MVP collecte uniquement des données d'entraînement nécessaires : sport, niveau, objectif, durée, contraintes non médicales. Il exclut les diagnostics, pathologies, blessures médicalisées et recommandations de santé. Règle produit : personnalisér sans médicalisér.");
}

function slideIaFallback(p) {
  const slide = p.slides.add();
  slideRoot(slide, [
    ...title(slide, "Stratégie IA", "OpenAI par défaut, pas de dépendance aveugle", "Le choix IA est technique, économique et réversible.", 0, { size: 60, titleW: 1380 }),
    rect(122, 430, 540, 310, C.lime),
    tx("MISTRAL", 170, 488, 440, 70, { size: 58, color: C.black, bold: true, align: "center" }),
    tx("par défaut", 170, 574, 440, 42, { size: 30, color: C.black, bold: true, align: "center" }),
    tx("Bon compromis pour un pilote : coût, performance, souveraineté.", 178, 650, 430, 50, { size: 23, color: C.black, bold: true, align: "center" }),
    ...arrow(674, 585, 890, "Parametres utilisateur", C.lime),
    ...miniCard("Alternatives", "OpenAI et Anthropic restent possibles si le besoin ou la qualité l'exige.", 918, 430, 430, 150, { accent: C.cyan }),
    ...miniCard("Garde-fous", "JSON mode, Zod, retry, erreurs propres et logs exploitables.", 918, 620, 430, 150, { accent: C.lime }),
    ...miniCard("Mesure", "Suivi du coût IA et des échecs de génération pendant le pilote.", 1388, 525, 370, 150, { accent: C.amber }),
    tx("Je ne vends pas une IA magique : je vends une chaîne contrôlée.", 210, 872, 1460, 52, { size: 36, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Cette slide Évite de passer trop vite sur l'IA. Dire : OpenAI est le choix par défaut, mais l'architecture garde une logique réversible.");
}

function slideQualityPilot(p) {
  const slide = p.slides.add();
  const steps = [
    ["Lint", "cohérence code"],
    ["Tests", "régression"],
    ["Build", "validité produit"],
    ["Deploy", "mise en ligne"],
    ["Monitor", "suivi pilote"],
  ];
  const elems = [];
  steps.forEach((s, i) => {
    const x = 126 + i * 340;
    elems.push(
      rect(x, 512, 250, 92, i === 0 ? C.lime : "#0D1010E8", { line: C.lime, weight: 3 }),
      tx(s[0].toUpperCase(), x + 20, 538, 210, 34, { size: 28, color: i === 0 ? C.black : C.white, bold: true, align: "center" }),
      tx(s[1], x + 20, 638, 210, 30, { size: 20, color: C.muted, align: "center" }),
      i < steps.length - 1 ? tx(">", x + 270, 528, 44, 60, { size: 46, color: C.lime, bold: true }) : undefined,
    );
  });
  slideRoot(slide, [
    ...title(slide, "Qualité", "La CI/CD Évite la demo fragile", "Le projet doit pouvoir etre relancé, testé et déploiemente sans dépendance au hasard.", 0, { size: 62, titleW: 1380 }),
    ...elems.filter(Boolean),
    tx("Ce que je veux montrer au jury : le cadrage produit est relié à une chaîne de livraison réelle.", 200, 808, 1500, 58, { size: 34, color: C.white, bold: true, align: "center" }),
  ]);
  note(slide, "Utiliser cette slide pour ralentir sur la CI/CD. Ne pas ouvrir tous les fichiers, mais expliquer la logique de qualité automatisee.");
}

function slidePilotSuccess(p) {
  const slide = p.slides.add();
  const items = [
    ["Usage", "Les utilisateurs reviennent-ils ?"],
    ["Qualité", "Les séances sont-elles exploitables ?"],
    ["Coût", "Le coût IA reste-t-il sous contrôle ?"],
    ["Risque", "Les limites non médicales sont-elles claires ?"],
  ];
  const elems = [];
  items.forEach((it, i) => {
    const x = 122 + (i % 2) * 810;
    const y = 420 + Math.floor(i / 2) * 225;
    elems.push(
      rect(x, y, 690, 160, "#0D1010E8", { line: i === 0 ? C.lime : "#334033", weight: i === 0 ? 4 : 2 }),
      tx(String(i + 1).padStart(2, "0"), x + 32, y + 34, 90, 60, { size: 48, color: C.lime, bold: true }),
      tx(it[0].toUpperCase(), x + 145, y + 34, 250, 42, { size: 32, color: C.white, bold: true }),
      tx(it[1], x + 145, y + 88, 480, 36, { size: 24, color: C.muted }),
    );
  });
  slideRoot(slide, [
    ...title(slide, "Succès pilote", "Ce que le pilote doit prouver", "La recommandation finale dépend de critères mesurables, pas d'une impression.", 0, { size: 62, titleW: 1340 }),
    ...elems,
    rect(220, 875, 1220, 66, C.lime),
    tx("SI CES SIGNAUX SONT BONS, ON ÉLARGIT. SINON, ON CORRIGE AVANT DE SCALER.", 250, 892, 1160, 30, { size: 25, color: C.black, bold: true, align: "center" }),
  ]);
  note(slide, "Cette slide prépare la conclusion. Dire que le pilote n'est pas une validation définitive, mais une méthode pour obtenir des preuves d'usage.");
}

function slideConclusionCanonical(p) {
  const slide = p.slides.add();
  const pageNumber = ++autoSlideNumber;
  const objections = [
    ["ChatGPT direct ?", "Alcide ajoute auth, profil, validation, sauvegarde, timer, coût contrôlé."],
    ["Mauvaise séance ?", "JSON strict, Zod, retry, logs, limites non médicales, pilote contrôlé."],
    ["Coût IA ?", "Quotas, estimation avant génération, suivi tokens, plafond mensuel."],
    ["Données ?", "Minimisation, userId, ownership, secrets serveur, tests 401/403."],
    ["Lancer marché ?", "Non : pilote pour valider usage, qualité, coût et risque avant scaling."],
  ];
  const objectionElems = [];
  objections.forEach((o, i) => {
    const y = 390 + i * 88;
    objectionElems.push(
      rect(905, y, 330, 64, i === 0 ? C.lime : "#0D1010E8", { line: C.lime, weight: 2 }),
      tx(o[0], 930, y + 18, 280, 24, { size: 18, color: i === 0 ? C.black : C.lime, bold: true, align: "center" }),
      rect(1260, y, 560, 64, "#0D1010E8", { line: "#334033", weight: 2 }),
      tx(o[1], 1285, y + 10, 510, 34, { size: 16, color: C.muted }),
    );
  });
  slideRoot(slide, [
    image({ dataUrl: hero, width: W, height: H, fit: "cover", position: { left: 0, top: 0 }, alt: "Alcide AI coach running in urban gym" }),
    rect(0, 0, W, H, "#000000B8"),
    tx("CONCLUSION", 92, 38, 420, 38, { size: 28, color: C.lime, bold: true }),
    tx("PRÉCONISATION CLIENT / C1.6", 92, 82, 820, 42, { size: 26, color: C.lime, bold: true }),
    tx("GO", 92, 165, 350, 150, { size: 145, color: C.lime, bold: true }),
    tx("PILOTE", 440, 183, 520, 110, { size: 96, color: C.white, bold: true }),
    tx("LIMITÉ", 95, 330, 360, 66, { size: 56, color: C.white, bold: true }),
    tx("PAS GO MARCHÉ", 475, 344, 520, 46, { size: 34, color: C.lime, bold: true }),
    tx("Valider un MVP Alcide pour prouver la valeur en usage réel contrôlé, puis décider ensuite d'un élargissement.", 100, 455, 740, 110, { size: 30, color: C.muted }),
    ...miniCard("Conditions go", "Périmètre valide, plafond IA, limites non médicales, retours qualifiés.", 100, 635, 710, 132, { accent: C.lime, bodySize: 22 }),
    tx("OBJECTIONS CLIENT TRAITÉES", 905, 328, 560, 34, { size: 28, color: C.lime, bold: true }),
    ...objectionElems,
    rect(100, 842, 1660, 72, C.lime),
    tx("Ma recommandation n'est pas un go marché : c'est un go pilote borné, car les bénéfices, les risques et les contrôles sont définis.", 130, 860, 1600, 32, { size: 24, color: C.black, bold: true, align: "center" }),
    tx("Alcide ne remplace pas un coach humain : il propose un premier niveau d'accompagnement personnalisé, disponible immédiatement.", 100, 938, 1460, 30, { size: 23, color: C.muted, bold: true }),
    tx(String(pageNumber).padStart(2, "0"), 1770, 1010, 78, 38, { size: 22, color: C.lime, bold: true, align: "right" }),
  ]);
  note(slide, "Conclusion : recommander un Go pilote limité, pas une ouverture commerciale. Traiter les objections : pourquoi pas ChatGPT direct, que se passe-t-il si l'IA se trompe, comment éviter l'explosion du coût, comment protéger les données, pourquoi ne pas lancer commercialement. Phrase finale : ma recommandation n'est pas un go marché, c'est un go pilote borné, car les bénéfices sont identifiés, les risques connus et les conditions de contrôle définies.");
}

function slide12(p) {
  const slide = p.slides.add();
  const pageNumber = ++autoSlideNumber;
  slideRoot(slide, [
    image({ dataUrl: hero, width: W, height: H, fit: "cover", position: { left: 0, top: 0 }, alt: "Alcide AI coach running in urban gym" }),
    rect(0, 0, W, H, "#000000B8"),
    tx("CONCLUSION", 92, 38, 420, 38, { size: 28, color: C.lime, bold: true }),
    tx("PRÉCONISATION CLIENT", 92, 82, 780, 42, { size: 26, color: C.lime, bold: true }),
    tx("GO", 92, 165, 350, 150, { size: 145, color: C.lime, bold: true }),
    tx("PILOTE", 440, 183, 520, 110, { size: 96, color: C.white, bold: true }),
    tx("SOUS CONDITIONS", 96, 330, 760, 66, { size: 56, color: C.white, bold: true }),
    tx("Lancer un MVP limité, mesurer l'usage, surveiller le coût IA et qualifier les retours avant d'élargir le périmètre.", 100, 455, 820, 130, { size: 34, color: C.muted }),
    ...miniCard("Condition 01", "Plafond IA et suivi des appels.", 100, 665, 390, 116, { accent: C.lime }),
    ...miniCard("Condition 02", "Monitoring externe et alerting.", 530, 665, 390, 116, { accent: C.lime }),
    ...miniCard("Condition 03", "Limites non médicales explicites.", 960, 665, 390, 116, { accent: C.lime }),
    ...miniCard("Condition 04", "Retours utilisateurs avant scaling.", 1390, 665, 390, 116, { accent: C.lime }),
    tx("Alcide ne remplace pas un coach humain : il propose un premier niveau d'accompagnement personnalisé, disponible immédiatement.", 100, 880, 1400, 64, { size: 30, color: C.white, bold: true }),
    tx(String(pageNumber).padStart(2, "0"), 1770, 1010, 78, 38, { size: 22, color: C.lime, bold: true, align: "right" }),
  ]);
  note(slide, "Conclusion : recommander le Go pilote, pas une production commerciale immédiate. Le projet est faisable, cohérent et défendable, à condition de suivre coûts, qualité IA et risques.");
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } });
[
  slide1,
  slidePlan,
  slideEliminatories,
  slideProblemPositioning,
  slidePersona,
  slideStakeholderDemand,
  slideAuditExisting,
  slideProductFlow,
  slideStakeholderMap,
  slide5,
  slideOpportunitiesThreats,
  slideTechnicalResources,
  slideRoadmap,
  slideBudgetFinal,
  slideWatchMethod,
  slideComparedOptions,
  slide6,
  slideAiEndToEnd,
  slideDataSecurity,
  slideGenerationCost,
  slideRiskControls,
  slide10,
  slidePilotSuccess,
  slideConclusionCanonical,
].forEach((fn) => fn(presentation));

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(PPTX_OUT);

for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await presentation.export({ slide, format: "png" });
  const bytes = Buffer.from(await png.arrayBuffer());
  await fs.writeFile(path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`), bytes);
}

console.log(JSON.stringify({ pptx: PPTX_OUT, preview: PREVIEW_DIR, slides: presentation.slides.count }, null, 2));
