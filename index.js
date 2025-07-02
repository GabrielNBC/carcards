const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { inicializarDb } = require('./database.js'); // <-- ADICIONADO: Importa a função de inicialização do DB.

// Cria uma nova instância do cliente
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Cria uma coleção para guardar os comandos
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Coloca cada comando na coleção, usando o nome do comando como chave
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
        }
    }
}

// Quando o cliente estiver pronto, roda este código uma vez
client.once(Events.ClientReady, readyClient => {
    console.log(`Pronto! Logado como ${readyClient.user.tag}`);
    inicializarDb(); // <-- ADICIONADO: Executa a função para criar/verificar a tabela no banco de dados.
});

// Cria um "escutador" para interações (comandos)
client.on(Events.InteractionCreate, async interaction => {
    // Ignora se não for um comando slash
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
        return;
    }

    try {
        // Tenta executar o comando
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
        }
    }
});

// Loga no Discord com o token do seu cliente
client.login(token);