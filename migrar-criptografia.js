// Script para migrar dados existentes para formato criptografado
require('dotenv').config();
const { fetchJsonFromGithub, saveJsonToGithub, listFilesFromGithub } = require('./github-db');
const { encryptPatientData, encryptUserData } = require('./crypto-utils');

async function migrarDados() {
    console.log('🔐 Iniciando migração de dados para formato criptografado...\n');
    
    try {
        // 1. Migrar usuários
        console.log('👥 Migrando usuários...');
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        
        // Verificar se já estão criptografados (se numeroRegistro não parece ser um CPF comum)
        const jaCriptografado = usuarios.some(u => 
            u.numeroRegistro && 
            u.numeroRegistro.length > 20 && // Dados criptografados são muito maiores
            !u.numeroRegistro.includes('-') // CPF tem hífen
        );
        
        if (!jaCriptografado) {
            const usuariosCriptografados = usuarios.map(encryptUserData);
            await saveJsonToGithub('usuarios.json', usuariosCriptografados, 'Migração: Criptografia de dados de usuários');
            console.log(`✅ ${usuarios.length} usuário(s) criptografado(s)`);
        } else {
            console.log('✅ Usuários já estão criptografados');
        }
        
        // 2. Migrar pacientes
        console.log('\n🏥 Migrando pacientes...');
        const files = await listFilesFromGithub('pacientes');
        let pacientesMigrados = 0;
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            
            // Verificar se já está criptografado
            const jaPacienteCriptografado = paciente.cpf && 
                paciente.cpf.length > 20 && 
                !paciente.cpf.includes('-');
            
            if (!jaPacienteCriptografado && paciente.cpf) {
                const pacienteCriptografado = encryptPatientData(paciente);
                await saveJsonToGithub(`pacientes/${file.name}`, pacienteCriptografado, 'Migração: Criptografia de dados do paciente');
                pacientesMigrados++;
                console.log(`✅ Paciente ${paciente.nomeCompleto} criptografado`);
            }
        }
        
        if (pacientesMigrados === 0) {
            console.log('✅ Todos os pacientes já estão criptografados');
        } else {
            console.log(`✅ ${pacientesMigrados} paciente(s) criptografado(s)`);
        }
        
        console.log('\n🎉 Migração concluída com sucesso!');
        console.log('\n🔒 DADOS AGORA PROTEGIDOS:');
        console.log('  • CPF dos pacientes');
        console.log('  • Telefones');
        console.log('  • Emails'); 
        console.log('  • Endereços');
        console.log('  • Observações médicas');
        console.log('  • Histórico médico');
        console.log('  • Números de registro dos profissionais');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        process.exit(1);
    }
}

// Executar migração
migrarDados();
