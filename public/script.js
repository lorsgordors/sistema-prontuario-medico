class ProntuarioApp {
    showEditarPacienteModal() {
        const paciente = this.currentPaciente;
        if (!paciente) return;
        document.getElementById('editarPacienteId').value = paciente.id;
        document.getElementById('editarPacienteNome').value = paciente.nomeCompleto;
        document.getElementById('editarPacienteCpf').value = paciente.cpf;
        document.getElementById('editarPacienteDataNasc').value = paciente.dataNascimento;
        document.getElementById('editarPacienteTelefone').value = paciente.telefone || '';
        document.getElementById('editarPacienteEmail').value = paciente.email || '';
        document.getElementById('editarPacienteEndereco').value = paciente.endereco || '';
        document.getElementById('editarPacienteAlergias').value = paciente.alergias || '';
        document.getElementById('editarPacienteMedicamentos').value = paciente.medicamentos || '';
        document.getElementById('editarPacienteComorbidades').value = paciente.comorbidades || '';
        document.getElementById('editarPacienteModal').classList.remove('hidden');
    }

    showEditarUsuarioModal(id) {
        fetch('/api/usuarios')
            .then(res => res.json())
            .then(usuarios => {
                const usuario = usuarios.find(u => u.id === id);
                if (!usuario) {
                    this.showMessage('Usuário não encontrado', 'error');
                    return;
                }
                document.getElementById('editarUsuarioId').value = usuario.id;
                document.getElementById('editarUsuarioNome').value = usuario.nomeCompleto;
                document.getElementById('editarUsuarioLogin').value = usuario.login;
                document.getElementById('editarUsuarioTipo').value = usuario.tipo;
                document.getElementById('editarUsuarioNumeroRegistro').value = usuario.numeroRegistro || '';
                document.getElementById('editarUsuarioNovaSenha').value = '';
                document.getElementById('editarUsuarioModal').classList.remove('hidden');
            });
    }
    constructor() {
        this.currentUser = null;
        this.currentPaciente = null;
        this.pacientes = [];
        this.tiposRegistro = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadTiposRegistro();
        this.checkAuth();
    }
    
    async loadTiposRegistro() {
        try {
            const response = await fetch('/api/tipos-registro');
            if (response.ok) {
                this.tiposRegistro = await response.json();
                this.populateTipoRegistroSelect();
            }
        } catch (error) {
            console.error('Erro ao carregar tipos de registro:', error);
        }
    }
    
    populateTipoRegistroSelect() {
        const select = document.getElementById('tipoRegistroNovo');
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>';
            this.tiposRegistro.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.valor;
                option.textContent = tipo.nome;
                option.dataset.temEstado = tipo.temEstado;
                select.appendChild(option);
            });
        }
    }
    
    setupEventListeners() {
        // Editar paciente - abrir modal
        document.getElementById('editarPacienteBtn').addEventListener('click', () => {
            this.showEditarPacienteModal();
        });
        // Editar paciente - fechar modal
        document.getElementById('cancelarEditarPaciente').addEventListener('click', () => {
            document.getElementById('editarPacienteModal').classList.add('hidden');
        });
        // Editar paciente - submit
        document.getElementById('editarPacienteForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = parseInt(form.id.value);
            const nomeCompleto = form.nomeCompleto.value;
            const cpf = form.cpf.value;
            const dataNascimento = form.dataNascimento.value;
            const telefone = form.telefone.value;
            const email = form.email.value;
            const endereco = form.endereco.value;
            const alergias = form.alergias.value;
            const medicamentos = form.medicamentos.value;
            const comorbidades = form.comorbidades.value;
            try {
                const response = await fetch(`/api/pacientes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nomeCompleto, cpf, dataNascimento, telefone, email, endereco, alergias, medicamentos, comorbidades })
                });
                if (response.ok) {
                    this.showMessage('Paciente editado com sucesso!', 'success');
                    document.getElementById('editarPacienteModal').classList.add('hidden');
                    this.showPacienteDetails(id);
                    this.loadPacientes();
                } else {
                    const error = await response.json();
                    this.showMessage(error.error || 'Erro ao editar paciente', 'error');
                }
            } catch {
                this.showMessage('Erro de conexão ao editar paciente', 'error');
            }
        });
        // Editar usuário - fechar modal
        document.getElementById('cancelarEditarUsuario').addEventListener('click', () => {
            document.getElementById('editarUsuarioModal').classList.add('hidden');
        });

        // Editar usuário - submit
        document.getElementById('editarUsuarioForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = parseInt(form.id.value);
            const nomeCompleto = form.nomeCompleto.value;
            const login = form.login.value;
            const tipo = form.tipo.value;
            const numeroRegistro = form.numeroRegistro.value;
            const novaSenha = form.novaSenha.value;
            const senhaAdmin = form.senhaAdmin.value;
            const payload = { nomeCompleto, login, tipo, numeroRegistro, senhaAdmin };
            if (novaSenha) payload.novaSenha = novaSenha;
            try {
                const response = await fetch(`/api/usuarios/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    this.showMessage('Usuário editado com sucesso!', 'success');
                    document.getElementById('editarUsuarioModal').classList.add('hidden');
                    this.loadUsuarios();
                } else {
                    const error = await response.json();
                    this.showMessage(error.error || 'Erro ao editar usuário', 'error');
                }
            } catch {
                this.showMessage('Erro de conexão ao editar usuário', 'error');
            }
        });
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Cadastro de paciente
        document.getElementById('pacienteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCadastroPaciente();
        });
        
        // Alterar senha
        document.getElementById('alterarSenhaForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAlterarSenha();
        });
        
        document.getElementById('registrarUsuarioForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistrarUsuario();
        });
        
        // Excluir paciente
        document.getElementById('excluirPacienteBtn').addEventListener('click', () => {
            this.showExcluirPacienteModal();
        });
        
        document.getElementById('excluirPacienteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExcluirPaciente();
        });
        
        // Busca de pacientes
        document.getElementById('searchPacientes').addEventListener('input', (e) => {
            this.filterPacientes(e.target.value);
        });
        
        // Refresh pacientes
        document.getElementById('refreshPacientes').addEventListener('click', () => {
            this.loadPacientes();
        });
        
        // Voltar para lista de pacientes
        document.getElementById('voltarPacientes').addEventListener('click', () => {
            this.switchTab('pacientes');
        });
        
        // Novo atendimento
        document.getElementById('novoAtendimentoBtn').addEventListener('click', () => {
            this.showAtendimentoForm();
        });
        
        document.getElementById('cancelarAtendimento').addEventListener('click', () => {
            this.hideAtendimentoForm();
        });
        
        document.getElementById('atendimentoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNovoAtendimento();
        });
        
        // Modais
        this.setupModalEventListeners();
        
        // Validações
        this.setupValidationEventListeners();
        
        // Formatação de CPF
        document.getElementById('pacienteCpf').addEventListener('input', (e) => {
            e.target.value = this.formatCPF(e.target.value);
        });
        
        // Toggle para sinais vitais
        document.getElementById('incluirSinaisVitais').addEventListener('change', (e) => {
            this.toggleSinaisVitais(e.target.checked);
        });
        
        // Data padrão para atendimentos
        document.getElementById('atendimentoData').valueAsDate = new Date();
    }
    
    setupModalEventListeners() {
        // Fechar modais
        document.getElementById('fecharRegistroModal').addEventListener('click', () => {
            this.hideRegistrarUsuarioModal();
        });
        
        document.getElementById('cancelarRegistro').addEventListener('click', () => {
            this.hideRegistrarUsuarioModal();
        });
        
        document.getElementById('fecharExcluirModal').addEventListener('click', () => {
            this.hideExcluirPacienteModal();
        });
        
        document.getElementById('cancelarExclusao').addEventListener('click', () => {
            this.hideExcluirPacienteModal();
        });
        
        // Fechar modal clicando fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'registrarUsuarioModal') {
                    this.hideRegistrarUsuarioModal();
                } else if (e.target.id === 'excluirPacienteModal') {
                    this.hideExcluirPacienteModal();
                } else if (e.target.id === 'limparLogsModal') {
                    this.hideLimparLogsModal();
                }
            }
        });

        // Event listeners para aba de logs
        document.getElementById('visualizarLogsBtn').addEventListener('click', () => {
            this.toggleLogsDisplay();
        });

        document.getElementById('limparLogsBtn').addEventListener('click', () => {
            this.showLimparLogsModal();
        });

        document.getElementById('filtroLogs').addEventListener('input', (e) => {
            this.filterLogs(e.target.value);
        });

        document.getElementById('filtroTipo').addEventListener('change', (e) => {
            this.filterLogsByType(e.target.value);
        });

        document.getElementById('confirmarLimpezaBtn').addEventListener('click', () => {
            this.handleLimparLogs();
        });

        document.getElementById('cancelarLimpezaBtn').addEventListener('click', () => {
            this.hideLimparLogsModal();
        });
        
        // Event listeners da aba de arrecadação
        document.getElementById('refreshArrecadacao')?.addEventListener('click', () => {
            const periodo = document.getElementById('periodFilter').value;
            this.loadArrecadacao(periodo);
        });
        
        document.getElementById('periodFilter')?.addEventListener('change', (e) => {
            const periodo = e.target.value;
            if (periodo === 'custom') {
                document.getElementById('customDates').style.display = 'flex';
            } else {
                document.getElementById('customDates').style.display = 'none';
                this.loadArrecadacao(periodo);
            }
        });
    }
    
    setupValidationEventListeners() {
        // Validação de força de senha
        document.getElementById('novaSenha').addEventListener('input', (e) => {
            this.validatePasswordStrength(e.target.value, 'forcaSenha');
        });
        
        document.getElementById('novaSenhaUsuario').addEventListener('input', (e) => {
            this.validatePasswordStrength(e.target.value, 'forcaSenhaRegistro');
        });
        
        // Mostrar/ocultar campo de estado baseado no tipo de registro
        document.getElementById('tipoRegistroNovo').addEventListener('change', (e) => {
            const option = e.target.selectedOptions[0];
            const temEstado = option && option.dataset.temEstado === 'true';
            const estadoGroup = document.getElementById('estadoRegistroGroup');
            const estadoSelect = document.getElementById('estadoRegistroNovo');
            
            if (temEstado) {
                estadoGroup.style.display = 'block';
                estadoSelect.required = true;
            } else {
                estadoGroup.style.display = 'none';
                estadoSelect.required = false;
                estadoSelect.value = '';
            }
        });
    }
    
    validatePasswordStrength(password, elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        let strength = '';
        let className = '';
        
        if (password.length === 0) {
            element.textContent = '';
            return;
        }
        
        if (password.length < 6) {
            strength = 'Muito fraca - Mínimo 6 caracteres';
            className = 'weak';
        } else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            strength = 'Fraca - Use letras e números';
            className = 'medium';
        } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            strength = 'Média - Use maiúsculas e símbolos';
            className = 'medium';
        } else {
            strength = 'Forte - Senha segura';
            className = 'strong';
        }
        
        element.textContent = strength;
        element.className = `password-strength ${className}`;
    }
    
    async checkAuth() {
        try {
            const response = await fetch('/api/me');
            if (response.ok) {
                this.currentUser = await response.json();
                this.showMainScreen();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            this.showLoginScreen();
        }
    }
    
    async handleLogin() {
        const form = document.getElementById('loginForm');
        const formData = new FormData(form);
        const errorDiv = document.getElementById('loginError');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    login: formData.get('login'),
                    senha: formData.get('senha')
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.showMainScreen();
                errorDiv.style.display = 'none';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.error;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Erro de conexão';
            errorDiv.style.display = 'block';
        }
    }
    
    async handleLogout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.showLoginScreen();
        } catch (error) {
            this.showMessage('Erro ao fazer logout', 'error');
        }
    }
    
    async handleAlterarSenha() {
        const form = document.getElementById('alterarSenhaForm');
        const formData = new FormData(form);
        
        const senhaAtual = formData.get('senhaAtual');
        const novaSenha = formData.get('novaSenha');
        const confirmarSenha = formData.get('confirmarSenha');
        
        if (novaSenha !== confirmarSenha) {
            this.showMessage('As senhas não coincidem', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/alterar-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    senhaAtual,
                    novaSenha
                })
            });
            
            if (response.ok) {
                this.showMessage('Senha alterada com sucesso! Faça login novamente.', 'success');
                setTimeout(() => {
                    this.showLoginScreen();
                }, 2000);
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao alterar senha', 'error');
        }
    }
    
    async handleRegistrarUsuario() {
        const form = document.getElementById('registrarUsuarioForm');
        const formData = new FormData(form);
        
        const dadosUsuario = {
            senhaAdmin: formData.get('senhaAdmin'),
            login: formData.get('login'),
            senha: formData.get('senha'),
            nomeCompleto: formData.get('nomeCompleto'),
            tipoRegistro: formData.get('tipoRegistro'),
            numeroRegistro: formData.get('numeroRegistro'),
            estadoRegistro: formData.get('estadoRegistro')
        };
        
        try {
            const response = await fetch('/api/registrar-usuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosUsuario)
            });
            
            if (response.ok) {
                this.showMessage('Usuário registrado com sucesso!', 'success');
                this.hideRegistrarUsuarioModal();
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao registrar usuário', 'error');
        }
    }
    
    async handleExcluirPaciente() {
        const form = document.getElementById('excluirPacienteForm');
        const formData = new FormData(form);
        
        const senha = formData.get('senha');
        const confirmacao = formData.get('confirmacao');
        
        // Validação local
        if (confirmacao !== 'EXCLUIR') {
            this.showMessage('Digite exatamente "EXCLUIR" para confirmar', 'error');
            return;
        }
        
        if (!senha.trim()) {
            this.showMessage('Digite sua senha para confirmar', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/pacientes/${this.currentPaciente.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senha })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showMessage(
                    `Paciente "${this.currentPaciente.nomeCompleto}" excluído com sucesso`, 
                    'success'
                );
                this.hideExcluirPacienteModal();
                this.switchTab('pacientes');
                this.loadPacientes();
            } else {
                this.showMessage(result.error || 'Erro ao excluir paciente', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showMessage('Erro de conexão ao excluir paciente', 'error');
        }
    }
    
    async loadEstatisticas() {
        try {
            const response = await fetch('/api/estatisticas');
            if (response.ok) {
                const stats = await response.json();
                this.renderEstatisticas(stats);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }
    
    renderEstatisticas(stats) {
        const container = document.getElementById('statsCards');
        const isAdmin = this.currentUser.tipo === 'Administrador';
        
        container.innerHTML = `
            <div class="stat-card ${isAdmin ? 'admin' : ''}">
                <div class="stat-number">${stats.totalPacientes}</div>
                <div class="stat-label">${isAdmin ? 'Total de Pacientes' : 'Meus Pacientes'}</div>
            </div>
            
            <div class="stat-card success">
                <div class="stat-number">${stats.totalAtendimentos}</div>
                <div class="stat-label">Meus Atendimentos</div>
            </div>
            
            <div class="stat-card warning">
                <div class="stat-number">${stats.pacientesRecentes}</div>
                <div class="stat-label">Novos (30 dias)</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-number">${isAdmin ? '👑' : '👨‍⚕️'}</div>
                <div class="stat-label">${stats.tipoUsuario}</div>
            </div>
        `;
    }
    
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainScreen').classList.add('hidden');
        document.getElementById('loginForm').reset();
    }
    
    showMainScreen() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        
        // Atualizar informações do usuário
        document.getElementById('userWelcome').textContent = `Bem-vindo, ${this.currentUser.nomeCompleto}`;
        document.getElementById('profileLogin').textContent = this.currentUser.login;
        document.getElementById('profileNome').textContent = this.currentUser.nomeCompleto;
        document.getElementById('profileTipoRegistro').textContent = this.currentUser.tipoRegistro;
        document.getElementById('profileNumeroRegistro').textContent = this.currentUser.numeroRegistro;
        document.getElementById('profileTipo').textContent = this.currentUser.tipo;
        
        // Mostrar estado se aplicável
        const estadoItem = document.getElementById('profileEstadoItem');
        if (this.currentUser.estadoRegistro) {
            document.getElementById('profileEstado').textContent = this.currentUser.estadoRegistro;
            estadoItem.style.display = 'flex';
        } else {
            estadoItem.style.display = 'none';
        }
        
        // Mostrar aba de usuários se for admin
        const usuariosTabBtn = document.getElementById('usuariosTabBtn');
        const logsTabBtn = document.getElementById('logsTabBtn');
        if (this.currentUser.tipo === 'Administrador') {
            usuariosTabBtn.style.display = '';
            logsTabBtn.style.display = '';
            
            // Configurar botão de novo usuário apenas para admin
            const novoUsuarioBtn = document.getElementById('novoUsuarioBtn');
            if (novoUsuarioBtn) {
                // Remover event listener anterior se existir
                novoUsuarioBtn.removeEventListener('click', this.handleNovoUsuario);
                // Adicionar novo event listener
                this.handleNovoUsuario = () => this.showRegistrarUsuarioModal();
                novoUsuarioBtn.addEventListener('click', this.handleNovoUsuario);
            }
        } else {
            usuariosTabBtn.style.display = 'none';
            logsTabBtn.style.display = 'none';
        }
        // Carregar dados
        this.loadEstatisticas();
        this.loadPacientes();
    }
    
    showRegistrarUsuarioModal() {
        document.getElementById('registrarUsuarioModal').classList.remove('hidden');
        document.getElementById('registrarUsuarioForm').reset();
        document.getElementById('estadoRegistroGroup').style.display = 'none';
    }
    
    hideRegistrarUsuarioModal() {
        document.getElementById('registrarUsuarioModal').classList.add('hidden');
    }
    
    showExcluirPacienteModal() {
        if (!this.currentPaciente) return;
        
        // Mostrar informações do usuário e paciente
        document.getElementById('pacienteNomeExclusao').textContent = this.currentPaciente.nomeCompleto;
        document.getElementById('usuarioLogadoExclusao').textContent = 
            `${this.currentUser.nomeCompleto} (${this.currentUser.login})`;
        
        document.getElementById('excluirPacienteModal').classList.remove('hidden');
        document.getElementById('excluirPacienteForm').reset();
    }
    
    hideExcluirPacienteModal() {
        document.getElementById('excluirPacienteModal').classList.add('hidden');
    }
    
    switchTab(tabName) {
        // Atualizar navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Mostrar conteúdo
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        // Ações específicas
        if (tabName === 'pacientes') {
            this.loadPacientes();
        } else if (tabName === 'meuPerfil') {
            this.loadEstatisticas();
        } else if (tabName === 'arrecadacao') {
            this.loadArrecadacao();
        } else if (tabName === 'usuarios' && this.currentUser.tipo === 'Administrador') {
            this.loadUsuarios();
        } else if (tabName === 'logs' && this.currentUser.tipo === 'Administrador') {
            this.loadLogStats();
        }
    }

    async loadUsuarios() {
        try {
            const response = await fetch('/api/usuarios');
            if (response.ok) {
                const usuarios = await response.json();
                this.renderUsuarios(usuarios);
            } else {
                document.getElementById('usuariosList').innerHTML = '<div class="text-center">Erro ao carregar usuários.</div>';
            }
        } catch {
            document.getElementById('usuariosList').innerHTML = '<div class="text-center">Erro de conexão.</div>';
        }
    }

    renderUsuarios(usuarios) {
        const container = document.getElementById('usuariosList');
        if (!usuarios || usuarios.length === 0) {
            container.innerHTML = '<div class="text-center">Nenhum usuário registrado.</div>';
            return;
        }
        container.innerHTML = usuarios.map(usuario => `
            <div class="usuario-item" style="border-bottom:1px solid #e2e8f0;padding:12px 0;">
                <strong>${usuario.nomeCompleto}</strong> <span style="color:#718096">(${usuario.login})</span><br>
                <span>Tipo: ${usuario.tipo}</span> | <span>Registro: ${usuario.tipoRegistro} ${usuario.numeroRegistro}</span>
                <button class="btn btn-secondary" onclick="app.showEditarUsuarioModal(${usuario.id})">Editar</button>
            </div>
        `).join('');
    }
    
    async handleCadastroPaciente() {
        const form = document.getElementById('pacienteForm');
        const formData = new FormData(form);
        
        const pacienteData = {
            nomeCompleto: formData.get('nomeCompleto'),
            cpf: formData.get('cpf'),
            dataNascimento: formData.get('dataNascimento'),
            telefone: formData.get('telefone'),
            email: formData.get('email'),
            endereco: formData.get('endereco'),
            alergias: formData.get('alergias'),
            medicamentos: formData.get('medicamentos'),
            comorbidades: formData.get('comorbidades')
        };
        
        try {
            const response = await fetch('/api/pacientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pacienteData)
            });
            
            if (response.ok) {
                this.showMessage('Paciente cadastrado com sucesso!', 'success');
                form.reset();
                this.loadPacientes();
                this.loadEstatisticas(); // Atualizar estatísticas
                this.switchTab('pacientes');
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao cadastrar paciente', 'error');
        }
    }
    
    async loadPacientes() {
        try {
            const response = await fetch('/api/pacientes');
            if (response.ok) {
                this.pacientes = await response.json();
                this.renderPacientes(this.pacientes);
            } else {
                this.showMessage('Erro ao carregar pacientes', 'error');
            }
        } catch (error) {
            this.showMessage('Erro de conexão', 'error');
        }
    }
    
    renderPacientes(pacientes) {
        const container = document.getElementById('pacientesList');
        const isAdmin = this.currentUser.tipo === 'Administrador';
        
        // Atualizar título e badge de informação
        const titulo = document.getElementById('tituloListaPacientes');
        const info = document.getElementById('infoPacientes');
        
        if (isAdmin) {
            titulo.textContent = '👑 Todos os Pacientes (Admin)';
            info.textContent = `${pacientes.length} paciente(s) no sistema`;
            info.className = 'info-badge admin';
        } else {
            titulo.textContent = '👥 Meus Pacientes';
            info.textContent = `${pacientes.length} paciente(s) cadastrado(s) por você`;
            info.className = 'info-badge';
        }
        
        if (pacientes.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 40px; color: #718096;">
                    <p>📋 ${isAdmin ? 'Nenhum paciente no sistema' : 'Você ainda não cadastrou pacientes'}</p>
                    <p style="margin-top: 10px;">
                        <a href="#" onclick="app.switchTab('cadastroPaciente')" style="color: #667eea;">
                            ${isAdmin ? 'Ver todos os usuários cadastrarem' : 'Cadastrar primeiro paciente'}
                        </a>
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pacientes.map(paciente => {
            const isOwn = paciente.criadoPorId === this.currentUser.id;
            const cardClass = isAdmin ? (isOwn ? 'paciente-card own' : 'paciente-card admin-view') : 'paciente-card own';
            
            return `
                <div class="${cardClass}" onclick="app.showPacienteDetails(${paciente.id})">
                    <div class="paciente-header">
                        <div class="paciente-nome">${paciente.nomeCompleto}</div>
                        <div style="color: #667eea; font-weight: 500;">
                            ${paciente.atendimentos ? paciente.atendimentos.length : 0} atendimento(s)
                        </div>
                    </div>
                    <div class="paciente-info">
                        <div><strong>CPF:</strong> ${paciente.cpf}</div>
                        <div><strong>Nascimento:</strong> ${this.formatDate(paciente.dataNascimento)}</div>
                        <div><strong>Telefone:</strong> ${paciente.telefone || 'Não informado'}</div>
                        <div><strong>Email:</strong> ${paciente.email || 'Não informado'}</div>
                    </div>
                    ${isAdmin && !isOwn ? `
                        <div class="paciente-creator">
                            👨‍⚕️ Cadastrado por: ${paciente.criadoPor}
                            <span class="creator-badge">Outro profissional</span>
                        </div>
                    ` : ''}
                    ${isAdmin && isOwn ? `
                        <div class="paciente-creator">
                            ✅ Cadastrado por você
                            <span class="creator-badge" style="background: #c6f6d5; color: #22543d;">Próprio</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    filterPacientes(searchTerm) {
        const filtered = this.pacientes.filter(paciente => 
            paciente.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paciente.cpf.includes(searchTerm)
        );
        this.renderPacientes(filtered);
    }
    
    async showPacienteDetails(pacienteId) {
        try {
            const response = await fetch(`/api/pacientes/${pacienteId}`);
            if (response.ok) {
                this.currentPaciente = await response.json();
                this.renderPacienteDetails();
                this.switchToDetalhePaciente();
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Erro ao carregar detalhes do paciente', 'error');
            }
        } catch (error) {
            this.showMessage('Erro de conexão', 'error');
        }
    }
    
    switchToDetalhePaciente() {
        // Adicionar aba de detalhes se não existir
        if (!document.querySelector('[data-tab="detalhePaciente"]')) {
            const navBtn = document.createElement('button');
            navBtn.className = 'nav-btn';
            navBtn.setAttribute('data-tab', 'detalhePaciente');
            navBtn.textContent = '📋 Detalhes';
            navBtn.addEventListener('click', () => this.switchTab('detalhePaciente'));
            document.querySelector('.main-nav').appendChild(navBtn);
        }
        
        this.switchTab('detalhePaciente');
    }
    
    renderPacienteDetails() {
        const paciente = this.currentPaciente;
        
        document.getElementById('detalhePacienteNome').textContent = `📋 ${paciente.nomeCompleto}`;
        
        document.getElementById('pacienteInfoContent').innerHTML = `
            <div class="profile-info">
                <div class="info-item">
                    <label>Nome Completo:</label>
                    <span>${paciente.nomeCompleto}</span>
                </div>
                <div class="info-item">
                    <label>CPF:</label>
                    <span>${paciente.cpf}</span>
                </div>
                <div class="info-item">
                    <label>Data de Nascimento:</label>
                    <span>${this.formatDate(paciente.dataNascimento)} (${this.calculateAge(paciente.dataNascimento)} anos)</span>
                </div>
                <div class="info-item">
                    <label>Telefone:</label>
                    <span>${paciente.telefone || 'Não informado'}</span>
                </div>
                <div class="info-item">
                    <label>E-mail:</label>
                    <span>${paciente.email || 'Não informado'}</span>
                </div>
                <div class="info-item">
                    <label>Endereço:</label>
                    <span>${paciente.endereco || 'Não informado'}</span>
                </div>
                <div class="info-item">
                    <label>Cadastrado por:</label>
                    <span>${paciente.criadoPor} em ${this.formatDateTime(paciente.criadoEm)}</span>
                </div>
            </div>
            
            <!-- Informações Médicas -->
            <div class="medical-info-display">
                <h3 class="section-title">🩺 Informações Médicas</h3>
                
                <div class="medical-card alergias-card">
                    <div class="medical-header">
                        <span class="medical-icon">🚨</span>
                        <h4>Alergias</h4>
                    </div>
                    <div class="medical-content ${!paciente.alergias ? 'empty' : ''}">
                        ${paciente.alergias || 'Nenhuma alergia registrada'}
                    </div>
                </div>
                
                <div class="medical-card medicamentos-card">
                    <div class="medical-header">
                        <span class="medical-icon">💊</span>
                        <h4>Medicamentos em Uso</h4>
                    </div>
                    <div class="medical-content ${!paciente.medicamentos ? 'empty' : ''}">
                        ${paciente.medicamentos || 'Nenhum medicamento registrado'}
                    </div>
                </div>
                
                <div class="medical-card comorbidades-card">
                    <div class="medical-header">
                        <span class="medical-icon">🏥</span>
                        <h4>Comorbidades</h4>
                    </div>
                    <div class="medical-content ${!paciente.comorbidades ? 'empty' : ''}">
                        ${paciente.comorbidades || 'Nenhuma comorbidade registrada'}
                    </div>
                </div>
            </div>
        `;
        
        this.renderAtendimentos();
    }
    
    renderAtendimentos() {
        const container = document.getElementById('atendimentosList');
        const atendimentos = this.currentPaciente.atendimentos || [];
        
        if (atendimentos.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 30px; color: #718096;">
                    <p>📅 Nenhum atendimento registrado</p>
                </div>
            `;
            return;
        }
        
        // Ordenar por data (mais recente primeiro)
        const atendimentosOrdenados = atendimentos.sort((a, b) => 
            new Date(b.data + ' ' + b.horario) - new Date(a.data + ' ' + a.horario)
        );
        
        container.innerHTML = atendimentosOrdenados.map(atendimento => `
            <div class="atendimento-item">
                <div class="atendimento-header">
                    <div class="atendimento-info">
                        <div class="atendimento-titulo" style="font-weight: bold; color: #667eea; font-size: 1.1em;">
                            ${atendimento.titulo || 'Atendimento'}
                        </div>
                        <div class="atendimento-meta">
                            <span class="atendimento-data">
                                📅 ${this.formatDate(atendimento.data)} às ${atendimento.horario}
                            </span>
                            ${atendimento.valor ? `<span class="atendimento-valor">R$ ${parseFloat(atendimento.valor).toFixed(2)}</span>` : ''}
                        </div>
                    </div>
                    <div class="atendimento-actions">
                        <button class="btn-print-atendimento" onclick="app.imprimirAtendimento('${atendimento.id}')" title="Imprimir atendimento">
                            🖨️
                        </button>
                        ${this.canDeleteAtendimento(atendimento) ? `
                            <button class="btn-delete-atendimento" onclick="app.confirmarExclusaoAtendimento('${atendimento.id}')" title="Excluir atendimento">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="atendimento-obs">${atendimento.observacoes}</div>
                ${atendimento.sinaisVitais ? this.renderSinaisVitais(atendimento.sinaisVitais) : ''}
                <div class="atendimento-profissional">
                    👨‍⚕️ ${atendimento.profissionalNome} (${atendimento.profissionalRegistro})
                    ${atendimento.profissionalEstado ? ` - ${atendimento.profissionalEstado}` : ''}
                </div>
            </div>
        `).join('');
    }
    
    showAtendimentoForm() {
        document.getElementById('atendimentoForm').classList.remove('hidden');
        document.getElementById('novoAtendimentoBtn').style.display = 'none';
        
        // Definir data e hora atuais
        const now = new Date();
        document.getElementById('atendimentoData').valueAsDate = now;
        document.getElementById('atendimentoHora').value = now.toTimeString().slice(0, 5);
    }
    
    hideAtendimentoForm() {
        document.getElementById('atendimentoForm').classList.add('hidden');
        document.getElementById('novoAtendimentoBtn').style.display = 'block';
        document.getElementById('atendimentoForm').reset();
        // Reset dos sinais vitais
        document.getElementById('incluirSinaisVitais').checked = false;
        this.toggleSinaisVitais(false);
    }
    
    toggleSinaisVitais(mostrar) {
        const fieldsContainer = document.getElementById('sinaisVitaisFields');
        const vitalsSection = document.querySelector('.vitals-section');
        
        if (mostrar) {
            fieldsContainer.classList.remove('hidden');
            vitalsSection.classList.add('active');
        } else {
            fieldsContainer.classList.add('hidden');
            vitalsSection.classList.remove('active');
            // Limpar campos dos sinais vitais
            ['pressaoSistolica', 'pressaoDiastolica', 'frequenciaCardiaca', 
             'frequenciaRespiratoria', 'temperatura', 'saturacao'].forEach(id => {
                document.getElementById(id).value = '';
            });
        }
    }
    
    async handleNovoAtendimento() {
        const form = document.getElementById('atendimentoForm');
        const formData = new FormData(form);
        const incluirVitais = document.getElementById('incluirSinaisVitais').checked;
        
        const atendimentoData = {
            titulo: formData.get('titulo'),
            data: formData.get('data'),
            horario: formData.get('horario'),
            observacoes: formData.get('observacoes'),
            valor: formData.get('valor')
        };
        
        // Incluir sinais vitais se foram marcados
        if (incluirVitais) {
            const pressaoSist = formData.get('pressaoSistolica');
            const pressaoDiast = formData.get('pressaoDiastolica');
            const fc = formData.get('frequenciaCardiaca');
            const fr = formData.get('frequenciaRespiratoria');
            const temp = formData.get('temperatura');
            const sat = formData.get('saturacao');
            
            const sinaisVitais = {};
            
            // Pressão arterial (precisa de ambos os valores)
            if (pressaoSist && pressaoDiast && pressaoSist.trim() && pressaoDiast.trim()) {
                sinaisVitais.pressaoArterial = `${pressaoSist.trim()}/${pressaoDiast.trim()}`;
            }
            
            // Outros sinais vitais
            if (fc && fc.trim()) {
                sinaisVitais.frequenciaCardiaca = fc.trim();
            }
            
            if (fr && fr.trim()) {
                sinaisVitais.frequenciaRespiratoria = fr.trim();
            }
            
            if (temp && temp.trim()) {
                sinaisVitais.temperatura = temp.trim();
            }
            
            if (sat && sat.trim()) {
                sinaisVitais.saturacao = sat.trim();
            }
            
            // Só incluir se houver pelo menos um sinal vital
            if (Object.keys(sinaisVitais).length > 0) {
                atendimentoData.sinaisVitais = sinaisVitais;
            }
        }
        
        try {
            const response = await fetch(`/api/pacientes/${this.currentPaciente.id}/atendimentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(atendimentoData)
            });
            
            if (response.ok) {
                this.showMessage('Atendimento registrado com sucesso!', 'success');
                this.hideAtendimentoForm();
                // Recarregar detalhes do paciente
                this.showPacienteDetails(this.currentPaciente.id);
                this.loadEstatisticas(); // Atualizar estatísticas
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao registrar atendimento', 'error');
        }
    }
    
    canDeleteAtendimento(atendimento) {
        // Admin pode excluir qualquer atendimento
        if (this.currentUser.tipo === 'Administrador') {
            return true;
        }
        
        // Profissionais podem excluir apenas seus próprios atendimentos
        return atendimento.profissionalId === this.currentUser.id;
    }
    
    async confirmarExclusaoAtendimento(atendimentoId) {
        const atendimento = this.currentPaciente.atendimentos.find(a => a.id == atendimentoId);
        if (!atendimento) {
            this.showMessage('Atendimento não encontrado', 'error');
            return;
        }
        
        const confirmar = confirm(
            `Tem certeza que deseja excluir o atendimento?\n\n` +
            `📋 Título: ${atendimento.titulo || 'Sem título'}\n` +
            `📅 Data: ${this.formatDate(atendimento.data)} às ${atendimento.horario}\n` +
            `👨‍⚕️ Profissional: ${atendimento.profissionalNome}\n\n` +
            `⚠️ Esta ação não pode ser desfeita!`
        );
        
        if (confirmar) {
            await this.excluirAtendimento(atendimentoId);
        }
    }
    
    async excluirAtendimento(atendimentoId) {
        try {
            const response = await fetch(`/api/pacientes/${this.currentPaciente.id}/atendimentos/${atendimentoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.showMessage('Atendimento excluído com sucesso!', 'success');
                // Recarregar detalhes do paciente
                this.showPacienteDetails(this.currentPaciente.id);
                this.loadEstatisticas(); // Atualizar estatísticas
            } else {
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir atendimento:', error);
            this.showMessage('Erro ao excluir atendimento', 'error');
        }
    }
    
    // Utilitários
    formatCPF(cpf) {
        return cpf
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Não informado';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }
    
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'Não informado';
        const date = new Date(dateTimeString);
        return date.toLocaleString('pt-BR');
    }
    
    calculateAge(birthDate) {
        const birth = new Date(birthDate + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // === FUNÇÕES DE GERENCIAMENTO DE LOGS ===
    async loadLogStats() {
        try {
            const response = await fetch('/api/logs/stats');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalLogs').textContent = stats.total;
                document.getElementById('logsHoje').textContent = stats.hoje;
                document.getElementById('logsAntigos').textContent = stats.antigos;
            } else {
                this.showMessage('Erro ao carregar estatísticas de logs', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar stats dos logs:', error);
            this.showMessage('Erro ao carregar estatísticas de logs', 'error');
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/logs');
            if (response.ok) {
                const logs = await response.json();
                this.allLogs = logs;
                this.renderLogs(logs);
            } else {
                this.showMessage('Erro ao carregar logs', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            this.showMessage('Erro ao carregar logs', 'error');
        }
    }

    toggleLogsDisplay() {
        const logsDisplay = document.getElementById('logsDisplay');
        const btn = document.getElementById('visualizarLogsBtn');
        
        if (logsDisplay.classList.contains('hidden')) {
            logsDisplay.classList.remove('hidden');
            btn.textContent = '👁️ Ocultar Logs';
            this.loadLogs();
        } else {
            logsDisplay.classList.add('hidden');
            btn.textContent = '👁️ Visualizar Logs';
        }
    }

    renderLogs(logs) {
        const logsList = document.getElementById('logsList');
        
        if (!logs || logs.length === 0) {
            logsList.innerHTML = '<div class="empty-state">Nenhum log encontrado</div>';
            return;
        }

        const logsHtml = logs.map(log => `
            <div class="log-item">
                <div class="log-header">
                    <span class="log-type ${log.acao}">${log.acao.toUpperCase()}</span>
                    <span class="log-timestamp">${new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <div class="log-usuario">👤 ${log.usuario}</div>
                <div class="log-acao">${log.detalhes}</div>
                <div class="log-tech-info">
                    <div class="log-device-info">
                        🌐 <strong>IP:</strong> ${log.ip || 'N/A'} | 
                        💻 <strong>Dispositivo:</strong> ${log.dispositivo || 'N/A'} | 
                        🌍 <strong>Navegador:</strong> ${log.navegador || 'N/A'} | 
                        🖥️ <strong>SO:</strong> ${log.so || 'N/A'}
                    </div>
                </div>
            </div>
        `).join('');

        logsList.innerHTML = logsHtml;
    }

    filterLogs(searchTerm) {
        if (!this.allLogs) return;
        
        const filteredLogs = this.allLogs.filter(log => 
            log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.detalhes && log.detalhes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        this.renderLogs(filteredLogs);
    }

    filterLogsByType(acao) {
        if (!this.allLogs) return;
        
        const filteredLogs = acao ? 
            this.allLogs.filter(log => log.acao === acao) : 
            this.allLogs;
            
        this.renderLogs(filteredLogs);
    }

    showLimparLogsModal() {
        document.getElementById('limparLogsModal').classList.remove('hidden');
    }

    hideLimparLogsModal() {
        document.getElementById('limparLogsModal').classList.add('hidden');
    }

    async handleLimparLogs() {
        const selectedPeriodo = document.querySelector('input[name="periodo"]:checked').value;
        
        try {
            const response = await fetch('/api/logs/limpar', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ periodo: selectedPeriodo })
            });

            if (response.ok) {
                const result = await response.json();
                this.showMessage(`Limpeza concluída: ${result.removidos} log(s) removido(s)`, 'success');
                this.hideLimparLogsModal();
                this.loadLogStats();
                if (!document.getElementById('logsDisplay').classList.contains('hidden')) {
                    this.loadLogs();
                }
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Erro ao limpar logs', 'error');
            }
        } catch (error) {
            console.error('Erro ao limpar logs:', error);
            this.showMessage('Erro ao limpar logs', 'error');
        }
    }
    
    renderSinaisVitais(sinaisVitais) {
        const vitaisHtml = [];
        
        if (sinaisVitais.pressaoArterial) {
            vitaisHtml.push(`<span class="vital-item vital-pressao">🩸 PA: ${sinaisVitais.pressaoArterial} mmHg</span>`);
        }
        
        if (sinaisVitais.frequenciaCardiaca) {
            vitaisHtml.push(`<span class="vital-item vital-fc">💓 FC: ${sinaisVitais.frequenciaCardiaca} bpm</span>`);
        }
        
        if (sinaisVitais.frequenciaRespiratoria) {
            vitaisHtml.push(`<span class="vital-item vital-fr">🫁 FR: ${sinaisVitais.frequenciaRespiratoria} rpm</span>`);
        }
        
        if (sinaisVitais.temperatura) {
            vitaisHtml.push(`<span class="vital-item vital-temp">🌡️ T: ${sinaisVitais.temperatura}°C</span>`);
        }
        
        if (sinaisVitais.saturacao) {
            vitaisHtml.push(`<span class="vital-item vital-sat">💨 SpO₂: ${sinaisVitais.saturacao}%</span>`);
        }
        
        if (vitaisHtml.length === 0) return '';
        
        return `
            <div class="sinais-vitais-display">
                <div class="vitais-header">
                    <span class="vitais-icon">🩺</span>
                    <strong>Sinais Vitais</strong>
                </div>
                <div class="vitais-grid">
                    ${vitaisHtml.join('')}
                </div>
            </div>
        `;
    }
    
    // === FUNCIONALIDADES DE ARRECADAÇÃO ===
    async loadArrecadacao(periodo = '30') {
        try {
            const response = await fetch(`/api/arrecadacao?periodo=${periodo}`);
            if (response.ok) {
                const data = await response.json();
                this.renderArrecadacao(data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de arrecadação:', error);
        }
    }
    
    renderArrecadacao(data) {
        // Atualizar cards de resumo
        document.getElementById('valorTotal').textContent = `R$ ${parseFloat(data.resumo.valorTotal).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('valorMes').textContent = `R$ ${parseFloat(data.resumo.valorMes).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('valorSemana').textContent = `R$ ${parseFloat(data.resumo.valorSemana).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('valorMedio').textContent = `R$ ${parseFloat(data.resumo.valorMedio).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Atualizar info badge
        document.getElementById('infoArrecadacao').textContent = `${data.resumo.quantidade} atendimentos`;
        
        // Renderizar gráfico simples (ASCII)
        this.renderGraficoSimples(data.grafico);
        
        // Renderizar detalhes
        this.renderDetalhesArrecadacao(data.detalhes);
    }
    
    renderGraficoSimples(dadosGrafico) {
        const canvas = document.getElementById('arrecadacaoChart');
        const ctx = canvas.getContext('2d');
        
        // Limpar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (dadosGrafico.labels.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('📊 Nenhum dado disponível', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const padding = 60;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);
        
        const maxValue = Math.max(...dadosGrafico.valores);
        const minValue = 0;
        
        // Configuração das cores
        const lineColor = '#3b82f6';
        const fillColor = 'rgba(59, 130, 246, 0.1)';
        const pointColor = '#1e40af';
        
        // Desenhar eixos
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        
        // Eixo Y
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.stroke();
        
        // Eixo X
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Desenhar linhas de grade Y
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }
        
        // Labels do eixo Y
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = maxValue - (maxValue / 5) * i;
            const y = padding + (chartHeight / 5) * i + 4;
            ctx.fillText(`R$ ${value.toFixed(0)}`, padding - 10, y);
        }
        
        // Desenhar linha do gráfico
        if (dadosGrafico.valores.length > 1) {
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            dadosGrafico.valores.forEach((valor, index) => {
                const x = padding + (chartWidth / (dadosGrafico.valores.length - 1)) * index;
                const y = canvas.height - padding - (valor / maxValue) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // Preencher área sob a linha
            ctx.fillStyle = fillColor;
            ctx.lineTo(canvas.width - padding, canvas.height - padding);
            ctx.lineTo(padding, canvas.height - padding);
            ctx.closePath();
            ctx.fill();
        }
        
        // Desenhar pontos
        ctx.fillStyle = pointColor;
        dadosGrafico.valores.forEach((valor, index) => {
            const x = padding + (chartWidth / (dadosGrafico.valores.length - 1)) * index;
            const y = canvas.height - padding - (valor / maxValue) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Labels do eixo X (datas)
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        dadosGrafico.labels.slice(0, 10).forEach((label, index) => { // Mostrar apenas 10 labels
            const x = padding + (chartWidth / (dadosGrafico.labels.length - 1)) * index;
            const dataFormatada = new Date(label + ' 12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit'
            });
            ctx.fillText(dataFormatada, x, canvas.height - padding + 20);
        });
    }
    
    renderDetalhesArrecadacao(detalhes) {
        const container = document.getElementById('detalhesArrecadacao');
        
        if (detalhes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💰</div>
                    <p>Nenhum atendimento com valor encontrado no período selecionado</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = detalhes.map(atend => `
            <div class="detail-item">
                <div class="detail-info">
                    <div class="detail-paciente">${atend.paciente}</div>
                    <div class="detail-data">📅 ${this.formatDate(atend.data)} às ${atend.horario}</div>
                    <div class="detail-desc">${atend.titulo}</div>
                </div>
                <div class="detail-valor">R$ ${atend.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
        `).join('');
    }
    
    filtrarPeriodoCustom() {
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;
        
        if (!dataInicio || !dataFim) {
            this.showMessage('Por favor, selecione as datas de início e fim', 'error');
            return;
        }
        
        if (new Date(dataInicio) > new Date(dataFim)) {
            this.showMessage('Data de início deve ser anterior à data de fim', 'error');
            return;
        }
        
        this.loadArrecadacaoCustom(dataInicio, dataFim);
    }
    
    async loadArrecadacaoCustom(dataInicio, dataFim) {
        try {
            const response = await fetch(`/api/arrecadacao?periodo=custom&dataInicio=${dataInicio}&dataFim=${dataFim}`);
            if (response.ok) {
                const data = await response.json();
                this.renderArrecadacao(data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de arrecadação:', error);
        }
    }
    
    // === FUNCIONALIDADE DE IMPRESSÃO ===
    imprimirAtendimento(atendimentoId) {
        const atendimento = this.currentPaciente.atendimentos.find(a => a.id == atendimentoId);
        if (!atendimento) {
            this.showMessage('Atendimento não encontrado', 'error');
            return;
        }
        
        this.showPrintModal(atendimento);
    }
    
    showPrintModal(atendimento) {
        const modal = document.createElement('div');
        modal.className = 'print-overlay';
        modal.id = 'printModal';
        
        // Calcular idade do paciente
        const idade = this.calcularIdade(this.currentPaciente.dataNascimento);
        
        // Formatar sinais vitais em texto corrido se existirem
        let sinaisVitaisTexto = '';
        if (atendimento.sinaisVitais) {
            const vitais = [];
            
            if (atendimento.sinaisVitais.temperatura) {
                vitais.push(`T: ${atendimento.sinaisVitais.temperatura}°C`);
            }
            if (atendimento.sinaisVitais.pressaoArterial) {
                vitais.push(`PA: ${atendimento.sinaisVitais.pressaoArterial} mmHg`);
            }
            if (atendimento.sinaisVitais.frequenciaCardiaca) {
                vitais.push(`FC: ${atendimento.sinaisVitais.frequenciaCardiaca} bpm`);
            }
            if (atendimento.sinaisVitais.frequenciaRespiratoria) {
                vitais.push(`FR: ${atendimento.sinaisVitais.frequenciaRespiratoria} rpm`);
            }
            if (atendimento.sinaisVitais.saturacao) {
                vitais.push(`SpO₂: ${atendimento.sinaisVitais.saturacao}%`);
            }
            
            if (vitais.length > 0) {
                sinaisVitaisTexto = '\n\nSinais Vitais: ' + vitais.join(', ') + '.';
            }
        }
        
        modal.innerHTML = `
            <div class="print-modal">
                <div class="print-header">
                    <h2 class="print-title">🖨️ Impressão de Atendimento</h2>
                    <button class="print-close" onclick="app.closePrintModal()">×</button>
                </div>
                
                <div class="print-content">
                    <div class="print-document">
                        <!-- Cabeçalho da Clínica -->
                        <div class="document-header">
                            <h1 class="clinic-name">Sistema de Prontuário</h1>
                            <p class="document-title">Evolução Profissional</p>
                        </div>
                        
                        <!-- Informações do Paciente -->
                        <div class="patient-info">
                            <h3>📋 Dados do Cliente</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Nome:</span>
                                    <span class="info-value">${this.currentPaciente.nomeCompleto}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">CPF:</span>
                                    <span class="info-value">${this.currentPaciente.cpf}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Data Nasc.:</span>
                                    <span class="info-value">${this.formatDate(this.currentPaciente.dataNascimento)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Idade:</span>
                                    <span class="info-value">${idade} anos</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Telefone:</span>
                                    <span class="info-value">${this.currentPaciente.telefone}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Data e Hora do Atendimento -->
                        <div class="attendance-date">
                            📅 Atendimento realizado em ${this.formatDate(atendimento.data)} às ${atendimento.horario}
                        </div>
                        
                        <!-- Título do Atendimento -->
                        ${atendimento.titulo ? `
                            <div class="attendance-content">
                                <h3>🏥 Tipo de Atendimento</h3>
                                <div style="font-weight: bold; color: #1e40af; font-size: 1.1rem; margin-bottom: 1rem;">
                                    ${atendimento.titulo}
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- Evolução/Observações -->
                        <div class="attendance-content">
                            <h3>📝 Evolução</h3>
                            <div class="evolution-text">${atendimento.observacoes}${sinaisVitaisTexto}</div>
                        </div>
                        
                        <!-- Assinatura do Profissional -->
                        <div class="professional-signature">
                            <div class="signature-info">
                                <div class="professional-name">${atendimento.profissionalNome}</div>
                                <div class="professional-registration">${atendimento.profissionalRegistro}</div>
                                ${atendimento.profissionalEstado ? `<div class="professional-registration">${atendimento.profissionalEstado}</div>` : ''}
                                <div class="signature-line">Assinatura do Profissional</div>
                            </div>
                        </div>
                        
                        <!-- Data de Impressão -->
                        <div class="print-date">
                            Documento impresso em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                        </div>
                    </div>
                </div>
                
                <div class="print-actions">
                    <button class="btn-cancel" onclick="app.closePrintModal()">Cancelar</button>
                    <button class="btn-print" onclick="app.executePrint()">
                        🖨️ Imprimir
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal clicando fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePrintModal();
            }
        });
    }
    
    closePrintModal() {
        const modal = document.getElementById('printModal');
        if (modal) {
            modal.remove();
        }
    }
    
    executePrint() {
        // Obter apenas o conteúdo do documento para impressão
        const printDocument = document.querySelector('.print-document');
        
        // Criar uma nova janela para impressão
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Impressão de Atendimento</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Times New Roman', serif;
                        line-height: 1.6;
                        color: #000;
                        background: white;
                        padding: 20px;
                    }
                    
                    .document-header {
                        text-align: center;
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 0.75rem;
                        margin-bottom: 1.5rem;
                    }
                    
                    .clinic-name {
                        font-size: 1.5rem;
                        font-weight: bold;
                        color: #1e40af;
                        margin: 0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .document-title {
                        font-size: 1rem;
                        color: #374151;
                        margin: 0.25rem 0;
                        font-weight: normal;
                    }
                    
                    .patient-info {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    
                    .patient-info h3 {
                        color: #1e40af;
                        font-size: 1rem;
                        margin: 0 0 0.75rem 0;
                        border-bottom: 1px solid #cbd5e1;
                        padding-bottom: 0.25rem;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.5rem 1rem;
                    }
                    
                    .info-item {
                        display: flex;
                        align-items: center;
                        font-size: 0.9rem;
                    }
                    
                    .info-label {
                        font-weight: bold;
                        color: #374151;
                        min-width: 70px;
                        margin-right: 0.25rem;
                        font-size: 0.85rem;
                    }
                    
                    .info-value {
                        color: #1f2937;
                        font-size: 0.85rem;
                    }
                    
                    .attendance-content {
                        margin: 1.5rem 0;
                    }
                    
                    .attendance-content h3 {
                        color: #1e40af;
                        font-size: 1rem;
                        margin: 0 0 0.75rem 0;
                        border-bottom: 1px solid #cbd5e1;
                        padding-bottom: 0.25rem;
                    }
                    
                    .attendance-date {
                        background: #eff6ff;
                        border: 1px solid #bfdbfe;
                        border-radius: 4px;
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                        font-weight: bold;
                        color: #1e40af;
                        text-align: center;
                        font-size: 0.95rem;
                    }
                    
                    .evolution-text {
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 4px;
                        padding: 1rem;
                        min-height: 150px;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font-size: 0.95rem;
                        line-height: 1.6;
                    }
                    
                    .professional-signature {
                        margin-top: 2rem;
                        padding-top: 1rem;
                        border-top: 1px solid #e5e7eb;
                    }
                    
                    .signature-info {
                        text-align: center;
                    }
                    
                    .professional-name {
                        font-size: 1rem;
                        font-weight: bold;
                        color: #1f2937;
                        margin-bottom: 0.25rem;
                    }
                    
                    .professional-registration {
                        color: #6b7280;
                        font-size: 0.9rem;
                        margin-bottom: 1.5rem;
                    }
                    
                    .signature-line {
                        border-top: 1px solid #9ca3af;
                        width: 250px;
                        margin: 0 auto;
                        padding-top: 0.25rem;
                        color: #6b7280;
                        font-size: 0.85rem;
                    }
                    
                    .print-date {
                        text-align: right;
                        color: #6b7280;
                        font-size: 0.8rem;
                        margin-top: 1.5rem;
                        font-style: italic;
                    }
                    
                    /* Estilos específicos para impressão */
                    @media print {
                        body {
                            padding: 0;
                        }
                        
                        .patient-info {
                            background: #f9f9f9 !important;
                        }
                        
                        .evolution-text {
                            border: 1px solid #ccc !important;
                            background: white !important;
                        }
                        
                        .attendance-date {
                            background: #f0f0f0 !important;
                            border: 1px solid #ccc !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${printDocument.outerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Aguardar o carregamento da página e imprimir
        printWindow.onload = function() {
            printWindow.print();
            printWindow.close();
        };
        
        // Fechar o modal após iniciar a impressão
        this.closePrintModal();
    }
    
    calcularIdade(dataNascimento) {
        const hoje = new Date();
        const nascimento = new Date(dataNascimento + ' 12:00:00');
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mesAtual = hoje.getMonth();
        const mesNascimento = nascimento.getMonth();
        
        if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        
        return idade;
    }
}

// Inicializar aplicação
const app = new ProntuarioApp();

// Expor globalmente para uso em onclick
window.app = app;