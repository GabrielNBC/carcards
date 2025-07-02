const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { db } = require('../../database.js');
const carrosDisponiveis = require('../../carros.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('corrida')
        .setDescription('Desafie outro jogador para uma corrida!')
        .addUserOption(option =>
            option.setName('oponente')
                .setDescription('O jogador que você quer desafiar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tipo_de_pista')
                .setDescription('O tipo de pista para a corrida')
                .setRequired(true)
                .addChoices(
                    { name: 'Arrancada (0-100km/h)', value: 'arrancada' },
                    { name: 'Circuito Rápido (Vel. Máxima)', value: 'velocidade' },
                    { name: 'Estrada com Curvas (Manejo)', value: 'manejo' },
                )),

    async execute(interaction) {
        const desafiante = interaction.user;
        const oponente = interaction.options.getUser('oponente');
        const tipoPista = interaction.options.getString('tipo_de_pista');

        const nomesPistas = {
            arrancada: 'Arrancada (0-100km/h)',
            velocidade: 'Circuito Rápido (Vel. Máxima)',
            manejo: 'Estrada com Curvas (Manejo)'
        };
        const nomeDaPista = nomesPistas[tipoPista];


        // --- Validações Iniciais ---
        if (oponente.bot) {
            return interaction.reply({ content: 'Você não pode desafiar um bot para uma corrida!', ephemeral: true });
        }
        if (oponente.id === desafiante.id) {
            return interaction.reply({ content: 'Você não pode desafiar a si mesmo!', ephemeral: true });
        }

        try {
            // --- Puxa a garagem de ambos os jogadores do DB ---
            const garagemDesafiante = db.prepare(`SELECT garagem_id, carro_id FROM garagem WHERE user_id = ? ORDER BY garagem_id DESC LIMIT 25`).all(desafiante.id);
            const garagemOponente = db.prepare(`SELECT garagem_id, carro_id FROM garagem WHERE user_id = ? ORDER BY garagem_id DESC LIMIT 25`).all(oponente.id);

            if (garagemDesafiante.length === 0) {
                return interaction.reply({ content: `Você não tem carros na sua garagem para competir! Use o comando \`/pacote\`.`, ephemeral: true });
            }
            if (garagemOponente.length === 0) {
                return interaction.reply({ content: `O jogador ${oponente.username} não tem carros na garagem dele!`, ephemeral: true });
            }

            // --- Cria os Menus de Seleção de Carro ---
            const menuDesafiante = new StringSelectMenuBuilder()
                .setCustomId(`corrida_menu_desafiante_${interaction.id}`)
                .setPlaceholder('Escolha seu carro, Desafiante!')
                .addOptions(garagemDesafiante.map(carro => {
                    const infoCarro = carrosDisponiveis.find(c => c.id === carro.carro_id);
                    return {
                        label: infoCarro.nome,
                        description: `Raridade: ${infoCarro.raridade}`,
                        value: carro.garagem_id.toString(),
                    };
                }));

            const menuOponente = new StringSelectMenuBuilder()
                .setCustomId(`corrida_menu_oponente_${interaction.id}`)
                .setPlaceholder('Escolha seu carro, Oponente!')
                .addOptions(garagemOponente.map(carro => {
                    const infoCarro = carrosDisponiveis.find(c => c.id === carro.carro_id);
                    return {
                        label: infoCarro.nome,
                        description: `Raridade: ${infoCarro.raridade}`,
                        value: carro.garagem_id.toString(),
                    };
                }));

            const rowDesafiante = new ActionRowBuilder().addComponents(menuDesafiante);
            const rowOponente = new ActionRowBuilder().addComponents(menuOponente);
            
            await interaction.reply({
                content: `🏁 Desafio Lançado! 🏁\n${desafiante.username} vs ${oponente.username} em uma **${nomeDaPista}**!\n\nAmbos devem escolher seus carros abaixo em 60 segundos.`,
                components: [rowDesafiante, rowOponente],
            });

            // --- Coletor de Interações para os Menus ---
            const filtro = i => i.isStringSelectMenu() && i.customId.startsWith('corrida_menu_');
            const coletor = interaction.channel.createMessageComponentCollector({ filter: filtro, time: 60000 });

            let carroDesafiante = null;
            let carroOponente = null;
            let desafiantePronto = false;
            let oponentePronto = false;


            coletor.on('collect', async i => {
                // Impede que um jogador vote duas vezes
                if (i.user.id === desafiante.id && desafiantePronto) return i.reply({ content: 'Você já escolheu seu carro.', ephemeral: true });
                if (i.user.id === oponente.id && oponentePronto) return i.reply({ content: 'Você já escolheu seu carro.', ephemeral: true });
                
                if (i.user.id === desafiante.id) {
                    const garagemId = parseInt(i.values[0], 10);
                    const carroDB = garagemDesafiante.find(c => c.garagem_id === garagemId);
                    carroDesafiante = carrosDisponiveis.find(c => c.id === carroDB.carro_id);
                    desafiantePronto = true;
                } else if (i.user.id === oponente.id) {
                    const garagemId = parseInt(i.values[0], 10);
                    const carroDB = garagemOponente.find(c => c.garagem_id === garagemId);
                    carroOponente = carrosDisponiveis.find(c => c.id === carroDB.carro_id);
                    oponentePronto = true;
                } else {
                    return i.reply({ content: 'Você não está participando desta corrida!', ephemeral: true });
                }

                // Atualiza a mensagem para dar feedback de quem já votou
                let feedbackContent = interaction.message.content;
                if (desafiantePronto && !oponentePronto) {
                    feedbackContent = `${desafiante.username} escolheu! Esperando ${oponente.username}...`;
                } else if (!desafiantePronto && oponentePronto) {
                    feedbackContent = `${oponente.username} escolheu! Esperando ${desafiante.username}...`;
                } else if (desafiantePronto && oponentePronto) {
                    feedbackContent = 'Ambos os jogadores escolheram! Processando resultado...';
                }
                
                await i.update({ content: feedbackContent });

                if (desafiantePronto && oponentePronto) {
                    coletor.stop('ambos_escolheram');
                }
            });

            coletor.on('end', async (collected, reason) => {
                menuDesafiante.setDisabled(true);
                menuOponente.setDisabled(true);
                await interaction.editReply({ components: [new ActionRowBuilder().addComponents(menuDesafiante), new ActionRowBuilder().addComponents(menuOponente)] });

                if (reason !== 'ambos_escolheram') {
                    return interaction.followUp('A corrida foi cancelada porque um dos jogadores não escolheu a tempo.');
                }

                // Lógica da corrida (sem alterações)
                let vencedor = null;
                let statDesafiante, statOponente, statNome, unidade;

                switch (tipoPista) {
                    case 'arrancada':
                        statNome = '0-100km/h';
                        unidade = 's';
                        statDesafiante = carroDesafiante.status.zero_a_cem;
                        statOponente = carroOponente.status.zero_a_cem;
                        if (statDesafiante < statOponente) vencedor = desafiante;
                        if (statOponente < statDesafiante) vencedor = oponente;
                        break;
                    case 'velocidade':
                        statNome = 'Vel. Máxima';
                        unidade = 'km/h';
                        statDesafiante = carroDesafiante.status.velocidade_maxima;
                        statOponente = carroOponente.status.velocidade_maxima;
                        if (statDesafiante > statOponente) vencedor = desafiante;
                        if (statOponente > statDesafiante) vencedor = oponente;
                        break;
                    case 'manejo':
                        statNome = 'Manejo';
                        unidade = '';
                        statDesafiante = carroDesafiante.status.manejo;
                        statOponente = carroOponente.status.manejo;
                        if (statDesafiante > statOponente) vencedor = desafiante;
                        if (statOponente > statDesafiante) vencedor = oponente;
                        break;
                }

                const resultadoEmbed = new EmbedBuilder()
                    .setTitle('🏁 Resultado da Corrida! 🏁')
                    .addFields(
                        { name: `Carro de ${desafiante.username}`, value: `**${carroDesafiante.nome}**\n${statNome}: ${statDesafiante}${unidade}` },
                        { name: `Carro de ${oponente.username}`, value: `**${carroOponente.nome}**\n${statNome}: ${statOponente}${unidade}` },
                    );

                if (vencedor) {
                    resultadoEmbed.setDescription(`🏆 O grande vencedor é **${vencedor.username}**! 🏆`).setColor('Gold');
                } else {
                    resultadoEmbed.setDescription('🎌 Incrível! A corrida terminou em **EMPATE**! 🎌').setColor('Grey');
                }

                await interaction.followUp({ embeds: [resultadoEmbed] });
            });

        } catch (error) {
            console.error("Erro no comando de corrida:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Ocorreu um erro inesperado ao tentar iniciar a corrida.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Ocorreu um erro inesperado ao tentar iniciar a corrida.', ephemeral: true });
            }
        }
    },
};