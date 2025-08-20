// Teste de login direto via servidor
const express = require('express');
const { fetchJsonFromGithub } = require('./github-db');

const app = express();
app.use(express.json());

app.post('/test-login', async (req, res) => {
    try {
        console.log('📥 Dados recebidos:', req.body);
        
        const { login, senha } = req.body;
        console.log('🔍 Buscando login:', JSON.stringify(login));
        console.log('🔍 Buscando senha:', JSON.stringify(senha));
        
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        console.log('📋 Usuários no GitHub:', usuarios.length);
        
        if (usuarios.length > 0) {
            const admin = usuarios[0];
            console.log('👤 Admin no GitHub:');
            console.log('  - Login:', JSON.stringify(admin.login));
            console.log('  - Senha:', JSON.stringify(admin.senha));
            console.log('  - Login match:', admin.login === login);
            console.log('  - Senha match:', admin.senha === senha);
        }
        
        const usuario = usuarios.find(u => 
            u.login === login && u.senha === senha
        );
        
        if (usuario) {
            console.log('✅ Login bem-sucedido!');
            res.json({ success: true, message: 'Login OK' });
        } else {
            console.log('❌ Login falhou!');
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
    } catch (error) {
        console.error('💥 Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🧪 Servidor de teste rodando na porta ${PORT}`);
    console.log(`📋 Teste: curl -X POST http://localhost:${PORT}/test-login -H "Content-Type: application/json" -d "{\\"login\\":\\"admin\\",\\"senha\\":\\"admin123\\"}"`);
});
