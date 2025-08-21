const fs = require('fs').promises;
const path = require('path');

// Configurações do GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'seu_token_aqui';
const GITHUB_OWNER = 'lorsgordors';
const GITHUB_REPO = 'sistema-prontuario-medico';

// Função para buscar dados do GitHub
async function fetchJsonFromGithub(filename) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Sistema-Prontuario-Medico'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return JSON.parse(content);
        }
        return [];
    } catch (error) {
        console.error(`Erro ao buscar ${filename}:`, error);
        return [];
    }
}

// Função para salvar dados no GitHub
async function saveJsonToGithub(filename, data, commitMessage) {
    try {
        const content = JSON.stringify(data, null, 2);
        const base64Content = Buffer.from(content).toString('base64');
        
        // Primeiro, buscar o SHA atual do arquivo
        const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Sistema-Prontuario-Medico'
            }
        });
        
        let sha = null;
        if (getResponse.ok) {
            const currentData = await getResponse.json();
            sha = currentData.sha;
        }

        // Agora, atualizar ou criar o arquivo
        const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Sistema-Prontuario-Medico',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: commitMessage,
                content: base64Content,
                sha: sha
            })
        });

        if (!putResponse.ok) {
            throw new Error(`Erro HTTP: ${putResponse.status}`);
        }

        return true;
    } catch (error) {
        console.error(`Erro ao salvar ${filename}:`, error);
        return false;
    }
}

// Função para limpar logs antigos
async function limparLogsAntigos(logs, dias = 7) {
    const diasAtras = new Date();
    diasAtras.setDate(diasAtras.getDate() - dias);
    
    const logsRecentes = logs.filter(log => {
        const dataLog = new Date(log.timestamp);
        return dataLog >= diasAtras;
    });
    
    const logsRemovidos = logs.length - logsRecentes.length;
    
    return { logsRecentes, logsRemovidos };
}

// Função principal
async function executarLimpeza() {
    try {
        console.log('🧹 LIMPEZA MANUAL DE LOGS');
        console.log('='.repeat(50));
        
        console.log('📥 Carregando logs do GitHub...');
        let logs = await fetchJsonFromGithub('logs.json');
        
        if (logs.length === 0) {
            console.log('📭 Nenhum log encontrado.');
            return;
        }
        
        console.log(`📊 Total de logs encontrados: ${logs.length}`);
        
        // Perguntar quantos dias manter
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const dias = await new Promise((resolve) => {
            rl.question('🗓️  Manter logs dos últimos quantos dias? (padrão: 7): ', (resposta) => {
                const numeroDias = parseInt(resposta) || 7;
                resolve(numeroDias);
            });
        });
        
        rl.close();
        
        console.log(`🔄 Removendo logs com mais de ${dias} dias...`);
        const { logsRecentes, logsRemovidos } = await limparLogsAntigos(logs, dias);
        
        if (logsRemovidos === 0) {
            console.log('✅ Nenhum log antigo encontrado para remoção.');
            return;
        }
        
        console.log(`🗑️  ${logsRemovidos} log(s) serão removidos.`);
        console.log(`📋 ${logsRecentes.length} log(s) serão mantidos.`);
        
        // Salvar logs limpos
        console.log('💾 Salvando logs limpos no GitHub...');
        const sucesso = await saveJsonToGithub('logs.json', logsRecentes, `Limpeza manual: removidos ${logsRemovidos} logs antigos`);
        
        if (sucesso) {
            console.log('✅ Limpeza concluída com sucesso!');
            console.log(`📊 Relatório:`);
            console.log(`   • Logs removidos: ${logsRemovidos}`);
            console.log(`   • Logs mantidos: ${logsRecentes.length}`);
            console.log(`   • Economia de espaço: ${Math.round((logsRemovidos / logs.length) * 100)}%`);
        } else {
            console.log('❌ Erro ao salvar logs limpos.');
        }
        
    } catch (error) {
        console.error('❌ Erro durante a limpeza:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    executarLimpeza();
}

module.exports = { limparLogsAntigos, executarLimpeza };
