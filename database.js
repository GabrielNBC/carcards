const Database = require('better-sqlite3');

// Cria um novo arquivo de banco de dados chamado 'carcards.db'
// Se o arquivo já existir, ele apenas se conecta a ele.
const db = new Database('carcards.db', { verbose: console.log });

// --- FUNÇÃO DE INICIALIZAÇÃO ---
// Esta função garante que a tabela que precisamos exista.
function inicializarDb() {
    // A tabela 'garagem' vai guardar o ID do usuário, o ID do carro que ele possui,
    // e um ID único para cada carta na garagem.
    const sql = `
    CREATE TABLE IF NOT EXISTS garagem (
        garagem_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        carro_id INTEGER NOT NULL
    );`;

    // Executamos o comando SQL para criar a tabela.
    db.exec(sql);
    console.log("Banco de dados pronto e tabela 'garagem' verificada.");
}

// Exportamos o banco de dados (db) e a função de inicialização
// para que outros arquivos possam usá-los.
module.exports = { db, inicializarDb };