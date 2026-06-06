require("dotenv").config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const PANELS_FILE = path.join(DATA_DIR, "panels.json");
const COUPONS_FILE = path.join(DATA_DIR, "coupons.json");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");
const GIVEAWAYS_FILE = path.join(DATA_DIR, "giveaways.json");
const REPOSTS_FILE = path.join(DATA_DIR, "reposts.json");
const APPS_FILE = path.join(DATA_DIR, "apps.json");

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  staffRoleId: process.env.STAFF_ROLE_ID,
  pixKey: process.env.PIX_KEY || "",
  storeName: process.env.STORE_NAME || "Loja de Bots",
  supportUrl: process.env.SUPPORT_URL || ""
};

const defaultProducts = [
  {
    id: "bot-vendas",
    name: "Bot de Vendas",
    price: 49.9,
    description: "Bot de vendas Discord com tickets, painel e suporte inicial.",
    deliveryMode: "manual",
    stock: [],
    fields: [],
    active: true,
    couponsEnabled: true
  }
];

const defaultPanels = [
  {
    id: "loja-principal",
    name: "Loja Principal",
    description: "Escolha um produto abaixo para abrir seu carrinho.",
    productIds: ["bot-vendas"],
    active: true
  }
];

const defaultEmojis = {
  store: "🏪",
  ticket: "🎧",
  welcome: "📞",
  automation: "🔄",
  customize: "🎨",
  cloud: "☁️",
  receipt: "🧾",
  giveaway: "🎉",
  settings: "⚙️",
  protect: "🛡️",
  payment: "💳",
  channels: "📁",
  staff: "🛠️",
  client: "👤",
  sales: "🔌",
  wallet: "💼",
  add: "➕",
  edit: "🖊️",
  list: "📋",
  delete: "🗑️",
  back: "⬅️",
  approve: "✅",
  reject: "❌",
  lock: "🔒",
  coupon: "🏷️",
  proof: "📎",
  search: "🔎",
  cart: "🛒",
  stock: "📦"
};

