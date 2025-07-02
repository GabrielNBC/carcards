const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const carrosDisponiveis = require('../../carros.json');
const { db } = require('../../database.js'); // <-- ADICIONADO: Importa a conexão com o banco de dados.

// Função para definir a cor da carta baseada na raridade
function obterCorPorRaridade(raridade) {
    switch (raridade) {
        case 'Raro':
            return '#0070DD'; // Azul
        case 'Incomum':
            return '#1F8B4C'; // Verde
        case 'Comum':
        default:
            return '#99AAB5'; // Cinza
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pacote')
        .setDescription('Abre um pacote e ganha uma carta de carro aleatória!'),

    async execute(interaction) {
        // --- Lógica para escolher uma carta aleatória (sem alterações) ---
        const chance = Math.random();
        let raridadeSorteada;

        if (chance < 0.70) {
            raridadeSorteada = 'Comum';
        } else if (chance < 0.85) {
            raridadeSorteada = 'Incomum';
        } else {
            raridadeSorteada = 'Raro';
        }

        const carrosPossiveis = carrosDisponiveis.filter(c => c.raridade === raridadeSorteada);
        const carroSorteado = carrosPossiveis[Math.floor(Math.random() * carrosPossiveis.length)];

        // --- NOVO: Bloco para salvar o carro no banco de dados ---
        try {
            const sql = `INSERT INTO garagem (user_id, carro_id) VALUES (?, ?)`;
            // interaction.user.id é o ID do usuário que usou o comando
            // carroSorteado.id é o ID do carro do nosso arquivo carros.json
            db.prepare(sql).run(interaction.user.id, carroSorteado.id);
        } catch (error) {
            console.error("Erro ao salvar na garagem:", error);
            return interaction.reply({ content: 'Ocorreu um erro ao tentar salvar seu novo carro na garagem. Tente novamente.', ephemeral: true });
        }
        
        // --- Criar a resposta visual (Embed) ---
        const embed = new EmbedBuilder()
            .setTitle(`🎉 Você ganhou e guardou na garagem! 🎉`) // <-- MODIFICADO: Mensagem de confirmação
            .setDescription(`**${carroSorteado.nome} ${carroSorteado.ano}**`)
            .setColor(obterCorPorRaridade(carroSorteado.raridade))
            .setImage(carroSorteado.imagem)
            .addFields(
                { name: 'Raridade', value: carroSorteado.raridade, inline: true },
                { name: 'Vel. Máxima', value: `${carroSorteado.status.velocidade_maxima} km/h`, inline: true },
                { name: '0-100km/h', value: `${carroSorteado.status.zero_a_cem}s`, inline: true },
                { name: 'Manejo', value: `${carroSorteado.status.manejo}`, inline: true }
            )
            .setFooter({ text: `ID da Carta: ${carroSorteado.id}` });
        
        // A carta agora é salva! A resposta abaixo confirma isso.
        await interaction.reply({ embeds: [embed] });
    },
};