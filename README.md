# Loja de Bots Discord

Bot de Discord para vender bots em planos. Ele cria um painel com botoes, abre ticket privado para o cliente, mostra dados de Pix, registra pedido em JSON e permite que a equipe aprove ou reprove a compra.

## Funcoes

- `/setup-loja`: envia o painel de planos no canal atual.
- `/painel-config`: envia o painel para configurar boas-vindas, auto-cargo e anti-fake.
- `/planos`: mostra os planos disponiveis.
- Botao `Comprar`: cria ticket privado para pagamento.
- Botao `Enviar comprovante`: abre modal para o cliente informar dados do pagamento.
- Botao `Aprovar`: marca pedido como aprovado e envia a mensagem de entrega.
- Botao `Reprovar`: marca pedido como reprovado.
- Botao `Fechar ticket`: fecha o canal do pedido.

## Modulos estilo Promisse Apps

- **Sistema de vendas:** planos, ticket de compra, Pix e aprovacao por staff.
- **Boas-vindas:** mensagem customizavel com `{user}` para mencionar o membro.
- **Auto-cargo:** cargo automatico para novos membros.
- **Anti-fake:** detecta contas recentes e pode apenas logar ou expulsar automaticamente.
- **Logs:** pedidos, comprovantes e alertas anti-fake podem ir para um canal definido.

## Como instalar

1. Instale Node.js 18 ou superior.
2. Na pasta do bot, rode:

```bash
npm install
```

3. Copie `.env.example` para `.env`.
4. Preencha `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `PIX_KEY`, `STAFF_ROLE_ID`, `TICKET_CATEGORY_ID` e `LOG_CHANNEL_ID`.
5. Inicie:

```bash
npm start
```

## Como colocar no Railway

### 1. Criar o bot no Discord

1. Entre em <https://discord.com/developers/applications>.
2. Clique em **New Application**.
3. Va em **Bot** e clique em **Add Bot**.
4. Copie o token do bot e guarde para usar no `DISCORD_TOKEN`.
5. Em **Privileged Gateway Intents**, ative:
   - Server Members Intent
   - Message Content Intent, se for expandir o bot depois

### 2. Pegar os IDs

No Discord, ative o modo desenvolvedor:

**Configuracoes de usuario > Avancado > Modo desenvolvedor**

Depois copie:

- ID do bot/aplicacao: `CLIENT_ID`
- ID do servidor: `GUILD_ID`
- ID do canal de logs: `LOG_CHANNEL_ID`
- ID da categoria de tickets: `TICKET_CATEGORY_ID`
- ID do cargo da equipe: `STAFF_ROLE_ID`

### 3. Enviar o projeto para o GitHub

O Railway trabalha melhor puxando de um repositorio GitHub.

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para ele.
3. Nao envie seu arquivo `.env`.

### 4. Criar projeto no Railway

1. Entre em <https://railway.app/>.
2. Clique em **New Project**.
3. Escolha **Deploy from GitHub repo**.
4. Selecione o repositorio do bot.
5. Railway vai detectar Node.js automaticamente.

### 5. Configurar variaveis no Railway

No projeto do Railway, va em:

**Service > Variables**

Adicione:

```env
DISCORD_TOKEN=token_do_seu_bot
CLIENT_ID=id_da_aplicacao
GUILD_ID=id_do_servidor
LOG_CHANNEL_ID=id_do_canal_de_logs
TICKET_CATEGORY_ID=id_da_categoria_de_tickets
STAFF_ROLE_ID=id_do_cargo_staff
PIX_KEY=sua_chave_pix
STORE_NAME=Nome da sua loja
SUPPORT_URL=https://discord.gg/seuconvite
DATA_DIR=/data
```

### 6. Criar volume para salvar dados

Se voce quiser que pedidos, planos e configuracoes nao sumam em reinicios:

1. No Railway, abra o servico do bot.
2. Va em **Volumes**.
3. Crie um volume.
4. Monte no caminho:

```txt
/data
```

5. Mantenha a variavel:

```env
DATA_DIR=/data
```

Sem volume, o bot ainda roda, mas os arquivos JSON podem ser perdidos quando o Railway recriar o ambiente.

### 7. Fazer deploy

Depois de configurar as variaveis, clique em **Deploy** ou faca um novo commit no GitHub.

Quando aparecer `Online como NomeDoBot` nos logs, entre no seu servidor e use:

```txt
/setup-loja
/painel-config
```

### 8. Convidar o bot para o servidor

Use este link, trocando `CLIENT_ID_AQUI` pelo ID da aplicacao:

```txt
https://discord.com/oauth2/authorize?client_id=CLIENT_ID_AQUI&permissions=268487888&integration_type=0&scope=bot+applications.commands
```

## Permissoes do bot

No portal do Discord Developer, ative:

- Server Members Intent
- Message Content Intent, se quiser evoluir para leitura de mensagens

Convide o bot com permissoes de:

- Manage Channels
- Kick Members, se o anti-fake for usado para expulsar contas recentes
- Manage Roles, se o auto-cargo estiver ativo
- Send Messages
- Embed Links
- Use Slash Commands
- Read Message History

## Editar planos

Altere `data/plans.json`. O campo `id` deve ser unico e sem espacos.

## Observacao sobre Pix

Esta primeira versao usa Pix manual: o cliente informa o pagamento e a equipe aprova no ticket. Depois da loja estar funcionando, da para integrar Mercado Pago, EFI Bank ou outro gateway para aprovacao automatica.
