const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const os = require('os');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'prontuario-medico-secret-key-lorsgordors-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Função para criar hash da senha
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para validar força da senha
function validarForcaSenha(senha) {
    if (senha.length < 6) return { valida: false, motivo: 'Senha deve ter pelo menos 6 caracteres' };
    if (!/[A-Za-z]/.test(senha)) return { valida: false, motivo: 'Senha deve conter pelo menos uma letra' };
    if (!/[0-9]/.test(senha)) return { valida: false, motivo: 'Senha deve conter pelo menos um número' };
    return { valida: true };
}

// Função para log de auditoria
async function logAuditoria(acao, usuario, detalhes) {
    try {
        let logs = [];
        try {
            const logsData = await fs.readFile('./data/logs.json', 'utf8');
            logs = JSON.parse(logsData);
        } catch {
            // Arquivo não existe, criar novo
        }
        
        logs.push({
            timestamp: new Date().toISOString(),
            acao,
            usuario,
            detalhes,
            ip: 'lorsgordors-system',
            dataHora: new Date().toLocaleString('pt-BR')
        });
        
        // Manter apenas os últimos 1000 logs
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }
        
        await fs.writeFile('./data/logs.json', JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Erro ao gravar log:', error);
    }
}

// Função para verificar se o usuário pode ver o paciente
function podeVerPaciente(usuario, paciente) {
    // Administrador vê todos os pacientes
    if (usuario.tipo === 'Administrador') {
        return true;
    }
    
    // Profissional vê apenas pacientes que ele cadastrou
    return paciente.criadoPor === usuario.nomeCompleto || 
           paciente.criadoPorId === usuario.id;
}

// Função para verificar se o usuário pode editar/excluir o paciente
function podeEditarPaciente(usuario, paciente) {
    // Administrador pode editar qualquer paciente
    if (usuario.tipo === 'Administrador') {
        return { pode: true, motivo: 'Administrador' };
    }
    
    // Profissional pode editar apenas pacientes que ele cadastrou
    if (paciente.criadoPor === usuario.nomeCompleto || paciente.criadoPorId === usuario.id) {
        return { pode: true, motivo: 'Proprietário do registro' };
    }
    
    return { 
        pode: false, 
        motivo: 'Você só pode gerenciar pacientes cadastrados por você' 
    };
}

// Função para obter TODOS os IPs de rede
function getAllNetworkIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                ips.push({
                    name: name,
                    address: interface.address,
                    netmask: interface.netmask
                });
            }
        }
    }
    return ips;
}

// Função para garantir que as pastas existam
async function ensureDirectories() {
    try {
        await fs.mkdir('./data', { recursive: true });
        await fs.mkdir('./data/pacientes', { recursive: true });
        
        // Criar arquivo de usuários padrão se não existir
        try {
            await fs.access('./data/usuarios.json');
        } catch {
            const usuariosPadrao = [
                {
                    id: 1,
                    login: 'admin',
                    senha: hashPassword('admin123'),
                    nomeCompleto: 'Administrador do Sistema - Lorsgordors',
                    tipoRegistro: 'CPF',
                    numeroRegistro: '000.000.000-00',
                    estadoRegistro: null,
                    tipo: 'Administrador',
                    criadoEm: '2025-08-07T15:42:34.000Z',
                    criadoPor: 'Sistema'
                }
            ];
            await fs.writeFile('./data/usuarios.json', JSON.stringify(usuariosPadrao, null, 2));
            console.log('✅ Sistema inicializado com usuário padrão: admin/admin123');
        }
        
        // Migrar usuários existentes se necessário
        await migrarUsuarios();
    } catch (error) {
        console.error('Erro ao criar diretórios:', error);
    }
}

// Função para migrar usuários existentes
async function migrarUsuarios() {
    try {
        const usuarios = JSON.parse(await fs.readFile('./data/usuarios.json', 'utf8'));
        let migracaoNecessaria = false;
        
        usuarios.forEach(usuario => {
            if (!usuario.tipoRegistro) {
                usuario.tipoRegistro = 'CPF';
                usuario.numeroRegistro = usuario.cpf || '000.000.000-00';
                usuario.estadoRegistro = null;
                usuario.tipo = usuario.tipo || 'Profissional';
                migracaoNecessaria = true;
            }
            if (!usuario.criadoEm) {
                usuario.criadoEm = new Date().toISOString();
                usuario.criadoPor = 'Sistema';
                migracaoNecessaria = true;
            }
        });
        
        if (migracaoNecessaria) {
            await fs.writeFile('./data/usuarios.json', JSON.stringify(usuarios, null, 2));
            console.log('✅ Migração de usuários concluída');
        }
    } catch (error) {
        console.log('ℹ️  Nenhuma migração necessária');
    }
}

