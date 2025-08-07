class ProntuarioApp {
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
        
        // Registrar usuário
        document.getElementById('registrarUsuarioBtn').addEventListener('click', () => {
            this.showRegistrarUsuarioModal();
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
                }
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
                <div class="stat-label">Total de Atendimentos</div>
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
        }
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
            endereco: formData.get('endereco')
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
                    <div class="atendimento-data">
                        📅 ${this.formatDate(atendimento.data)} às ${atendimento.horario}
                    </div>
                    ${atendimento.valor ? `<div class="atendimento-valor">R$ ${parseFloat(atendimento.valor).toFixed(2)}</div>` : ''}
                </div>
                <div class="atendimento-obs">${atendimento.observacoes}</div>
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
    }
    
    async handleNovoAtendimento() {
        const form = document.getElementById('atendimentoForm');
        const formData = new FormData(form);
        
        const atendimentoData = {
            data: formData.get('data'),
            horario: formData.get('horario'),
            observacoes: formData.get('observacoes'),
            valor: formData.get('valor')
        };
        
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
}

// Inicializar aplicação
const app = new ProntuarioApp();

// Expor globalmente para uso em onclick
window.app = app;