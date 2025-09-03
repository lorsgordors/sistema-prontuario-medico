// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const { saveJsonToGithub, fetchJsonFromGithub, listFilesFromGithub, deleteFileFromGithub } = require('./github-db');
const { encryptPatientData, decryptPatientData, encryptUserData, decryptUserData } = require('./crypto-utils');
const fs = require('fs').promises;
const path = require('path');
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

// Função para validar força da senha
function validarForcaSenha(senha) {
    if (senha.length < 6) return { valida: false, motivo: 'Senha deve ter pelo menos 6 caracteres' };
    if (!/[A-Za-z]/.test(senha)) return { valida: false, motivo: 'Senha deve conter pelo menos uma letra' };
    if (!/[0-9]/.test(senha)) return { valida: false, motivo: 'Senha deve conter pelo menos um número' };
    return { valida: true };
}

// Função para log de auditoria
async function logAuditoria(acao, usuario, detalhes, req = null) {
    try {
        let logs = await fetchJsonFromGithub('logs.json');
        
        // Extrair informações do dispositivo/navegador
        const userAgent = req ? req.get('User-Agent') || '' : '';
        const ip = req ? req.ip || req.connection.remoteAddress || 'desconhecido' : 'sistema';
        
        // Detectar navegador
        let navegador = 'Desconhecido';
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) navegador = 'Chrome';
        else if (userAgent.includes('Firefox')) navegador = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) navegador = 'Safari';
        else if (userAgent.includes('Edg')) navegador = 'Microsoft Edge';
        else if (userAgent.includes('Opera') || userAgent.includes('OPR')) navegador = 'Opera';
        
        // Detectar sistema operacional
        let so = 'Desconhecido';
        if (userAgent.includes('Windows NT')) so = 'Windows';
        else if (userAgent.includes('Mac OS X')) so = 'macOS';
        else if (userAgent.includes('Linux')) so = 'Linux';
        else if (userAgent.includes('Android')) so = 'Android';
        else if (userAgent.includes('iOS')) so = 'iOS';
        
        // Detectar tipo de dispositivo
        let dispositivo = 'Desktop';
        if (userAgent.includes('Mobile')) dispositivo = 'Mobile';
        else if (userAgent.includes('Tablet')) dispositivo = 'Tablet';
        
        logs.push({
            timestamp: new Date().toISOString(),
            acao,
            usuario,
            detalhes,
            ip: ip === '::1' ? 'localhost' : ip,
            navegador,
            so,
            dispositivo,
            userAgent: userAgent ? userAgent.substring(0, 200) : '', // Limitar tamanho
            dataHora: new Date().toLocaleString('pt-BR')
        });
        
        // Manter apenas os últimos 5000 logs como backup (sem limpeza automática)
        if (logs.length > 5000) {
            logs = logs.slice(-5000);
        }
        
        await saveJsonToGithub('logs.json', logs, 'Novo log de auditoria');
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

