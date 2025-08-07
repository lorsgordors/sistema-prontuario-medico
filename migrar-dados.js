const fs = require('fs').promises;
const path = require('path');

async function migrarPacientesExistentes() {
    try {
        const pacientesDir = './data/pacientes';
        
        // Verificar se a pasta existe
        try {
            await fs.access(pacientesDir);
        } catch {
            console.log('📁 Pasta de pacientes não existe ainda. Nenhuma migração necessária.');
            return;
        }
        
        const files = await fs.readdir(pacientesDir);
        
        console.log('🔄 Iniciando migração dos dados de pacientes...');
        
        let pacientesMigrados = 0;
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(pacientesDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const paciente = JSON.parse(data);
                
                // Adicionar campos novos se não existirem
                let needsUpdate = false;
                
                if (!paciente.criadoPorId) {
                    // Assumir que pacientes sem criadoPorId foram criados pelo admin
                    paciente.criadoPorId = 1; // ID do admin
                    needsUpdate = true;
                }
                
                if (!paciente.ultimaAtualizacao) {
                    paciente.ultimaAtualizacao = paciente.criadoEm || new Date().toISOString();
                    needsUpdate = true;
                }
                
                if (!paciente.criadoPorRegistro && paciente.criadoPor) {
                    paciente.criadoPorRegistro = 'CPF: 000.000.000-00'; // Padrão para dados antigos
                    needsUpdate = true;
                }
                
                // Atualizar atendimentos se necessário
                if (paciente.atendimentos && Array.isArray(paciente.atendimentos)) {
                    paciente.atendimentos.forEach(atendimento => {
                        if (!atendimento.profissionalId) {
                            atendimento.profissionalId = paciente.criadoPorId;
                        }
                    });
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    await fs.writeFile(filePath, JSON.stringify(paciente, null, 2));
                    console.log(`✅ Migrado: ${paciente.nomeCompleto}`);
                    pacientesMigrados++;
                }
            }
        }
        
        if (pacientesMigrados > 0) {
            console.log(`🎉 Migração concluída! ${pacientesMigrados} paciente(s) migrado(s).`);
        } else {
            console.log('✨ Todos os dados já estão atualizados. Nenhuma migração necessária.');
        }
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    }
}

// Executar migração se este arquivo for executado diretamente
if (require.main === module) {
    migrarPacientesExistentes();
}

module.exports = { migrarPacientesExistentes };