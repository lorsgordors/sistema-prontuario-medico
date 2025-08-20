// Funções utilitárias para salvar e buscar arquivos JSON no GitHub
const axios = require('axios');

// Configuração do GitHub - usa variáveis de ambiente
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO || 'lorsgordors/dados.prontuario';
const BRANCH = 'main';

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN não configurado! Configure a variável de ambiente.');
    process.exit(1);
}

async function getFileSha(filePath) {
  const url = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    return res.data.sha;
  } catch (e) {
    return undefined;
  }
}

async function saveJsonToGithub(filePath, jsonData, commitMessage = 'Atualizando arquivo JSON') {
  const content = Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64');
  const url = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  
  try {
    // Sempre buscar o SHA mais atual antes de salvar
    const sha = await getFileSha(filePath);
    
    await axios.put(url, {
      message: commitMessage,
      content,
      branch: BRANCH,
      sha
    }, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
  } catch (error) {
    // Se ainda der conflito, tenta novamente após pequeno delay
    if (error.response && error.response.status === 409) {
      console.log('⚠️ Conflito detectado, tentando novamente...');
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      const sha = await getFileSha(filePath);
      await axios.put(url, {
        message: commitMessage,
        content,
        branch: BRANCH,
        sha
      }, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
    } else {
      throw error;
    }
  }
}

async function fetchJsonFromGithub(filePath) {
  const url = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const content = Buffer.from(res.data.content, 'base64').toString('utf8');
    return JSON.parse(content);
  } catch (e) {
    // Se não existe, retorna array vazio (para listas) ou objeto vazio
    if (e.response && e.response.status === 404) {
      // Personalize conforme o tipo de arquivo esperado
      if (filePath.endsWith('.json')) {
        // Para usuários, logs e pacientes, retorna array vazio
        if (filePath === 'usuarios.json' || filePath === 'logs.json' || filePath === 'pacientes.json') return [];
        // Para arquivos de paciente individuais, retorna null
        if (filePath.startsWith('pacientes/')) return null;
        // Para outros, pode retornar objeto vazio
        return {};
      }
    }
    throw e;
  }
}

// Função específica para listar arquivos em uma pasta
async function listFilesFromGithub(folderPath) {
  const url = `https://api.github.com/repos/${REPO}/contents/${folderPath}`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    return res.data.filter(item => item.type === 'file' && item.name.endsWith('.json'));
  } catch (e) {
    if (e.response && e.response.status === 404) {
      return []; // Pasta não existe, retorna array vazio
    }
    throw e;
  }
}

// Função para excluir arquivo do GitHub
async function deleteFileFromGithub(filePath, commitMessage = 'Excluindo arquivo') {
  const sha = await getFileSha(filePath);
  if (!sha) {
    throw new Error('Arquivo não encontrado para exclusão');
  }
  
  const url = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  await axios.delete(url, {
    data: {
      message: commitMessage,
      sha,
      branch: BRANCH
    },
    headers: { Authorization: `token ${GITHUB_TOKEN}` }
  });
}

module.exports = { saveJsonToGithub, fetchJsonFromGithub, listFilesFromGithub, deleteFileFromGithub };
