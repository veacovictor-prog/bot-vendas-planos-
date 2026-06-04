# Loja de Bots Discord

Bot de Discord para vender bots em planos. Ele cria um painel com botoes, abre ticket privado para o cliente, mostra dados de Pix, registra pedido em JSON e permite que a equipe aprove ou reprove a compra.

## Funcoes

- `/setup-loja`: envia o painel de planos no canal atual.
- `/painel-loja`: configura nome da loja, Pix, canal de logs, categoria de tickets e cargo staff.
- `/painel-config`: envia o painel para configurar boas-vindas, auto-cargo e anti-fake.
- `/botconfig`: abre o painel central estilo Promisse com loja, tickets, protecao, sorteios, apps e automacoes.
- `/planos`: mostra os planos disponiveis.
- `/criar produto`: cria produto com preco, descricao, entrega manual ou automatica e estoque.
- `/criar campo`: adiciona uma opcao/campo dentro de um produto.
- `/criar painel`: cria painel com varios produtos.
- `/criar cupom`: cria cupom de desconto.
- `/set produto`: publica um produto no canal atual.
- `/set painel`: publica um painel com menu de selecao.
- `/estatistica`: mostra pedidos, aprovados e faturamento.
- `/gerar-pix`: gera uma cobranca Pix manual com copia e cola.
- `/painel-ia`: configura IA de atendimento com Gemini.
- `/ticket-painel`: publica painel de suporte.
- `/blacklist`: bloqueia/libera usuarios da loja.
- `/termos`: configura aceite obrigatorio de termos.
- `/sorteio`: cria e encerra sorteios.
- `/repost`: republica produto/painel automaticamente.
- `/avaliar`: cliente avalia a ultima compra aprovada.
- `/protecao`: ativa/desativa anti-link basico.
- `/apps`: cliente com compra aprovada conecta e configura o bot adquirido.
- Botao `Comprar`: cria ticket privado para pagamento.
- Botao `Enviar comprovante`: abre modal para o cliente informar dados do pagamento.
- Botao `Aplicar cupom`: aplica desconto no carrinho.
- Botao `Aprovar`: marca pedido como aprovado e envia a mensagem de entrega.
- Botao `Reprovar`: marca pedido como reprovado.
- Botao `Fechar ticket`: fecha o canal do pedido.

## Modulos estilo Promisse Apps

- **Sistema de vendas:** planos, ticket de compra, Pix e aprovacao por staff.
- **Produtos e estoque:** produtos com entrega manual ou automatica.
- **Painel multi-produto:** um menu com varios produtos em um painel so.
- **Cupons:** desconto percentual com limite de uso opcional.
- **Estatisticas:** pedidos totais, aprovados, em analise e faturamento aprovado.
- **Logs publico/privado:** canal privado para equipe e canal publico para compras aprovadas.
- **Cargo cliente:** cargo automatico quando a compra e aprovada.
- **Ticket com IA:** painel de suporte, assumir atendimento, ultima compra e fechamento.
- **Campos de produto:** varias opcoes dentro do mesmo produto, cada uma com preco e estoque.
- **Termos de compra:** aceite obrigatorio antes de abrir carrinho.
- **Blacklist:** bloqueio de compra e ticket por usuario.
- **Avaliacoes:** feedback publico apos compra aprovada.
- **Sorteios:** botao de participar, requisito por cargo e encerramento automatico.
- **Repost automatico:** produto ou painel repostado por intervalo.
- **Protecao anti-link:** remove links de usuarios sem cargo staff.
- **Painel botconfig:** menu central com secoes de loja, produtos, tickets, protecao, sorteios, apps e automacoes.
- **Pagamentos:** Pix, comprovante manual, Mercado Pago e carteira integrada podem ser ligados/desligados no painel.
- **Carteira integrada:** gera Pix pelo Mercado Pago, verifica pagamento e registra o valor recebido para saque posterior na conta Mercado Pago.
- **Protecao anti-bot:** remove bots adicionados quando a protecao estiver ativa.
- **Apps de clientes:** cliente aprovado conecta o token do bot comprado e altera nome, foto e status.
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
4. Preencha `DISCORD_TOKEN`.
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
  - Message Content Intent, necessario para IA responder mensagens em tickets

