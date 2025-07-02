const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js');
const carrosDisponiveis = require('../../carros.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('garagem')
        .setDescription('Mostra todos os carros que você possui na sua coleção.'),

    async execute(interaction) {
        try {
            // Prepara o comando SQL para buscar os carros do usuário no banco de dados.
            // Selecionamos o garagem_id para ter uma referência única de cada carro.
            const sql = `SELECT garagem_id, carro_id FROM garagem WHERE user_id = ?`;
            const linhasDaGaragem = db.prepare(sql).all(interaction.user.id);

            // Se o resultado da busca for uma lista vazia, o jogador não tem carros.
            if (linhasDaGaragem.length === 0) {
                return interaction.reply({ content: 'Sua garagem está vazia! Use o comando `/pacote` para conseguir seus primeiros carros.', ephemeral: true });
            }

            // Mapeia os IDs dos carros para os dados completos dos carros do nosso arquivo JSON.
            // Agora, mantemos o garagem_id para referência.
            const carrosDoUsuario = linhasDaGaragem.map(linha => {
                const infoCarro = carrosDisponiveis.find(carro => carro.id === linha.carro_id);
                return {
                    garagemId: linha.garagem_id, // ID único desta carta na garagem
                    ...infoCarro // Todas as outras informações do carro
                };
            });

            // Cria uma string formatada com a lista de carros.
            // Adicionamos o ID da garagem para cada carro, o que será útil no futuro.
            const listaDeCarros = carrosDoUsuario
                .map(carro => `**(ID: ${carro.garagemId})** ${carro.nome} - *${carro.raridade}*`)
                .join('\n'); // O '\n' cria uma nova linha para cada carro, organizando a lista.

            const embed = new EmbedBuilder()
                .setTitle(`Garagem de ${interaction.user.username}`)
                .setColor('#FFD700') // Uma cor dourada para a garagem
                .setDescription(listaDeCarros || 'Nenhum carro encontrado.')
                .setFooter({ text: `Total de carros: ${carrosDoUsuario.length}`});

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro ao buscar a garagem:", error);
            return interaction.reply({ content: 'Ocorreu um erro ao tentar buscar sua garagem.', ephemeral: true });
        }
    },
};