// Middleware de autenticação
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Usuário não autenticado' });
    }
}

// Middleware para verificar se é administrador
function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.tipo === 'Administrador') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
}

// Rotas de autenticação
app.post('/api/login', async (req, res) => {
    try {
        const { login, senha } = req.body;
        const usuarios = JSON.parse(await fs.readFile('./data/usuarios.json', 'utf8'));
        
        const usuario = usuarios.find(u => 
            u.login === login && u.senha === hashPassword(senha)
        );
        
        if (usuario) {
            req.session.user = {
                id: usuario.id,
                login: usuario.login,
                nomeCompleto: usuario.nomeCompleto,
                tipoRegistro: usuario.tipoRegistro,
                numeroRegistro: usuario.numeroRegistro,
                estadoRegistro: usuario.estadoRegistro,
                tipo: usuario.tipo
            };
            
            await logAuditoria('login', usuario.login, 'Login realizado com sucesso');
            res.json({ success: true, user: req.session.user });
        } else {
            await logAuditoria('login_falhou', login || 'desconhecido', 'Tentativa de login com credenciais inválidas');
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/logout', requireAuth, async (req, res) => {
    await logAuditoria('logout', req.session.user.login, 'Logout realizado');
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
    res.json(req.session.user);
});

// Rota para alterar senha
app.post('/api/alterar-senha', requireAuth, async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        const usuarios = JSON.parse(await fs.readFile('./data/usuarios.json', 'utf8'));
        
        const usuarioIndex = usuarios.findIndex(u => u.id === req.session.user.id);
        
        if (usuarioIndex === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Verificar senha atual
        if (usuarios[usuarioIndex].senha !== hashPassword(senhaAtual)) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        
        // Validar nova senha
        const validacao = validarForcaSenha(novaSenha);
        if (!validacao.valida) {
            return res.status(400).json({ error: validacao.motivo });
        }
        
        // Atualizar senha
        usuarios[usuarioIndex].senha = hashPassword(novaSenha);
        await fs.writeFile('./data/usuarios.json', JSON.stringify(usuarios, null, 2));
        
        await logAuditoria('alteracao_senha', req.session.user.login, 'Senha alterada com sucesso');
        
        // Destruir sessão para forçar novo login
        req.session.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// Rota para registrar novo usuário
app.post('/api/registrar-usuario', async (req, res) => {
    try {
        const { 
            senhaAdmin, 
            login, 
            senha, 
            nomeCompleto, 
            tipoRegistro, 
            numeroRegistro, 
            estadoRegistro 
        } = req.body;
        
        const usuarios = JSON.parse(await fs.readFile('./data/usuarios.json', 'utf8'));
        
        // Verificar se existe um admin
        const admin = usuarios.find(u => u.tipo === 'Administrador');
        if (!admin) {
            return res.status(403).json({ error: 'Nenhum administrador encontrado' });
        }
        
        // Verificar senha do admin
        if (admin.senha !== hashPassword(senhaAdmin)) {
            await logAuditoria('registro_usuario_falhou', admin.login, `Tentativa de registro com senha admin incorreta para usuário: ${login}`);
            return res.status(401).json({ error: 'Senha do administrador incorreta' });
        }
        
        // Verificar se o login já existe
        if (usuarios.find(u => u.login === login)) {
            return res.status(409).json({ error: 'Nome de usuário já existe' });
        }
        
        // Validar nova senha
        const validacao = validarForcaSenha(senha);
        if (!validacao.valida) {
            return res.status(400).json({ error: validacao.motivo });
        }
        
        // Criar novo usuário
        const novoUsuario = {
            id: Math.max(...usuarios.map(u => u.id)) + 1,
            login,
            senha: hashPassword(senha),
            nomeCompleto,
            tipoRegistro,
            numeroRegistro,
            estadoRegistro,
            tipo: 'Profissional',
            criadoEm: new Date().toISOString(),
            criadoPor: admin.login
        };
        
        usuarios.push(novoUsuario);
        await fs.writeFile('./data/usuarios.json', JSON.stringify(usuarios, null, 2));
        
        await logAuditoria('registro_usuario', admin.login, `Novo usuário registrado: ${login} (${nomeCompleto})`);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
});

// Rota para listar pacientes (filtrados por usuário)
app.get('/api/pacientes', requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir('./data/pacientes');
        const pacientes = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(`./data/pacientes/${file}`, 'utf8');
                const paciente = JSON.parse(data);
                
                // Filtrar pacientes baseado no usuário
                if (podeVerPaciente(req.session.user, paciente)) {
                    // Adicionar informação do criador para o admin
                    if (req.session.user.tipo === 'Administrador') {
                        paciente.infoAdicional = {
                            criadoPor: paciente.criadoPor,
                            criadoEm: paciente.criadoEm
                        };
                    }
                    pacientes.push(paciente);
                }
            }
        }
        
        // Log de auditoria
        await logAuditoria('listagem_pacientes', req.session.user.login, 
            `Listou ${pacientes.length} paciente(s)`);
        
        res.json(pacientes);
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        res.status(500).json({ error: 'Erro ao buscar pacientes' });
    }
});

// Rota para cadastrar paciente
app.post('/api/pacientes', requireAuth, async (req, res) => {
    try {
        const pacienteData = req.body;
        const fileName = pacienteData.nomeCompleto
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') + '.json';
        
        const paciente = {
            id: Date.now(),
            ...pacienteData,
            atendimentos: [],
            criadoEm: new Date().toISOString(),
            criadoPor: req.session.user.nomeCompleto,
            criadoPorId: req.session.user.id,
            criadoPorRegistro: `${req.session.user.tipoRegistro}: ${req.session.user.numeroRegistro}`,
            ultimaAtualizacao: new Date().toISOString()
        };
        
        await fs.writeFile(`./data/pacientes/${fileName}`, JSON.stringify(paciente, null, 2));
        
        await logAuditoria('cadastro_paciente', req.session.user.login, 
            `Paciente cadastrado: ${paciente.nomeCompleto} (ID: ${paciente.id})`);
        
        res.json({ success: true, paciente });
    } catch (error) {
        console.error('Erro ao cadastrar paciente:', error);
        res.status(500).json({ error: 'Erro ao cadastrar paciente' });
    }
});

// Rota para buscar paciente específico
app.get('/api/pacientes/:id', requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir('./data/pacientes');
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(`./data/pacientes/${file}`, 'utf8');
                const paciente = JSON.parse(data);
                
                if (paciente.id == req.params.id) {
                    // Verificar se o usuário pode ver este paciente
                    if (!podeVerPaciente(req.session.user, paciente)) {
                        return res.status(403).json({ 
                            error: 'Acesso negado. Você só pode ver pacientes cadastrados por você.' 
                        });
                    }
                    
                    return res.json(paciente);
                }
            }
        }
        
        res.status(404).json({ error: 'Paciente não encontrado' });
    } catch (error) {
        console.error('Erro ao buscar paciente:', error);
        res.status(500).json({ error: 'Erro ao buscar paciente' });
    }
});

