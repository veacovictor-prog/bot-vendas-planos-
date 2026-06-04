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
const PLANS_FILE = path.join(DATA_DIR, "plans.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const PANELS_FILE = path.join(DATA_DIR, "panels.json");
const COUPONS_FILE = path.join(DATA_DIR, "coupons.json");

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

const defaultPlans = [
  {
    id: "starter",
    name: "Starter",
    price: "19,90",
    period: "mensal",
    description: "Bot simples com comandos basicos, status online e suporte inicial.",
    features: [
      "1 bot Discord",
      "Instalacao manual",
      "Suporte basico",
      "Atualizacoes simples"
    ],
    delivery: "A equipe envia o bot e orienta a instalacao apos confirmar o pagamento."
  },
  {
    id: "pro",
    name: "Pro",
    price: "39,90",
    period: "mensal",
    description: "Bot de vendas, ticket ou moderacao com personalizacao da sua marca.",
    features: [
      "1 bot personalizado",
      "Comandos slash",
      "Painel dentro do Discord",
      "Suporte prioritario"
    ],
    delivery: "A equipe entrega o bot configurado para o servidor do cliente."
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: "79,90",
    period: "mensal",
    description: "Plano completo para lojas que querem vender 24/7 com automacoes.",
    features: [
      "Bot completo de vendas",
      "Sistema de tickets",
      "Logs e painel admin",
      "Customizacao completa"
    ],
    delivery: "A equipe entrega o bot completo e ajuda na primeira configuracao."
  }
];

const defaultProducts = [
  {
    id: "bot-vendas",
    name: "Bot de Vendas",
    price: 49.9,
    description: "Bot de vendas Discord com tickets, painel e suporte inicial.",
    deliveryMode: "manual",
    stock: [],
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

const commands = [
  new SlashCommandBuilder()
    .setName("setup-loja")
    .setDescription("Envia o painel principal da loja de bots.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("painel-config")
    .setDescription("Envia o painel de configuracao dos sistemas extras.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("painel-loja")
    .setDescription("Envia o painel para configurar a loja, Pix, logs e tickets.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("planos")
    .setDescription("Mostra os planos de bots disponiveis."),
  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Cria produto, painel ou cupom.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
    .setDescription("Mostra estatisticas de vendas.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("gerar-pix")
    .setDescription("Gera uma cobranca Pix manual.")
    .addNumberOption((option) => option.setName("valor").setDescription("Valor da cobranca.").setRequired(true))
    .addStringOption((option) => option.setName("descricao").setDescription("Descricao da cobranca.").setRequired(false))
].map((command) => command.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

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

async function getPlans() {
  const plans = await readJson(PLANS_FILE, null);
  if (plans) return plans;
  await writeJson(PLANS_FILE, defaultPlans);
  return defaultPlans;
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
      ticketCategoryId: config.ticketCategoryId || "",
      staffRoleId: config.staffRoleId || ""
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
    }
  };
}

async function getGuildSettings(guildId) {
  const settings = await getAllSettings();
  const current = settings[guildId] || {};
  const defaults = defaultGuildSettings();

  return {
    shop: { ...defaults.shop, ...(current.shop || {}) },
    welcome: { ...defaults.welcome, ...(current.welcome || {}) },
    autoRole: { ...defaults.autoRole, ...(current.autoRole || {}) },
    antiFake: { ...defaults.antiFake, ...(current.antiFake || {}) }
  };
}

async function getShopSettings(guildId) {
  const settings = await getGuildSettings(guildId);
  return {
    storeName: settings.shop?.storeName || config.storeName,
    pixKey: settings.shop?.pixKey || config.pixKey,
    supportUrl: settings.shop?.supportUrl || config.supportUrl,
    logChannelId: settings.shop?.logChannelId || config.logChannelId,
    ticketCategoryId: settings.shop?.ticketCategoryId || config.ticketCategoryId,
    staffRoleId: settings.shop?.staffRoleId || config.staffRoleId
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

function money(plan) {
  return `R$ ${plan.price}/${plan.period}`;
}

function brl(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
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

function planEmbed(plan) {
  return new EmbedBuilder()
    .setColor(0x2f6fed)
    .setTitle(`${plan.name} - ${money(plan)}`)
    .setDescription(plan.description)
    .addFields(
      {
        name: "Inclui",
        value: plan.features.map((feature) => `• ${feature}`).join("\n")
      },
      {
        name: "Entrega",
        value: plan.delivery
      }
    );
}

function storePanelEmbed(plans, shop) {
  const description = plans
    .map((plan) => `**${plan.name}** - ${money(plan)}\n${plan.description}`)
    .join("\n\n");

  return new EmbedBuilder()
    .setColor(0x111827)
    .setTitle(shop.storeName)
    .setDescription(description || "Nenhum plano cadastrado.")
    .setFooter({ text: "Escolha um plano abaixo para abrir seu atendimento de compra." });
}

function shopPanelEmbed(shop) {
  return new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle("Painel da loja")
    .setDescription("Configure os dados principais da loja por botoes.")
    .addFields(
      { name: "Nome", value: shop.storeName || "Nao configurado", inline: true },
      { name: "Pix", value: shop.pixKey ? `\`${shop.pixKey}\`` : "Nao configurado", inline: true },
      { name: "Suporte", value: shop.supportUrl || "Nao configurado", inline: true },
      { name: "Logs", value: shop.logChannelId ? `<#${shop.logChannelId}>` : "Nao configurado", inline: true },
      { name: "Categoria tickets", value: shop.ticketCategoryId || "Nao configurado", inline: true },
      { name: "Staff", value: shop.staffRoleId ? `<@&${shop.staffRoleId}>` : "Manage Server", inline: true }
    );
}

function shopRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("shopcfg:identity")
        .setLabel("Loja")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("shopcfg:payment")
        .setLabel("Pix")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("shopcfg:channels")
        .setLabel("Canais")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shopcfg:staff")
        .setLabel("Staff")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function configPanelEmbed(settings) {
  return new EmbedBuilder()
    .setColor(0x0f172a)
    .setTitle("Painel de configuracao")
    .setDescription("Configure os sistemas extras da loja diretamente por botoes.")
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
        .setLabel("Boas-vindas")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("config:autorole")
        .setLabel("Auto-cargo")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("config:antifake")
        .setLabel("Anti-fake")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function planSelect(plans) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("shop:select-plan")
      .setPlaceholder("Escolha um plano")
      .addOptions(plans.map((plan) => ({
        label: `${plan.name} - R$ ${plan.price}`,
        description: plan.description.slice(0, 100),
        value: plan.id
      })))
  );
}

function paymentRows(orderId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:proof:${orderId}`)
        .setLabel("Enviar comprovante")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`order:coupon:${orderId}`)
        .setLabel("Aplicar cupom")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`order:close:${orderId}`)
        .setLabel("Fechar ticket")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:approve:${orderId}`)
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`order:reject:${orderId}`)
        .setLabel("Reprovar")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function isStaff(member, shop = {}) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild)
    || (shop.staffRoleId && member.roles.cache.has(shop.staffRoleId));
}

function orderEmbed(order, plan, shop) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`Pedido ${order.id}`)
    .setDescription(`Plano escolhido: **${plan.name}**\nValor: **${money(plan)}**`)
    .addFields(
      { name: "Cliente", value: `<@${order.userId}>`, inline: true },
      { name: "Status", value: order.status, inline: true },
      { name: "Pix", value: `\`${shop.pixKey || "Configure o Pix em /painel-loja"}\`` }
    )
    .setFooter({ text: "Depois de pagar, clique em Enviar comprovante." });
}

function deliveryEmbed(order, plan, shop) {
  const supportLine = shop.supportUrl ? `\nSuporte: ${shop.supportUrl}` : "";

  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("Pagamento aprovado")
    .setDescription(
      `Seu plano **${plan.name}** foi aprovado.\n\n${plan.delivery}${supportLine}`
    )
    .addFields({ name: "Pedido", value: order.id, inline: true });
}

async function log(guild, embed) {
  const shop = await getShopSettings(guild.id);
  if (!shop.logChannelId) return;
  const channel = await guild.channels.fetch(shop.logChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
}

async function createOrderTicket(interaction, plan) {
  const shop = await getShopSettings(interaction.guildId);
  const orderId = `${Date.now().toString(36)}-${interaction.user.id.slice(-4)}`;
  const guild = interaction.guild;
  const channelName = `compra-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 90);

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  if (shop.staffRoleId) {
    permissionOverwrites.push({
      id: shop.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
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
    userId: interaction.user.id,
    guildId: guild.id,
    channelId: channel.id,
    planId: plan.id,
    status: "aguardando_pagamento",
    proof: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveOrder(order);
  await channel.send({
    content: `<@${interaction.user.id}> ${shop.staffRoleId ? `<@&${shop.staffRoleId}>` : ""}`,
    embeds: [orderEmbed(order, plan, shop)],
    components: paymentRows(order.id)
  });

  await log(guild, new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("Novo pedido")
    .setDescription(`Pedido **${order.id}** criado por <@${order.userId}> no plano **${plan.name}**.`));

  await interaction.reply({
    content: `Seu ticket de compra foi criado: ${channel}`,
    ephemeral: true
  });
}

async function createProductTicket(interaction, product) {
  const shop = await getShopSettings(interaction.guildId);

  if (!product.active) {
    await interaction.reply({ content: "Este produto esta desativado.", ephemeral: true });
    return;
  }

  if (product.deliveryMode === "automatic" && (!product.stock || product.stock.length <= 0)) {
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
    status: "aguardando_pagamento",
    total: Number(product.price),
    coupon: null,
    proof: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveOrder(order);
  await channel.send({
    content: `<@${interaction.user.id}> ${shop.staffRoleId ? `<@&${shop.staffRoleId}>` : ""}`,
    embeds: [cartEmbed(order, product, shop)],
    components: paymentRows(order.id)
  });

  await log(guild, new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("Novo carrinho")
    .setDescription(`Carrinho **${order.id}** criado por <@${order.userId}> para **${product.name}**.`));

  await interaction.reply({ content: `Seu carrinho foi criado: ${channel}`, ephemeral: true });
}

async function sendStorePanel(interaction) {
  const plans = await getPlans();
  const shop = await getShopSettings(interaction.guildId);
  if (!plans.length) {
    await interaction.reply({ content: "Nenhum plano foi cadastrado em `data/plans.json`.", ephemeral: true });
    return;
  }

  await interaction.channel.send({
    embeds: [storePanelEmbed(plans, shop)],
    components: [planSelect(plans)]
  });

  await interaction.reply({ content: "Painel da loja enviado.", ephemeral: true });
}

async function sendPlans(interaction) {
  const plans = await getPlans();
  if (!plans.length) {
    await interaction.reply({ content: "Nenhum plano disponivel no momento.", ephemeral: true });
    return;
  }

  await interaction.reply({
    embeds: plans.map(planEmbed),
    ephemeral: true
  });
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
    components: shopRows()
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
      components: productBuyRows(product)
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
    .setColor(0x0ea5e9)
    .setTitle("Estatisticas de vendas")
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
    .setColor(0x22c55e)
    .setTitle("Pix gerado")
    .setDescription(`Valor: **${brl(value)}**\nDescricao: **${description}**`)
    .addFields(
      { name: "Chave Pix", value: `\`${shop.pixKey || "Configure em /painel-loja"}\`` },
      { name: "Copia e cola", value: `\`${payload}\`` }
    )
    .setFooter({ text: "Pix manual. A equipe ainda precisa conferir e aprovar." });

  await interaction.reply({ embeds: [embed], ephemeral: true });
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
          .setRequired(true)
      )
    );
  }

  if (action === "channels") {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("logChannelId")
          .setLabel("ID do canal de logs")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.logChannelId || "")
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ticketCategoryId")
          .setLabel("ID da categoria de tickets")
          .setStyle(TextInputStyle.Short)
          .setValue(shop.ticketCategoryId || "")
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
  }

  if (action === "channels") {
    settings.shop.logChannelId = interaction.fields.getTextInputValue("logChannelId").trim();
    settings.shop.ticketCategoryId = interaction.fields.getTextInputValue("ticketCategoryId").trim();
  }

  if (action === "staff") {
    settings.shop.staffRoleId = interaction.fields.getTextInputValue("staffRoleId").trim();
  }

  await saveGuildSettings(interaction.guildId, settings);
  await interaction.reply({
    content: "Loja configurada.",
    embeds: [shopPanelEmbed(await getShopSettings(interaction.guildId))],
    ephemeral: true
  });
}