### 2. Configurar o Railway

No Railway, voce so precisa colocar esta variavel obrigatoria:

```env
DISCORD_TOKEN=token_do_seu_bot
```

Tambem recomendo colocar:

```env
DATA_DIR=/data
```

Depois crie um **Volume** montado em `/data`.

### 3. Configurar a loja pelo Discord

Depois que o bot ficar online, use no Discord:

```txt
/botconfig
/painel-loja
```

No `/botconfig` voce acessa tudo por menu. No painel da loja voce configura:

- nome da loja
- chave Pix
- canal de log privada
- canal de log publica
- categoria de tickets
- cargo staff
- cargo cliente
- link de suporte

Depois use:

```txt
/painel-config
/setup-loja
```

## Fluxo novo de produtos

### Criar produto manual

```txt
/criar produto id:bot-personalizado nome:Bot Personalizado preco:49.90 descricao:Bot sob encomenda entrega:manual
```

### Criar produto automatico com estoque

Use `|` para separar os itens do estoque:

```txt
/criar produto id:template-vendas nome:Template Vendas preco:29.90 descricao:Entrega automatica entrega:automatica estoque:link1|link2|link3
```

Quando o staff aprovar o pagamento, o bot entrega um item do estoque e remove esse item automaticamente.

### Criar campos/opcoes dentro do produto

```txt
/criar campo produto:nitro id:mensal nome:Nitro Mensal preco:19.90 descricao:1 mes estoque:codigo1|codigo2
/criar campo produto:nitro id:anual nome:Nitro Anual preco:149.90 descricao:12 meses estoque:codigo3|codigo4
```

Quando o produto tiver campos, o cliente clica em comprar e escolhe a opcao no menu.

### Criar cupom

```txt
/criar cupom codigo:PROMO10 desconto:10 usos:20
```

### Criar painel com varios produtos

```txt
/criar painel id:loja-principal nome:Loja Principal produtos:bot-personalizado,template-vendas descricao:Escolha seu bot abaixo
```

### Publicar produto ou painel

```txt
/set produto id:bot-personalizado
/set painel id:loja-principal
```

### Ver estatisticas

```txt
/estatistica
```

### Gerar Pix manual

```txt
/gerar-pix valor:49.90 descricao:Bot personalizado
```

### Carteira integrada

A carteira integrada usa Mercado Pago. O bot gera o Pix, o cliente paga, o dinheiro cai na sua conta Mercado Pago e voce saca depois pelo painel/app do Mercado Pago.