const commands = [
  new SlashCommandBuilder()
    .setName("setup-loja")
    .setDescription("Envia o painel principal de produtos da loja."),
  new SlashCommandBuilder()
    .setName("painel-config")
    .setDescription("Envia o painel de configuracao dos sistemas extras."),
  new SlashCommandBuilder()
    .setName("botconfig")
    .setDescription("Abre o painel central de configuracao estilo Promisse."),
  new SlashCommandBuilder()
    .setName("painel-loja")
    .setDescription("Envia o painel para configurar a loja, Pix, logs e tickets."),
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Cria produto, painel ou cupom.")
    .addSubcommand((subcommand) => subcommand
      .setName("produto")
      .setDescription("Cria ou atualiza um produto.")
      .addStringOption((option) => option.setName("id").setDescription("ID unico, sem espacos.").setRequired(true))
      .addStringOption((option) => option.setName("nome").setDescription("Nome do produto.").setRequired(true))
      .addNumberOption((option) => option.setName("preco").setDescription("Preco em reais.").setRequired(true))
      .addStringOption((option) => option.setName("descricao").setDescription("Descricao do produto.").setRequired(true))
      .addStringOption((option) => option
        .setName("entrega")
        .setDescription("Tipo de entrega.")
        .setRequired(false)
        .addChoices(
          { name: "manual", value: "manual" },
          { name: "automatica", value: "automatic" }
        ))
      .addStringOption((option) => option.setName("estoque").setDescription("Itens separados por | para entrega automatica.").setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName("campo")
      .setDescription("Adiciona uma opcao/campo dentro de um produto.")
      .addStringOption((option) => option.setName("produto").setDescription("ID do produto.").setRequired(true))
      .addStringOption((option) => option.setName("id").setDescription("ID do campo/opcao.").setRequired(true))
      .addStringOption((option) => option.setName("nome").setDescription("Nome do campo.").setRequired(true))
      .addNumberOption((option) => option.setName("preco").setDescription("Preco deste campo.").setRequired(true))
      .addStringOption((option) => option.setName("descricao").setDescription("Descricao do campo.").setRequired(false))
      .addStringOption((option) => option.setName("estoque").setDescription("Itens separados por |.").setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName("painel")
      .setDescription("Cria ou atualiza um painel com produtos.")
      .addStringOption((option) => option.setName("id").setDescription("ID unico do painel.").setRequired(true))
      .addStringOption((option) => option.setName("nome").setDescription("Nome do painel.").setRequired(true))
      .addStringOption((option) => option.setName("produtos").setDescription("IDs dos produtos separados por virgula.").setRequired(true))
      .addStringOption((option) => option.setName("descricao").setDescription("Descricao do painel.").setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName("cupom")
      .setDescription("Cria ou atualiza um cupom.")
      .addStringOption((option) => option.setName("codigo").setDescription("Codigo do cupom.").setRequired(true))
      .addNumberOption((option) => option.setName("desconto").setDescription("Desconto em porcentagem.").setRequired(true))
      .addIntegerOption((option) => option.setName("usos").setDescription("Limite de usos.").setRequired(false))),
  new SlashCommandBuilder()
    .setName("set")
    .setDescription("Publica produto ou painel no canal atual.")
    .addSubcommand((subcommand) => subcommand
      .setName("produto")
      .setDescription("Publica um produto.")
      .addStringOption((option) => option.setName("id").setDescription("ID do produto.").setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("painel")
      .setDescription("Publica um painel.")
      .addStringOption((option) => option.setName("id").setDescription("ID do painel.").setRequired(true))),
  new SlashCommandBuilder()
    .setName("estatistica")
    .setDescription("Mostra estatisticas de vendas."),
  new SlashCommandBuilder()
    .setName("gerar-pix")
    .setDescription("Gera uma cobranca Pix manual.")
    .addNumberOption((option) => option.setName("valor").setDescription("Valor da cobranca.").setRequired(true))
    .addStringOption((option) => option.setName("descricao").setDescription("Descricao da cobranca.").setRequired(false)),
  new SlashCommandBuilder()
    .setName("carteira")
    .setDescription("Mostra os recebimentos Pix da carteira integrada."),
  new SlashCommandBuilder()
    .setName("config-pagamento")
    .setDescription("Configura Pix e pagamentos automaticos sem mexer no Railway.")
    .addSubcommand((subcommand) => subcommand
      .setName("pix")
      .setDescription("Configura chave Pix e metodos manuais."))
    .addSubcommand((subcommand) => subcommand
      .setName("efi")
      .setDescription("Configura Pix automatico da Efi Bank."))
    .addSubcommand((subcommand) => subcommand
      .setName("mercadopago")
      .setDescription("Configura Pix automatico do Mercado Pago."))
    .addSubcommand((subcommand) => subcommand
      .setName("status")
      .setDescription("Mostra se os pagamentos estao configurados.")),
  new SlashCommandBuilder()
    .setName("painel-ia")
    .setDescription("Configura o suporte com IA."),
  new SlashCommandBuilder()
    .setName("ia-teste")
    .setDescription("Testa se a IA esta ligada e respondendo.")
    .addStringOption((option) => option.setName("pergunta").setDescription("Pergunta para testar a IA.").setRequired(true)),
  new SlashCommandBuilder()
    .setName("ticket-painel")
    .setDescription("Publica o painel de suporte com ticket e IA."),
  new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Gerencia usuarios bloqueados da loja.")
    .addSubcommand((subcommand) => subcommand
      .setName("add")
      .setDescription("Bloqueia um usuario de comprar e abrir ticket.")
      .addUserOption((option) => option.setName("usuario").setDescription("Usuario bloqueado.").setRequired(true))
      .addStringOption((option) => option.setName("motivo").setDescription("Motivo do bloqueio.").setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName("remover")
      .setDescription("Remove um usuario da blacklist.")
      .addUserOption((option) => option.setName("usuario").setDescription("Usuario liberado.").setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("listar")
      .setDescription("Lista usuarios bloqueados.")),
  new SlashCommandBuilder()
    .setName("termos")
    .setDescription("Configura os termos de compra.")
    .addStringOption((option) => option.setName("texto").setDescription("Texto dos termos.").setRequired(true))
    .addBooleanOption((option) => option.setName("obrigatorio").setDescription("Exigir aceite antes da compra.").setRequired(false)),
  new SlashCommandBuilder()
    .setName("sorteio")
    .setDescription("Cria ou encerra sorteios.")
    .addSubcommand((subcommand) => subcommand
      .setName("criar")
      .setDescription("Cria um sorteio com botao de participar.")
      .addStringOption((option) => option.setName("premio").setDescription("Premio do sorteio.").setRequired(true))
      .addIntegerOption((option) => option.setName("minutos").setDescription("Duracao em minutos.").setRequired(true))
      .addIntegerOption((option) => option.setName("vencedores").setDescription("Quantidade de vencedores.").setRequired(false))
      .addRoleOption((option) => option.setName("cargo").setDescription("Cargo obrigatorio para participar.").setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName("encerrar")
      .setDescription("Encerra um sorteio pelo ID.")
      .addStringOption((option) => option.setName("id").setDescription("ID do sorteio.").setRequired(true))),
  new SlashCommandBuilder()
    .setName("repost")
    .setDescription("Configura repost automatico de produto ou painel.")
    .addStringOption((option) => option
      .setName("tipo")
      .setDescription("Tipo de repost.")
      .setRequired(true)
      .addChoices(
        { name: "produto", value: "product" },
        { name: "painel", value: "panel" }
      ))
    .addStringOption((option) => option.setName("id").setDescription("ID do produto ou painel.").setRequired(true))
    .addIntegerOption((option) => option.setName("minutos").setDescription("Intervalo em minutos. Use 0 para desativar.").setRequired(true)),
  new SlashCommandBuilder()
    .setName("avaliar")
    .setDescription("Avalia sua ultima compra.")
    .addIntegerOption((option) => option.setName("nota").setDescription("Nota de 1 a 5.").setRequired(true))
    .addStringOption((option) => option.setName("comentario").setDescription("Comentario da avaliacao.").setRequired(false)),
  new SlashCommandBuilder()
    .setName("protecao")
    .setDescription("Configura protecoes basicas do servidor.")
    .addBooleanOption((option) => option.setName("anti-link").setDescription("Bloquear links de usuarios sem staff.").setRequired(true)),
  new SlashCommandBuilder()
    .setName("apps")
    .setDescription("Gerencia o bot adquirido na loja.")
].map((command) => command.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
const managedClients = new Map();

function startHealthServer() {
  const port = Number(process.env.PORT);
  if (!Number.isFinite(port) || port <= 0) return;

  const server = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        ok: true,
        bot: client.user?.tag || null,
        uptime: Math.round(process.uptime())
      }));
      return;
    }

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end(`${config.storeName} online`);
  });

  server.listen(port, () => {
    console.log(`Healthcheck online na porta ${port}`);
  });
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function getProducts() {
  const products = await readJson(PRODUCTS_FILE, null);
  if (products) return products;
  await writeJson(PRODUCTS_FILE, defaultProducts);
  return defaultProducts;
}

async function saveProducts(products) {
  await writeJson(PRODUCTS_FILE, products);
}

async function getPanels() {
  const panels = await readJson(PANELS_FILE, null);
  if (panels) return panels;
  await writeJson(PANELS_FILE, defaultPanels);
  return defaultPanels;
}

async function savePanels(panels) {
  await writeJson(PANELS_FILE, panels);
}

async function getCoupons() {
  const coupons = await readJson(COUPONS_FILE, null);
  if (coupons) return coupons;
  await writeJson(COUPONS_FILE, []);
  return [];
}

async function saveCoupons(coupons) {
  await writeJson(COUPONS_FILE, coupons);
}

async function getTickets() {
  const tickets = await readJson(TICKETS_FILE, null);
  if (tickets) return tickets;
  await writeJson(TICKETS_FILE, []);
  return [];
}

async function getReviews() {
  const reviews = await readJson(REVIEWS_FILE, null);
  if (reviews) return reviews;
  await writeJson(REVIEWS_FILE, []);
  return [];
}

async function saveReviews(reviews) {
  await writeJson(REVIEWS_FILE, reviews);
}

async function getGiveaways() {
  const giveaways = await readJson(GIVEAWAYS_FILE, null);
  if (giveaways) return giveaways;
  await writeJson(GIVEAWAYS_FILE, []);
  return [];
}

async function saveGiveaways(giveaways) {
  await writeJson(GIVEAWAYS_FILE, giveaways);
}

async function getReposts() {
  const reposts = await readJson(REPOSTS_FILE, null);
  if (reposts) return reposts;
  await writeJson(REPOSTS_FILE, []);
  return [];
}

async function saveReposts(reposts) {
  await writeJson(REPOSTS_FILE, reposts);
}

async function getApps() {
  const apps = await readJson(APPS_FILE, null);
  if (apps) return apps;
  await writeJson(APPS_FILE, []);
  return [];
}

async function saveApps(apps) {
  await writeJson(APPS_FILE, apps);
}

async function saveTicket(ticket) {
  const tickets = await getTickets();
  const index = tickets.findIndex((item) => item.id === ticket.id);
  if (index >= 0) tickets[index] = ticket;
  else tickets.push(ticket);
  await writeJson(TICKETS_FILE, tickets);
}

async function findTicketByChannel(channelId) {
  const tickets = await getTickets();
  return tickets.find((ticket) => ticket.channelId === channelId && ticket.status === "open");
}

async function getOrders() {
  const orders = await readJson(ORDERS_FILE, null);
  if (orders) return orders;
  await writeJson(ORDERS_FILE, []);
  return [];
}

async function getAllSettings() {
  const settings = await readJson(SETTINGS_FILE, null);
  if (settings) return settings;
  await writeJson(SETTINGS_FILE, {});
  return {};
}

function defaultGuildSettings() {
  return {
    shop: {
      storeName: config.storeName,
      pixKey: config.pixKey,
      supportUrl: config.supportUrl,
      logChannelId: config.logChannelId || "",
      publicLogChannelId: "",
      ticketCategoryId: config.ticketCategoryId || "",
      staffRoleId: config.staffRoleId || "",
      clientRoleId: "",
      reviewChannelId: "",
      salesEnabled: true,
      paymentMethods: {
        pix: true,
        manualProof: true,
        mercadoPago: false,
        wallet: false,
        efiBank: false
      },
      paymentProvider: "manual",
      mercadoPagoAccessToken: "",
      efiClientId: "",
      efiClientSecret: "",
      efiCertificateBase64: "",
      efiPixKey: "",
      efiSandbox: false,
      emojis: defaultEmojis,
      termsRequired: false,
      termsText: "Ao comprar, voce confirma que leu a descricao do produto e entende que produtos digitais podem nao ter reembolso.",
      blacklist: []
    },
    ai: {
      enabled: false,
      apiKey: process.env.GEMINI_API_KEY || "",
      model: "gemini-2.0-flash",
      maxReplies: 20,
      storeInfo: "",
      productInfo: "",
      policy: "",
      faq: []
    },
    welcome: {
      enabled: false,
      channelId: "",
      message: "Bem-vindo(a), {user}! Conheca nossa loja e abra seu ticket quando precisar."
    },
    autoRole: {
      enabled: false,
      roleId: ""
    },
    antiFake: {
      enabled: false,
      minAccountAgeDays: 7,
      logOnly: true
    },
    protection: {
      antiLink: false,
      antiBot: false
    }
  };
}

async function getGuildSettings(guildId) {
  const settings = await getAllSettings();
  const current = settings[guildId] || {};
  const defaults = defaultGuildSettings();

  return {
    shop: { ...defaults.shop, ...(current.shop || {}) },
    ai: { ...defaults.ai, ...(current.ai || {}) },
    welcome: { ...defaults.welcome, ...(current.welcome || {}) },
    autoRole: { ...defaults.autoRole, ...(current.autoRole || {}) },
    antiFake: { ...defaults.antiFake, ...(current.antiFake || {}) },
    protection: { ...defaults.protection, ...(current.protection || {}) }
  };
}

async function getShopSettings(guildId) {
  const settings = await getGuildSettings(guildId);
  return {
    storeName: settings.shop?.storeName || config.storeName,
    pixKey: settings.shop?.pixKey || config.pixKey,
    supportUrl: settings.shop?.supportUrl || config.supportUrl,
    logChannelId: settings.shop?.logChannelId || config.logChannelId,
    publicLogChannelId: settings.shop?.publicLogChannelId || "",
    ticketCategoryId: settings.shop?.ticketCategoryId || config.ticketCategoryId,
    staffRoleId: settings.shop?.staffRoleId || config.staffRoleId,
    clientRoleId: settings.shop?.clientRoleId || "",
    reviewChannelId: settings.shop?.reviewChannelId || "",
    salesEnabled: settings.shop?.salesEnabled !== false,
    paymentMethods: {
      pix: settings.shop?.paymentMethods?.pix !== false,
      manualProof: settings.shop?.paymentMethods?.manualProof !== false,
      mercadoPago: Boolean(settings.shop?.paymentMethods?.mercadoPago),
      wallet: Boolean(settings.shop?.paymentMethods?.wallet),
      efiBank: Boolean(settings.shop?.paymentMethods?.efiBank)
    },
    paymentProvider: settings.shop?.paymentProvider || process.env.PAYMENT_PROVIDER || "manual",
    mercadoPagoAccessToken: settings.shop?.mercadoPagoAccessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
    efiClientId: settings.shop?.efiClientId || process.env.EFI_CLIENT_ID || "",
    efiClientSecret: settings.shop?.efiClientSecret || process.env.EFI_CLIENT_SECRET || "",
    efiCertificateBase64: settings.shop?.efiCertificateBase64 || process.env.EFI_CERTIFICATE_BASE64 || "",
    efiPixKey: settings.shop?.efiPixKey || process.env.EFI_PIX_KEY || settings.shop?.pixKey || config.pixKey || "",
    efiSandbox: String(settings.shop?.efiSandbox ?? process.env.EFI_SANDBOX ?? "false").toLowerCase() === "true",
    emojis: { ...defaultEmojis, ...(settings.shop?.emojis || {}) },
    termsRequired: Boolean(settings.shop?.termsRequired),
    termsText: settings.shop?.termsText || "Ao comprar, voce confirma que leu a descricao do produto e entende que produtos digitais podem nao ter reembolso.",
    blacklist: settings.shop?.blacklist || []
  };
}

async function saveGuildSettings(guildId, value) {
  const settings = await getAllSettings();
  settings[guildId] = value;
  await writeJson(SETTINGS_FILE, settings);
}

async function saveOrder(order) {
  const orders = await getOrders();
  const index = orders.findIndex((item) => item.id === order.id);
  if (index >= 0) orders[index] = order;
  else orders.push(order);
  await writeJson(ORDERS_FILE, orders);
}

async function findOrder(orderId) {
  const orders = await getOrders();
  return orders.find((order) => order.id === orderId);
}

async function findOrderByChannel(channelId) {
  const orders = await getOrders();
  return orders.find((order) => order.channelId === channelId && !["fechado", "aprovado", "reprovado"].includes(order.status));
}

const theme = {
  dark: 0x0f172a,
  primary: 0x2563eb,
  success: 0x16a34a,
  warning: 0xf59e0b,
  danger: 0xdc2626,
  purple: 0x7c3aed,
  cyan: 0x0891b2
};

function brl(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function yesNo(value) {
  return value ? "Ativo" : "Desativado";
}

function boolFromText(value) {
  return /^(sim|s|true|1|ativo|ligado|on)$/i.test(String(value || "").trim());
}

function paymentMethodsText(shop) {
  const methods = shop.paymentMethods || {};
  const active = [
    methods.pix ? "Pix" : null,
    methods.manualProof ? "Comprovante" : null,
    methods.mercadoPago ? "Mercado Pago" : null,
    methods.efiBank ? "Efí Bank" : null,
    methods.wallet ? "Carteira" : null
  ].filter(Boolean);
  return active.length ? active.join(", ") : "Nenhum ativo";
}

function parseButtonEmoji(value) {
  const emoji = String(value || "").trim();
  const match = emoji.match(/^<(?<animated>a?):(?<name>[A-Za-z0-9_]+):(?<id>\d+)>$/);
  if (match?.groups) {
    return {
      id: match.groups.id,
      name: match.groups.name,
      animated: match.groups.animated === "a"
    };
  }
  return emoji || "•";
}

function buttonEmoji(shop, key) {
  return parseButtonEmoji(shop?.emojis?.[key] || defaultEmojis[key] || "•");
}

function emojisPreview(shop) {
  return Object.entries({ ...defaultEmojis, ...(shop.emojis || {}) })
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function autoPaymentProvider(shop) {
  if ((shop.paymentProvider || "").toLowerCase() === "efi" || shop.paymentMethods?.efiBank) return "efi";
  if ((shop.paymentProvider || "").toLowerCase() === "mercadopago" || shop.paymentMethods?.mercadoPago || shop.paymentMethods?.wallet) return "mercadopago";
  return "manual";
}

function parsePrice(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "0").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")) || 0;
}

function orderAmount(order) {
  return Number(order.total || order.price || 0);
}

function shortText(value, fallback = "Nao configurado", size = 900) {
  const text = String(value || fallback).trim();
  return text.length > size ? `${text.slice(0, size - 3)}...` : text;
}

function normalizeId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 60);
}

function productStockText(product) {
  if (product.deliveryMode === "automatic") return `${product.stock?.length || 0} disponivel(is)`;
  return "Entrega manual";
}

function getProductFields(product) {
  return Array.isArray(product.fields) ? product.fields : [];
}

function getBuyableItems(product) {
  const fields = getProductFields(product);
  if (!fields.length) return [{ ...product, fieldId: null, productId: product.id, productName: product.name }];
  return fields.map((field) => ({
    ...field,
    productId: product.id,
    productName: product.name,
    deliveryMode: field.deliveryMode || product.deliveryMode,
    couponsEnabled: product.couponsEnabled,
    active: field.active !== false
  }));
}

function isBlacklisted(shop, userId) {
  return (shop.blacklist || []).some((entry) => entry.userId === userId);
}

function shopPanelEmbed(shop) {
  return new EmbedBuilder()
    .setColor(theme.primary)
    .setTitle("Configuracao da loja")
    .setDescription("Central de dados principais para vendas, suporte e logs.")
    .addFields(
      { name: "Nome", value: shop.storeName || "Nao configurado", inline: true },
      { name: "Pix", value: shop.pixKey ? `\`${shop.pixKey}\`` : "Nao configurado", inline: true },
      { name: "Vendas", value: shop.salesEnabled ? "Ligadas" : "Desligadas", inline: true },
      { name: "Pagamentos", value: paymentMethodsText(shop), inline: true },
      { name: "Pix auto", value: autoPaymentProvider(shop) === "efi" ? "Efí Bank" : autoPaymentProvider(shop) === "mercadopago" ? "Mercado Pago" : "Nao configurado", inline: true },
      { name: "Suporte", value: shop.supportUrl || "Nao configurado", inline: true },
      { name: "Log privada", value: shop.logChannelId ? `<#${shop.logChannelId}>` : "Nao configurado", inline: true },
      { name: "Log publica", value: shop.publicLogChannelId ? `<#${shop.publicLogChannelId}>` : "Nao configurado", inline: true },
      { name: "Avaliacoes", value: shop.reviewChannelId ? `<#${shop.reviewChannelId}>` : "Log publica", inline: true },
      { name: "Categoria tickets", value: shop.ticketCategoryId || "Nao configurado", inline: true },
      { name: "Staff", value: shop.staffRoleId ? `<@&${shop.staffRoleId}>` : "Manage Server", inline: true },
      { name: "Cliente", value: shop.clientRoleId ? `<@&${shop.clientRoleId}>` : "Nao configurado", inline: true }
    );
}

function shopRows(shop = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("shopcfg:identity")
        .setEmoji(buttonEmoji(shop, "store"))
        .setLabel("Loja")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shopcfg:payment")
        .setEmoji(buttonEmoji(shop, "payment"))
        .setLabel("Pagamentos")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shopcfg:channels")
        .setEmoji(buttonEmoji(shop, "channels"))
        .setLabel("Canais")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shopcfg:staff")
        .setEmoji(buttonEmoji(shop, "staff"))
        .setLabel("Staff")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("shopcfg:clientrole")
        .setEmoji(buttonEmoji(shop, "client"))
        .setLabel("Cargo cliente")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shopcfg:sales")
        .setEmoji(buttonEmoji(shop, "sales"))
        .setLabel("Vendas")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("shopcfg:wallet")
        .setEmoji(buttonEmoji(shop, "wallet"))
        .setLabel("Carteira MP")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shopcfg:emojis")
        .setEmoji(buttonEmoji(shop, "customize"))
        .setLabel("Emojis")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function aiPanelEmbed(settings) {
  return new EmbedBuilder()
    .setColor(theme.cyan)
    .setTitle("Suporte com IA")
    .setDescription("Treine a IA para responder perguntas iniciais antes da equipe assumir o atendimento.")
    .addFields(
      { name: "Status", value: yesNo(settings.ai.enabled), inline: true },
      { name: "Modelo", value: settings.ai.model || "gemini-2.0-flash", inline: true },
      { name: "Limite", value: `${settings.ai.maxReplies || 20} resposta(s)`, inline: true },
      { name: "Loja", value: shortText(settings.ai.storeInfo) },
      { name: "Produtos", value: shortText(settings.ai.productInfo) },
      { name: "Politica", value: shortText(settings.ai.policy) }
    )
    .setFooter({ text: "A IA para quando um staff assume o ticket." });
}

function aiRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("aicfg:api")
        .setEmoji("🔑")
        .setLabel("API")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("aicfg:training")
        .setEmoji("📚")
        .setLabel("Treinamento")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("aicfg:behavior")
        .setEmoji("⚙️")
        .setLabel("Comportamento")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function supportPanelEmbed(shop) {
  return new EmbedBuilder()
    .setColor(theme.dark)
    .setTitle("Central de atendimento")
    .setDescription("Abra um ticket para falar com o suporte. Se a IA estiver ativa, ela responde perguntas iniciais enquanto a equipe chega.")
    .addFields(
      { name: "Loja", value: shop.storeName || "Loja de Bots", inline: true },
      { name: "Equipe", value: shop.staffRoleId ? `<@&${shop.staffRoleId}>` : "Staff", inline: true }
    )
    .setFooter({ text: shop.storeName || "Loja de Bots" });
}

function supportRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support:open")
        .setEmoji("🎧")
        .setLabel("Abrir ticket")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function botConfigEmbed(shop, settings) {
  return new EmbedBuilder()
    .setColor(theme.dark)
    .setTitle("Painel de Controle")
    .setDescription(`Bom dia, aqui voce pode gerenciar sua aplicacao com liberdade.\n\n**${shop.storeName || "Loja de Bots"}**`)
    .addFields(
      { name: "Vendas", value: shop.salesEnabled === false ? "Desligadas" : "Ligadas", inline: true },
      { name: "Pix auto", value: autoPaymentProvider(shop) === "efi" ? "Efi Bank" : autoPaymentProvider(shop) === "mercadopago" ? "Mercado Pago" : "Pendente", inline: true },
      { name: "Protecao", value: settings.protection?.antiBot || settings.protection?.antiLink ? "Ativa" : "Basica", inline: true },
      { name: "Tickets", value: shop.ticketCategoryId ? "Configurado" : "Pendente", inline: true },
      { name: "Apps", value: "Clientes aprovados podem conectar bots", inline: true },
      { name: "Automacoes", value: settings.welcome?.enabled || settings.autoRole?.enabled ? "Ativas" : "Disponiveis", inline: true }
    )
    .setFooter({ text: "Use os botoes abaixo para navegar." });
}

function botConfigRows(shop = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("botcfg:store")
        .setEmoji(buttonEmoji(shop, "store"))
        .setLabel("Minha loja")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:tickets")
        .setEmoji(buttonEmoji(shop, "ticket"))
        .setLabel("Ticket")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:welcome")
        .setEmoji(buttonEmoji(shop, "welcome"))
        .setLabel("Boas-Vindas")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("botcfg:automation")
        .setEmoji(buttonEmoji(shop, "automation"))
        .setLabel("Automacoes")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:custom")
        .setEmoji(buttonEmoji(shop, "customize"))
        .setLabel("Customizar")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:apps")
        .setEmoji(buttonEmoji(shop, "cloud"))
        .setLabel("zenCloud")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:wallet")
        .setEmoji(buttonEmoji(shop, "receipt"))
        .setLabel("Extrato")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("botcfg:giveaways")
        .setEmoji(buttonEmoji(shop, "giveaway"))
        .setLabel("Giveaway")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:config")
        .setEmoji(buttonEmoji(shop, "settings"))
        .setLabel("Configuracoes")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:protection")
        .setEmoji(buttonEmoji(shop, "protect"))
        .setLabel("zenProtect")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}
function protectionPanelEmbed(settings, shop) {
  return new EmbedBuilder()
    .setColor(theme.warning)
    .setTitle("Protecao do servidor")
    .setDescription("Gerencie protecoes basicas contra links, contas recentes e entrada de bots.")
    .addFields(
      { name: "Anti-link", value: yesNo(settings.protection?.antiLink), inline: true },
      { name: "Anti-fake", value: yesNo(settings.antiFake?.enabled), inline: true },
      { name: "Anti-bot", value: yesNo(settings.protection?.antiBot), inline: true },
      { name: "Minimo de conta", value: `${settings.antiFake?.minAccountAgeDays || 7} dia(s)`, inline: true },
      { name: "Modo anti-fake", value: settings.antiFake?.logOnly ? "Apenas logar" : "Expulsar", inline: true },
      { name: "Canal de logs", value: shop.logChannelId ? `<#${shop.logChannelId}>` : "Nao definido", inline: true }
    );
}

function protectionRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("protcfg:antilink")
        .setEmoji("🔗")
        .setLabel("Anti-link")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("protcfg:antifake")
        .setEmoji("🕵️")
        .setLabel("Anti-fake")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("protcfg:antibot")
        .setEmoji("🤖")
        .setLabel("Anti-bot")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:home")
        .setEmoji("⬅️")
        .setLabel("Voltar")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function productsAdminEmbed(products, panels) {
  const productText = products.length
    ? products.slice(0, 8).map((product) => `\`${product.id}\` - **${product.name}** (${brl(product.price)})`).join("\n")
    : "Nenhum produto cadastrado.";
  const panelText = panels.length
    ? panels.slice(0, 8).map((panel) => `\`${panel.id}\` - **${panel.name}**`).join("\n")
    : "Nenhum painel cadastrado.";

  return new EmbedBuilder()
    .setColor(theme.success)
    .setTitle("Loja | Produtos")
    .setDescription("Use os comandos abaixo para criar e publicar produtos.")
    .addFields(
      { name: "Produtos", value: productText },
      { name: "Paineis", value: panelText },
      { name: "Comandos", value: "`/criar produto`, `/criar campo`, `/criar painel`, `/set produto`, `/set painel`" }
    );
}

function storeOverviewEmbed(shop, products, orders) {
  const approved = orders.filter((order) => order.status === "aprovado");
  const received = approved.reduce((sum, order) => sum + orderAmount(order), 0);

  return new EmbedBuilder()
    .setColor(theme.dark)
    .setTitle("Painel da Loja")
    .setDescription("Escolha o que deseja fazer.")
    .addFields(
      { name: "Total criados", value: `${products.length} produto(s)`, inline: true },
      { name: "Saldo", value: autoPaymentProvider(shop) === "efi" ? `${brl(received)} | Efi Bank` : shop.mercadoPagoAccessToken ? `${brl(received)} | Mercado Pago` : "Nao configurado", inline: true },
      { name: "Moeda padrao", value: "BRL - pt_BR", inline: true },
      { name: "Vendas", value: shop.salesEnabled ? "Ligadas" : "Desligadas", inline: true },
      { name: "Pix auto", value: autoPaymentProvider(shop) === "efi" ? "Efi Bank" : autoPaymentProvider(shop) === "mercadopago" ? "Mercado Pago" : "Pendente", inline: true },
      { name: "Chave Pix", value: shop.pixKey ? "Configurada" : "Pendente", inline: true }
    )
    .setFooter({ text: shop.storeName || "Loja de Bots" });
}

function storeOverviewRows(shop = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("botcfg:products")
        .setEmoji(buttonEmoji(shop, "add"))
        .setLabel("Criar produto")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("botcfg:products")
        .setEmoji(buttonEmoji(shop, "edit"))
        .setLabel("Produtos")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("botcfg:store-more")
        .setPlaceholder("Mais opcoes da loja...")
        .addOptions(
          { label: "Posicoes", description: "Cargos por valor gasto.", value: "positions" },
          { label: "Sistema de Saldo", description: "Configure saldo interno da loja.", value: "wallet" },
          { label: "Cupons", description: "Crie e gerencie cupons de desconto.", value: "coupons" },
          { label: "Condecoracoes", description: "Metas e recompensas por compra.", value: "badges" },
          { label: "Cargo Temporario", description: "Cargos temporarios vinculados a produtos.", value: "temporary-role" },
          { label: "OAuth2", description: "Obrigatoriedade de auth para compras.", value: "oauth2" }
        )
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("botcfg:home")
        .setEmoji(buttonEmoji(shop, "back"))
        .setLabel("Voltar")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function automationPanelEmbed(settings) {
  return new EmbedBuilder()
    .setColor(theme.cyan)
    .setTitle("Automacoes")
    .setDescription("Configure repost, boas-vindas, auto-cargo e atendimento com IA.")
    .addFields(
      { name: "Boas-vindas", value: yesNo(settings.welcome?.enabled), inline: true },
      { name: "Auto-cargo", value: yesNo(settings.autoRole?.enabled), inline: true },
      { name: "IA em tickets", value: yesNo(settings.ai?.enabled), inline: true },
      { name: "Comandos", value: "`/painel-config`, `/painel-ia`, `/repost`" }
    );
}

async function sendBotConfigPanel(interaction, edit = false) {
  const shop = await getShopSettings(interaction.guildId);
  const settings = await getGuildSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode abrir o botconfig.", ephemeral: true });
    return;
  }

  const payload = {
    embeds: [botConfigEmbed(shop, settings)],
    components: botConfigRows(shop),
    ephemeral: true
  };

  if (edit) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function handleBotConfigSection(interaction, section) {
  const shop = await getShopSettings(interaction.guildId);
  const settings = await getGuildSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode alterar o painel.", ephemeral: true });
    return;
  }

  if (section === "home") {
    await sendBotConfigPanel(interaction, true);
    return;
  }

  if (section === "store") {
    await interaction.update({ embeds: [storeOverviewEmbed(shop, await getProducts(), await getOrders())], components: storeOverviewRows(shop) });
    return;
  }

  if (section === "tickets") {
    await interaction.update({ embeds: [supportPanelEmbed(shop)], components: supportRows() });
    return;
  }

  if (section === "welcome" || section === "config") {
    await interaction.update({ embeds: [configPanelEmbed(settings)], components: configRows() });
    return;
  }

  if (section === "protection") {
    await interaction.update({ embeds: [protectionPanelEmbed(settings, shop)], components: protectionRows() });
    return;
  }

  if (section === "products") {
    await interaction.update({ embeds: [productsAdminEmbed(await getProducts(), await getPanels())], components: botConfigRows(shop) });
    return;
  }

  if (section === "automation" || section === "custom") {
    await interaction.update({ embeds: [automationPanelEmbed(settings)], components: botConfigRows(shop) });
    return;
  }

  if (section === "giveaways") {
    await interaction.update({
      embeds: [new EmbedBuilder()
        .setColor(theme.purple)
        .setTitle("Sorteios")
        .setDescription("Crie sorteios reais com botao de participar e encerramento automatico.")
        .addFields({ name: "Comandos", value: "`/sorteio criar`, `/sorteio encerrar`" })],
      components: botConfigRows(shop)
    });
    return;
  }

  if (section === "wallet") {
    const orders = await getOrders();
    const approved = orders.filter((order) => order.guildId === interaction.guildId && order.status === "aprovado");
    const total = approved.reduce((sum, order) => sum + orderAmount(order), 0);
    await interaction.update({
      embeds: [new EmbedBuilder()
        .setColor(theme.success)
        .setTitle("Extrato")
        .setDescription("Resumo rapido dos recebimentos da loja.")
        .addFields(
          { name: "Recebido", value: brl(total), inline: true },
          { name: "Pedidos aprovados", value: String(approved.length), inline: true },
          { name: "Provedor", value: autoPaymentProvider(shop) === "efi" ? "Efi Bank" : autoPaymentProvider(shop) === "mercadopago" ? "Mercado Pago" : "Manual", inline: true }
        )],
      components: botConfigRows(shop)
    });
    return;
  }

  if (section === "apps") {
    const apps = await getApps();
    await interaction.update({ embeds: [appPanelEmbed(userApps(apps, interaction, shop), true)], components: appRows(shop) });
  }
}

async function handleStoreMoreOption(interaction) {
  const option = interaction.values[0];
  const map = {
    positions: {
      title: "Posicoes",
      description: "Cargos por valor gasto. Use cargo cliente em /painel-loja e crie cargos especiais manualmente por enquanto."
    },
    wallet: {
      title: "Sistema de Saldo",
      description: "Use Pix auto com Efi Bank ou Mercado Pago e acompanhe em /carteira."
    },
    coupons: {
      title: "Cupons",
      description: "Crie cupons com /criar cupom e aplique no carrinho pelo botao Aplicar cupom."
    },
    badges: {
      title: "Condecoracoes",
      description: "Metas de compra e condecoracoes podem ser acompanhadas pelo extrato e estatisticas."
    },
    "temporary-role": {
      title: "Cargo Temporario",
      description: "Vincule cargos usando o cargo cliente em /painel-loja. Tempo automatico pode ser adicionado depois por produto."
    },
    oauth2: {
      title: "OAuth2",
      description: "Use /apps para bots de clientes e o convite OAuth2 do seu bot no Discord Developer Portal."
    }
  };
  const data = map[option] || map.wallet;

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(theme.dark)
      .setTitle(data.title)
      .setDescription(data.description)],
    components: storeOverviewRows(await getShopSettings(interaction.guildId))
  });
}