async function handlePlanSelect(interaction) {
  const plans = await getPlans();
  const plan = plans.find((item) => item.id === interaction.values[0]);

  if (!plan) {
    await interaction.reply({ content: "Plano nao encontrado.", ephemeral: true });
    return;
  }

  await createOrderTicket(interaction, plan);
}

async function handlePanelSelect(interaction) {
  const products = await getProducts();
  const product = products.find((item) => item.id === interaction.values[0]);

  if (!product) {
    await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
    return;
  }

  await createProductTicket(interaction, product);
}

async function handleProductButton(interaction, action, productId) {
  const products = await getProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    await interaction.reply({ content: "Produto nao encontrado.", ephemeral: true });
    return;
  }

  if (action === "buy") {
    await createProductTicket(interaction, product);
    return;
  }

  if (action === "stock") {
    await interaction.reply({
      content: `Estoque de **${product.name}**: ${productStockText(product)}.`,
      ephemeral: true
    });
  }
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
  order.total = Number((Number(product.price) * (1 - discount / 100)).toFixed(2));
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  await interaction.reply({
    content: `Cupom **${code}** aplicado. Novo total: **${brl(order.total)}**.`,
    ephemeral: true
  });

  await interaction.channel.send({
    embeds: [cartEmbed(order, product, await getShopSettings(interaction.guildId))],
    components: paymentRows(order.id)
  });
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
    .setColor(0xeab308)
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