Configure de um destes jeitos:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR...
```

Ou pelo Discord:

```txt
/botconfig
Loja > Carteira MP
```

No carrinho o cliente usa:

- `Pix carteira`: gera o Pix copia e cola do Mercado Pago.
- `Verificar Pix`: consulta o Mercado Pago; se estiver aprovado, o bot aprova e entrega automaticamente.

Para ver o resumo:

```txt
/carteira
```

O bot nao faz saque bancario automatico. Ele confirma e registra o pagamento; o saque fica na sua conta Mercado Pago.

## Recursos premium

### Termos de compra

```txt
/termos texto:Ao comprar voce aceita os termos da loja obrigatorio:true
```

### Blacklist

```txt
/blacklist add usuario:@usuario motivo:Chargeback
/blacklist remover usuario:@usuario
/blacklist listar
```

### Sorteio

```txt
/sorteio criar premio:Nitro minutos:60 vencedores:1
/sorteio encerrar id:ID_DO_SORTEIO
```

### Repost automatico

```txt
/repost tipo:painel id:loja-principal minutos:60
/repost tipo:produto id:bot-vendas minutos:30
```

Use `minutos:0` para desativar o repost daquele item no canal.

### Avaliacao

Depois de uma compra aprovada, o cliente usa:

```txt
/avaliar nota:5 comentario:Entrega rapida e produto funcionando
```

### Protecao anti-link

```txt
/protecao anti-link:true
```

### Apps de clientes

Depois que uma compra for aprovada, o cliente usa:

```txt
/apps
```

No painel ele pode:

- conectar o token do bot comprado
- mudar nome do bot
- mudar foto/avatar por URL
- mudar status/bio curta que aparece como presenca
- listar e remover os bots conectados

Observacoes importantes:

- O token do bot do cliente fica salvo em `data/apps.json`. No Railway, use `DATA_DIR=/data` com Volume para nao perder os dados.
- Nunca envie `data/apps.json` com tokens reais para o GitHub.
- A API do Discord permite alterar nome, avatar e presenca do bot. A bio real do perfil pode nao ser liberada para bots; por isso a bio fica salva como descricao interna e pode ser usada como texto de status.

## Ticket com IA

1. Use:

```txt
/painel-ia
```

2. Configure:

- API: ativa/desativa, chave Gemini e modelo.
- Treinamento: informacoes da loja, produtos e politica.
- Comportamento: limite de respostas e FAQ no formato `pergunta=resposta`.

3. Publique o painel:

```txt
/ticket-painel
```

Quando o cliente abrir ticket e mandar mensagem, a IA responde enquanto nenhum staff tiver clicado em `Assumir`.

### 4. Pegar os IDs para o painel

No Discord, ative o modo desenvolvedor:

**Configuracoes de usuario > Avancado > Modo desenvolvedor**

Depois copie:

- ID do bot/aplicacao: `CLIENT_ID`
- ID do servidor: `GUILD_ID`
- ID do canal de logs: `LOG_CHANNEL_ID`
- ID da categoria de tickets: `TICKET_CATEGORY_ID`
- ID do cargo da equipe: `STAFF_ROLE_ID`

### 5. Enviar o projeto para o GitHub

O Railway trabalha melhor puxando de um repositorio GitHub.

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para ele.
3. Nao envie seu arquivo `.env`.

### 6. Criar projeto no Railway

1. Entre em <https://railway.app/>.
2. Clique em **New Project**.
3. Escolha **Deploy from GitHub repo**.
4. Selecione o repositorio do bot.
5. Railway vai detectar Node.js automaticamente.

### 7. Configurar variaveis no Railway

No projeto do Railway, va em:

**Service > Variables**

Adicione o minimo:

```env
DISCORD_TOKEN=token_do_seu_bot
DATA_DIR=/data
```

Os dados de loja, Pix, canais e cargo staff voce configura depois pelo comando `/painel-loja`.

### 8. Criar volume para salvar dados

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

### 9. Fazer deploy

Depois de configurar as variaveis, clique em **Deploy** ou faca um novo commit no GitHub.

Quando aparecer `Online como NomeDoBot` nos logs, entre no seu servidor e use:

```txt
/setup-loja
/painel-loja
/painel-config
/criar
/set
/estatistica
/gerar-pix
/painel-ia
/ticket-painel
/blacklist
/termos
/sorteio
/repost
/avaliar
/protecao
```

### 10. Convidar o bot para o servidor

Use este link, trocando `CLIENT_ID_AQUI` pelo ID da aplicacao. O trecho `applications.commands` e obrigatorio para os slash commands aparecerem:

```txt
https://discord.com/oauth2/authorize?client_id=CLIENT_ID_AQUI&permissions=268487888&integration_type=0&scope=bot+applications.commands
```

Se os comandos nao aparecerem:

1. Remova o bot do servidor.
2. Convide de novo usando o link acima.
3. Reinicie o deploy no Railway.
4. Confira os logs do Railway. Deve aparecer algo como:

```txt
Slash commands registrados em NomeDoServidor
```

## Permissoes do bot

No portal do Discord Developer, ative:

- Server Members Intent
- Message Content Intent, se quiser evoluir para leitura de mensagens

Convide o bot com permissoes de:

- Manage Channels
- Kick Members, se o anti-fake for usado para expulsar contas recentes
- Manage Roles, se o auto-cargo estiver ativo
- Message Content Intent, se usar IA em tickets
- Send Messages
- Embed Links
- Use Slash Commands
- Read Message History

## Editar planos

Altere `data/plans.json`. O campo `id` deve ser unico e sem espacos.

## Observacao sobre Pix

Esta primeira versao usa Pix manual: o cliente informa o pagamento e a equipe aprova no ticket. Depois da loja estar funcionando, da para integrar Mercado Pago, EFI Bank ou outro gateway para aprovacao automatica.