function appRows(shop = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("apps:add")
        .setEmoji(buttonEmoji(shop, "add"))
        .setLabel("Conectar bot")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("apps:config")
        .setEmoji(buttonEmoji(shop, "staff"))
        .setLabel("Configurar")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("apps:list")
        .setEmoji(buttonEmoji(shop, "list"))
        .setLabel("Meus bots")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("apps:remove")
        .setEmoji(buttonEmoji(shop, "delete"))
        .setLabel("Remover")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function appPanelEmbed(userApps, hasAccess) {
  const appText = userApps.length
    ? userApps.slice(0, 8).map((app) => `**${app.username || "Bot"}**\nID: \`${app.id}\`\nStatus: ${app.active ? "online" : "desligado"}`).join("\n\n")
    : "Nenhum bot conectado ainda.";

  return new EmbedBuilder()
    .setColor(hasAccess ? theme.cyan : theme.warning)
    .setTitle("Meus apps")
    .setDescription("Conecte o bot comprado, troque nome, foto e status pelo Discord.")
    .addFields(
      { name: "Acesso", value: hasAccess ? "Liberado por compra aprovada ou cargo cliente" : "Precisa de compra aprovada", inline: true },
      { name: "Bots conectados", value: appText }
    )
    .setFooter({ text: "Tokens ficam privados e nao aparecem em logs ou embeds." });
}

function appListEmbed(userApps) {
  return new EmbedBuilder()
    .setColor(theme.primary)
    .setTitle("Bots conectados")
    .setDescription(userApps.length
      ? userApps.map((app) => [
        `**${app.username || "Bot"}**`,
        `ID: \`${app.id}\``,
        `Status: ${app.active ? "online" : "desligado"}`,
        `Texto: ${shortText(app.statusText, "Sem status", 120)}`
      ].join("\n")).join("\n\n")
      : "Voce ainda nao conectou nenhum bot.");
}

async function hasAppAccess(interaction, shop) {
  if (isStaff(interaction.member, shop)) return true;
  if (shop.clientRoleId && interaction.member?.roles?.cache?.has(shop.clientRoleId)) return true;

  const orders = await getOrders();
  return orders.some((order) => (
    order.guildId === interaction.guildId
    && order.userId === interaction.user.id
    && order.status === "aprovado"
  ));
}

function userApps(apps, interaction, shop) {
  const staff = isStaff(interaction.member, shop);
  return apps.filter((app) => (
    app.guildId === interaction.guildId
    && (app.ownerId === interaction.user.id || staff)
  ));
}

async function fetchDiscordBot(token) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bot ${token}` }
  });

  if (!response.ok) {
    throw new Error("Token invalido ou bot sem acesso.");
  }

  const data = await response.json();
  if (!data.bot) throw new Error("Esse token nao parece ser de bot.");
  return data;
}

async function imageUrlToDataUri(url) {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return null;
  if (!/^https?:\/\//i.test(cleanUrl)) throw new Error("A foto precisa ser uma URL http/https.");

  const response = await fetch(cleanUrl);
  if (!response.ok) throw new Error("Nao consegui baixar a foto.");

  const contentType = response.headers.get("content-type") || "";
  if (!/^image\/(png|jpe?g|gif|webp)$/i.test(contentType)) {
    throw new Error("Use uma imagem png, jpg, gif ou webp.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 7 * 1024 * 1024) throw new Error("A imagem e grande demais.");
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function patchDiscordBot(token, values) {
  const body = {};
  if (values.username) body.username = values.username;
  if (values.avatarUrl) body.avatar = await imageUrlToDataUri(values.avatarUrl);
  if (!Object.keys(body).length) return null;

  const response = await fetch("https://discord.com/api/v10/users/@me", {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Discord recusou a alteracao do perfil (${response.status}). ${detail.slice(0, 120)}`);
  }

  return response.json();
}

async function startManagedApp(app) {
  if (!app?.active || !app.token) return;

  const previous = managedClients.get(app.id);
  if (previous) {
    previous.destroy();
    managedClients.delete(app.id);
  }

  const managed = new Client({ intents: [GatewayIntentBits.Guilds] });
  managed.once(Events.ClientReady, () => {
    const activity = app.statusText ? [{ name: app.statusText.slice(0, 128), type: 0 }] : [];
    managed.user.setPresence({ status: app.presence || "online", activities: activity });
    console.log(`App gerenciado online: ${managed.user.tag} (${app.id})`);
  });
  managed.on("error", (error) => console.error(`Erro no app gerenciado ${app.id}:`, error.message));
  managedClients.set(app.id, managed);
  await managed.login(app.token);
}

async function startManagedApps() {
  const apps = await getApps();
  for (const app of apps.filter((item) => item.active)) {
    await startManagedApp(app).catch((error) => console.error(`Nao ligou app ${app.id}:`, error.message));
  }
}

async function stopManagedApp(appId) {
  const managed = managedClients.get(appId);
  if (!managed) return;
  managed.destroy();
  managedClients.delete(appId);
}

async function sendAppsPanel(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  const access = await hasAppAccess(interaction, shop);
  const apps = await getApps();

  await interaction.reply({
    embeds: [appPanelEmbed(userApps(apps, interaction, shop), access)],
    components: access ? appRows(shop) : [],
    ephemeral: true
  });
}

function showAppModal(interaction, action) {
  const isAdd = action === "add";
  const modal = new ModalBuilder()
    .setCustomId(`apps-modal:${action}`)
    .setTitle(isAdd ? "Conectar bot" : action === "config" ? "Configurar bot" : "Remover bot");

  if (isAdd) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("token")
        .setLabel("Token do bot")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("username")
        .setLabel("Novo nome do bot")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("avatarUrl")
        .setLabel("URL da foto/avatar")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("statusText")
        .setLabel("Status/bio curta")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("bio")
        .setLabel("Descricao interna")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false))
    );
  } else if (action === "config") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("appId")
        .setLabel("ID do bot")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("username")
        .setLabel("Novo nome")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("avatarUrl")
        .setLabel("Nova URL da foto")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("statusText")
        .setLabel("Novo status/bio curta")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("bio")
        .setLabel("Descricao interna")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false))
    );
  } else {
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("appId")
        .setLabel("ID do bot")
        .setStyle(TextInputStyle.Short)
        .setRequired(true))
    );
  }

  return interaction.showModal(modal);
}

async function handleAppsButton(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!(await hasAppAccess(interaction, shop))) {
    await interaction.reply({ content: "Voce precisa ter uma compra aprovada ou cargo cliente para usar /apps.", ephemeral: true });
    return;
  }

  if (action === "list") {
    const apps = await getApps();
    await interaction.reply({ embeds: [appListEmbed(userApps(apps, interaction, shop))], ephemeral: true });
    return;
  }

  if (["add", "config", "remove"].includes(action)) {
    await showAppModal(interaction, action);
  }
}

function modalValue(interaction, name) {
  return interaction.fields.getTextInputValue(name)?.trim() || "";
}

async function handleAppsModal(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!(await hasAppAccess(interaction, shop))) {
    await interaction.reply({ content: "Voce precisa ter uma compra aprovada para gerenciar apps.", ephemeral: true });
    return;
  }

  const apps = await getApps();

  if (action === "add") {
    await interaction.deferReply({ ephemeral: true });
    const token = modalValue(interaction, "token");
    const username = modalValue(interaction, "username").slice(0, 32);
    const avatarUrl = modalValue(interaction, "avatarUrl");
    const statusText = modalValue(interaction, "statusText").slice(0, 128);
    const bio = modalValue(interaction, "bio").slice(0, 900);

    let botUser = await fetchDiscordBot(token);
    const patched = await patchDiscordBot(token, { username, avatarUrl });
    if (patched) botUser = patched;

    const record = {
      id: botUser.id,
      guildId: interaction.guildId,
      ownerId: interaction.user.id,
      username: botUser.username,
      token,
      avatarUrl,
      statusText,
      bio,
      presence: "online",
      active: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const index = apps.findIndex((app) => app.guildId === interaction.guildId && app.id === record.id);
    if (index >= 0 && apps[index].ownerId !== interaction.user.id && !isStaff(interaction.member, shop)) {
      await interaction.editReply("Esse bot ja esta conectado por outro cliente.");
      return;
    }

    if (index >= 0) {
      record.createdAt = apps[index].createdAt || record.createdAt;
      apps[index] = { ...apps[index], ...record };
    } else {
      apps.push(record);
    }
    await saveApps(apps);
    await startManagedApp(record);

    await interaction.editReply(`Bot **${record.username}** conectado. ID: \`${record.id}\`.`);
    return;
  }

  const appId = modalValue(interaction, "appId");
  const index = apps.findIndex((app) => app.guildId === interaction.guildId && app.id === appId);
  const app = apps[index];
  if (!app || (app.ownerId !== interaction.user.id && !isStaff(interaction.member, shop))) {
    await interaction.reply({ content: "Bot nao encontrado nos seus apps.", ephemeral: true });
    return;
  }

  if (action === "remove") {
    apps.splice(index, 1);
    await saveApps(apps);
    await stopManagedApp(app.id);
    await interaction.reply({ content: `Bot \`${app.id}\` removido e desligado.`, ephemeral: true });
    return;
  }

  if (action === "config") {
    await interaction.deferReply({ ephemeral: true });
    const username = modalValue(interaction, "username").slice(0, 32);
    const avatarUrl = modalValue(interaction, "avatarUrl");
    const statusText = modalValue(interaction, "statusText").slice(0, 128);
    const bio = modalValue(interaction, "bio").slice(0, 900);
    const patched = await patchDiscordBot(app.token, { username, avatarUrl });

    app.username = patched?.username || username || app.username;
    if (avatarUrl) app.avatarUrl = avatarUrl;
    if (statusText) app.statusText = statusText;
    if (bio) app.bio = bio;
    app.active = true;
    app.updatedAt = new Date().toISOString();
    apps[index] = app;
    await saveApps(apps);
    await startManagedApp(app);

    await interaction.editReply(`Bot **${app.username || app.id}** atualizado e online.`);
  }
}

