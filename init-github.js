// Script para inicializar estrutura do GitHub com dados padrão
require('dotenv').config();
const { saveJsonToGithub } = require('./github-db');
const crypto = require('crypto');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function inicializarGithub() {
    try {
        console.log('🚀 Inicializando estrutura no GitHub...');
        
        // Criar usuário administrador padrão
        const usuariosPadrao = [{
            id: 1,
            login: 'admin',
            senha: 'admin123',
            nomeCompleto: 'Administrador do Sistema - Lorsgordors',
            tipoRegistro: 'CPF',
            numeroRegistro: '000.000.000-00',
            estadoRegistro: null,
            tipo: 'Administrador',
            criadoEm: '2025-08-07T15:42:34.000Z',
            criadoPor: 'Sistema'
        }];
        
        // Salvar no GitHub
        await saveJsonToGithub('usuarios.json', usuariosPadrao, 'Inicialização: usuário admin padrão');
        await saveJsonToGithub('logs.json', [], 'Inicialização: logs vazios');
        
        console.log('✅ Estrutura inicializada no GitHub com sucesso!');
        console.log('📝 Login padrão: admin / admin123');
        console.log('📁 Pacientes serão salvos individualmente na pasta pacientes/');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar GitHub:', error.message);
    }
}

inicializarGithub();