// Rota para excluir paciente
app.delete('/api/pacientes/:id', requireAuth, async (req, res) => {
    try {
        const { senha } = req.body;
        const usuarios = JSON.parse(await fs.readFile('./data/usuarios.json', 'utf8'));
        
        // Verificar senha do usuário logado
        const usuario = usuarios.find(u => u.id === req.session.user.id);
        if (!usuario || usuario.senha !== hashPassword(senha)) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }
        
        const files = await fs.readdir('./data/pacientes');
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(`./data/pacientes/${file}`, 'utf8');
                const paciente = JSON.parse(data);
                
                if (paciente.id == req.params.id) {
                    // Verificar permissões de edição
                    const permissao = podeEditarPaciente(usuario, paciente);
                    if (!permissao.pode) {
                        return res.status(403).json({ error: permissao.motivo });
                    }
                    
                    await fs.unlink(`./data/pacientes/${file}`);
                    
                    await logAuditoria('exclusao_paciente', req.session.user.login, 
                        `Paciente excluído: ${paciente.nomeCompleto} (${permissao.motivo})`);
                    
                    return res.json({ 
                        success: true, 
                        message: 'Paciente excluído com sucesso' 
                    });
                }
            }
        }
        
        res.status(404).json({ error: 'Paciente não encontrado' });
    } catch (error) {
        console.error('Erro ao excluir paciente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para adicionar atendimento
app.post('/api/pacientes/:id/atendimentos', requireAuth, async (req, res) => {
    try {
        const atendimentoData = req.body;
        const files = await fs.readdir('./data/pacientes');
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(`./data/pacientes/${file}`, 'utf8');
                const paciente = JSON.parse(data);
                
                if (paciente.id == req.params.id) {
                    // Verificar se o usuário pode editar este paciente
                    const permissao = podeEditarPaciente(req.session.user, paciente);
                    if (!permissao.pode) {
                        return res.status(403).json({ error: permissao.motivo });
                    }
                    
                    const novoAtendimento = {
                        id: Date.now(),
                        ...atendimentoData,
                        profissionalNome: req.session.user.nomeCompleto,
                        profissionalRegistro: `${req.session.user.tipoRegistro}: ${req.session.user.numeroRegistro}`,
                        profissionalEstado: req.session.user.estadoRegistro,
                        profissionalId: req.session.user.id,
                        criadoEm: new Date().toISOString()
                    };
                    
                    paciente.atendimentos.push(novoAtendimento);
                    paciente.ultimaAtualizacao = new Date().toISOString();
                    
                    await fs.writeFile(`./data/pacientes/${file}`, JSON.stringify(paciente, null, 2));
                    
                    await logAuditoria('novo_atendimento', req.session.user.login, 
                        `Atendimento registrado para: ${paciente.nomeCompleto}`);
                    
                    return res.json({ success: true, atendimento: novoAtendimento });
                }
            }
        }
        
        res.status(404).json({ error: 'Paciente não encontrado' });
    } catch (error) {
        console.error('Erro ao adicionar atendimento:', error);
        res.status(500).json({ error: 'Erro ao adicionar atendimento' });
    }
});

