// Apresentação Hub Plataforma — StinPharma
// Executar: node scripts/stinpharma-presentation.js

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "Hub Plataforma — StinPharma";
pres.author = "Hub Plataforma";

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  navy:     "0F2D4A",   // fundo escuro principal
  teal:     "0D7B6E",   // primário
  tealMid:  "14A896",   // destaque
  tealLt:   "5EEAD4",   // suave
  white:    "FFFFFF",
  offWhite: "F0FDFA",
  slate:    "475569",
  lightBg:  "F8FAFC",
  muted:    "64748B",
  dark:     "1E293B",
  green:    "16A34A",
  amber:    "D97706",
  red:      "DC2626",
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 8, offset: 3, angle: 45, opacity: 0.10
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function darkSlide(slide) {
  slide.background = { color: C.navy };
}
function lightSlide(slide) {
  slide.background = { color: C.lightBg };
}

function sectionTitle(slide, txt, y = 0.3) {
  slide.addText(txt, {
    x: 0.5, y, w: 9, h: 0.5,
    fontFace: "Cambria", fontSize: 22, bold: true,
    color: C.dark, align: "left", margin: 0
  });
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.white },
    line: { color: opts.border || "E2E8F0", width: 1.2 },
    rectRadius: 0.12,
    shadow: makeShadow()
  });
}