function ticketRows(ticketId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:claim:${ticketId}`)
        .setEmoji("🙋")
        .setLabel("Assumir")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket:lastbuy:${ticketId}`)
        .setEmoji("🧾")
        .setLabel("Ultima compra")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket:close:${ticketId}`)
        .setEmoji("🔒")
        .setLabel("Fechar")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function configPanelEmbed(settings) {
  return new EmbedBuilder()
    .setColor(theme.dark)
    .setTitle("Sistemas do servidor")
    .setDescription("Configure entrada de membros, auto-cargo e protecao contra contas recentes.")
    .addFields(
      {
        name: "Boas-vindas",
        value: settings.welcome.enabled
          ? `Ativo em <#${settings.welcome.channelId}>`
          : "Desativado",
        inline: true
      },
      {
        name: "Auto-cargo",
        value: settings.autoRole.enabled
          ? `Ativo com <@&${settings.autoRole.roleId}>`
          : "Desativado",
        inline: true
      },
      {
        name: "Anti-fake",
        value: settings.antiFake.enabled
          ? `Ativo: minimo ${settings.antiFake.minAccountAgeDays} dia(s) de conta`
          : "Desativado",
        inline: true
      }
    );
}

function configRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("config:welcome")
        .setEmoji("👋")
        .setLabel("Boas-vindas")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("config:autorole")
        .setEmoji("🏷️")
        .setLabel("Auto-cargo")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("config:antifake")
        .setEmoji("🛡️")
        .setLabel("Anti-fake")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function paymentRows(orderId, shop = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:proof:${orderId}`)
        .setEmoji(buttonEmoji(shop, "proof"))
        .setLabel("Enviar comprovante")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:coupon:${orderId}`)
        .setEmoji(buttonEmoji(shop, "coupon"))
        .setLabel("Aplicar cupom")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:close:${orderId}`)
        .setEmoji(buttonEmoji(shop, "lock"))
        .setLabel("Fechar ticket")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:walletpix:${orderId}`)
        .setEmoji(buttonEmoji(shop, "wallet"))
        .setLabel("Pix auto")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:checkpix:${orderId}`)
        .setEmoji(buttonEmoji(shop, "search"))
        .setLabel("Verificar Pix")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:approve:${orderId}`)
        .setEmoji(buttonEmoji(shop, "approve"))
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:reject:${orderId}`)
        .setEmoji(buttonEmoji(shop, "reject"))
        .setLabel("Reprovar")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function isStaff(member, shop = {}) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.ManageGuild)
    || (shop.staffRoleId && member.roles.cache.has(shop.staffRoleId));
}

async function log(guild, embed) {
  const shop = await getShopSettings(guild.id);
  if (!shop.logChannelId) return;
  const channel = await guild.channels.fetch(shop.logChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
}

async function publicSaleLog(guild, embed) {
  const shop = await getShopSettings(guild.id);
  if (!shop.publicLogChannelId) return;
  const channel = await guild.channels.fetch(shop.publicLogChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
}

async function createMercadoPagoPix(order, shop, user) {
  if (!shop.paymentMethods.wallet || !shop.mercadoPagoAccessToken) {
    throw new Error("Carteira Mercado Pago nao configurada em /painel-loja.");
  }

  const amount = orderAmount(order);
  if (!amount || amount <= 0) throw new Error("Valor do pedido invalido.");

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${shop.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `discord-${order.id}`
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: `${shop.storeName || "Loja"} - pedido ${order.id}`.slice(0, 250),
      payment_method_id: "pix",
      payer: {
        email: `cliente_${user.id}@example.com`,
        first_name: user.username || "Cliente"
      },
      external_reference: order.id
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Mercado Pago recusou o Pix (${response.status}): ${JSON.stringify(data).slice(0, 250)}`);
  }

  return data;
}

async function getMercadoPagoPayment(paymentId, shop) {
  if (!shop.mercadoPagoAccessToken) throw new Error("Access token Mercado Pago nao configurado.");
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${shop.mercadoPagoAccessToken}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Erro ao verificar Pix (${response.status}).`);
  return data;
}

function efiClient(shop) {
  if (!shop.efiClientId || !shop.efiClientSecret || !shop.efiCertificateBase64) {
    throw new Error("Efí Bank nao configurado. Preencha client id, client secret e certificado base64.");
  }

  const EfiPay = require("sdk-node-apis-efi");
  return new EfiPay({
    sandbox: Boolean(shop.efiSandbox),
    client_id: shop.efiClientId,
    client_secret: shop.efiClientSecret,
    certificate: shop.efiCertificateBase64,
    cert_base64: true
  });
}

async function createEfiPix(order, shop) {
  const amount = orderAmount(order);
  if (!amount || amount <= 0) throw new Error("Valor do pedido invalido.");
  const pixKey = shop.efiPixKey || shop.pixKey;
  if (!pixKey) throw new Error("Chave Pix da Efí nao configurada.");

  const efipay = efiClient(shop);
  const body = {
    calendario: { expiracao: 3600 },
    valor: { original: amount.toFixed(2) },
    chave: pixKey,
    solicitacaoPagador: `Pedido ${order.id}`,
    infoAdicionais: [
      { nome: "Loja", valor: String(shop.storeName || "Loja").slice(0, 50) },
      { nome: "Pedido", valor: String(order.id).slice(0, 50) }
    ]
  };

  const charge = await efipay.pixCreateImmediateCharge({}, body);
  const qr = charge.loc?.id ? await efipay.pixGenerateQRCode({ id: charge.loc.id }) : {};
  return {
    provider: "efibank",
    paymentId: charge.txid,
    status: charge.status || "ATIVA",
    qrCode: qr.qrcode || charge.pixCopiaECola || "",
    ticketUrl: qr.linkVisualizacao || charge.location || "",
    txid: charge.txid,
    locId: charge.loc?.id || null
  };
}

async function getEfiPixPayment(txid, shop) {
  const efipay = efiClient(shop);
  return efipay.pixDetailCharge({ txid });
}

function isAutoPaymentApproved(payment, provider) {
  if (provider === "efibank") return payment.status === "CONCLUIDA";
  return payment.status === "approved";
}

async function createProductTicket(interaction, product, field = null, acceptedTerms = false) {
  const shop = await getShopSettings(interaction.guildId);
  if (!shop.salesEnabled) {
    await interaction.reply({ content: "As vendas estao desligadas no momento.", ephemeral: true });
    return;
  }
  const item = field || { ...product, productId: product.id, productName: product.name, fieldId: null };

  if (isBlacklisted(shop, interaction.user.id)) {
    await interaction.reply({ content: "Voce esta bloqueado de comprar nesta loja.", ephemeral: true });
    return;
  }

  if (shop.termsRequired && !acceptedTerms) {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(theme.warning)
        .setTitle("Termos de compra")
        .setDescription(shortText(shop.termsText, "Leia os termos antes de continuar.", 1500))
        .setFooter({ text: "Aceite os termos para abrir o carrinho." })],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`terms:accept:${product.id}:${item.fieldId || "base"}`)
          .setEmoji("✅")
          .setLabel("Aceito os termos")
          .setStyle(ButtonStyle.Secondary)
      )],
      ephemeral: true
    });
    return;
  }

  if (!product.active) {
    await interaction.reply({ content: "Este produto esta desativado.", ephemeral: true });
    return;
  }

  if (item.deliveryMode === "automatic" && (!item.stock || item.stock.length <= 0)) {
    await interaction.reply({ content: "Este produto esta sem estoque no momento.", ephemeral: true });
    return;
  }

  const orderId = `${Date.now().toString(36)}-${interaction.user.id.slice(-4)}`;
  const guild = interaction.guild;
  const channelName = `carrinho-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90);

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  if (shop.staffRoleId) {
    permissionOverwrites.push({
      id: shop.staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: shop.ticketCategoryId || null,
    permissionOverwrites
  });

  const order = {
    id: orderId,
    type: "product",
    userId: interaction.user.id,
    guildId: guild.id,
    channelId: channel.id,
    productId: product.id,
    fieldId: item.fieldId || null,
    itemName: item.name || product.name,
    status: "aguardando_pagamento",
    total: Number(item.price),
    coupon: null,
    proof: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveOrder(order);
  await channel.send({
    content: `<@${interaction.user.id}> ${shop.staffRoleId ? `<@&${shop.staffRoleId}>` : ""}`,
    embeds: [cartEmbed(order, item, shop)],
    components: paymentRows(order.id, shop)
  });

  await log(guild, new EmbedBuilder()
    .setColor(theme.primary)
    .setTitle("Novo carrinho")
    .setDescription(`Carrinho **${order.id}** criado por <@${order.userId}> para **${item.name || product.name}**.`));

  await interaction.reply({ content: `Seu carrinho foi criado: ${channel}`, ephemeral: true });
}

async function sendStorePanel(interaction) {
  const panels = await getPanels();
  const panel = panels.find((item) => item.id === "loja-principal") || panels.find((item) => item.active !== false);
  if (!panel) {
    await interaction.reply({ content: "Nenhum painel de produtos foi cadastrado. Use `/criar painel`.", ephemeral: true });
    return;
  }

  await publishPanel(interaction.channel, panel.id, interaction.guildId);
  await interaction.reply({ content: "Painel de produtos enviado.", ephemeral: true });
}

async function sendConfigPanel(interaction) {
  const settings = await getGuildSettings(interaction.guildId);
  await interaction.channel.send({
    embeds: [configPanelEmbed(settings)],
    components: configRows()
  });
  await interaction.reply({ content: "Painel de configuracao enviado.", ephemeral: true });
}

async function sendShopPanel(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  await interaction.channel.send({
    embeds: [shopPanelEmbed(shop)],
    components: shopRows(shop)
  });
  await interaction.reply({ content: "Painel da loja enviado.", ephemeral: true });
}

async function handleCreateCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode criar itens da loja.", ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "produto") {
    const products = await getProducts();
    const id = normalizeId(interaction.options.getString("id"));
    const stockText = interaction.options.getString("estoque") || "";
    const product = {
      id,
      name: interaction.options.getString("nome"),
      price: interaction.options.getNumber("preco"),
      description: interaction.options.getString("descricao"),
      deliveryMode: interaction.options.getString("entrega") || "manual",
      stock: stockText ? stockText.split("|").map((item) => item.trim()).filter(Boolean) : [],
      active: true,
      couponsEnabled: true
    };

    const index = products.findIndex((item) => item.id === id);
    if (index >= 0) products[index] = { ...products[index], ...product };
    else products.push(product);
    await saveProducts(products);

    await interaction.reply({
      content: `Produto **${product.name}** salvo com ID \`${product.id}\`. Use \`/set produto id:${product.id}\`.`,
      embeds: [productEmbed(product, shop)],
      ephemeral: true
    });
    return;
  }

  if (subcommand === "campo") {
    const products = await getProducts();
    const productId = normalizeId(interaction.options.getString("produto"));
    const productIndex = products.findIndex((item) => item.id === productId);
    if (productIndex < 0) {
      await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
      return;
    }

    const product = products[productIndex];
    product.fields = getProductFields(product);
    const fieldId = normalizeId(interaction.options.getString("id"));
    const stockText = interaction.options.getString("estoque") || "";
    const field = {
      id: fieldId,
      fieldId,
      name: interaction.options.getString("nome"),
      price: interaction.options.getNumber("preco"),
      description: interaction.options.getString("descricao") || "",
      deliveryMode: stockText ? "automatic" : product.deliveryMode,
      stock: stockText ? stockText.split("|").map((item) => item.trim()).filter(Boolean) : [],
      active: true
    };

    const fieldIndex = product.fields.findIndex((item) => item.id === fieldId);
    if (fieldIndex >= 0) product.fields[fieldIndex] = { ...product.fields[fieldIndex], ...field };
    else product.fields.push(field);

    products[productIndex] = product;
    await saveProducts(products);

    await interaction.reply({
      content: `Campo **${field.name}** salvo no produto **${product.name}**.`,
      embeds: [productEmbed(product, shop)],
      ephemeral: true
    });
    return;
  }

  if (subcommand === "painel") {
    const panels = await getPanels();
    const id = normalizeId(interaction.options.getString("id"));
    const panel = {
      id,
      name: interaction.options.getString("nome"),
      description: interaction.options.getString("descricao") || "Escolha um produto abaixo.",
      productIds: interaction.options.getString("produtos").split(",").map((item) => normalizeId(item)).filter(Boolean),
      active: true
    };

    const index = panels.findIndex((item) => item.id === id);
    if (index >= 0) panels[index] = panel;
    else panels.push(panel);
    await savePanels(panels);

    await interaction.reply({ content: `Painel **${panel.name}** salvo. Use \`/set painel id:${panel.id}\`.`, ephemeral: true });
    return;
  }

  if (subcommand === "cupom") {
    const coupons = await getCoupons();
    const code = interaction.options.getString("codigo").trim().toUpperCase();
    const coupon = {
      code,
      discountPercent: Math.max(0, Math.min(100, interaction.options.getNumber("desconto"))),
      maxUses: interaction.options.getInteger("usos") || null,
      used: 0,
      active: true
    };

    const index = coupons.findIndex((item) => item.code === code);
    if (index >= 0) coupons[index] = { ...coupons[index], ...coupon };
    else coupons.push(coupon);
    await saveCoupons(coupons);

    await interaction.reply({ content: `Cupom **${code}** salvo com ${coupon.discountPercent}% de desconto.`, ephemeral: true });
  }
}

async function handleSetCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode publicar itens da loja.", ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "produto") {
    const products = await getProducts();
    const id = normalizeId(interaction.options.getString("id"));
    const product = products.find((item) => item.id === id);
    if (!product) {
      await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
      return;
    }

    await interaction.channel.send({
      embeds: [productEmbed(product, shop)],
      components: productBuyRows(product, shop)
    });
    await interaction.reply({ content: "Produto publicado.", ephemeral: true });
    return;
  }

  if (subcommand === "painel") {
    const products = await getProducts();
    const panels = await getPanels();
    const id = normalizeId(interaction.options.getString("id"));
    const panel = panels.find((item) => item.id === id);
    if (!panel) {
      await interaction.reply({ content: "Painel nao encontrado.", ephemeral: true });
      return;
    }

    const panelProducts = panel.productIds
      .map((productId) => products.find((product) => product.id === productId && product.active))
      .filter(Boolean);

    if (!panelProducts.length) {
      await interaction.reply({ content: "Nenhum produto ativo neste painel.", ephemeral: true });
      return;
    }

    await interaction.channel.send({
      embeds: [panelEmbed(panel, panelProducts, shop)],
      components: [panelSelect(panel, panelProducts)]
    });
    await interaction.reply({ content: "Painel publicado.", ephemeral: true });
  }
}

