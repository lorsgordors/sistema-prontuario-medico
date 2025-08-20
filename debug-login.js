// Script de debug para testar login
require('dotenv').config();
const { fetchJsonFromGithub } = require('./github-db');

async function testLogin() {
    try {
        console.log('🔍 Testando login...');
        
        // Buscar usuários
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        console.log('📋 Usuários encontrados:', usuarios.length);
        
        // Mostrar primeiro usuário
        if (usuarios.length > 0) {
            const admin = usuarios[0];
            console.log('👤 Admin encontrado:');
            console.log('  - Login:', JSON.stringify(admin.login));
            console.log('  - Senha:', JSON.stringify(admin.senha));
            console.log('  - Tipo:', admin.tipo);
        }
        
        // Testar comparação
        const testLogin = 'admin';
        const testSenha = 'admin123';
        
        console.log('\n🧪 Teste de comparação:');
        console.log('  - Login teste:', JSON.stringify(testLogin));
        console.log('  - Senha teste:', JSON.stringify(testSenha));
        
        const usuario = usuarios.find(u => 
            u.login === testLogin && u.senha === testSenha
        );
        
        if (usuario) {
            console.log('✅ Login funcionou!');
        } else {
            console.log('❌ Login falhou!');
            
            // Debug detalhado
            usuarios.forEach((u, i) => {
                console.log(`\nUsuário ${i}:`);
                console.log('  Login match:', u.login === testLogin, `("${u.login}" === "${testLogin}")`);
                console.log('  Senha match:', u.senha === testSenha, `("${u.senha}" === "${testSenha}")`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

testLogin();