async function handleApprove(interaction, orderId) {
  const shop = await getShopSettings(interaction.guildId);
  if (!isStaff(interaction.member, shop)) {
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

    if (product.deliveryMode === "automatic") {
      if (!product.stock || product.stock.length <= 0) {
        await interaction.reply({ content: "Produto sem estoque para entrega automatica.", ephemeral: true });
        return;
      }
      const deliveredItem = product.stock.shift();
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
      .setColor(0x22c55e)
      .setTitle("Compra aprovada")
      .setDescription(`Produto **${product.name}** aprovado para <@${order.userId}>.${deliveryText}`)
      .addFields(
        { name: "Pedido", value: order.id, inline: true },
        { name: "Valor", value: brl(order.total), inline: true }
      );
  } else {
    const plans = await getPlans();
    const plan = plans.find((item) => item.id === order.planId);
    if (!plan) {
      await interaction.reply({ content: "Plano nao encontrado.", ephemeral: true });
      return;
    }
    embed = deliveryEmbed(order, plan, shop);
  }

  order.status = "aprovado";
  order.approvedBy = interaction.user.id;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  await interaction.channel.send({ content: `<@${order.userId}>`, embeds: [embed] });
  await interaction.reply({ content: "Pedido aprovado.", ephemeral: true });
  await log(interaction.guild, embed);
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
    .setColor(0xf59e0b)
    .setTitle(`Carrinho ${order.id}`)
    .setDescription(`Produto: **${product.name}**\nValor: **${brl(order.total)}**${discountLine}`)
    .addFields(
      { name: "Cliente", value: `<@${order.userId}>`, inline: true },
      { name: "Status", value: order.status, inline: true },
      { name: "Pix", value: `\`${shop.pixKey || "Configure o Pix em /painel-loja"}\`` },
      { name: "Entrega", value: product.deliveryMode === "automatic" ? "Automatica apos aprovacao" : "Manual pela equipe" }
    )
    .setFooter({ text: "Depois de pagar, clique em Enviar comprovante." });
}

function productEmbed(product, shop) {
  return new EmbedBuilder()
    .setColor(0x16a34a)
    .setTitle(product.name)
    .setDescription(product.description || "Produto sem descricao.")
    .addFields(
      { name: "Preco", value: brl(product.price), inline: true },
      { name: "Estoque", value: productStockText(product), inline: true },
      { name: "Loja", value: shop.storeName || "Loja de Bots", inline: true }
    )
    .setFooter({ text: product.couponsEnabled ? "Cupons ativos neste produto." : "Cupons desativados neste produto." });
}

function productBuyRows(product) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`product:buy:${product.id}`)
        .setLabel("Comprar agora")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`product:stock:${product.id}`)
        .setLabel("Ver estoque")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function panelEmbed(panel, products, shop) {
  const lines = products.map((product) => {
    return `**${product.name}** - ${brl(product.price)}\n${product.description || "Sem descricao."}`;
  });

  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle(panel.name)
    .setDescription(`${panel.description || "Escolha um produto abaixo."}\n\n${lines.join("\n\n")}`)
    .setFooter({ text: shop.storeName || "Loja de Bots" });
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
      if (interaction.commandName === "painel-loja") await sendShopPanel(interaction);
      if (interaction.commandName === "planos") await sendPlans(interaction);
      if (interaction.commandName === "criar") await handleCreateCommand(interaction);
      if (interaction.commandName === "set") await handleSetCommand(interaction);
      if (interaction.commandName === "estatistica") await handleStatsCommand(interaction);
      if (interaction.commandName === "gerar-pix") await handleGeneratePix(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "shop:select-plan") {
      await handlePlanSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("panel:select:")) {
      await handlePanelSelect(interaction);
      return;
    }

    if (interaction.isButton()) {
      const [, action, orderId] = interaction.customId.split(":");
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
      if (action === "approve") await handleApprove(interaction, orderId);
      if (action === "reject") await handleReject(interaction, orderId);
      if (action === "close") await handleClose(interaction, orderId);
      return;
    }

    if (interaction.isModalSubmit()) {
      const [, action, orderId] = interaction.customId.split(":");
      if (interaction.customId.startsWith("shopcfg-modal:")) {
        await handleShopModal(interaction, action);
        return;
      }
      if (interaction.customId.startsWith("config-modal:")) {
        await handleConfigModal(interaction, action);
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

client.on(Events.GuildMemberAdd, async (member) => {
  const settings = await getGuildSettings(member.guild.id);
  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const accountAgeDays = accountAgeMs / 86400000;

  if (settings.antiFake.enabled && accountAgeDays < settings.antiFake.minAccountAgeDays) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
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