async function handleStatsCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode ver estatisticas.", ephemeral: true });
    return;
  }

  const orders = (await getOrders()).filter((order) => order.guildId === interaction.guildId);
  const approved = orders.filter((order) => order.status === "aprovado");
  const revenue = approved.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const embed = new EmbedBuilder()
    .setColor(theme.cyan)
    .setTitle("Estatisticas de vendas")
    .setDescription("Resumo dos pedidos registrados neste servidor.")
    .addFields(
      { name: "Pedidos totais", value: String(orders.length), inline: true },
      { name: "Aprovados", value: String(approved.length), inline: true },
      { name: "Faturamento aprovado", value: brl(revenue), inline: true },
      { name: "Em analise", value: String(orders.filter((order) => order.status === "em_analise").length), inline: true },
      { name: "Aguardando pagamento", value: String(orders.filter((order) => order.status === "aguardando_pagamento").length), inline: true }
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleGeneratePix(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  const value = interaction.options.getNumber("valor");
  const description = interaction.options.getString("descricao") || "Pagamento da loja";
  const payload = `PIX|LOJA=${shop.storeName || "Loja"}|CHAVE=${shop.pixKey || "configure-pix"}|VALOR=${value.toFixed(2)}|DESC=${description}`.slice(0, 950);

  const embed = new EmbedBuilder()
    .setColor(theme.success)
    .setTitle("Pix gerado")
    .setDescription(`Use os dados abaixo para receber este pagamento manual.`)
    .addFields(
      { name: "Valor", value: brl(value), inline: true },
      { name: "Descricao", value: description, inline: true },
      { name: "Chave Pix", value: `\`${shop.pixKey || "Configure em /painel-loja"}\`` },
      { name: "Copia e cola", value: `\`${payload}\`` }
    )
    .setFooter({ text: "Pix manual. A equipe ainda precisa conferir e aprovar." });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleWalletStatsCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode ver a carteira.", ephemeral: true });
    return;
  }

  const orders = (await getOrders()).filter((order) => order.guildId === interaction.guildId && order.walletPix?.paymentId);
  const approved = orders.filter((order) => order.status === "aprovado" && (
    order.walletPix.status === "approved" || order.walletPix.status === "CONCLUIDA"
  ));
  const pending = orders.filter((order) => !(order.walletPix.status === "approved" || order.walletPix.status === "CONCLUIDA"));
  const approvedTotal = approved.reduce((sum, order) => sum + orderAmount(order), 0);
  const pendingTotal = pending.reduce((sum, order) => sum + orderAmount(order), 0);

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(theme.success)
      .setTitle("Carteira integrada")
      .setDescription("Resumo dos Pix automáticos. O saque e feito na sua conta do provedor configurado.")
      .addFields(
        { name: "Provedor ativo", value: autoPaymentProvider(shop) === "efi" ? "Efí Bank" : autoPaymentProvider(shop) === "mercadopago" ? "Mercado Pago" : "Pendente", inline: true },
        { name: "Efí Bank", value: shop.efiClientId ? "Configurado" : "Pendente", inline: true },
        { name: "Mercado Pago", value: shop.mercadoPagoAccessToken ? "Configurado" : "Pendente", inline: true },
        { name: "Recebido aprovado", value: brl(approvedTotal), inline: true },
        { name: "Pendente", value: brl(pendingTotal), inline: true },
        { name: "Pedidos aprovados", value: String(approved.length), inline: true },
        { name: "Pedidos pendentes", value: String(pending.length), inline: true }
      )],
    ephemeral: true
  });
}

async function handlePaymentConfigCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar pagamentos.", ephemeral: true });
    return;
  }

  const section = interaction.options.getSubcommand();
  if (section === "pix") {
    await handleShopButton(interaction, "payment");
    return;
  }

  if (section === "efi") {
    await handleShopButton(interaction, "efi");
    return;
  }

  if (section === "mercadopago") {
    await handleShopButton(interaction, "mercadopago");
    return;
  }

  await handleWalletStatsCommand(interaction);
}

async function sendAiPanel(interaction) {
  const settings = await getGuildSettings(interaction.guildId);
  await interaction.channel.send({ embeds: [aiPanelEmbed(settings)], components: aiRows() });
  await interaction.reply({ content: "Painel IA enviado.", ephemeral: true });
}

async function handleAiTestCommand(interaction) {
  const settings = await getGuildSettings(interaction.guildId);
  const question = interaction.options.getString("pergunta");

  if (!settings.ai.enabled) {
    await interaction.reply({ content: "A IA esta desligada. Use `/painel-ia` > API e coloque `sim` em ativar.", ephemeral: true });
    return;
  }

  if (!settings.ai.apiKey) {
    await interaction.reply({ content: "A chave Gemini API nao foi configurada. Use `/painel-ia` > API.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const reply = await generateAiReply(settings, { content: question }, question).catch((error) => {
    console.error("Erro no teste de IA:", error);
    return `Erro ao chamar Gemini: ${error.message}`;
  });
  await interaction.editReply(reply ? reply.slice(0, 1900) : "A IA nao retornou texto. Confira o modelo e a chave API.");
}

async function sendTicketPanel(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  await interaction.channel.send({ embeds: [supportPanelEmbed(shop)], components: supportRows() });
  await interaction.reply({ content: "Painel de ticket enviado.", ephemeral: true });
}

async function handleAiButton(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar a IA.", ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(interaction.guildId);
  const modal = new ModalBuilder()
    .setCustomId(`aicfg-modal:${action}`)
    .setTitle(`Configurar IA ${action}`);

  if (action === "api") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("enabled")
          .setLabel("Ativar IA? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.ai.enabled ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("apiKey")
          .setLabel("Chave Gemini API")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.ai.apiKey || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("model")
          .setLabel("Modelo Gemini")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.ai.model || "gemini-2.0-flash")
          .setRequired(true)
      )
    );
  }

  if (action === "training") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("storeInfo")
          .setLabel("Informacoes da loja")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(settings.ai.storeInfo || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("productInfo")
          .setLabel("Informacoes dos produtos")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(settings.ai.productInfo || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("policy")
          .setLabel("Politica da loja")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(settings.ai.policy || "")
          .setRequired(false)
      )
    );
  }

  if (action === "behavior") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("maxReplies")
          .setLabel("Maximo de respostas por ticket")
          .setStyle(TextInputStyle.Short)
          .setValue(String(settings.ai.maxReplies || 20))
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("faq")
          .setLabel("FAQ: pergunta=resposta, uma por linha")
          .setStyle(TextInputStyle.Paragraph)
          .setValue((settings.ai.faq || []).map((item) => `${item.q}=${item.a}`).join("\n"))
          .setRequired(false)
      )
    );
  }

  await interaction.showModal(modal);
}

async function handleAiModal(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar a IA.", ephemeral: true });
    return;
  }

  const yes = (value) => ["sim", "s", "yes", "y", "true", "1"].includes(value.trim().toLowerCase());
  const settings = await getGuildSettings(interaction.guildId);
  settings.ai = settings.ai || defaultGuildSettings().ai;

  if (action === "api") {
    settings.ai.enabled = yes(interaction.fields.getTextInputValue("enabled"));
    settings.ai.apiKey = interaction.fields.getTextInputValue("apiKey").trim();
    settings.ai.model = interaction.fields.getTextInputValue("model").trim() || "gemini-2.0-flash";
  }

  if (action === "training") {
    settings.ai.storeInfo = interaction.fields.getTextInputValue("storeInfo").trim();
    settings.ai.productInfo = interaction.fields.getTextInputValue("productInfo").trim();
    settings.ai.policy = interaction.fields.getTextInputValue("policy").trim();
  }

  if (action === "behavior") {
    const maxReplies = Number(interaction.fields.getTextInputValue("maxReplies").trim());
    settings.ai.maxReplies = Number.isFinite(maxReplies) && maxReplies > 0 ? Math.min(maxReplies, 100) : 20;
    settings.ai.faq = interaction.fields.getTextInputValue("faq")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [q, ...rest] = line.split("=");
        return { q: (q || "").trim(), a: rest.join("=").trim() };
      })
      .filter((item) => item.q && item.a);
  }

  await saveGuildSettings(interaction.guildId, settings);
  await interaction.reply({ content: "IA configurada.", embeds: [aiPanelEmbed(settings)], ephemeral: true });
}