// Função para garantir que o GitHub esteja inicializado
async function ensureGitHubInit() {
    try {
        // Verifica se já existe usuário no GitHub
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        if (usuarios.length === 0) {
            console.log('⚠️  GitHub não inicializado. Execute node init-github.js');
        } else {
            console.log('✅ GitHub inicializado com', usuarios.length, 'usuários');
        }
    } catch (error) {
        console.log('⚠️  GitHub não inicializado. Execute node init-github.js');
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
// Rota para editar perfil de usuário (apenas admin, exige senha)
app.put('/api/usuarios/:id', requireAdmin, async (req, res) => {
    try {
        const { senhaAdmin, novaSenha, ...dadosEditados } = req.body;
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        const admin = usuarios.find(u => u.tipo === 'Administrador');
        if (!admin || admin.senha !== senhaAdmin) {
            return res.status(401).json({ error: 'Senha do administrador incorreta' });
        }
        const usuarioIndex = usuarios.findIndex(u => u.id == req.params.id);
        if (usuarioIndex === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        // Atualizar dados permitidos
        Object.assign(usuarios[usuarioIndex], dadosEditados);
        if (typeof novaSenha === 'string' && novaSenha.trim().length > 0) {
            usuarios[usuarioIndex].senha = novaSenha;
        }
        await saveJsonToGithub('usuarios.json', usuarios, 'Editando usuário via API');
        await logAuditoria('edicao_usuario', req.session.user.login, `Usuário editado: ${usuarios[usuarioIndex].login}`, req);
        res.json({ success: true, usuario: usuarios[usuarioIndex] });
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({ error: 'Erro ao editar usuário' });
    }
});
// Rota para listar todos os usuários (apenas admin)
app.get('/api/usuarios', requireAdmin, async (req, res) => {
    try {
        const usuariosCriptografados = await fetchJsonFromGithub('usuarios.json');
        // Descriptografar usuários antes de enviar
        const usuarios = usuariosCriptografados.map(decryptUserData);
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { login, senha } = req.body;
        const usuariosCriptografados = await fetchJsonFromGithub('usuarios.json');
        
        // Descriptografar usuários para verificar login
        const usuarios = usuariosCriptografados.map(decryptUserData);
        
        const usuario = usuarios.find(u => 
                u.login === login && u.senha === senha
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
            
            await logAuditoria('login', usuario.login, 'Login realizado com sucesso', req);
            res.json({ success: true, user: req.session.user });
        } else {
            await logAuditoria('login_falhou', login || 'desconhecido', 'Tentativa de login com credenciais inválidas', req);
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/logout', requireAuth, async (req, res) => {
    await logAuditoria('logout', req.session.user.login, 'Logout realizado', req);
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
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        
        const usuarioIndex = usuarios.findIndex(u => u.id === req.session.user.id);
        
        if (usuarioIndex === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Verificar senha atual
        if (usuarios[usuarioIndex].senha !== senhaAtual) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        
        // Validar nova senha
        const validacao = validarForcaSenha(novaSenha);
        if (!validacao.valida) {
            return res.status(400).json({ error: validacao.motivo });
        }
        
        // Atualizar senha
        usuarios[usuarioIndex].senha = novaSenha;
        await saveJsonToGithub('usuarios.json', usuarios, 'Alteração de senha via API');
        
        await logAuditoria('alteracao_senha', req.session.user.login, 'Senha alterada com sucesso', req);
        
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
        
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        
        // Verificar se existe um admin
        const admin = usuarios.find(u => u.tipo === 'Administrador');
        if (!admin) {
            return res.status(403).json({ error: 'Nenhum administrador encontrado' });
        }
        
        // Verificar senha do admin
        if (admin.senha !== senhaAdmin) {
            await logAuditoria('registro_usuario_falhou', admin.login, `Tentativa de registro com senha admin incorreta para usuário: ${login}`, req);
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
            senha: senha,
            nomeCompleto,
            tipoRegistro,
            numeroRegistro,
            estadoRegistro,
            tipo: 'Profissional',
            criadoEm: new Date().toISOString(),
            criadoPor: admin.login
        };
        
        // Criptografar dados sensíveis do usuário
        const usuarioCriptografado = encryptUserData(novoUsuario);
        
        // Adicionar usuário criptografado à lista
        const usuariosComNovoUsuario = usuarios.slice(); // copia lista
        usuariosComNovoUsuario.push(usuarioCriptografado);
        
        await saveJsonToGithub('usuarios.json', usuariosComNovoUsuario, 'Registro de novo usuário via API');
        await logAuditoria('registro_usuario', admin.login, `Novo usuário registrado: ${login} (${nomeCompleto})`, req);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
});

// Rota para listar pacientes (filtrados por usuário)
app.get('/api/pacientes', requireAuth, async (req, res) => {
    try {
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        const pacientesFiltrados = [];
        
        for (const file of files) {
            const pacienteCriptografado = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (pacienteCriptografado && podeVerPaciente(req.session.user, pacienteCriptografado)) {
                // Descriptografar dados antes de enviar
                const paciente = decryptPatientData(pacienteCriptografado);
                
                if (req.session.user.tipo === 'Administrador') {
                    paciente.infoAdicional = {
                        criadoPor: paciente.criadoPor,
                        criadoEm: paciente.criadoEm
                    };
                }
                pacientesFiltrados.push(paciente);
            }
        }
        
        // Log de auditoria
        await logAuditoria('listagem_pacientes', req.session.user.login, 
            `Listou ${pacientesFiltrados.length} paciente(s)`, req);
        
        res.json(pacientesFiltrados);
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
        
        // Criptografar dados sensíveis antes de salvar
        const pacienteCriptografado = encryptPatientData(paciente);
        
        // Salvar paciente em arquivo individual
        await saveJsonToGithub(`pacientes/${fileName}`, pacienteCriptografado, 'Cadastro de paciente via API');
        
        await logAuditoria('cadastro_paciente', req.session.user.login, 
            `Paciente cadastrado: ${paciente.nomeCompleto} (ID: ${paciente.id})`, req);
        
        res.json({ success: true, paciente });
    } catch (error) {
        console.error('Erro ao cadastrar paciente:', error);
        res.status(500).json({ error: 'Erro ao cadastrar paciente' });
    }
});

// Rota para buscar paciente específico
// Rota para editar paciente
app.put('/api/pacientes/:id', requireAuth, async (req, res) => {
    try {
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        
        for (const file of files) {
            const pacienteCriptografado = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (pacienteCriptografado && pacienteCriptografado.id == req.params.id) {
                // Descriptografar para verificar permissão
                const paciente = decryptPatientData(pacienteCriptografado);
                
                // Verificar permissão de edição
                const permissao = podeEditarPaciente(req.session.user, paciente);
                if (!permissao.pode) {
                    return res.status(403).json({ error: permissao.motivo });
                }
                
                // Atualizar dados permitidos
                const { nomeCompleto, cpf, dataNascimento, telefone, email, endereco, alergias, medicamentos, comorbidades } = req.body;
                paciente.nomeCompleto = nomeCompleto;
                paciente.cpf = cpf;
                paciente.dataNascimento = dataNascimento;
                paciente.telefone = telefone;
                paciente.email = email;
                paciente.endereco = endereco;
                paciente.alergias = alergias;
                paciente.medicamentos = medicamentos;
                paciente.comorbidades = comorbidades;
                paciente.ultimaAtualizacao = new Date().toISOString();
                
                // Criptografar antes de salvar
                const pacienteAtualizado = encryptPatientData(paciente);
                
                // Salvar no GitHub (mesmo arquivo)
                await saveJsonToGithub(`pacientes/${file.name}`, pacienteAtualizado, 'Edição de paciente via API');
                
                await logAuditoria('edicao_paciente', req.session.user.login, `Paciente editado: ${paciente.nomeCompleto} (ID: ${paciente.id})`, req);
                return res.json({ success: true, paciente });
            }
        }
        
        res.status(404).json({ error: 'Paciente não encontrado' });
    } catch (error) {
        console.error('Erro ao editar paciente:', error);
        res.status(500).json({ error: 'Erro ao editar paciente' });
    }
});
app.get('/api/pacientes/:id', requireAuth, async (req, res) => {
    try {
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        
        for (const file of files) {
            const pacienteCriptografado = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (pacienteCriptografado && pacienteCriptografado.id == req.params.id) {
                // Verificar se o usuário pode ver este paciente
                if (!podeVerPaciente(req.session.user, pacienteCriptografado)) {
                    return res.status(403).json({ 
                        error: 'Acesso negado. Você só pode ver pacientes cadastrados por você.' 
                    });
                }
                
                // Descriptografar dados antes de enviar
                const paciente = decryptPatientData(pacienteCriptografado);
                return res.json(paciente);
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
        const usuarios = await fetchJsonFromGithub('usuarios.json');
        
        // Verificar senha do usuário logado
        const usuario = usuarios.find(u => u.id === req.session.user.id);
        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }
        
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (paciente && paciente.id == req.params.id) {
                // Verificar permissões de edição
                const permissao = podeEditarPaciente(usuario, paciente);
                if (!permissao.pode) {
                    return res.status(403).json({ error: permissao.motivo });
                }
                
                // Excluir arquivo do GitHub
                await deleteFileFromGithub(`pacientes/${file.name}`, 'Exclusão de paciente via API');
                
                await logAuditoria('exclusao_paciente', req.session.user.login, 
                    `Paciente excluído: ${paciente.nomeCompleto} (${permissao.motivo})`, req);
                
                return res.json({ 
                    success: true, 
                    message: 'Paciente excluído com sucesso' 
                });
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
        
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (paciente && paciente.id == req.params.id) {
                // Verificar se o usuário pode editar este paciente
                const permissao = podeEditarPaciente(req.session.user, paciente);
                if (!permissao.pode) {
                    return res.status(403).json({ error: permissao.motivo });
                }
                
                const novoAtendimento = {
                    id: Date.now(),
                    titulo: atendimentoData.titulo,
                    data: atendimentoData.data,
                    horario: atendimentoData.horario,
                    valor: atendimentoData.valor,
                    observacoes: atendimentoData.observacoes,
                    sinaisVitais: atendimentoData.sinaisVitais, // ✅ ADICIONADO!
                    profissionalNome: req.session.user.nomeCompleto,
                    profissionalRegistro: `${req.session.user.tipoRegistro}: ${req.session.user.numeroRegistro}`,
                    profissionalEstado: req.session.user.estadoRegistro,
                    profissionalId: req.session.user.id,
                    criadoEm: new Date().toISOString()
                };
                
                paciente.atendimentos.push(novoAtendimento);
                paciente.ultimaAtualizacao = new Date().toISOString();
                
                // Salvar no GitHub (mesmo arquivo)
                await saveJsonToGithub(`pacientes/${file.name}`, paciente, 'Novo atendimento via API');
                
                await logAuditoria('novo_atendimento', req.session.user.login, 
                    `Atendimento registrado para: ${paciente.nomeCompleto}`, req);
                
                return res.json({ success: true, atendimento: novoAtendimento });
            }
        }
        
        res.status(404).json({ error: 'Paciente não encontrado' });
    } catch (error) {
        console.error('Erro ao adicionar atendimento:', error);
        res.status(500).json({ error: 'Erro ao adicionar atendimento' });
    }
});

// Rota para excluir atendimento
app.delete('/api/pacientes/:id/atendimentos/:atendimentoId', requireAuth, async (req, res) => {
    try {
        const { id: pacienteId, atendimentoId } = req.params;
        
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (paciente && paciente.id == pacienteId) {
                // Verificar se o usuário pode editar este paciente
                const permissao = podeEditarPaciente(req.session.user, paciente);
                if (!permissao.pode) {
                    return res.status(403).json({ error: permissao.motivo });
                }
                
                // Encontrar o índice do atendimento
                const atendimentoIndex = paciente.atendimentos.findIndex(
                    atend => atend.id == atendimentoId
                );
                
                if (atendimentoIndex === -1) {
                    return res.status(404).json({ error: 'Atendimento não encontrado' });
                }
                
                const atendimentoRemovido = paciente.atendimentos[atendimentoIndex];
                
                // Verificar se o usuário pode excluir este atendimento específico
                if (req.session.user.tipo !== 'Administrador' && 
                    atendimentoRemovido.profissionalId !== req.session.user.id) {
                    return res.status(403).json({ 
                        error: 'Você só pode excluir atendimentos que você mesmo registrou' 
                    });
                }
                
                // Remover o atendimento
                paciente.atendimentos.splice(atendimentoIndex, 1);
                paciente.ultimaAtualizacao = new Date().toISOString();
                
                // Salvar no GitHub (mesmo arquivo)
                await saveJsonToGithub(`pacientes/${file.name}`, paciente, 'Atendimento excluído via API');
                
                await logAuditoria('excluir_atendimento', req.session.user.login, 
                    `Atendimento excluído do paciente: ${paciente.nomeCompleto} - Título: ${atendimentoRemovido.titulo || 'Sem título'}`, req);
                
                return res.json({ 
                    success: true, 
                    message: 'Atendimento excluído com sucesso',
                    atendimentoRemovido 
                });
            }
        }
        
        res.status(404).json({ error: 'Paciente não encontrado' });
    } catch (error) {
        console.error('Erro ao excluir atendimento:', error);
        res.status(500).json({ error: 'Erro ao excluir atendimento' });
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
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        let totalPacientes = 0;
        let totalAtendimentos = 0;
        let pacientesRecentes = 0;
        let valorTotalAtendimentos = 0;
        
        const umMesAtras = new Date();
        umMesAtras.setMonth(umMesAtras.getMonth() - 1);
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (paciente && podeVerPaciente(req.session.user, paciente)) {
                totalPacientes++;
                
                // Contar atendimentos e somar valores do usuário logado
                if (paciente.atendimentos) {
                    const atendimentosDoUsuario = paciente.atendimentos.filter(
                        atend => atend.profissionalId === req.session.user.id
                    );
                    
                    totalAtendimentos += atendimentosDoUsuario.length;
                    
                    // Somar valores dos atendimentos
                    atendimentosDoUsuario.forEach(atend => {
                        if (atend.valor && !isNaN(parseFloat(atend.valor))) {
                            valorTotalAtendimentos += parseFloat(atend.valor);
                        }
                    });
                }
                
                // Pacientes cadastrados no último mês
                if (new Date(paciente.criadoEm) > umMesAtras) {
                    pacientesRecentes++;
                }
            }
        }
        
        res.json({
            totalPacientes,
            totalAtendimentos,
            pacientesRecentes,
            valorTotalAtendimentos: valorTotalAtendimentos.toFixed(2),
            tipoUsuario: req.session.user.tipo
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// === ROTA DE ARRECADAÇÃO ===
app.get('/api/arrecadacao', requireAuth, async (req, res) => {
    try {
        const { periodo } = req.query; // 7, 30, 90, 365 ou custom
        const { dataInicio, dataFim } = req.query;
        
        // Buscar lista de arquivos de pacientes do GitHub
        const files = await listFilesFromGithub('pacientes');
        let atendimentosComValor = [];
        
        const agora = new Date();
        let dataLimite;
        
        // Definir data limite baseada no período
        if (periodo === 'custom' && dataInicio && dataFim) {
            dataLimite = new Date(dataInicio);
        } else {
            const diasAtras = parseInt(periodo) || 30;
            dataLimite = new Date(agora.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
        }
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (paciente && podeVerPaciente(req.session.user, paciente)) {
                if (paciente.atendimentos) {
                    paciente.atendimentos
                        .filter(atend => atend.profissionalId === req.session.user.id)
                        .forEach(atend => {
                            const dataAtendimento = new Date(atend.data + ' ' + atend.horario);
                            
                            // Filtrar por período
                            let incluirAtendimento = false;
                            if (periodo === 'custom' && dataInicio && dataFim) {
                                const inicio = new Date(dataInicio);
                                const fim = new Date(dataFim + ' 23:59:59');
                                incluirAtendimento = dataAtendimento >= inicio && dataAtendimento <= fim;
                            } else {
                                incluirAtendimento = dataAtendimento >= dataLimite;
                            }
                            
                            if (incluirAtendimento && atend.valor && !isNaN(parseFloat(atend.valor))) {
                                atendimentosComValor.push({
                                    data: atend.data,
                                    horario: atend.horario,
                                    valor: parseFloat(atend.valor),
                                    titulo: atend.titulo,
                                    paciente: paciente.nomeCompleto,
                                    observacoes: atend.observacoes
                                });
                            }
                        });
                }
            }
        }
        
        // Ordenar por data (mais recente primeiro)
        atendimentosComValor.sort((a, b) => 
            new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario)
        );
        
        // Calcular estatísticas
        const valorTotal = atendimentosComValor.reduce((acc, atend) => acc + atend.valor, 0);
        const quantidade = atendimentosComValor.length;
        const valorMedio = quantidade > 0 ? valorTotal / quantidade : 0;
        
        // Estatísticas por período
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioSemana = new Date(hoje.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        const valorMes = atendimentosComValor
            .filter(atend => new Date(atend.data + ' ' + atend.horario) >= inicioMes)
            .reduce((acc, atend) => acc + atend.valor, 0);
            
        const valorSemana = atendimentosComValor
            .filter(atend => new Date(atend.data + ' ' + atend.horario) >= inicioSemana)
            .reduce((acc, atend) => acc + atend.valor, 0);
        
        // Dados para o gráfico (agrupados por data)
        const dadosGrafico = {};
        atendimentosComValor.forEach(atend => {
            if (!dadosGrafico[atend.data]) {
                dadosGrafico[atend.data] = 0;
            }
            dadosGrafico[atend.data] += atend.valor;
        });
        
        const labels = Object.keys(dadosGrafico).sort();
        const valores = labels.map(data => dadosGrafico[data]);
        
        res.json({
            resumo: {
                valorTotal: valorTotal.toFixed(2),
                valorMes: valorMes.toFixed(2),
                valorSemana: valorSemana.toFixed(2),
                valorMedio: valorMedio.toFixed(2),
                quantidade
            },
            grafico: {
                labels,
                valores
            },
            detalhes: atendimentosComValor.slice(0, 50) // Limitar a 50 para performance
        });
    } catch (error) {
        console.error('Erro ao buscar dados de arrecadação:', error);
        res.status(500).json({ error: 'Erro ao buscar dados de arrecadação' });
    }
});

// === ROTAS DE LOGS (ADMIN) ===
app.get('/api/logs/stats', requireAdmin, async (req, res) => {
    try {
        let logs = await fetchJsonFromGithub('logs.json');
        const agora = new Date();
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const seteDiasAtras = new Date(agora.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        const logsHoje = logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= hoje;
        }).length;
        
        const logsAntigos = logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate < seteDiasAtras;
        }).length;
        
        res.json({
            total: logs.length,
            hoje: logsHoje,
            antigos: logsAntigos
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas de logs:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas de logs' });
    }
});

app.get('/api/logs', requireAdmin, async (req, res) => {
    try {
        let logs = await fetchJsonFromGithub('logs.json');
        // Ordenar por data mais recente primeiro
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // Limitar a 500 logs mais recentes para performance
        logs = logs.slice(0, 500);
        res.json(logs);
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
});

app.delete('/api/logs/limpar', requireAdmin, async (req, res) => {
    try {
        const { periodo } = req.body;
        let logs = await fetchJsonFromGithub('logs.json');
        const logsOriginais = logs.length;
        
        const agora = new Date();
        let dataCorte;
        
        switch (periodo) {
            case '1': // 24 horas
                dataCorte = new Date(agora.getTime() - (24 * 60 * 60 * 1000));
                break;
            case '7': // 7 dias
                dataCorte = new Date(agora.getTime() - (7 * 24 * 60 * 60 * 1000));
                break;
            case '30': // 30 dias
                dataCorte = new Date(agora.getTime() - (30 * 24 * 60 * 60 * 1000));
                break;
            case 'all': // todos
                logs = [];
                break;
            default:
                return res.status(400).json({ error: 'Período inválido' });
        }
        
        if (periodo !== 'all') {
            logs = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= dataCorte;
            });
        }
        
        await saveJsonToGithub('logs.json', logs, `Limpeza manual de logs - período: ${periodo === 'all' ? 'todos' : periodo + ' dias'}`);
        
        // Log da ação de limpeza
        await logAuditoria('limpeza_logs', req.session.user.login, 
            `Removeu ${logsOriginais - logs.length} log(s) - período: ${periodo === 'all' ? 'todos' : periodo + ' dias'}`, req);
        
        res.json({ 
            removidos: logsOriginais - logs.length,
            restantes: logs.length 
        });
    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        res.status(500).json({ error: 'Erro ao limpar logs' });
    }
});

// === ROTAS DA AGENDA/AGENDAMENTOS ===

// Função auxiliar para encontrar arquivo de paciente pelo ID
async function findPacienteFileById(pacienteId) {
    try {
        const files = await listFilesFromGithub('pacientes/');
        
        for (const fileInfo of files) {
            const fileName = typeof fileInfo === 'string' ? fileInfo : fileInfo.name;
            if (fileName && fileName.endsWith('.json')) {
                try {
                    const filePath = fileName.startsWith('pacientes/') ? fileName : `pacientes/${fileName}`;
                    const pacienteData = await fetchJsonFromGithub(filePath);
                    const decryptedData = decryptPatientData(pacienteData);
                    
                    if (decryptedData && decryptedData.id == pacienteId) {
                        return {
                            fileName: fileName.replace('pacientes/', ''),
                            data: decryptedData
                        };
                    }
                } catch (error) {
                    console.error(`Erro ao verificar arquivo ${fileName}:`, error);
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar arquivo do paciente:', error);
        return null;
    }
}

// GET - Listar agendamentos
app.get('/api/agendamentos', requireAuth, async (req, res) => {
    try {
        let agendamentos = [];
        
        try {
            agendamentos = await fetchJsonFromGithub('agendamentos.json');
        } catch (error) {
            // Arquivo não existe ainda, retornar lista vazia
            console.log('Arquivo agendamentos.json não existe, criando vazio');
            agendamentos = [];
        }
        
        // Garantir que agendamentos é um array
        if (!Array.isArray(agendamentos)) {
            agendamentos = [];
        }
        
        // Enriquecer agendamentos com dados do paciente
        const pacienteFiles = await listFilesFromGithub('pacientes/');
        const pacientesData = {};
        
        for (const fileInfo of pacienteFiles) {
            const fileName = typeof fileInfo === 'string' ? fileInfo : fileInfo.name;
            if (fileName && fileName.endsWith('.json')) {
                try {
                    const filePath = fileName.startsWith('pacientes/') ? fileName : `pacientes/${fileName}`;
                    const pacienteData = await fetchJsonFromGithub(filePath);
                    const decryptedData = decryptPatientData(pacienteData);
                    
                    if (decryptedData && decryptedData.id) {
                        pacientesData[decryptedData.id] = decryptedData;
                    }
                } catch (error) {
                    console.error(`Erro ao carregar paciente ${fileName}:`, error);
                }
            }
        }
        
        // Filtrar agendamentos por usuário (não administradores veem apenas os próprios)
        let agendamentosFiltrados = agendamentos;
        
        if (req.session.user && req.session.user.tipo !== 'Administrador') {
            agendamentosFiltrados = agendamentos.filter(agendamento => {
                return agendamento.criadoPor === req.session.user.nomeCompleto;
            });
        }
        
        // Adicionar nome do paciente aos agendamentos
        const agendamentosEnriquecidos = agendamentosFiltrados.map(agendamento => {
            const paciente = pacientesData[agendamento.pacienteId];
            return {
                ...agendamento,
                pacienteNome: paciente ? paciente.nomeCompleto : 'Paciente não encontrado'
            };
        });
        
        await logAuditoria(
            'LISTAR_AGENDAMENTOS',
            req.session.user ? req.session.user.nomeCompleto : 'sistema',
            `Total de agendamentos: ${agendamentosFiltrados.length} (próprios: ${req.session.user && req.session.user.tipo !== 'Administrador' ? 'sim' : 'todos'})`,
            req
        );
        
        res.json(agendamentosEnriquecidos);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        await logAuditoria(
            'ERRO_LISTAR_AGENDAMENTOS',
            req.session.user ? req.session.user.nomeCompleto : 'sistema',
            `Erro: ${error.message}`,
            req
        );
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST - Criar agendamento
app.post('/api/agendamentos', requireAuth, async (req, res) => {
    try {
        const { data, pacienteId, horario, tipo, observacoes } = req.body;
        
        // Validações
        if (!data || !pacienteId || !horario || !tipo) {
            return res.status(400).json({ 
                error: 'Dados obrigatórios: data, pacienteId, horario, tipo' 
            });
        }
        
        // Verificar se o paciente existe e obter dados
        let pacienteInfo = null;
        try {
            pacienteInfo = await findPacienteFileById(pacienteId);
            if (!pacienteInfo) {
                return res.status(404).json({ error: 'Paciente não encontrado' });
            }
        } catch (error) {
            console.error('Erro ao verificar paciente:', error);
            return res.status(500).json({ error: 'Erro ao verificar paciente' });
        }
        
        // Carregar agendamentos existentes
        let agendamentos = [];
        try {
            const dados = await fetchJsonFromGithub('agendamentos.json');
            agendamentos = Array.isArray(dados) ? dados : [];
        } catch (error) {
            // Arquivo não existe ainda
            agendamentos = [];
        }
        
        // Verificar conflito de horário
        const conflito = agendamentos.find(a => 
            a.data === data && a.horario === horario
        );
        
        if (conflito) {
            return res.status(409).json({ 
                error: 'Já existe um agendamento para este horário' 
            });
        }
        
        // Gerar ID único
        const novoId = agendamentos.length > 0 
            ? Math.max(...agendamentos.map(a => a.id)) + 1 
            : 1;
        
        // Criar novo agendamento
        const novoAgendamento = {
            id: novoId,
            data,
            pacienteId: parseInt(pacienteId),
            horario,
            tipo,
            observacoes: observacoes || '',
            criadoEm: new Date().toISOString(),
            criadoPor: req.session.user ? req.session.user.nomeCompleto : 'sistema',
            status: 'agendado'
        };
        
        // Adicionar à lista
        agendamentos.push(novoAgendamento);
        
        // Salvar no GitHub
        await saveJsonToGithub(
            'agendamentos.json', 
            agendamentos, 
            `Novo agendamento para paciente ${pacienteId}`
        );
        
        const agendamentoCompleto = {
            ...novoAgendamento,
            pacienteNome: pacienteInfo.data.nomeCompleto
        };
        
        await logAuditoria(
            'CRIAR_AGENDAMENTO',
            req.session.user ? req.session.user.nomeCompleto : 'sistema',
            `Agendamento criado para ${pacienteInfo.data.nomeCompleto} em ${data} às ${horario}`,
            req
        );
        
        res.status(201).json(agendamentoCompleto);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        await logAuditoria(
            'ERRO_CRIAR_AGENDAMENTO',
            req.session.user ? req.session.user.nomeCompleto : 'sistema',
            `Erro: ${error.message}`,
            req
        );
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE - Excluir agendamento
app.delete('/api/agendamentos/:id', requireAuth, async (req, res) => {
    try {
        const agendamentoId = parseInt(req.params.id);
        
        // Carregar agendamentos
        let agendamentos = [];
        try {
            const dados = await fetchJsonFromGithub('agendamentos.json');
            agendamentos = Array.isArray(dados) ? dados : [];
        } catch (error) {
            return res.status(404).json({ error: 'Nenhum agendamento encontrado' });
        }
        
        // Encontrar agendamento
        const agendamento = agendamentos.find(a => a.id === agendamentoId);
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }
        
        // Verificar permissão - usuários só podem excluir próprios agendamentos
        if (req.session.user && req.session.user.tipo !== 'Administrador') {
            if (agendamento.criadoPor !== req.session.user.nomeCompleto) {
                return res.status(403).json({ 
                    error: 'Você só pode excluir seus próprios agendamentos' 
                });
            }
        }
        
        // Carregar dados do paciente para auditoria
        let nomePaciente = 'Desconhecido';
        try {
            const pacienteInfo = await findPacienteFileById(agendamento.pacienteId);
            if (pacienteInfo && pacienteInfo.data) {
                nomePaciente = pacienteInfo.data.nomeCompleto;
            }
        } catch (error) {
            console.error('Erro ao carregar dados do paciente para auditoria:', error);
        }
        
        // Remover agendamento
        agendamentos = agendamentos.filter(a => a.id !== agendamentoId);
        
        // Salvar lista atualizada
        await saveJsonToGithub(
            'agendamentos.json',
            agendamentos,
            `Agendamento excluído: ${nomePaciente} - ${agendamento.data} ${agendamento.horario}`
        );
        
        await logAuditoria(
            'EXCLUIR_AGENDAMENTO',
            req.session.user ? req.session.user.nomeCompleto : 'sistema',
            `Agendamento excluído: ${nomePaciente} em ${agendamento.data} às ${agendamento.horario}`,
            req
        );
        
        res.json({ message: 'Agendamento excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        await logAuditoria(
            'ERRO_EXCLUIR_AGENDAMENTO',
            req.session.user ? req.session.user.nomeCompleto : 'sistema',
            `Erro: ${error.message}`,
            req
        );
        res.status(500).json({ error: 'Erro interno do servidor' });
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
    console.log('🎉 LIZARD PRONTUÁRIO - LORSGORDORS');
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
        console.log('   ✅ Limpeza automática de logs (7 dias)');
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

// Função para limpar agendamentos expirados automaticamente
async function limparAgendamentosExpirados() {
    try {
        let agendamentos = [];
        
        try {
            agendamentos = await fetchJsonFromGithub('agendamentos.json');
        } catch (error) {
            // Se não existe arquivo, não há nada para limpar
            console.log('📂 Arquivo agendamentos.json não existe ainda');
            return;
        }
        
        if (!Array.isArray(agendamentos)) {
            console.log('⚠️ Dados de agendamentos não são um array válido');
            return;
        }
        
        console.log(`🔍 Verificando ${agendamentos.length} agendamentos para limpeza...`);
        
        // Obter data e hora atual local
        const agora = new Date();
        console.log(`⏰ Data/Hora atual: ${agora.toLocaleString('pt-BR')}`);
        
        const agendamentosIniciais = agendamentos.length;
        
        // Filtrar agendamentos não expirados
        const agendamentosValidos = agendamentos.filter(agendamento => {
            try {
                // Combinar data e hora do agendamento
                const [ano, mes, dia] = agendamento.data.split('-').map(Number);
                const [hora, minuto] = agendamento.horario.split(':').map(Number);
                
                // Criar data/hora do agendamento
                const dataAgendamento = new Date(ano, mes - 1, dia, hora, minuto);
                
                console.log(`📅 Agendamento ID ${agendamento.id}: ${agendamento.data} ${agendamento.horario} (${dataAgendamento.toLocaleString('pt-BR')})`);
                
                // Se o agendamento já passou, deve ser removido
                const expirado = dataAgendamento < agora;
                
                if (expirado) {
                    console.log(`🗑️ Removendo agendamento expirado: ${agendamento.data} ${agendamento.horario} (${agendamento.pacienteNome || 'Paciente'})`);
                } else {
                    console.log(`✅ Agendamento válido: ${agendamento.data} ${agendamento.horario}`);
                }
                
                return !expirado;
            } catch (error) {
                console.error(`❌ Erro ao processar agendamento ${agendamento.id}:`, error);
                // Em caso de erro, manter o agendamento para não perder dados
                return true;
            }
        });
        
        const removidos = agendamentosIniciais - agendamentosValidos.length;
        
        console.log(`📊 Resultado: ${removidos} agendamento(s) para remover de ${agendamentosIniciais} total`);
        
        // Se houve remoções, salvar a lista atualizada
        if (removidos > 0) {
            await saveJsonToGithub(
                'agendamentos.json',
                agendamentosValidos,
                `Limpeza automática: ${removidos} agendamento(s) expirado(s) removido(s)`
            );
            
            await logAuditoria(
                'LIMPEZA_AUTOMATICA',
                'sistema',
                `${removidos} agendamento(s) expirado(s) removido(s) automaticamente`,
                null
            );
            
            console.log(`✅ Limpeza automática concluída: ${removidos} agendamento(s) removido(s)`);
        } else {
            console.log(`✅ Nenhum agendamento expirado encontrado`);
        }
        
    } catch (error) {
        console.error('❌ Erro na limpeza automática de agendamentos:', error);
        
        try {
            await logAuditoria(
                'ERRO_LIMPEZA_AUTOMATICA',
                'sistema',
                `Erro na limpeza automática: ${error.message}`,
                null
            );
        } catch (logError) {
            console.error('Erro ao registrar log de erro:', logError);
        }
    }
}

// Inicializar limpeza automática (roda a cada 5 minutos)
function iniciarLimpezaAutomatica() {
    console.log('🧹 Limpeza automática de agendamentos iniciada (a cada 5 minutos)');
    
    // Executar uma vez na inicialização
    setTimeout(() => {
        console.log('🧹 Executando primeira limpeza automática...');
        limparAgendamentosExpirados();
    }, 30000); // 30 segundos para o servidor estar pronto
    
    // Depois executar a cada 5 minutos
    setInterval(() => {
        console.log('🧹 Executando limpeza automática periódica...');
        limparAgendamentosExpirados();
    }, 5 * 60 * 1000); // 5 minutos em milissegundos
}

// Inicialização do sistema para lorsgordors
ensureGitHubInit().then(() => {
    const PORT = process.env.PORT || 3000;
    console.log('🚀 Inicializando Lizard Prontuário');
    console.log('👤 Usuário: lorsgordors');
    console.log('📅 Data: 2025-08-07 15:42:34 (UTC)');
    console.log('📁 Usando GitHub como banco de dados...');
    
    startServerLorsgordors(PORT);
    
    // Iniciar limpeza automática de agendamentos expirados
    iniciarLimpezaAutomatica();
});