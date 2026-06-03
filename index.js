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

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  staffRoleId: process.env.STAFF_ROLE_ID,
  pixKey: process.env.PIX_KEY || "Configure a chave Pix no .env",
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
    .setName("planos")
    .setDescription("Mostra os planos de bots disponiveis.")
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

async function getGuildSettings(guildId) {
  const settings = await getAllSettings();
  return settings[guildId] || {
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

function storePanelEmbed(plans) {
  const description = plans
    .map((plan) => `**${plan.name}** - ${money(plan)}\n${plan.description}`)
    .join("\n\n");

  return new EmbedBuilder()
    .setColor(0x111827)
    .setTitle(config.storeName)
    .setDescription(description || "Nenhum plano cadastrado.")
    .setFooter({ text: "Escolha um plano abaixo para abrir seu atendimento de compra." });
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

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild)
    || (config.staffRoleId && member.roles.cache.has(config.staffRoleId));
}

function orderEmbed(order, plan) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`Pedido ${order.id}`)
    .setDescription(`Plano escolhido: **${plan.name}**\nValor: **${money(plan)}**`)
    .addFields(
      { name: "Cliente", value: `<@${order.userId}>`, inline: true },
      { name: "Status", value: order.status, inline: true },
      { name: "Pix", value: `\`${config.pixKey}\`` }
    )
    .setFooter({ text: "Depois de pagar, clique em Enviar comprovante." });
}

function deliveryEmbed(order, plan) {
  const supportLine = config.supportUrl ? `\nSuporte: ${config.supportUrl}` : "";

  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("Pagamento aprovado")
    .setDescription(
      `Seu plano **${plan.name}** foi aprovado.\n\n${plan.delivery}${supportLine}`
    )
    .addFields({ name: "Pedido", value: order.id, inline: true });
}

async function log(guild, embed) {
  if (!config.logChannelId) return;
  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
}

async function createOrderTicket(interaction, plan) {
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

  if (config.staffRoleId) {
    permissionOverwrites.push({
      id: config.staffRoleId,
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
    parent: config.ticketCategoryId || null,
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
    content: `<@${interaction.user.id}> ${config.staffRoleId ? `<@&${config.staffRoleId}>` : ""}`,
    embeds: [orderEmbed(order, plan)],
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

async function sendStorePanel(interaction) {
  const plans = await getPlans();
  if (!plans.length) {
    await interaction.reply({ content: "Nenhum plano foi cadastrado em `data/plans.json`.", ephemeral: true });
    return;
  }

  await interaction.channel.send({
    embeds: [storePanelEmbed(plans)],
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

async function handlePlanSelect(interaction) {
  const plans = await getPlans();
  const plan = plans.find((item) => item.id === interaction.values[0]);

  if (!plan) {
    await interaction.reply({ content: "Plano nao encontrado.", ephemeral: true });
    return;
  }

  await createOrderTicket(interaction, plan);
}

async function handleConfigButton(interaction, action) {
  if (!isStaff(interaction.member)) {
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
  if (!isStaff(interaction.member)) {
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
  if (!isStaff(interaction.member)) {
    await interaction.reply({ content: "Apenas a equipe pode aprovar pedidos.", ephemeral: true });
    return;
  }

  const order = await findOrder(orderId);
  const plans = await getPlans();
  const plan = plans.find((item) => item.id === order?.planId);

  if (!order || !plan) {
    await interaction.reply({ content: "Pedido ou plano nao encontrado.", ephemeral: true });
    return;
  }

  order.status = "aprovado";
  order.approvedBy = interaction.user.id;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);

  const embed = deliveryEmbed(order, plan);
  await interaction.channel.send({ content: `<@${order.userId}>`, embeds: [embed] });
  await interaction.reply({ content: "Pedido aprovado.", ephemeral: true });
  await log(interaction.guild, embed);
}

async function handleReject(interaction, orderId) {
  if (!isStaff(interaction.member)) {
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

  const canClose = order.userId === interaction.user.id || isStaff(interaction.member);
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

client.once(Events.ClientReady, async () => {
  console.log(`Online como ${client.user.tag}`);

  if (config.clientId && config.guildId) {
    const rest = new REST({ version: "10" }).setToken(config.token);
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log("Comandos registrados no servidor.");
  } else {
    console.log("CLIENT_ID ou GUILD_ID nao configurado. Slash commands nao foram registrados.");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-loja") await sendStorePanel(interaction);
      if (interaction.commandName === "painel-config") await sendConfigPanel(interaction);
      if (interaction.commandName === "planos") await sendPlans(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "shop:select-plan") {
      await handlePlanSelect(interaction);
      return;
    }

    if (interaction.isButton()) {
      const [, action, orderId] = interaction.customId.split(":");
      if (interaction.customId.startsWith("config:")) {
        await handleConfigButton(interaction, action);
        return;
      }
      if (action === "proof") await handleProofButton(interaction, orderId);
      if (action === "approve") await handleApprove(interaction, orderId);
      if (action === "reject") await handleReject(interaction, orderId);
      if (action === "close") await handleClose(interaction, orderId);
      return;
    }

    if (interaction.isModalSubmit()) {
      const [, action, orderId] = interaction.customId.split(":");
      if (interaction.customId.startsWith("config-modal:")) {
        await handleConfigModal(interaction, action);
        return;
      }
      if (action === "proof-modal") await handleProofModal(interaction, orderId);
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