async function createSupportTicket(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (isBlacklisted(shop, interaction.user.id)) {
    await interaction.reply({ content: "Voce esta bloqueado de abrir atendimento nesta loja.", ephemeral: true });
    return;
  }

  const ticketId = `${Date.now().toString(36)}-${interaction.user.id.slice(-4)}`;
  const channelName = `suporte-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90);

  const permissionOverwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] }
  ];

  if (shop.staffRoleId) {
    permissionOverwrites.push({
      id: shop.staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: shop.ticketCategoryId || null,
    permissionOverwrites
  });

  const ticket = {
    id: ticketId,
    guildId: interaction.guildId,
    channelId: channel.id,
    userId: interaction.user.id,
    status: "open",
    claimedBy: null,
    aiReplies: 0,
    createdAt: new Date().toISOString()
  };
  await saveTicket(ticket);

  await channel.send({
    content: `<@${interaction.user.id}> ${shop.staffRoleId ? `<@&${shop.staffRoleId}>` : ""}`,
    embeds: [new EmbedBuilder()
      .setColor(theme.primary)
      .setTitle("Ticket aberto")
      .setDescription("Descreva sua duvida com detalhes. A IA responde automaticamente ate alguem da equipe assumir.")],
    components: ticketRows(ticket.id)
  });

  await log(interaction.guild, new EmbedBuilder()
    .setColor(theme.primary)
    .setTitle("Ticket de suporte aberto")
    .setDescription(`Ticket **${ticket.id}** aberto por <@${ticket.userId}>.`));

  await interaction.reply({ content: `Ticket criado: ${channel}`, ephemeral: true });
}

async function handleTicketButton(interaction, action, ticketId) {
  const tickets = await getTickets();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  const ticket = tickets[index];
  const shop = await getShopSettings(interaction.guildId);

  if (!ticket) {
    await interaction.reply({ content: "Ticket nao encontrado.", ephemeral: true });
    return;
  }

  if (action === "claim") {
    if (!isStaff(interaction.member, shop)) {
      await interaction.reply({ content: "Apenas a equipe pode assumir tickets.", ephemeral: true });
      return;
    }
    ticket.claimedBy = interaction.user.id;
    tickets[index] = ticket;
    await writeJson(TICKETS_FILE, tickets);
    await interaction.reply({ content: `Atendimento assumido por <@${interaction.user.id}>.` });
    return;
  }

  if (action === "lastbuy") {
    const orders = (await getOrders()).filter((order) => order.userId === ticket.userId && order.status === "aprovado");
    const last = orders[orders.length - 1];
    await interaction.reply({
      content: last ? `Ultima compra aprovada: **${last.productId || last.planId || last.id}** em ${last.updatedAt || last.createdAt}.` : "Esse usuario nao tem compra aprovada.",
      ephemeral: true
    });
    return;
  }

  if (action === "close") {
    const canClose = ticket.userId === interaction.user.id || isStaff(interaction.member, shop);
    if (!canClose) {
      await interaction.reply({ content: "Voce nao pode fechar este ticket.", ephemeral: true });
      return;
    }
    ticket.status = "closed";
    ticket.closedAt = new Date().toISOString();
    tickets[index] = ticket;
    await writeJson(TICKETS_FILE, tickets);
    await interaction.reply({ content: "Ticket sera fechado em 5 segundos.", ephemeral: true });
    setTimeout(() => interaction.channel.delete("Ticket de suporte fechado").catch(() => null), 5000);
  }
}

function normalizeGeminiModel(model) {
  const clean = String(model || "").trim();
  if (!clean || clean === "gemini-1.5-flash") return "gemini-2.0-flash";
  return clean;
}

async function generateAiReply(settings, message, question = null) {
  if (!settings.ai.enabled || !settings.ai.apiKey) return null;

  const faq = (settings.ai.faq || []).map((item) => `Pergunta: ${item.q}\nResposta: ${item.a}`).join("\n\n");
  const prompt = [
    "Voce e um atendente de suporte de uma loja Discord.",
    "Responda em portugues do Brasil, com clareza, sem prometer reembolso se a politica negar.",
    `Informacoes da loja: ${settings.ai.storeInfo || "Nao informado"}`,
    `Produtos: ${settings.ai.productInfo || "Nao informado"}`,
    `Politica: ${settings.ai.policy || "Nao informado"}`,
    faq ? `FAQ:\n${faq}` : "",
    `Cliente perguntou: ${question || message.content}`
  ].filter(Boolean).join("\n\n");

  const model = normalizeGeminiModel(settings.ai.model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response;

  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${settings.ai.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    })
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Gemini demorou demais para responder. Tente de novo ou confira a chave/modelo.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini falhou: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const json = await response.json();
  return json.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || null;
}

async function handleShopButton(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode alterar a loja.", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`shopcfg-modal:${action}`)
    .setTitle(`Configurar ${action}`);

  if (action === "identity") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("storeName")
          .setLabel("Nome da loja")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.storeName || "")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("supportUrl")
          .setLabel("Link de suporte/convite")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.supportUrl || "")
          .setRequired(false)
      )
    );
  }

  if (action === "payment") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("pixKey")
          .setLabel("Chave Pix")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.pixKey || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("pixEnabled")
          .setLabel("Pix ativo? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.paymentMethods.pix ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("manualProof")
          .setLabel("Comprovante manual? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.paymentMethods.manualProof ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("mercadoPago")
          .setLabel("Mercado Pago ativo? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.paymentMethods.mercadoPago ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("wallet")
          .setLabel("Carteira integrada? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.paymentMethods.wallet ? "sim" : "nao")
          .setRequired(true)
      )
    );
  }

  if (action === "sales") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("salesEnabled")
          .setLabel("Vendas ligadas? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.salesEnabled ? "sim" : "nao")
          .setRequired(true)
      )
    );
  }

  if (action === "wallet") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("paymentProvider")
          .setLabel("Provedor: efi ou mercadopago")
          .setStyle(TextInputStyle.Short)
          .setValue(autoPaymentProvider(shop) === "efi" ? "efi" : autoPaymentProvider(shop) === "mercadopago" ? "mercadopago" : "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("mercadoPagoAccessToken")
          .setLabel("Access Token Mercado Pago")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.mercadoPagoAccessToken || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiClientId")
          .setLabel("Efí Client ID")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.efiClientId || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiClientSecret")
          .setLabel("Efí Client Secret")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.efiClientSecret || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiCertificateBase64")
          .setLabel("Efí certificado Pix base64")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(shop.efiCertificateBase64 || "")
          .setRequired(false)
      )
    );
  }

  if (action === "efi") {
    modal.setTitle("Configurar Efi Bank");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiClientId")
          .setLabel("Efi Client ID")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.efiClientId || "")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiClientSecret")
          .setLabel("Efi Client Secret")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.efiClientSecret || "")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiCertificateBase64")
          .setLabel("Certificado Pix em base64")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(shop.efiCertificateBase64 || "")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiPixKey")
          .setLabel("Chave Pix cadastrada na Efi")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.efiPixKey || shop.pixKey || "")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("efiSandbox")
          .setLabel("Sandbox? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.efiSandbox ? "sim" : "nao")
          .setRequired(true)
      )
    );
  }

  if (action === "mercadopago") {
    modal.setTitle("Configurar Mercado Pago");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("mercadoPagoAccessToken")
          .setLabel("Access Token Mercado Pago")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(shop.mercadoPagoAccessToken || "")
          .setRequired(true)
      )
    );
  }

  if (action === "emojis") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emojis")
          .setLabel("Emojis key=emoji, um por linha")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(emojisPreview(shop).slice(0, 3800))
          .setRequired(false)
      )
    );
  }

  if (action === "channels") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("logChannelId")
          .setLabel("ID do canal de log privada")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.logChannelId || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("publicLogChannelId")
          .setLabel("ID do canal de log publica")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.publicLogChannelId || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ticketCategoryId")
          .setLabel("ID da categoria de tickets")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.ticketCategoryId || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reviewChannelId")
          .setLabel("ID do canal de avaliacoes")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.reviewChannelId || "")
          .setRequired(false)
      )
    );
  }

  if (action === "clientrole") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("clientRoleId")
          .setLabel("ID do cargo cliente")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.clientRoleId || "")
          .setRequired(false)
      )
    );
  }

  if (action === "staff") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("staffRoleId")
          .setLabel("ID do cargo staff")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.staffRoleId || "")
          .setRequired(false)
      )
    );
  }

  await interaction.showModal(modal);
}

async function handleShopModal(interaction, action) {
  const settings = await getGuildSettings(interaction.guildId);
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode alterar a loja.", ephemeral: true });
    return;
  }

  settings.shop = settings.shop || {};

  if (action === "identity") {
    settings.shop.storeName = interaction.fields.getTextInputValue("storeName").trim();
    settings.shop.supportUrl = interaction.fields.getTextInputValue("supportUrl").trim();
  }

  if (action === "payment") {
    settings.shop.pixKey = interaction.fields.getTextInputValue("pixKey").trim();
    settings.shop.paymentMethods = {
      pix: boolFromText(interaction.fields.getTextInputValue("pixEnabled")),
      manualProof: boolFromText(interaction.fields.getTextInputValue("manualProof")),
      mercadoPago: boolFromText(interaction.fields.getTextInputValue("mercadoPago")),
      wallet: boolFromText(interaction.fields.getTextInputValue("wallet"))
    };
  }

  if (action === "sales") {
    settings.shop.salesEnabled = boolFromText(interaction.fields.getTextInputValue("salesEnabled"));
  }

  if (action === "wallet") {
    const provider = interaction.fields.getTextInputValue("paymentProvider").trim().toLowerCase();
    settings.shop.mercadoPagoAccessToken = interaction.fields.getTextInputValue("mercadoPagoAccessToken").trim();
    settings.shop.efiClientId = interaction.fields.getTextInputValue("efiClientId").trim();
    settings.shop.efiClientSecret = interaction.fields.getTextInputValue("efiClientSecret").trim();
    settings.shop.efiCertificateBase64 = interaction.fields.getTextInputValue("efiCertificateBase64").trim();
    settings.shop.efiPixKey = settings.shop.pixKey || settings.shop.efiPixKey || "";
    settings.shop.paymentProvider = provider === "efi" ? "efi" : provider === "mercadopago" ? "mercadopago" : settings.shop.paymentProvider || "manual";
    settings.shop.paymentMethods = settings.shop.paymentMethods || {};
    settings.shop.paymentMethods.wallet = Boolean(settings.shop.mercadoPagoAccessToken || settings.shop.efiClientId);
    settings.shop.paymentMethods.mercadoPago = Boolean(settings.shop.mercadoPagoAccessToken);
    settings.shop.paymentMethods.efiBank = Boolean(settings.shop.efiClientId && settings.shop.efiClientSecret && settings.shop.efiCertificateBase64);
  }

  if (action === "efi") {
    settings.shop.efiClientId = interaction.fields.getTextInputValue("efiClientId").trim();
    settings.shop.efiClientSecret = interaction.fields.getTextInputValue("efiClientSecret").trim();
    settings.shop.efiCertificateBase64 = interaction.fields.getTextInputValue("efiCertificateBase64").trim();
    settings.shop.efiPixKey = interaction.fields.getTextInputValue("efiPixKey").trim();
    settings.shop.pixKey = settings.shop.efiPixKey || settings.shop.pixKey || "";
    settings.shop.efiSandbox = boolFromText(interaction.fields.getTextInputValue("efiSandbox"));
    settings.shop.paymentProvider = "efi";
    settings.shop.paymentMethods = settings.shop.paymentMethods || {};
    settings.shop.paymentMethods.pix = true;
    settings.shop.paymentMethods.wallet = true;
    settings.shop.paymentMethods.efiBank = Boolean(settings.shop.efiClientId && settings.shop.efiClientSecret && settings.shop.efiCertificateBase64 && settings.shop.efiPixKey);
    settings.shop.paymentMethods.mercadoPago = false;
  }

  if (action === "mercadopago") {
    settings.shop.mercadoPagoAccessToken = interaction.fields.getTextInputValue("mercadoPagoAccessToken").trim();
    settings.shop.paymentProvider = "mercadopago";
    settings.shop.paymentMethods = settings.shop.paymentMethods || {};
    settings.shop.paymentMethods.pix = true;
    settings.shop.paymentMethods.wallet = true;
    settings.shop.paymentMethods.mercadoPago = Boolean(settings.shop.mercadoPagoAccessToken);
    settings.shop.paymentMethods.efiBank = false;
  }

  if (action === "emojis") {
    const lines = interaction.fields.getTextInputValue("emojis").split(/\r?\n/);
    const emojis = { ...(settings.shop.emojis || {}) };
    for (const line of lines) {
      const clean = line.trim();
      if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
      const [key, ...valueParts] = clean.split("=");
      const normalizedKey = key.trim();
      const value = valueParts.join("=").trim();
      if (defaultEmojis[normalizedKey] && value) emojis[normalizedKey] = value;
    }
    settings.shop.emojis = emojis;
  }

  if (action === "channels") {
    settings.shop.logChannelId = interaction.fields.getTextInputValue("logChannelId").trim();
    settings.shop.publicLogChannelId = interaction.fields.getTextInputValue("publicLogChannelId").trim();
    settings.shop.ticketCategoryId = interaction.fields.getTextInputValue("ticketCategoryId").trim();
    settings.shop.reviewChannelId = interaction.fields.getTextInputValue("reviewChannelId").trim();
  }

  if (action === "staff") {
    settings.shop.staffRoleId = interaction.fields.getTextInputValue("staffRoleId").trim();
  }

  if (action === "clientrole") {
    settings.shop.clientRoleId = interaction.fields.getTextInputValue("clientRoleId").trim();
  }

  await saveGuildSettings(interaction.guildId, settings);
  await interaction.reply({
    content: "Loja configurada.",
    embeds: [shopPanelEmbed(await getShopSettings(interaction.guildId))],
    ephemeral: true
  });
}

async function handlePanelSelect(interaction) {
  const products = await getProducts();
  const product = products.find((item) => item.id === interaction.values[0]);

  if (!product) {
    await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
    return;
  }

  await beginProductPurchase(interaction, product);
}

async function handleProductButton(interaction, action, productId) {
  const products = await getProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
    return;
  }

  if (action === "buy") {
    await beginProductPurchase(interaction, product);
    return;
  }

  if (action === "stock") {
    await interaction.reply({
      content: `Estoque de **${product.name}**: ${productStockText(product)}.`,
      ephemeral: true
    });
  }
}

async function publishProduct(channel, productId, guildId) {
  const shop = await getShopSettings(guildId);
  const products = await getProducts();
  const product = products.find((item) => item.id === normalizeId(productId));
  if (!product) return false;
  await channel.send({ embeds: [productEmbed(product, shop)], components: productBuyRows(product, shop) });
  return true;
}

async function publishPanel(channel, panelId, guildId) {
  const shop = await getShopSettings(guildId);
  const products = await getProducts();
  const panels = await getPanels();
  const panel = panels.find((item) => item.id === normalizeId(panelId));
  if (!panel) return false;
  const panelProducts = panel.productIds
    .map((productId) => products.find((product) => product.id === productId && product.active))
    .filter(Boolean);
  if (!panelProducts.length) return false;
  await channel.send({ embeds: [panelEmbed(panel, panelProducts, shop)], components: [panelSelect(panel, panelProducts)] });
  return true;
}

async function handleBlacklistCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode gerenciar blacklist.", ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(interaction.guildId);
  settings.shop.blacklist = settings.shop.blacklist || [];
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    const user = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("motivo") || "Sem motivo informado";
    const entry = { userId: user.id, reason, addedBy: interaction.user.id, addedAt: new Date().toISOString() };
    const index = settings.shop.blacklist.findIndex((item) => item.userId === user.id);
    if (index >= 0) settings.shop.blacklist[index] = entry;
    else settings.shop.blacklist.push(entry);
    await saveGuildSettings(interaction.guildId, settings);
    await interaction.reply({ content: `<@${user.id}> foi adicionado a blacklist.`, ephemeral: true });
    return;
  }

  if (subcommand === "remover") {
    const user = interaction.options.getUser("usuario");
    settings.shop.blacklist = settings.shop.blacklist.filter((item) => item.userId !== user.id);
    await saveGuildSettings(interaction.guildId, settings);
    await interaction.reply({ content: `<@${user.id}> foi removido da blacklist.`, ephemeral: true });
    return;
  }

  const list = settings.shop.blacklist.length
    ? settings.shop.blacklist.map((item) => `<@${item.userId}> - ${item.reason}`).join("\n")
    : "Nenhum usuario bloqueado.";
  await interaction.reply({ content: list, ephemeral: true });
}

async function handleTermsCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar termos.", ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(interaction.guildId);
  settings.shop.termsText = interaction.options.getString("texto");
  settings.shop.termsRequired = interaction.options.getBoolean("obrigatorio") ?? true;
  await saveGuildSettings(interaction.guildId, settings);

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(theme.primary)
      .setTitle("Termos atualizados")
      .setDescription(shortText(settings.shop.termsText, "Sem termos", 1500))
      .addFields({ name: "Obrigatorio", value: yesNo(settings.shop.termsRequired), inline: true })],
    ephemeral: true
  });
}

function giveawayEmbed(giveaway) {
  return new EmbedBuilder()
    .setColor(theme.purple)
    .setTitle("Sorteio")
    .setDescription(`Premio: **${giveaway.prize}**\nTermina em: <t:${Math.floor(new Date(giveaway.endsAt).getTime() / 1000)}:R>`)
    .addFields(
      { name: "Vencedores", value: String(giveaway.winnersCount), inline: true },
      { name: "Participantes", value: String(giveaway.participants.length), inline: true },
      { name: "Requisito", value: giveaway.requiredRoleId ? `<@&${giveaway.requiredRoleId}>` : "Nenhum", inline: true }
    )
    .setFooter({ text: `ID ${giveaway.id}` });
}

function giveawayRows(giveawayId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:join:${giveawayId}`)
      .setEmoji("🎉")
      .setLabel("Participar")
      .setStyle(ButtonStyle.Secondary)
  )];
}

async function handleGiveawayCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode gerenciar sorteios.", ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "criar") {
    const minutes = Math.max(1, interaction.options.getInteger("minutos"));
    const giveaway = {
      id: Date.now().toString(36),
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: null,
      prize: interaction.options.getString("premio"),
      winnersCount: interaction.options.getInteger("vencedores") || 1,
      requiredRoleId: interaction.options.getRole("cargo")?.id || null,
      participants: [],
      status: "open",
      endsAt: new Date(Date.now() + minutes * 60000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const message = await interaction.channel.send({ embeds: [giveawayEmbed(giveaway)], components: giveawayRows(giveaway.id) });
    giveaway.messageId = message.id;
    const giveaways = await getGiveaways();
    giveaways.push(giveaway);
    await saveGiveaways(giveaways);
    await interaction.reply({ content: `Sorteio criado com ID \`${giveaway.id}\`.`, ephemeral: true });
    return;
  }

  await endGiveaway(interaction.options.getString("id"), interaction);
}

async function endGiveaway(giveawayId, interaction = null) {
  const giveaways = await getGiveaways();
  const index = giveaways.findIndex((item) => item.id === giveawayId);
  const giveaway = giveaways[index];
  if (!giveaway || giveaway.status !== "open") {
    if (interaction) await interaction.reply({ content: "Sorteio nao encontrado ou ja encerrado.", ephemeral: true });
    return;
  }

  const shuffled = [...giveaway.participants].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, giveaway.winnersCount);
  giveaway.status = "closed";
  giveaway.winners = winners;
  giveaway.closedAt = new Date().toISOString();
  giveaways[index] = giveaway;
  await saveGiveaways(giveaways);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (channel?.isTextBased()) {
    await channel.send(winners.length
      ? `Sorteio **${giveaway.prize}** encerrado. Vencedor(es): ${winners.map((id) => `<@${id}>`).join(", ")}`
      : `Sorteio **${giveaway.prize}** encerrado sem participantes.`);
  }

  if (interaction) await interaction.reply({ content: "Sorteio encerrado.", ephemeral: true });
}

async function handleGiveawayButton(interaction, action, giveawayId) {
  if (action !== "join") return;

  const giveaways = await getGiveaways();
  const index = giveaways.findIndex((item) => item.id === giveawayId);
  const giveaway = giveaways[index];
  if (!giveaway || giveaway.status !== "open") {
    await interaction.reply({ content: "Este sorteio ja foi encerrado.", ephemeral: true });
    return;
  }

  if (giveaway.requiredRoleId && !interaction.member.roles.cache.has(giveaway.requiredRoleId)) {
    await interaction.reply({ content: "Voce nao tem o cargo necessario para participar.", ephemeral: true });
    return;
  }

  if (giveaway.participants.includes(interaction.user.id)) {
    await interaction.reply({ content: "Voce ja esta participando.", ephemeral: true });
    return;
  }

  giveaway.participants.push(interaction.user.id);
  giveaways[index] = giveaway;
  await saveGiveaways(giveaways);

  await interaction.reply({ content: "Voce entrou no sorteio.", ephemeral: true });
  await interaction.message.edit({ embeds: [giveawayEmbed(giveaway)], components: giveawayRows(giveaway.id) }).catch(() => null);
}

async function processScheduledTasks() {
  const now = Date.now();

  const giveaways = await getGiveaways();
  for (const giveaway of giveaways.filter((item) => item.status === "open" && new Date(item.endsAt).getTime() <= now)) {
    await endGiveaway(giveaway.id);
  }

  const reposts = await getReposts();
  let changed = false;
  for (const repost of reposts) {
    if (new Date(repost.nextAt).getTime() > now) continue;
    const channel = await client.channels.fetch(repost.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      if (repost.type === "product") await publishProduct(channel, repost.id, repost.guildId).catch(() => null);
      if (repost.type === "panel") await publishPanel(channel, repost.id, repost.guildId).catch(() => null);
    }
    repost.nextAt = new Date(Date.now() + repost.intervalMinutes * 60000).toISOString();
    changed = true;
  }
  if (changed) await saveReposts(reposts);
}

