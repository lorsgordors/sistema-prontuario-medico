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
        
        const umMesAtras = new Date();
        umMesAtras.setMonth(umMesAtras.getMonth() - 1);
        
        for (const file of files) {
            const paciente = await fetchJsonFromGithub(`pacientes/${file.name}`);
            if (paciente && podeVerPaciente(req.session.user, paciente)) {
                totalPacientes++;
                totalAtendimentos += paciente.atendimentos ? paciente.atendimentos.length : 0;
                
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
            tipoUsuario: req.session.user.tipo
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
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

// Inicialização do sistema para lorsgordors
ensureGitHubInit().then(() => {
    const PORT = process.env.PORT || 3000;
    console.log('🚀 Inicializando Lizard Prontuário');
    console.log('👤 Usuário: lorsgordors');
    console.log('📅 Data: 2025-08-07 15:42:34 (UTC)');
    console.log('📁 Usando GitHub como banco de dados...');
    
    startServerLorsgordors(PORT);
});