// Rota para obter tipos de registro
app.get('/api/tipos-registro', (req, res) => {
    const tipos = [
        { valor: 'CPF', nome: 'CPF - Cadastro de Pessoa Física', temEstado: false },
        { valor: 'CRM', nome: 'CRM - Conselho Regional de Medicina', temEstado: true },
        { valor: 'COREN', nome: 'COREN - Conselho Regional de Enfermagem', temEstado: true },
        { valor: 'CRO', nome: 'CRO - Conselho Regional de Odontologia', temEstado: true },
        { valor: 'CREFITO', nome: 'CREFITO - Conselho Regional de Fisioterapia', temEstado: true },
        { valor: 'CRF', nome: 'CRF - Conselho Regional de Farmácia', temEstado: true },
        { valor: 'CRP', nome: 'CRP - Conselho Regional de Psicologia', temEstado: true },
        { valor: 'CRBM', nome: 'CRBM - Conselho Regional de Biomedicina', temEstado: true },
        { valor: 'CRN', nome: 'CRN - Conselho Regional de Nutrição', temEstado: true },
        { valor: 'CBO', nome: 'CBO - Classificação Brasileira de Ocupações', temEstado: false }
    ];
    
    res.json(tipos);
});

// Rota para estatísticas do usuário
app.get('/api/estatisticas', requireAuth, async (req, res) => {
    try {
        const files = await fs.readdir('./data/pacientes');
        let totalPacientes = 0;
        let totalAtendimentos = 0;
        let pacientesRecentes = 0;
        
        const umMesAtras = new Date();
        umMesAtras.setMonth(umMesAtras.getMonth() - 1);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(`./data/pacientes/${file}`, 'utf8');
                const paciente = JSON.parse(data);
                
                // Contar apenas pacientes que o usuário pode ver
                if (podeVerPaciente(req.session.user, paciente)) {
                    totalPacientes++;
                    totalAtendimentos += paciente.atendimentos ? paciente.atendimentos.length : 0;
                    
                    // Pacientes cadastrados no último mês
                    if (new Date(paciente.criadoEm) > umMesAtras) {
                        pacientesRecentes++;
                    }
                }
            }
        }
        
        res.json({
            totalPacientes,
            totalAtendimentos,
            pacientesRecentes,
            tipoUsuario: req.session.user.tipo
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Função para iniciar servidor com configuração robusta - LORSGORDORS
function startServerLorsgordors(port) {
    console.log('🔧 Configurando servidor para lorsgordors...');
    
    const allIPs = getAllNetworkIPs();
    console.log('🌐 Interfaces de rede detectadas:');
    allIPs.forEach((ip, i) => {
        console.log(`   ${i + 1}. ${ip.name}: ${ip.address}`);
    });
    
    // Tentar binding com '0.0.0.0' para aceitar todas as conexões
    const server = app.listen(port, '0.0.0.0', () => {
        console.clear();
        console.log('🎉 SISTEMA DE PRONTUÁRIO MÉDICO - LORSGORDORS');
        console.log('='.repeat(75));
        console.log(`📅 Iniciado: 2025-08-07 15:42:34 (UTC)`);
        console.log(`👤 Usuário: lorsgordors`);
        console.log(`⚡ Porta: ${port}`);
        console.log(`🖥️  Servidor: Aceitando conexões de todas as interfaces`);
        console.log('='.repeat(75));
        
        console.log('💻 ACESSO LOCAL (seu computador):');
        console.log(`   ✅ http://localhost:${port}`);
        console.log(`   ✅ http://127.0.0.1:${port}`);
        
        if (allIPs.length > 0) {
            allIPs.forEach((ip, i) => {
                console.log(`   ${i === 0 ? '✅' : '🔗'} http://${ip.address}:${port}`);
            });
        }
        console.log('');
        
        console.log('📱 ACESSO DE OUTROS DISPOSITIVOS:');
        if (allIPs.length > 0) {
            allIPs.forEach((ip, i) => {
                console.log(`   📲 http://${ip.address}:${port}`);
            });
        } else {
            console.log('   ⚠️  Nenhum IP de rede detectado');
        }
        console.log('');
        
        console.log('🧪 TESTE PRIMEIRO NO SEU PC:');
        console.log('   1. Abra o navegador');
        console.log(`   2. Digite: http://localhost:${port}`);
        console.log('   3. Login: admin / admin123');
        console.log('   4. Se funcionar, teste no celular');
        console.log('');
        
        console.log('📱 DEPOIS TESTE NO CELULAR:');
        console.log('   1. Conecte na mesma rede Wi-Fi');
        console.log('   2. Abra o navegador do celular');
        if (allIPs.length > 0) {
            console.log(`   3. Digite: http://${allIPs[0].address}:${port}`);
        }
        console.log('   4. Use o mesmo login: admin/admin123');
        console.log('');
        
        console.log('🔑 CREDENCIAIS PADRÃO:');
        console.log('   👤 Usuário: admin');
        console.log('   🔒 Senha: admin123');
        console.log('');
        
        console.log('📊 STATUS DO SISTEMA:');
        console.log('   ✅ Base de dados inicializada');
        console.log('   ✅ Logs de auditoria ativos');
        console.log('   ✅ Sessões configuradas');
        console.log('   ✅ Firewall deve estar liberado');
        console.log('');
        
        console.log('🛠️  TROUBLESHOOTING:');
        console.log('   • Se localhost não funcionar: problema de DNS local');
        console.log('   • Se IP não funcionar no PC: problema de binding');
        console.log('   • Se não funcionar no celular: firewall/rede');
        console.log('');
        
        console.log('⚡ Pressione Ctrl+C para parar o servidor');
        console.log('='.repeat(75));
        
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Porta ${port} ocupada. Tentando ${port + 1}...`);
            startServerLorsgordors(port + 1);
        } else if (err.code === 'EACCES') {
            console.log('❌ Permissão negada para a porta. Tentando porta > 1024...');
            startServerLorsgordors(port > 1024 ? port + 1 : 3000);
        } else {
            console.error('❌ Erro ao iniciar servidor:', err);
            console.log('💡 Tentando porta alternativa...');
            startServerLorsgordors(8080);
        }
    });

    // Middleware de log para monitorar conexões
    app.use((req, res, next) => {
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        req.ip || 'unknown';
        
        const userAgent = req.headers['user-agent'] || '';
        const isPhone = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)/.test(userAgent);
        
        if (!req.url.includes('favicon') && !req.url.includes('.css') && !req.url.includes('.js')) {
            let deviceType = '💻 PC';
            if (isPhone) deviceType = '📱 Celular';
            if (isTablet) deviceType = '📱 Tablet';
            
            console.log(`📡 ${new Date().toLocaleTimeString('pt-BR')} - ${deviceType}`);
            console.log(`   🔗 ${req.method} ${req.url}`);
            console.log(`   📍 IP: ${clientIP}`);
            console.log(`   🌐 Host: ${req.headers.host}`);
            
            if (isPhone || isTablet) {
                console.log('   🎉 DISPOSITIVO MÓVEL CONECTOU! ✅');
            }
            console.log('');
        }
        next();
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Encerrando Sistema de Prontuário Médico...');
        server.close(() => {
            console.log('✅ Servidor encerrado com sucesso!');
            console.log('📋 Para reiniciar: node server.js');
            console.log('👋 Até logo, lorsgordors!');
            process.exit(0);
        });
    });

    return server;
}

// Inicialização do sistema para lorsgordors
ensureDirectories().then(() => {
    const PORT = process.env.PORT || 3000;
    console.log('🚀 Inicializando Sistema de Prontuário Médico');
    console.log('👤 Usuário: lorsgordors');
    console.log('📅 Data: 2025-08-07 15:42:34 (UTC)');
    console.log('📁 Verificando estrutura de dados...');
    
    startServerLorsgordors(PORT);
});