function circleIcon(slide, x, y, size, color, label, labelColor) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: size, h: size,
    fill: { color },
    line: { color, width: 0 }
  });
  if (label) {
    slide.addText(label, {
      x: x - 0.05, y: y + size * 0.18,
      w: size + 0.1, h: size * 0.65,
      fontFace: "Arial", fontSize: size * 14,
      color: labelColor || C.white,
      align: "center", valign: "middle", margin: 0, bold: true
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — CAPA
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);

  // faixa teal esquerda (bloco, não stripe)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 3.8, h: 5.625,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 }
  });

  // Logotipo / nome produto
  s.addText("HUB", {
    x: 0.25, y: 1.0, w: 3.3, h: 0.8,
    fontFace: "Cambria", fontSize: 54, bold: true,
    color: C.white, align: "center", margin: 0
  });
  s.addText("PLATAFORMA", {
    x: 0.25, y: 1.75, w: 3.3, h: 0.55,
    fontFace: "Calibri", fontSize: 20, bold: false,
    color: C.tealLt, align: "center", charSpacing: 6, margin: 0
  });

  // divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.55, w: 2.2, h: 0.04,
    fill: { color: C.white }, line: { color: C.white, width: 0 }
  });

  s.addText("Gestão Comercial\npara a Indústria", {
    x: 0.25, y: 2.75, w: 3.3, h: 1.1,
    fontFace: "Calibri", fontSize: 15,
    color: "C7F5EE", align: "center", margin: 0
  });

  // Título direito
  s.addText("Transformando a Operação\nComercial da StinPharma", {
    x: 4.1, y: 1.3, w: 5.6, h: 1.5,
    fontFace: "Cambria", fontSize: 30, bold: true,
    color: C.white, align: "left", margin: 0
  });

  s.addText("Uma visão completa de como o Hub Plataforma\ncentraliza, protege e escala a operação comercial\nda sua indústria.", {
    x: 4.1, y: 3.0, w: 5.5, h: 1.2,
    fontFace: "Calibri", fontSize: 14,
    color: "9ECFCA", align: "left", margin: 0
  });

  s.addText("2026", {
    x: 4.1, y: 4.9, w: 1.5, h: 0.4,
    fontFace: "Calibri", fontSize: 12,
    color: C.muted, align: "left", margin: 0
  });

  s.addNotes("Slide de abertura. Apresente o nome da plataforma e o objetivo: transformar a operação comercial da StinPharma.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — VISÃO
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightSlide(s);

  sectionTitle(s, "Visão da Plataforma", 0.3);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.78, w: 4.2, h: 0.04,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 }
  });

  // Coluna esquerda — o que é
  card(s, 0.4, 1.0, 4.4, 3.9, { fill: C.white });

  s.addText("O que é?", {
    x: 0.7, y: 1.2, w: 3.8, h: 0.5,
    fontFace: "Cambria", fontSize: 18, bold: true,
    color: C.navy, align: "left", margin: 0
  });

  s.addText([
    { text: "O Hub Plataforma", options: { bold: true } },
    { text: " é a plataforma de gestão comercial da StinPharma — uma Aplicação Web que organiza toda a operação, do primeiro contato com o cliente até o pedido confirmado.", options: {} }
  ], {
    x: 0.7, y: 1.8, w: 3.8, h: 1.4,
    fontFace: "Calibri", fontSize: 13.5,
    color: C.dark, align: "left", margin: 0
  });

  s.addText("Indústria → Hub → Carteira → Cliente → Atendimento → Orçamento → Pedido", {
    x: 0.65, y: 3.3, w: 4.0, h: 0.65,
    fontFace: "Calibri", fontSize: 11, italic: true,
    color: C.teal, align: "center", margin: 0
  });

  // detalhe da faixa no card
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.65, y: 4.1, w: 3.9, h: 0.55,
    fill: { color: C.offWhite },
    line: { color: "D1FAF5", width: 1 }, rectRadius: 0.08
  });
  s.addText("Plataforma própria · Dados da Indústria · Multiusuário", {
    x: 0.7, y: 4.15, w: 3.8, h: 0.45,
    fontFace: "Calibri", fontSize: 11,
    color: C.teal, align: "center", margin: 0
  });

  // Coluna direita — pilares
  const pillars = [
    { icon: "🏭", title: "Indústria no Centro", desc: "A StinPharma é a dona dos dados. Hubs e Assistentes operam sob sua autorização." },
    { icon: "📋", title: "Catálogo Estruturado", desc: "Portfólio → Categoria → Subcategoria → Produto. Organizado e controlado." },
    { icon: "🔄", title: "Ciclo Comercial Completo", desc: "Da Solicitação de Novo Cliente até o Pedido finalizado, tudo rastreado." },
    { icon: "👥", title: "Perfis e Acessos", desc: "Admin, Gestor, Proprietário do Hub e Assistente — cada um vê e faz o que é seu." },
  ];

  pillars.forEach((p, i) => {
    const y = 1.0 + i * 1.0;
    card(s, 5.1, y, 4.5, 0.87, { fill: C.white });
    s.addText(p.icon + " " + p.title, {
      x: 5.35, y: y + 0.08, w: 4.0, h: 0.35,
      fontFace: "Calibri", fontSize: 13, bold: true,
      color: C.navy, align: "left", margin: 0
    });
    s.addText(p.desc, {
      x: 5.35, y: y + 0.42, w: 4.0, h: 0.38,
      fontFace: "Calibri", fontSize: 11,
      color: C.slate, align: "left", margin: 0
    });
  });

  s.addNotes("Explique que o Hub Plataforma não é um sistema genérico — foi pensado especificamente para a operação comercial da indústria farmacêutica/StinPharma.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — MAPA MENTAL
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightSlide(s);

  sectionTitle(s, "Mapa Mental — Ecossistema Hub Plataforma", 0.2);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.68, w: 5.0, h: 0.04,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 }
  });

  // Nó central
  const cx = 5.0, cy = 2.85, cr = 0.65;
  s.addShape(pres.shapes.OVAL, {
    x: cx - cr, y: cy - cr * 0.7, w: cr * 2, h: cr * 1.4,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 }
  });
  s.addText("HUB\nPLATAFORMA", {
    x: cx - cr, y: cy - cr * 0.5, w: cr * 2, h: cr,
    fontFace: "Cambria", fontSize: 11, bold: true,
    color: C.white, align: "center", valign: "middle", margin: 0
  });

  // Nós satélites: [label, x, y, color, lineX1, lineY1, lineX2, lineY2]
  const nodes = [
    { label: "Indústria\n(Tenant Raiz)",    nx: 0.5,  ny: 0.9,  nc: C.teal },
    { label: "Hubs\n(Unidade de Negócio)",   nx: 2.4,  ny: 0.75, nc: C.teal },
    { label: "Carteiras\n(Grupos de Clientes)", nx: 7.0,  ny: 0.75, nc: C.tealMid },
    { label: "Clientes\n(Contatos)",         nx: 8.5,  ny: 2.2,  nc: C.tealMid },
    { label: "Portfólio\nProdutos",          nx: 8.2,  ny: 3.9,  nc: "0F766E" },
    { label: "Orçamentos\n& Pedidos",        nx: 6.8,  ny: 4.8,  nc: "0F766E" },
    { label: "Pipeline\nComercial",          nx: 3.1,  ny: 4.85, nc: "0E7490" },
    { label: "Perfis\n& Acessos",            nx: 0.6,  ny: 4.0,  nc: "1D4ED8" },
    { label: "RBAC\n& Segurança",            nx: 0.4,  ny: 2.5,  nc: "1D4ED8" },
  ];

  nodes.forEach(n => {
    const nw = 1.55, nh = 0.72;
    // Linha de conexão ao centro
    const lx1 = n.nx + nw / 2;
    const ly1 = n.ny + nh / 2;
    s.addShape(pres.shapes.LINE, {
      x: Math.min(lx1, cx), y: Math.min(ly1, cy + 0.35),
      w: Math.abs(lx1 - cx), h: Math.abs(ly1 - (cy + 0.35)),
      line: { color: "CBD5E1", width: 1.2, dashType: "sysDash" }
    });
    // Card nó
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: n.nx, y: n.ny, w: nw, h: nh,
      fill: { color: n.nc }, line: { color: n.nc, width: 0 },
      rectRadius: 0.1,
      shadow: makeShadow()
    });
    s.addText(n.label, {
      x: n.nx + 0.05, y: n.ny + 0.05, w: nw - 0.1, h: nh - 0.1,
      fontFace: "Calibri", fontSize: 10.5, bold: true,
      color: C.white, align: "center", valign: "middle", margin: 0
    });
  });

  s.addNotes("Mostre como cada entidade se conecta ao centro. A indústria controla tudo — Hubs operam dentro das regras definidas pela StinPharma.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — DORES RESOLVIDAS
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightSlide(s);

  sectionTitle(s, "Dores que o Hub Plataforma Resolve", 0.22);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.7, w: 4.8, h: 0.04,
    fill: { color: C.red }, line: { color: C.red, width: 0 }
  });

  const dores = [
    {
      icon: "❌",
      title: "Informação espalhada",
      problema: "Clientes, orçamentos e pedidos em planilhas, e-mails e sistemas separados.",
      solucao: "Tudo em um único lugar: cliente, histórico, orçamento, pipeline e pedido.",
    },
    {
      icon: "❌",
      title: "Sem controle de acesso",
      problema: "Qualquer vendedor vê dados de qualquer cliente — risco de vazamento e conflito.",
      solucao: "Carteiras distribuídas por Hub, com RBAC: cada usuário vê apenas o que é seu.",
    },
    {
      icon: "❌",
      title: "Pipeline sem visibilidade",
      problema: "O gestor não sabe em que etapa estão as negociações nem quem está parado.",
      solucao: "Pipeline configurado pela Indústria, com etapas e acompanhamento em tempo real.",
    },
    {
      icon: "❌",
      title: "Catálogo desatualizado",
      problema: "Produtos, preços e portfólios divergentes entre representantes e indústria.",
      solucao: "Portfólio gerido pela indústria. Hubs só acessam produtos autorizados.",
    },
    {
      icon: "❌",
      title: "Processo comercial informal",
      problema: "Do lead ao pedido sem rastreabilidade — sem auditoria, sem padrão.",
      solucao: "Fluxo formalizado: Solicitação → Cliente → Atendimento → Orçamento → Pedido.",
    },
    {
      icon: "❌",
      title: "Dependência de pessoas",
      problema: "Saiu o vendedor, perdeu o histórico. Clientes sem responsável definido.",
      solucao: "Clientes pertencem à Indústria. Redistribuição de carteira sem perda de dados.",
    },
  ];

  const cols = 3;
  dores.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.35 + col * 3.2;
    const y = 1.0 + row * 2.18;
    const w = 3.0, h = 2.0;

    card(s, x, y, w, h, { fill: C.white });

    // Problema
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.12, y: y + 0.12, w: w - 0.24, h: 0.75,
      fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 }, rectRadius: 0.07
    });
    s.addText(d.icon + "  " + d.title, {
      x: x + 0.18, y: y + 0.13, w: w - 0.3, h: 0.22,
      fontFace: "Calibri", fontSize: 11, bold: true,
      color: C.red, align: "left", margin: 0
    });
    s.addText(d.problema, {
      x: x + 0.18, y: y + 0.36, w: w - 0.3, h: 0.46,
      fontFace: "Calibri", fontSize: 10,
      color: "7F1D1D", align: "left", margin: 0
    });

    // Solução
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.12, y: y + 1.0, w: w - 0.24, h: 0.85,
      fill: { color: C.offWhite }, line: { color: "A7F3D0", width: 1 }, rectRadius: 0.07
    });
    s.addText("✅  Solução", {
      x: x + 0.18, y: y + 1.02, w: w - 0.3, h: 0.22,
      fontFace: "Calibri", fontSize: 10, bold: true,
      color: C.green, align: "left", margin: 0
    });
    s.addText(d.solucao, {
      x: x + 0.18, y: y + 1.26, w: w - 0.3, h: 0.52,
      fontFace: "Calibri", fontSize: 10,
      color: "065F46", align: "left", margin: 0
    });

    // título fix (ja tá no titulo das props)
    s.addText(d.title, {
      x: x + 0.35, y: y + 0.135, w: w - 0.5, h: 0.22,
      fontFace: "Calibri", fontSize: 10.5, bold: true,
      color: C.red, align: "left", margin: 0
    });
  });

  s.addNotes("Apresente cada dor com empatia — o gestor provavelmente já viveu todas elas. A plataforma foi construída para resolver exatamente esses problemas.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — O QUE ELE FAZ (fluxo operacional)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightSlide(s);

  sectionTitle(s, "O que o Hub Plataforma faz", 0.22);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.7, w: 4.0, h: 0.04,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 }
  });

  // Fluxo visual
  const steps = [
    { num: "1", label: "Solicitação\nde Novo Cliente", color: "0E7490" },
    { num: "2", label: "Aprovação\n(Indústria)", color: C.teal },
    { num: "3", label: "Cliente\nna Carteira", color: "0D9488" },
    { num: "4", label: "Atendimento\nComercial", color: "059669" },
    { num: "5", label: "Orçamento\nEmitido", color: "16A34A" },
    { num: "6", label: "Pré-pedido\n→ Pedido", color: "15803D" },
  ];

  const startX = 0.35, stepW = 1.52, stepH = 1.1, stepY = 1.05, gap = 0.1;

  steps.forEach((st, i) => {
    const x = startX + i * (stepW + gap);
    // seta
    if (i > 0) {
      s.addShape(pres.shapes.LINE, {
        x: x - gap - 0.02, y: stepY + stepH / 2,
        w: gap + 0.04, h: 0,
        line: { color: "CBD5E1", width: 2 }
      });
    }
    card(s, x, stepY, stepW, stepH, { fill: C.white });
    // círculo numerado
    s.addShape(pres.shapes.OVAL, {
      x: x + stepW / 2 - 0.28, y: stepY + 0.1, w: 0.56, h: 0.56,
      fill: { color: st.color }, line: { color: st.color, width: 0 }
    });
    s.addText(st.num, {
      x: x + stepW / 2 - 0.28, y: stepY + 0.12, w: 0.56, h: 0.5,
      fontFace: "Cambria", fontSize: 18, bold: true,
      color: C.white, align: "center", valign: "middle", margin: 0
    });
    s.addText(st.label, {
      x: x + 0.1, y: stepY + 0.72, w: stepW - 0.2, h: 0.32,
      fontFace: "Calibri", fontSize: 10, bold: true,
      color: C.dark, align: "center", margin: 0
    });
  });

  // Funcionalidades em grade
  const funcs = [
    { title: "Gestão de Clientes", items: ["Cadastro centralizado", "Vinculado à Carteira", "Histórico completo"] },
    { title: "Catálogo de Produtos", items: ["Portfólio por Indústria", "Categoria/Subcategoria", "Autorização por Hub"] },
    { title: "Orçamentos", items: ["Emissão pelo Assistente", "Aprovação pelo Cliente", "Conversão em Pedido"] },
    { title: "Relatórios & Pipeline", items: ["Etapas configuráveis", "Visibilidade em tempo real", "Auditoria de mudanças"] },
  ];

  funcs.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.35 + col * 4.85;
    const y = 2.5 + row * 1.35;
    card(s, x, y, 4.65, 1.2, { fill: C.white });

    s.addText(f.title, {
      x: x + 0.15, y: y + 0.1, w: 4.35, h: 0.3,
      fontFace: "Cambria", fontSize: 13, bold: true,
      color: C.navy, align: "left", margin: 0
    });
    s.addText(f.items.map(it => "• " + it).join("   "), {
      x: x + 0.15, y: y + 0.45, w: 4.35, h: 0.65,
      fontFace: "Calibri", fontSize: 11,
      color: C.slate, align: "left", margin: 0
    });
  });

  s.addNotes("Percorra o fluxo operacional passo a passo. Destaque que todo o ciclo está dentro de uma única plataforma — sem sistemas paralelos.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — O QUE ELE RESOLVE (resultados)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightSlide(s);

  sectionTitle(s, "O que o Hub Plataforma Resolve para a StinPharma", 0.22);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.7, w: 5.5, h: 0.04,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 }
  });

  // Grandes stats
  const stats = [
    { val: "100%", label: "visibilidade do\npipeline comercial", color: C.teal },
    { val: "0", label: "dados perdidos\nna troca de vendedor", color: C.navy },
    { val: "1", label: "plataforma para\ntodo o ciclo", color: "059669" },
    { val: "∞", label: "escalabilidade de\nHubs e Carteiras", color: "7C3AED" },
  ];

  stats.forEach((st, i) => {
    const x = 0.35 + i * 2.4;
    card(s, x, 1.0, 2.2, 1.55, { fill: C.white });
    s.addText(st.val, {
      x: x + 0.1, y: 1.1, w: 2.0, h: 0.75,
      fontFace: "Cambria", fontSize: 42, bold: true,
      color: st.color, align: "center", margin: 0
    });
    s.addText(st.label, {
      x: x + 0.1, y: 1.85, w: 2.0, h: 0.55,
      fontFace: "Calibri", fontSize: 11,
      color: C.muted, align: "center", margin: 0
    });
  });

  // Gráfico — Organização vs Caos (barra comparativa)
  s.addText("Antes × Depois da Plataforma", {
    x: 0.5, y: 2.75, w: 5.0, h: 0.4,
    fontFace: "Cambria", fontSize: 14, bold: true,
    color: C.dark, align: "left", margin: 0
  });

  s.addChart(pres.charts.BAR, [
    { name: "Antes", labels: ["Visibilidade", "Controle de Acesso", "Rastreabilidade", "Produtividade"], values: [20, 15, 10, 30] },
    { name: "Depois", labels: ["Visibilidade", "Controle de Acesso", "Rastreabilidade", "Produtividade"], values: [95, 90, 95, 80] },
  ], {
    x: 0.4, y: 3.15, w: 5.8, h: 2.2,
    barDir: "bar",
    barGrouping: "clustered",
    chartColors: ["CBD5E1", C.teal],
    chartArea: { fill: { color: C.white }, roundedCorners: true },
    catAxisLabelColor: C.slate,
    valAxisLabelColor: C.slate,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: C.dark,
    dataLabelFontSize: 10,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 11,
  });

  // Texto direito
  const resolves = [
    { icon: "🎯", text: "Indústria controla o catálogo, os Hubs apenas operam com o que foi autorizado." },
    { icon: "📊", text: "Gestor visualiza pipeline, Orçamentos e Pedidos de todos os Hubs em tempo real." },
    { icon: "🔁", text: "Redistribuição de Carteira sem perda de histórico — cliente pertence à Indústria." },
    { icon: "⚡", text: "Assistentes focam em vender; burocracia e aprovações são automatizadas na plataforma." },
  ];

  resolves.forEach((r, i) => {
    card(s, 6.5, 2.7 + i * 0.73, 3.15, 0.63, { fill: C.white });
    s.addText(r.icon, {
      x: 6.65, y: 2.72 + i * 0.73, w: 0.45, h: 0.5,
      fontFace: "Calibri", fontSize: 18,
      align: "center", margin: 0
    });
    s.addText(r.text, {
      x: 7.15, y: 2.74 + i * 0.73, w: 2.35, h: 0.5,
      fontFace: "Calibri", fontSize: 10,
      color: C.dark, align: "left", margin: 0
    });
  });

  s.addNotes("Foco nos resultados concretos. O gráfico é ilustrativo — adapte para dados reais se disponíveis. Os 4 pontos à direita são os ganhos mais citados por gestores de indústria.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — O QUE PODE ACONTECER (expansão e oportunidades)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightSlide(s);

  sectionTitle(s, "O que pode acontecer com o Hub Plataforma", 0.22);
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.7, w: 4.8, h: 0.04,
    fill: { color: C.amber }, line: { color: C.amber, width: 0 }
  });

  // Linha do tempo de evolução
  s.addText("Roadmap de Expansão", {
    x: 0.5, y: 0.9, w: 9, h: 0.35,
    fontFace: "Cambria", fontSize: 14, bold: true,
    color: C.dark, align: "left", margin: 0
  });

  const timeline = [
    { fase: "Hoje", desc: "Clientes, Carteiras, Hubs, Produtos, Orçamentos e Pedidos funcionando.", color: C.teal },
    { fase: "Próximo", desc: "Portfólio N:N por produto, preço comercial no vínculo Hub×Portfólio.", color: C.tealMid },
    { fase: "Médio Prazo", desc: "Atendimento Comercial substitui Deal. Pré-pedido automatizado.", color: C.amber },
    { fase: "Futuro", desc: "App mobile para Assistentes, integração com ERP, NF-e automática.", color: "7C3AED" },
  ];

  // Linha do eixo
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 1.68, w: 9.0, h: 0,
    line: { color: "E2E8F0", width: 2.5 }
  });

  timeline.forEach((t, i) => {
    const x = 0.5 + i * 2.3;
    // ponto na linha
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.8, y: 1.5, w: 0.36, h: 0.36,
      fill: { color: t.color }, line: { color: t.color, width: 0 }
    });
    card(s, x, 1.95, 2.1, 1.1, { fill: C.white });
    s.addText(t.fase, {
      x: x + 0.1, y: 2.05, w: 1.9, h: 0.3,
      fontFace: "Cambria", fontSize: 12, bold: true,
      color: t.color, align: "left", margin: 0
    });
    s.addText(t.desc, {
      x: x + 0.1, y: 2.38, w: 1.9, h: 0.6,
      fontFace: "Calibri", fontSize: 10,
      color: C.slate, align: "left", margin: 0
    });
  });

  // Oportunidades
  s.addText("Oportunidades Habilitadas", {
    x: 0.5, y: 3.22, w: 9, h: 0.4,
    fontFace: "Cambria", fontSize: 14, bold: true,
    color: C.dark, align: "left", margin: 0
  });

  const opps = [
    { icon: "🌎", title: "Escala Nacional", desc: "Novos Hubs em qualquer região sem custo marginal relevante." },
    { icon: "📦", title: "Novos Portfólios", desc: "Lançar linhas de produto e autorizar Hubs seletivamente." },
    { icon: "📈", title: "Inteligência Comercial", desc: "Dados de pipeline viram relatórios de desempenho por Hub." },
    { icon: "🤝", title: "Parceiros Autorizados", desc: "Representantes externos operam como Hubs com dados protegidos." },
    { icon: "💊", title: "Compliance Pharma", desc: "Rastreabilidade de pedidos, orçamentos e receituários controlados." },
  ];

  opps.forEach((o, i) => {
    const x = 0.35 + i * 1.93;
    card(s, x, 3.7, 1.8, 1.65, { fill: C.white });
    s.addText(o.icon, {
      x: x + 0.1, y: 3.8, w: 1.6, h: 0.45,
      fontFace: "Calibri", fontSize: 22,
      align: "center", margin: 0
    });
    s.addText(o.title, {
      x: x + 0.1, y: 4.28, w: 1.6, h: 0.3,
      fontFace: "Cambria", fontSize: 11, bold: true,
      color: C.navy, align: "center", margin: 0
    });
    s.addText(o.desc, {
      x: x + 0.08, y: 4.6, w: 1.65, h: 0.65,
      fontFace: "Calibri", fontSize: 9.5,
      color: C.muted, align: "center", margin: 0
    });
  });

  s.addNotes("Mostre que a plataforma não é um sistema estático — ela cresce com a StinPharma. Cada nova funcionalidade está alinhada às necessidades reais da indústria.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — SEGURANÇA
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);

  s.addText("Segurança para a Empresa", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontFace: "Cambria", fontSize: 26, bold: true,
    color: C.white, align: "left", margin: 0
  });
  s.addText("O Hub Plataforma foi construído com segurança como pilar, não como recurso adicional.", {
    x: 0.5, y: 0.9, w: 9, h: 0.4,
    fontFace: "Calibri", fontSize: 14,
    color: C.tealLt, align: "left", margin: 0
  });

  const pillars = [
    {
      num: "01",
      title: "Dados são da Indústria",
      items: [
        "Clientes, produtos e orçamentos pertencem à StinPharma, não ao representante.",
        "Ao desativar um Hub, os dados permanecem intactos na plataforma.",
        "Zero risco de \"levar a carteira\" ao sair.",
      ],
      color: C.teal,
    },
    {
      num: "02",
      title: "Controle de Acesso (RBAC)",
      items: [
        "4 perfis fixos: Admin, Gestor, Proprietário do Hub, Assistente.",
        "Cada perfil enxerga e opera apenas o seu escopo.",
        "Permissões granulares por Função dentro do Hub.",
      ],
      color: C.tealMid,
    },
    {
      num: "03",
      title: "Isolamento por Tenant",
      items: [
        "Dados da StinPharma nunca cruzam com dados de outra indústria.",
        "RLS (Row Level Security) no banco de dados — proteção em camada de infra.",
        "Ambiente HUB DEV separado de produção.",
      ],
      color: "0E7490",
    },
    {
      num: "04",
      title: "Auditoria & Rastreabilidade",
      items: [
        "Toda mudança de estado de Hub é registrada com autor e timestamp.",
        "Orçamentos têm ciclo de vida imutável após conversão.",
        "Histórico de Atendimentos e Pedidos sempre disponível para o Gestor.",
      ],
      color: "1D4ED8",
    },
  ];

  pillars.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.35 + col * 4.85;
    const y = 1.5 + row * 1.9;
    const w = 4.6, h = 1.75;

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h,
      fill: { color: "162A3F" }, line: { color: p.color, width: 1.5 },
      rectRadius: 0.12, shadow: makeShadow()
    });

    // Número
    s.addText(p.num, {
      x: x + 0.15, y: y + 0.1, w: 0.55, h: 0.55,
      fontFace: "Cambria", fontSize: 22, bold: true,
      color: p.color, align: "left", margin: 0
    });

    s.addText(p.title, {
      x: x + 0.72, y: y + 0.12, w: w - 0.85, h: 0.45,
      fontFace: "Cambria", fontSize: 14, bold: true,
      color: C.white, align: "left", margin: 0
    });

    s.addText(p.items.map(it => "· " + it).join("\n"), {
      x: x + 0.15, y: y + 0.65, w: w - 0.3, h: 1.0,
      fontFace: "Calibri", fontSize: 10.5,
      color: "9ECFCA", align: "left", margin: 0
    });
  });

  s.addNotes("Esse é um slide crítico para o gestor. Reforce que o Hub Plataforma dá controle e propriedade dos dados de volta para a indústria — o representante opera, mas a StinPharma é dona.");
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — FECHAMENTO
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkSlide(s);

  // Faixa teal à direita
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.2, y: 0, w: 3.8, h: 5.625,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 }
  });

  s.addText("O Hub Plataforma\né a Plataforma da\nStinPharma.", {
    x: 0.5, y: 0.7, w: 5.5, h: 2.0,
    fontFace: "Cambria", fontSize: 30, bold: true,
    color: C.white, align: "left", margin: 0
  });

  s.addText("Centralizada. Segura. Escalável.", {
    x: 0.5, y: 2.8, w: 5.5, h: 0.5,
    fontFace: "Calibri", fontSize: 18, italic: true,
    color: C.tealLt, align: "left", margin: 0
  });

  const bullets = [
    "✓  Dados são seus — sempre",
    "✓  Equipe controlada por perfis",
    "✓  Pipeline visível para o Gestor",
    "✓  Escalável para quantos Hubs precisar",
  ];

  s.addText(bullets.join("\n"), {
    x: 0.5, y: 3.4, w: 5.5, h: 1.8,
    fontFace: "Calibri", fontSize: 13,
    color: "C7F5EE", align: "left", margin: 0
  });

  // Lado direito
  s.addText("Próximos\nPassos", {
    x: 6.4, y: 0.9, w: 3.4, h: 1.0,
    fontFace: "Cambria", fontSize: 24, bold: true,
    color: C.white, align: "center", margin: 0
  });

  const steps = [
    "Validar fluxo com a equipe",
    "Configurar Hubs StinPharma",
    "Cadastrar Portfólio de Produtos",
    "Treinar Assistentes e Gestores",
  ];

  steps.forEach((st, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: 6.45, y: 2.05 + i * 0.77, w: 0.35, h: 0.35,
      fill: { color: C.white }, line: { color: C.white, width: 0 }
    });
    s.addText(String(i + 1), {
      x: 6.45, y: 2.07 + i * 0.77, w: 0.35, h: 0.3,
      fontFace: "Cambria", fontSize: 12, bold: true,
      color: C.teal, align: "center", margin: 0
    });
    s.addText(st, {
      x: 6.9, y: 2.07 + i * 0.77, w: 2.8, h: 0.35,
      fontFace: "Calibri", fontSize: 12,
      color: C.white, align: "left", margin: 0
    });
  });

  s.addNotes("Encerre com convicção. Deixe os próximos passos claros — a reunião deve terminar com uma ação definida, não com dúvidas.");
}

// ──────────────────────────────────────────────────────────────────────────────
const outPath = "HubPlataforma_StinPharma.pptx";
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("✅ Apresentação gerada:", outPath);
}).catch(err => {
  console.error("❌ Erro:", err);
});