async function handleRepostCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar repost.", ephemeral: true });
    return;
  }

  const type = interaction.options.getString("tipo");
  const id = normalizeId(interaction.options.getString("id"));
  const minutes = interaction.options.getInteger("minutos");
  const reposts = await getReposts();
  const key = `${interaction.guildId}:${interaction.channelId}:${type}:${id}`;

  const filtered = reposts.filter((item) => item.key !== key);
  if (minutes <= 0) {
    await saveReposts(filtered);
    await interaction.reply({ content: "Repost desativado para este item neste canal.", ephemeral: true });
    return;
  }

  filtered.push({
    key,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    type,
    id,
    intervalMinutes: minutes,
    nextAt: new Date(Date.now() + minutes * 60000).toISOString()
  });
  await saveReposts(filtered);
  await interaction.reply({ content: `Repost configurado a cada ${minutes} minuto(s).`, ephemeral: true });
}

async function handleReviewCommand(interaction) {
  const note = interaction.options.getInteger("nota");
  const rating = Math.max(1, Math.min(5, note));
  const orders = (await getOrders()).filter((order) => order.guildId === interaction.guildId && order.userId === interaction.user.id && order.status === "aprovado");
  const order = orders[orders.length - 1];
  if (!order) {
    await interaction.reply({ content: "Voce precisa ter uma compra aprovada para avaliar.", ephemeral: true });
    return;
  }

  const review = {
    id: Date.now().toString(36),
    guildId: interaction.guildId,
    userId: interaction.user.id,
    orderId: order.id,
    rating,
    comment: interaction.options.getString("comentario") || "",
    createdAt: new Date().toISOString()
  };
  const reviews = await getReviews();
  reviews.push(review);
  await saveReviews(reviews);

  const shop = await getShopSettings(interaction.guildId);
  const embed = new EmbedBuilder()
    .setColor(theme.success)
    .setTitle("Nova avaliacao")
    .setDescription(`Nota: **${rating}/5**\n${review.comment || "Sem comentario."}`)
    .addFields({ name: "Cliente", value: `<@${interaction.user.id}>`, inline: true });

  if (shop.reviewChannelId) {
    const channel = await interaction.guild.channels.fetch(shop.reviewChannelId).catch(() => null);
    await channel?.send({ embeds: [embed] }).catch(() => null);
  } else if (shop.publicLogChannelId) {
    const channel = await interaction.guild.channels.fetch(shop.publicLogChannelId).catch(() => null);
    await channel?.send({ embeds: [embed] }).catch(() => null);
  }

  await interaction.reply({ content: "Obrigado pela avaliacao.", ephemeral: true });
}

async function handleProtectionCommand(interaction) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar protecoes.", ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(interaction.guildId);
  settings.protection = settings.protection || {};
  settings.protection.antiLink = interaction.options.getBoolean("anti-link");
  await saveGuildSettings(interaction.guildId, settings);

  await interaction.reply({
    content: `Anti-link ${settings.protection.antiLink ? "ativado" : "desativado"}.`,
    ephemeral: true
  });
}

async function handleProtectionButton(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode configurar protecoes.", ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(interaction.guildId);
  settings.protection = settings.protection || {};
  settings.antiFake = settings.antiFake || {};

  if (action === "antilink") settings.protection.antiLink = !settings.protection.antiLink;
  if (action === "antibot") settings.protection.antiBot = !settings.protection.antiBot;
  if (action === "antifake") settings.antiFake.enabled = !settings.antiFake.enabled;

  await saveGuildSettings(interaction.guildId, settings);
  await interaction.update({ embeds: [protectionPanelEmbed(settings, shop)], components: protectionRows() });
}

async function beginProductPurchase(interaction, product, field = null, acceptedTerms = false) {
  const fields = getProductFields(product).filter((item) => item.active !== false);
  if (!field && fields.length) {
    await interaction.reply({
      content: `Escolha uma opcao de **${product.name}**:`,
      components: [productFieldSelect(product)],
      ephemeral: true
    });
    return;
  }

  await createProductTicket(interaction, product, field, acceptedTerms);
}

async function handleFieldSelect(interaction) {
  const [, , productId] = interaction.customId.split(":");
  const products = await getProducts();
  const product = products.find((item) => item.id === productId);
  const field = getProductFields(product || {}).find((item) => item.id === interaction.values[0]);

  if (!product || !field) {
    await interaction.reply({ content: "Opcao nao encontrada.", ephemeral: true });
    return;
  }

  await beginProductPurchase(interaction, product, field);
}

async function handleTermsAccept(interaction, productId, fieldId) {
  const products = await getProducts();
  const product = products.find((item) => item.id === productId);
  const field = fieldId && fieldId !== "base"
    ? getProductFields(product || {}).find((item) => item.id === fieldId)
    : null;

  if (!product) {
    await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
    return;
  }

  await createProductTicket(interaction, product, field, true);
}

async function handleConfigButton(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode alterar configuracoes.", ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(interaction.guildId);
  const modal = new ModalBuilder()
    .setCustomId(`config-modal:${action}`)
    .setTitle(`Configurar ${action}`);

  if (action === "welcome") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("enabled")
          .setLabel("Ativar? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.welcome.enabled ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("channelId")
          .setLabel("ID do canal de boas-vindas")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.welcome.channelId || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("message")
          .setLabel("Mensagem ({user} menciona o membro)")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(settings.welcome.message)
          .setRequired(true)
      )
    );
  }

  if (action === "autorole") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("enabled")
          .setLabel("Ativar? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.autoRole.enabled ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("roleId")
          .setLabel("ID do cargo automatico")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.autoRole.roleId || "")
          .setRequired(false)
      )
    );
  }

  if (action === "antifake") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("enabled")
          .setLabel("Ativar? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.antiFake.enabled ? "sim" : "nao")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("minDays")
          .setLabel("Idade minima da conta em dias")
          .setStyle(TextInputStyle.Short)
          .setValue(String(settings.antiFake.minAccountAgeDays))
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("logOnly")
          .setLabel("So logar? sim ou nao")
          .setStyle(TextInputStyle.Short)
          .setValue(settings.antiFake.logOnly ? "sim" : "nao")
          .setRequired(true)
      )
    );
  }

  await interaction.showModal(modal);
}

async function handleConfigModal(interaction, action) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode alterar configuracoes.", ephemeral: true });
    return;
  }

  const yes = (value) => ["sim", "s", "yes", "y", "true", "1"].includes(value.trim().toLowerCase());
  const settings = await getGuildSettings(interaction.guildId);

  if (action === "welcome") {
    settings.welcome.enabled = yes(interaction.fields.getTextInputValue("enabled"));
    settings.welcome.channelId = interaction.fields.getTextInputValue("channelId").trim();
    settings.welcome.message = interaction.fields.getTextInputValue("message").trim();
  }

  if (action === "autorole") {
    settings.autoRole.enabled = yes(interaction.fields.getTextInputValue("enabled"));
    settings.autoRole.roleId = interaction.fields.getTextInputValue("roleId").trim();
  }

  if (action === "antifake") {
    const minDays = Number(interaction.fields.getTextInputValue("minDays").trim());
    settings.antiFake.enabled = yes(interaction.fields.getTextInputValue("enabled"));
    settings.antiFake.minAccountAgeDays = Number.isFinite(minDays) && minDays >= 0 ? minDays : 7;
    settings.antiFake.logOnly = yes(interaction.fields.getTextInputValue("logOnly"));
  }

  await saveGuildSettings(interaction.guildId, settings);
  await interaction.reply({
    content: "Configuracao salva.",
    embeds: [configPanelEmbed(settings)],
    ephemeral: true
  });
}

async function handleProofButton(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order || order.userId !== interaction.user.id) {
    await interaction.reply({ content: "Este pedido nao pertence a voce.", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`order:proof-modal:${orderId}`)
    .setTitle("Enviar comprovante");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("payer")
        .setLabel("Nome de quem pagou")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Horario, valor ou observacao")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

async function handleCouponButton(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order || order.userId !== interaction.user.id) {
    await interaction.reply({ content: "Este carrinho nao pertence a voce.", ephemeral: true });
    return;
  }

  if (order.type !== "product") {
    await interaction.reply({ content: "Cupom so esta disponivel para produtos.", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`order:coupon-modal:${orderId}`)
    .setTitle("Aplicar cupom");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("coupon")
        .setLabel("Codigo do cupom")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

async function handleCouponModal(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order || order.userId !== interaction.user.id) {
    await interaction.reply({ content: "Carrinho nao encontrado.", ephemeral: true });
    return;
  }

  const products = await getProducts();
  const product = products.find((item) => item.id === order.productId);
  const field = getProductFields(product || {}).find((item) => item.id === order.fieldId);
  const item = field || product;
  if (!product || !product.couponsEnabled) {
    await interaction.reply({ content: "Este produto nao aceita cupom.", ephemeral: true });
    return;
  }

  const coupons = await getCoupons();
  const code = interaction.fields.getTextInputValue("coupon").trim().toUpperCase();
  const coupon = coupons.find((item) => item.code === code && item.active);

  if (!coupon || (coupon.maxUses && coupon.used >= coupon.maxUses)) {
    await interaction.reply({ content: "Cupom invalido ou esgotado.", ephemeral: true });
    return;
  }

  const discount = Math.max(0, Math.min(100, Number(coupon.discountPercent || 0)));
  order.coupon = { code: coupon.code, discountPercent: discount };
  order.total = Number((Number(item.price) * (1 - discount / 100)).toFixed(2));
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  await interaction.reply({
    content: `Cupom **${code}** aplicado. Novo total: **${brl(order.total)}**.`,
    ephemeral: true
  });

  await interaction.channel.send({
    embeds: [cartEmbed(order, item, await getShopSettings(interaction.guildId))],
    components: paymentRows(order.id, await getShopSettings(interaction.guildId))
  });
}

async function handleWalletPix(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order || order.userId !== interaction.user.id) {
    await interaction.reply({ content: "Pedido nao encontrado.", ephemeral: true });
    return;
  }

  const shop = await getShopSettings(interaction.guildId);
  await interaction.deferReply({ ephemeral: true });
  const provider = autoPaymentProvider(shop);

  if (order.walletPix?.paymentId) {
    await interaction.editReply(`Ja existe um Pix gerado para este pedido. Use **Verificar Pix**.\n\nCopia e cola:\n\`\`\`\n${order.walletPix.qrCode || "Nao disponivel"}\n\`\`\``);
    return;
  }

  const payment = provider === "efi"
    ? await createEfiPix(order, shop)
    : await createMercadoPagoPix(order, shop, interaction.user);
  const transactionData = payment.point_of_interaction?.transaction_data || {};
  order.walletPix = {
    provider: provider === "efi" ? "efibank" : "mercadopago",
    paymentId: String(provider === "efi" ? payment.paymentId : payment.id),
    txid: provider === "efi" ? payment.txid : null,
    locId: provider === "efi" ? payment.locId : null,
    status: payment.status || "pending",
    qrCode: provider === "efi" ? payment.qrCode : transactionData.qr_code || "",
    ticketUrl: provider === "efi" ? payment.ticketUrl : transactionData.ticket_url || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(theme.success)
      .setTitle("Pix carteira gerado")
      .setDescription(order.walletPix.provider === "efibank"
        ? "Pague pelo Pix abaixo. O valor cai na sua conta Efí Bank configurada."
        : "Pague pelo Pix abaixo. O valor cai na sua conta Mercado Pago configurada.")
      .addFields(
        { name: "Pedido", value: order.id, inline: true },
        { name: "Valor", value: brl(orderAmount(order)), inline: true },
        { name: "Provedor", value: order.walletPix.provider === "efibank" ? "Efí Bank" : "Mercado Pago", inline: true },
        { name: "Pagamento", value: `\`${order.walletPix.paymentId}\``, inline: true },
        { name: "Copia e cola", value: `\`\`\`\n${shortText(order.walletPix.qrCode, "Nao retornado", 900)}\n\`\`\`` },
        { name: "Link", value: order.walletPix.ticketUrl || "Nao retornado" }
      )]
  });
}

async function handleCheckWalletPix(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order) {
    await interaction.reply({ content: "Pedido nao encontrado.", ephemeral: true });
    return;
  }

  const shop = await getShopSettings(interaction.guildId);
  const canCheck = order.userId === interaction.user.id || isStaff(interaction.member, shop);
  if (!canCheck) {
    await interaction.reply({ content: "Voce nao pode verificar este pedido.", ephemeral: true });
    return;
  }

  if (!order.walletPix?.paymentId) {
    await interaction.reply({ content: "Este pedido ainda nao tem Pix carteira gerado.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const provider = order.walletPix.provider || "mercadopago";
  const payment = provider === "efibank"
    ? await getEfiPixPayment(order.walletPix.txid || order.walletPix.paymentId, shop)
    : await getMercadoPagoPayment(order.walletPix.paymentId, shop);
  order.walletPix.status = payment.status || order.walletPix.status;
  order.walletPix.statusDetail = payment.status_detail || "";
  order.walletPix.updatedAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  if (isAutoPaymentApproved(payment, provider)) {
    await interaction.editReply(`Pix aprovado no ${provider === "efibank" ? "Efí Bank" : "Mercado Pago"}. Finalizando a entrega...`);
    await handleApprove(interaction, orderId, false);
    return;
  }

  await interaction.editReply(`Pix ainda nao aprovado. Status atual: **${payment.status || "desconhecido"}**.`);
}

async function handleProofModal(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order || order.userId !== interaction.user.id) {
    await interaction.reply({ content: "Pedido nao encontrado.", ephemeral: true });
    return;
  }

  order.status = "em_analise";
  order.proof = {
    payer: interaction.fields.getTextInputValue("payer"),
    details: interaction.fields.getTextInputValue("details")
  };
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  const embed = new EmbedBuilder()
    .setColor(theme.warning)
    .setTitle("Comprovante enviado")
    .addFields(
      { name: "Pedido", value: order.id, inline: true },
      { name: "Cliente", value: `<@${order.userId}>`, inline: true },
      { name: "Nome", value: order.proof.payer },
      { name: "Detalhes", value: order.proof.details }
    );

  await interaction.reply({ content: "Comprovante enviado para analise da equipe.", ephemeral: true });
  await interaction.channel.send({ embeds: [embed] });
  await log(interaction.guild, embed);
}

async function handleApprove(interaction, orderId, requireStaff = true) {
  const shop = await getShopSettings(interaction.guildId);
  if (requireStaff && !isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode aprovar pedidos.", ephemeral: true });
    return;
  }

  const order = await findOrder(orderId);
  if (!order) {
    await interaction.reply({ content: "Pedido nao encontrado.", ephemeral: true });
    return;
  }

  let embed;
  let deliveryText = "";

  if (order.type === "product") {
    const products = await getProducts();
    const productIndex = products.findIndex((item) => item.id === order.productId);
    const product = products[productIndex];

    if (!product) {
      await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
      return;
    }

    const fields = getProductFields(product);
    const fieldIndex = fields.findIndex((field) => field.id === order.fieldId);
    const field = fieldIndex >= 0 ? fields[fieldIndex] : null;
    const item = field || product;
    const stock = item.stock || [];
    const deliveryMode = item.deliveryMode || product.deliveryMode;

    if (deliveryMode === "automatic") {
      if (stock.length <= 0) {
        await interaction.reply({ content: "Produto sem estoque para entrega automatica.", ephemeral: true });
        return;
      }
      const deliveredItem = stock.shift();
      if (field) {
        product.fields[fieldIndex].stock = stock;
      } else {
        product.stock = stock;
      }
      products[productIndex] = product;
      await saveProducts(products);
      order.deliveredItem = deliveredItem;
      deliveryText = `\n\nEntrega automatica:\n\`\`\`\n${deliveredItem}\n\`\`\``;
    } else {
      deliveryText = "\n\nA equipe vai finalizar a entrega manualmente neste ticket.";
    }

    if (order.coupon?.code) {
      const coupons = await getCoupons();
      const couponIndex = coupons.findIndex((item) => item.code === order.coupon.code);
      if (couponIndex >= 0) {
        coupons[couponIndex].used = Number(coupons[couponIndex].used || 0) + 1;
        await saveCoupons(coupons);
      }
    }

    embed = new EmbedBuilder()
      .setColor(theme.success)
      .setTitle("Compra aprovada")
      .setDescription(`Produto **${order.itemName || product.name}** aprovado para <@${order.userId}>.${deliveryText}`)
      .addFields(
        { name: "Pedido", value: order.id, inline: true },
        { name: "Valor", value: brl(order.total), inline: true }
      );
  } else {
    await interaction.reply({
      content: "Esse pedido usa um modelo antigo. O sistema agora usa apenas produtos e paineis.",
      ephemeral: true
    });
    return;
  }

  order.status = "aprovado";
  order.approvedBy = interaction.user.id;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  if (shop.clientRoleId) {
    const member = await interaction.guild.members.fetch(order.userId).catch(() => null);
    await member?.roles.add(shop.clientRoleId, "Compra aprovada").catch(() => null);
  }

  await interaction.channel.send({ content: `<@${order.userId}>`, embeds: [embed] });
  await interaction.channel.send(`<@${order.userId}> depois que receber, voce pode avaliar com \`/avaliar\`.`).catch(() => null);
  const replyPayload = { content: "Pedido aprovado.", ephemeral: true };
  if (interaction.replied || interaction.deferred) await interaction.followUp(replyPayload).catch(() => null);
  else await interaction.reply(replyPayload);
  await log(interaction.guild, embed);
  await publicSaleLog(interaction.guild, new EmbedBuilder()
    .setColor(theme.success)
    .setTitle("Nova compra aprovada")
    .setDescription(`<@${order.userId}> teve uma compra aprovada.`)
    .addFields({ name: "Valor", value: brl(order.total || 0), inline: true }));
}

async function handleReject(interaction, orderId) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
    await interaction.reply({ content: "Apenas a equipe pode reprovar pedidos.", ephemeral: true });
    return;
  }

  const order = await findOrder(orderId);
  if (!order) {
    await interaction.reply({ content: "Pedido nao encontrado.", ephemeral: true });
    return;
  }

  order.status = "reprovado";
  order.rejectedBy = interaction.user.id;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  await interaction.channel.send(`<@${order.userId}> seu pagamento nao foi aprovado. Fale com a equipe para conferir os dados.`);
  await interaction.reply({ content: "Pedido reprovado.", ephemeral: true });
}

