const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Pega todas as pastas de comando do diretório de comandos
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Pega todos os arquivos de comando de cada pasta
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
		}
	}
}

// Cria uma instância do módulo REST
const rest = new REST().setToken(token);

// Efetua o deploy dos comandos!
(async () => {
	try {
		console.log(`Iniciando o registro de ${commands.length} comandos (/) de aplicação.`);

		// O método put é usado para atualizar todos os comandos no servidor com o novo conjunto
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Sucesso! Foram registrados ${data.length} comandos (/) de aplicação.`);
	} catch (error) {
		console.error(error);
	}
})();