async function handleClose(interaction, orderId) {
  const order = await findOrder(orderId);
  if (!order) {
    await interaction.reply({ content: "Pedido nao encontrado.", ephemeral: true });
    return;
  }

  const shop = await getShopSettings(interaction.guildId);
  const canClose = order.userId === interaction.user.id || isStaff(interaction.member, shop);
  if (!canClose) {
    await interaction.reply({ content: "Voce nao pode fechar este ticket.", ephemeral: true });
    return;
  }

  order.status = order.status === "aprovado" ? order.status : "fechado";
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  await interaction.reply({ content: "Ticket sera fechado em 5 segundos.", ephemeral: true });
  setTimeout(() => interaction.channel.delete("Ticket de compra fechado").catch(() => null), 5000);
}

function cartEmbed(order, product, shop) {
  const discountLine = order.coupon
    ? `\nCupom: **${order.coupon.code}** (-${order.coupon.discountPercent}%)`
    : "";

  return new EmbedBuilder()
    .setColor(theme.warning)
    .setTitle("Carrinho de compra")
    .setDescription(`Finalize o pagamento e envie o comprovante para a equipe aprovar.\n\n**${product.name}**${discountLine}`)
    .addFields(
      { name: "Total", value: brl(order.total), inline: true },
      { name: "Cliente", value: `<@${order.userId}>`, inline: true },
      { name: "Status", value: order.status, inline: true },
      { name: "Chave Pix", value: `\`${shop.pixKey || "Configure o Pix em /painel-loja"}\`` },
      { name: "Formas de pagamento", value: paymentMethodsText(shop), inline: true },
      { name: "Entrega", value: product.deliveryMode === "automatic" ? "Automatica apos aprovacao" : "Manual pela equipe" }
    )
    .setFooter({ text: `Pedido ${order.id}` });
}

function productEmbed(product, shop) {
  const fields = getProductFields(product).filter((field) => field.active !== false);
  const fieldsText = fields.length
    ? fields.slice(0, 8).map((field) => `**${field.name}** - ${brl(field.price)}`).join("\n")
    : "Produto unico";

  return new EmbedBuilder()
    .setColor(theme.success)
    .setTitle(product.name)
    .setDescription(shortText(product.description, "Produto sem descricao."))
    .addFields(
      { name: "Preco", value: brl(product.price), inline: true },
      { name: "Estoque", value: productStockText(product), inline: true },
      { name: "Entrega", value: product.deliveryMode === "automatic" ? "Automatica" : "Manual", inline: true },
      { name: "Opcoes", value: fieldsText }
    )
    .setFooter({ text: `${shop.storeName || "Loja de Bots"} • ${product.couponsEnabled ? "Cupons aceitos" : "Sem cupons"}` });
}

function productBuyRows(product, shop = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`product:buy:${product.id}`)
        .setEmoji(buttonEmoji(shop, "cart"))
        .setLabel("Comprar agora")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`product:stock:${product.id}`)
        .setEmoji(buttonEmoji(shop, "stock"))
        .setLabel("Ver estoque")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function productFieldSelect(product) {
  const fields = getProductFields(product).filter((field) => field.active !== false);
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`field:select:${product.id}`)
      .setPlaceholder("Escolha uma opcao")
      .addOptions(fields.slice(0, 25).map((field) => ({
        label: `${field.name} - ${brl(field.price)}`.slice(0, 100),
        description: (field.description || "Comprar opcao").slice(0, 100),
        value: field.id
      })))
  );
}

function panelEmbed(panel, products, shop) {
  const lines = products.map((product) => {
    return `**${product.name}**\n${brl(product.price)} - ${productStockText(product)}\n${product.description || "Sem descricao."}`;
  });

  return new EmbedBuilder()
    .setColor(theme.purple)
    .setTitle(panel.name)
    .setDescription(`${panel.description || "Escolha um produto abaixo."}\n\n${lines.join("\n\n")}`)
    .setFooter({ text: `${shop.storeName || "Loja de Bots"} • selecione no menu abaixo` });
}

function panelSelect(panel, products) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`panel:select:${panel.id}`)
      .setPlaceholder("Selecione um produto")
      .addOptions(products.slice(0, 25).map((product) => ({
        label: `${product.name} - ${brl(product.price)}`.slice(0, 100),
        description: (product.description || "Comprar produto").slice(0, 100),
        value: product.id
      })))
  );
}

async function registerCommandsForGuild(guild) {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const applicationId = config.clientId || client.user.id;

  await rest.put(Routes.applicationGuildCommands(applicationId, guild.id), { body: commands });
  console.log(`Slash commands registrados em ${guild.name} (${guild.id}).`);
}

client.once(Events.ClientReady, async () => {
  console.log(`Online como ${client.user.tag}`);
  setInterval(() => processScheduledTasks().catch((error) => console.error("Erro nas tarefas agendadas:", error)), 60000);
  await processScheduledTasks().catch((error) => console.error("Erro nas tarefas agendadas:", error));
  await startManagedApps().catch((error) => console.error("Erro ao ligar apps gerenciados:", error));

  try {
    if (config.guildId) {
      const guild = await client.guilds.fetch(config.guildId);
      await registerCommandsForGuild(guild);
      return;
    }

    for (const guild of client.guilds.cache.values()) {
      await registerCommandsForGuild(guild);
    }
  } catch (error) {
    console.error("Erro ao registrar slash commands:", error);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    await registerCommandsForGuild(guild);
  } catch (error) {
    console.error(`Erro ao registrar slash commands em ${guild.id}:`, error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-loja") await sendStorePanel(interaction);
      if (interaction.commandName === "painel-config") await sendConfigPanel(interaction);
      if (interaction.commandName === "botconfig") await sendBotConfigPanel(interaction);
      if (interaction.commandName === "painel-loja") await sendShopPanel(interaction);
      if (interaction.commandName === "criar") await handleCreateCommand(interaction);
      if (interaction.commandName === "set") await handleSetCommand(interaction);
      if (interaction.commandName === "estatistica") await handleStatsCommand(interaction);
      if (interaction.commandName === "gerar-pix") await handleGeneratePix(interaction);
      if (interaction.commandName === "carteira") await handleWalletStatsCommand(interaction);
      if (interaction.commandName === "config-pagamento") await handlePaymentConfigCommand(interaction);
      if (interaction.commandName === "painel-ia") await sendAiPanel(interaction);
      if (interaction.commandName === "ia-teste") await handleAiTestCommand(interaction);
      if (interaction.commandName === "ticket-painel") await sendTicketPanel(interaction);
      if (interaction.commandName === "blacklist") await handleBlacklistCommand(interaction);
      if (interaction.commandName === "termos") await handleTermsCommand(interaction);
      if (interaction.commandName === "sorteio") await handleGiveawayCommand(interaction);
      if (interaction.commandName === "repost") await handleRepostCommand(interaction);
      if (interaction.commandName === "avaliar") await handleReviewCommand(interaction);
      if (interaction.commandName === "protecao") await handleProtectionCommand(interaction);
      if (interaction.commandName === "apps") await sendAppsPanel(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("panel:select:")) {
      await handlePanelSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("field:select:")) {
      await handleFieldSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "botcfg:section") {
      await handleBotConfigSection(interaction, interaction.values[0]);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "botcfg:store-more") {
      await handleStoreMoreOption(interaction);
      return;
    }

    if (interaction.isButton()) {
      const [, action, orderId] = interaction.customId.split(":");
      if (interaction.customId.startsWith("botcfg:")) {
        await handleBotConfigSection(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("protcfg:")) {
        await handleProtectionButton(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("apps:")) {
        await handleAppsButton(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("terms:accept:")) {
        const [, , productId, fieldId] = interaction.customId.split(":");
        await handleTermsAccept(interaction, productId, fieldId);
        return;
      }
      if (interaction.customId.startsWith("giveaway:")) {
        await handleGiveawayButton(interaction, action, orderId);
        return;
      }
      if (interaction.customId === "support:open") {
        await createSupportTicket(interaction);
        return;
      }
      if (interaction.customId.startsWith("ticket:")) {
        await handleTicketButton(interaction, action, orderId);
        return;
      }
      if (interaction.customId.startsWith("aicfg:")) {
        await handleAiButton(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("product:")) {
        await handleProductButton(interaction, action, orderId);
        return;
      }
      if (interaction.customId.startsWith("shopcfg:")) {
        await handleShopButton(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("config:")) {
        await handleConfigButton(interaction, action);
        return;
      }
      if (action === "proof") await handleProofButton(interaction, orderId);
      if (action === "coupon") await handleCouponButton(interaction, orderId);
      if (action === "walletpix") await handleWalletPix(interaction, orderId);
      if (action === "checkpix") await handleCheckWalletPix(interaction, orderId);
      if (action === "approve") await handleApprove(interaction, orderId);
      if (action === "reject") await handleReject(interaction, orderId);
      if (action === "close") await handleClose(interaction, orderId);
      return;
    }

    if (interaction.isModalSubmit()) {
      const [, action, orderId] = interaction.customId.split(":");
      if (interaction.customId.startsWith("apps-modal:")) {
        await handleAppsModal(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("shopcfg-modal:")) {
        await handleShopModal(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("config-modal:")) {
        await handleConfigModal(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("aicfg-modal:")) {
        await handleAiModal(interaction, action);
        return;
      }
      if (action === "proof-modal") await handleProofModal(interaction, orderId);
      if (action === "coupon-modal") await handleCouponModal(interaction, orderId);
    }
  } catch (error) {
    console.error(error);
    const payload = { content: "Ocorreu um erro ao processar essa acao.", ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => null);
    else await interaction.reply(payload).catch(() => null);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const settings = await getGuildSettings(message.guild.id);
    const shop = await getShopSettings(message.guild.id);

    if (settings.protection.antiLink && !isStaff(message.member, shop) && /(https?:\/\/|discord\.gg\/|www\.)/i.test(message.content)) {
      await message.delete().catch(() => null);
      await log(message.guild, new EmbedBuilder()
        .setColor(theme.danger)
        .setTitle("Anti-link")
        .setDescription(`Link removido de <@${message.author.id}> em <#${message.channel.id}>.`));
      return;
    }

    const ticket = await findTicketByChannel(message.channel.id);
    const order = ticket ? null : await findOrderByChannel(message.channel.id);
    const conversation = ticket || order;
    if (!conversation || conversation.claimedBy || conversation.userId !== message.author.id) return;

    if (!settings.ai.enabled || Number(conversation.aiReplies || 0) >= (settings.ai.maxReplies || 20)) return;

    await message.channel.sendTyping().catch(() => null);
    let aiErrorHandled = false;
    const reply = await generateAiReply(settings, message).catch(async (error) => {
      console.error("Erro na IA:", error);
      await log(message.guild, new EmbedBuilder()
        .setColor(theme.danger)
        .setTitle("Erro na IA")
        .setDescription(error.message.slice(0, 1000)));
      await message.reply(`A IA nao conseguiu responder agora. Erro: ${error.message.slice(0, 300)}`).catch(() => null);
      aiErrorHandled = true;
      return null;
    });

    if (!reply) {
      if (aiErrorHandled) return;
      await message.reply("A IA recebeu sua mensagem, mas nao retornou texto. Confira a chave e o modelo em `/painel-ia`.").catch(() => null);
      return;
    }

    conversation.aiReplies = Number(conversation.aiReplies || 0) + 1;
    conversation.updatedAt = new Date().toISOString();
    if (ticket) await saveTicket(conversation);
    else await saveOrder(conversation);

    await message.reply(reply.slice(0, 1900));
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const settings = await getGuildSettings(member.guild.id);

  if (member.user.bot && settings.protection?.antiBot) {
    await member.kick("Protecao anti-bot ativa").catch(() => null);
    await log(member.guild, new EmbedBuilder()
      .setColor(theme.danger)
      .setTitle("Anti-bot")
      .setDescription(`Bot ${member.user.tag} removido automaticamente.`));
    return;
  }

  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const accountAgeDays = accountAgeMs / 86400000;

  if (settings.antiFake.enabled && accountAgeDays < settings.antiFake.minAccountAgeDays) {
    const embed = new EmbedBuilder()
      .setColor(theme.danger)
      .setTitle("Anti-fake detectou uma conta recente")
      .setDescription(`${member.user.tag} entrou com conta de ${accountAgeDays.toFixed(1)} dia(s).`)
      .addFields({ name: "Acao", value: settings.antiFake.logOnly ? "Apenas log" : "Kick automatico" });

    await log(member.guild, embed);
    if (!settings.antiFake.logOnly) {
      await member.kick("Anti-fake: conta muito recente").catch(() => null);
      return;
    }
  }

  if (settings.autoRole.enabled && settings.autoRole.roleId) {
    await member.roles.add(settings.autoRole.roleId, "Auto-cargo da loja").catch(() => null);
  }

  if (settings.welcome.enabled && settings.welcome.channelId) {
    const channel = await member.guild.channels.fetch(settings.welcome.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const message = settings.welcome.message.replaceAll("{user}", `<@${member.id}>`);
      await channel.send(message).catch(() => null);
    }
  }
});

if (!config.token) {
  console.error("DISCORD_TOKEN nao configurado. Copie .env.example para .env e preencha o token.");
  process.exit(1);
}

startHealthServer();
client.login(config.token);
