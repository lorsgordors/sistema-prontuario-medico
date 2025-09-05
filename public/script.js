class ProntuarioApp {
    constructor() {
        this.currentUser = null;
        this.currentPaciente = null;
        this.pacientes = [];
        this.cache = {
            lastPacientesLoad: 0,
            lastEstatisticasLoad: 0,
            cacheDuration: 30000 // 30 segundos
        };
        
        // Inicializar event listeners
        this.initEventListeners();
    }
    
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
                
                // Preencher campos básicos
                document.getElementById('editarUsuarioId').value = usuario.id;
                document.getElementById('editarUsuarioNome').value = usuario.nomeCompleto;
                document.getElementById('editarUsuarioLogin').value = usuario.login;
                document.getElementById('editarUsuarioTipo').value = usuario.tipo;
                document.getElementById('editarUsuarioNovaSenha').value = '';
                
                // Controlar visibilidade dos campos de registro
                this.toggleEditarUsuarioRegistroFields(usuario.tipo);
                
                // Preencher campos de registro se for profissional
                if (usuario.tipo === 'Profissional') {
                    // Carregar tipos de registro para o select de edição
                    this.populateEditarTipoRegistroSelect().then(() => {
                        document.getElementById('editarUsuarioTipoRegistro').value = usuario.tipoRegistro || '';
                        document.getElementById('editarUsuarioNumeroRegistro').value = usuario.numeroRegistro || '';
                        document.getElementById('editarUsuarioEstado').value = usuario.estadoRegistro || '';
                        
                        // Mostrar/ocultar campo de estado baseado no tipo de registro
                        this.toggleEditarEstadoField(usuario.tipoRegistro);
                    });
                }
                
                document.getElementById('editarUsuarioModal').classList.remove('hidden');
            });
    }
    
    toggleEditarUsuarioRegistroFields(tipoUsuario) {
        const registroSection = document.getElementById('editarRegistroProfissionalSection');
        const tipoRegistroGroup = document.getElementById('editarTipoRegistroGroup');
        const numeroRegistroGroup = document.getElementById('editarNumeroRegistroGroup');
        const estadoRegistroGroup = document.getElementById('editarEstadoRegistroGroup');
        
        const tipoRegistroSelect = document.getElementById('editarUsuarioTipoRegistro');
        const numeroRegistroInput = document.getElementById('editarUsuarioNumeroRegistro');
        const estadoRegistroSelect = document.getElementById('editarUsuarioEstado');
        
        if (tipoUsuario === 'Profissional') {
            registroSection.style.display = 'block';
            tipoRegistroGroup.style.display = 'block';
            numeroRegistroGroup.style.display = 'block';
            tipoRegistroSelect.required = true;
            numeroRegistroInput.required = true;
        } else {
            registroSection.style.display = 'none';
            tipoRegistroGroup.style.display = 'none';
            numeroRegistroGroup.style.display = 'none';
            estadoRegistroGroup.style.display = 'none';
            
            tipoRegistroSelect.required = false;
            numeroRegistroInput.required = false;
            estadoRegistroSelect.required = false;
            
            tipoRegistroSelect.value = '';
            numeroRegistroInput.value = '';
            estadoRegistroSelect.value = '';
        }
    }
    
    async populateEditarTipoRegistroSelect() {
        const select = document.getElementById('editarUsuarioTipoRegistro');
        if (select && this.tiposRegistro) {
            select.innerHTML = '<option value="">Selecione...</option>';
            this.tiposRegistro.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.valor;
                option.textContent = tipo.nome;
                option.dataset.temEstado = tipo.temEstado;
                select.appendChild(option);
            });
        } else if (select) {
            // Carregar tipos de registro se não estão carregados
            await this.loadTiposRegistro();
            this.populateEditarTipoRegistroSelect();
        }
    }
    
    toggleEditarEstadoField(tipoRegistro) {
        if (!this.tiposRegistro) return;
        
        const tipo = this.tiposRegistro.find(t => t.valor === tipoRegistro);
        const estadoGroup = document.getElementById('editarEstadoRegistroGroup');
        const estadoSelect = document.getElementById('editarUsuarioEstado');
        
        if (tipo && tipo.temEstado) {
            estadoGroup.style.display = 'block';
            estadoSelect.required = true;
        } else {
            estadoGroup.style.display = 'none';
            estadoSelect.required = false;
            estadoSelect.value = '';
        }
    }
    
    initEventListeners() {
        this.loadTiposRegistro();
        this.checkAuth();
    }
    
    async loadTiposRegistro() {
        try {
            console.log('Carregando tipos de registro...');
            const response = await fetch('/api/tipos-registro');
            console.log('Response status:', response.status);
            
            if (response.ok) {
                this.tiposRegistro = await response.json();
                console.log('Tipos de registro carregados:', this.tiposRegistro);
                this.populateTipoRegistroSelect();
            } else {
                console.error('Erro ao buscar tipos de registro:', response.status);
            }
        } catch (error) {
            console.error('Erro ao carregar tipos de registro:', error);
        }
    }
    
    populateTipoRegistroSelect() {
        const select = document.getElementById('tipoRegistroNovo');
        console.log('populateTipoRegistroSelect - select:', select);
        console.log('populateTipoRegistroSelect - tiposRegistro:', this.tiposRegistro);
        
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>';
            
            if (this.tiposRegistro && this.tiposRegistro.length > 0) {
                this.tiposRegistro.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.valor;
                    option.textContent = tipo.nome;
                    option.dataset.temEstado = tipo.temEstado;
                    select.appendChild(option);
                });
                console.log(`Adicionadas ${this.tiposRegistro.length} opções de tipo de registro`);
            } else {
                console.log('Nenhum tipo de registro disponível, carregando...');
                // Se não há tipos carregados, tentar carregar novamente
                this.loadTiposRegistro().then(() => {
                    this.populateTipoRegistroSelect();
                });
            }
        }
    }
    
    initEventListeners() {
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
                    const updatedPaciente = await response.json();
                    this.showMessage('Paciente editado com sucesso!', 'success');
                    document.getElementById('editarPacienteModal').classList.add('hidden');
                    
                    // Atualizar dados localmente sem recarregar
                    this.currentPaciente = updatedPaciente;
                    this.renderPacienteDetails();
                    
                    // Atualizar na lista de pacientes se estiver carregada
                    if (this.pacientes && this.pacientes.length > 0) {
                        const index = this.pacientes.findIndex(p => p.id === id);
                        if (index !== -1) {
                            this.pacientes[index] = updatedPaciente;
                            this.renderPacientes(this.pacientes);
                        }
                    }
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
        
        // Editar usuário - controlar campos de registro baseado no tipo
        document.getElementById('editarUsuarioTipo').addEventListener('change', (e) => {
            this.toggleEditarUsuarioRegistroFields(e.target.value);
        });
        
        // Editar usuário - controlar campo de estado baseado no tipo de registro
        document.getElementById('editarUsuarioTipoRegistro').addEventListener('change', (e) => {
            this.toggleEditarEstadoField(e.target.value);
        });

        // Editar usuário - submit
        document.getElementById('editarUsuarioForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = parseInt(form.id.value);
            const nomeCompleto = form.nomeCompleto.value;
            const login = form.login.value;
            const tipo = form.tipo.value;
            const novaSenha = form.novaSenha.value;
            const senhaAdmin = form.senhaAdmin.value;
            
            // Construir payload básico
            const payload = { nomeCompleto, login, tipo, senhaAdmin };
            
            // Adicionar campos de registro se for profissional
            if (tipo === 'Profissional') {
                payload.tipoRegistro = form.tipoRegistro.value;
                payload.numeroRegistro = form.numeroRegistro.value;
                payload.estadoRegistro = form.estadoRegistro.value;
            } else {
                // Limpar campos de registro para administradores
                payload.tipoRegistro = '';
                payload.numeroRegistro = '';
                payload.estadoRegistro = '';
            }
            
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
                    
                    // Recarregar lista de usuários
                    await this.loadUsuarios();
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
                } else if (e.target.id === 'novoAgendamentoModal') {
                    this.hideNovoAgendamentoModal();
                }
            }
        });
        
        // === AGENDA EVENT LISTENERS ===
        // Configurar apenas uma vez para evitar duplicação
        if (!this.agendaModalListenersSetup) {
            this.agendaModalListenersSetup = true;
            
            const closeAgendaModalBtn = document.getElementById('closeAgendaModal');
            const cancelAgendamentoBtn = document.getElementById('cancelAgendamento');
            
            if (closeAgendaModalBtn) {
                closeAgendaModalBtn.addEventListener('click', () => {
                    this.hideNovoAgendamentoModal();
                });
            }
            
            if (cancelAgendamentoBtn) {
                cancelAgendamentoBtn.addEventListener('click', () => {
                    this.hideNovoAgendamentoModal();
                });
            }
        }

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
        
        // Mostrar/ocultar campos de registro baseado no tipo de usuário
        document.getElementById('tipoUsuarioNovo').addEventListener('change', (e) => {
            const tipoUsuario = e.target.value;
            const registroSection = document.getElementById('registroProfissionalSection');
            const tipoRegistroGroup = document.getElementById('tipoRegistroGroup');
            const numeroRegistroGroup = document.getElementById('numeroRegistroGroup');
            const estadoRegistroGroup = document.getElementById('estadoRegistroGroup');
            
            const tipoRegistroSelect = document.getElementById('tipoRegistroNovo');
            const numeroRegistroInput = document.getElementById('numeroRegistroNovo');
            const estadoRegistroSelect = document.getElementById('estadoRegistroNovo');
            
            if (tipoUsuario === 'Profissional') {
                // Mostrar seção de registro para profissionais
                registroSection.style.display = 'block';
                tipoRegistroGroup.style.display = 'block';
                numeroRegistroGroup.style.display = 'block';
                tipoRegistroSelect.required = true;
                numeroRegistroInput.required = true;
                
                // Popular as opções de tipo de registro
                app.populateTipoRegistroSelect();
            } else {
                // Ocultar seção de registro para administradores
                registroSection.style.display = 'none';
                tipoRegistroGroup.style.display = 'none';
                numeroRegistroGroup.style.display = 'none';
                estadoRegistroGroup.style.display = 'none';
                
                tipoRegistroSelect.required = false;
                numeroRegistroInput.required = false;
                estadoRegistroSelect.required = false;
                
                tipoRegistroSelect.value = '';
                numeroRegistroInput.value = '';
                estadoRegistroSelect.value = '';
            }
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
                await this.showMainScreen();
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
                
                // Carregar personalização do usuário assim que fizer login
                await this.loadUserPersonalization();
                
                await this.showMainScreen();
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
            
            // Limpar personalização individual do usuário
            if (window.personalizationManager) {
                window.personalizationManager.clearUserPersonalization();
            }
            
            this.showLoginScreen();
        } catch (error) {
            this.showMessage('Erro ao fazer logout', 'error');
        }
    }
    
    async loadUserPersonalization() {
        try {
            const response = await fetch('/api/personalizacao');
            if (response.ok) {
                const config = await response.json();
                this.applyUserPersonalization(config);
            }
        } catch (error) {
            console.log('Personalização não encontrada, usando padrão');
        }
    }
    
    applyUserPersonalization(config) {
        // Update CSS variables
        const root = document.documentElement;
        root.style.setProperty('--primary-purple', config.corPrimaria || '#8b5cf6');
        root.style.setProperty('--secondary-purple', config.corSecundaria || '#667eea');
        
        const nomeSystem = config.nomeSystem || config.nomeSistema || 'Lizard Prontuário';
        
        // Update page title
        if (document.title) {
            document.title = nomeSystem;
        }
        
        // Update login system name (se ainda estiver visível)
        const loginSystemName = document.getElementById('loginSystemName');
        if (loginSystemName) {
            const logoHtml = loginSystemName.querySelector('.logo-icon')?.outerHTML || '';
            loginSystemName.innerHTML = `${logoHtml} ${nomeSystem}`;
        }
        
        // Update main system name  
        const mainSystemName = document.getElementById('mainSystemName');
        if (mainSystemName) {
            const logoHtml = mainSystemName.querySelector('.logo-icon')?.outerHTML || '';
            mainSystemName.innerHTML = `${logoHtml} ${nomeSystem}`;
        }
        
        // Update logo
        const logos = document.querySelectorAll('.logo-icon');
        logos.forEach(logo => {
            if (config.logoUrl && config.logoUrl !== 'logo.png') {
                logo.src = config.logoUrl;
            }
        });
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
        const submitBtn = form.querySelector('button[type="submit"]');
        
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

        // Adicionar loading ao botão
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span class="btn-text">Excluindo...</span>';
        
        // Adicionar classe deleting ao card do paciente se estiver visível
        const pacienteCard = document.querySelector(`[onclick="app.showPacienteDetails(${this.currentPaciente.id})"]`);
        if (pacienteCard) {
            pacienteCard.classList.add('deleting');
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
                
                // Remover paciente da lista local sem recarregar
                this.pacientes = this.pacientes.filter(p => p.id !== this.currentPaciente.id);
                
                // Voltar para lista de pacientes e renderizar
                await this.switchTab('pacientes');
            } else {
                // Remover loading states em caso de erro
                if (pacienteCard) {
                    pacienteCard.classList.remove('deleting');
                }
                this.showMessage(result.error || 'Erro ao excluir paciente', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            // Remover loading states em caso de erro
            if (pacienteCard) {
                pacienteCard.classList.remove('deleting');
            }
            this.showMessage('Erro de conexão ao excluir paciente', 'error');
        } finally {
            // Restaurar botão
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<span class="btn-text">🗑️ Confirmar Exclusão</span>';
        }
    }
    
    async loadEstatisticas(forceReload = false) {
        const now = Date.now();
        
        // Verificar cache se não for reload forçado
        if (!forceReload && 
            this.lastStats && 
            (now - this.cache.lastEstatisticasLoad) < this.cache.cacheDuration) {
            // Usar dados do cache
            this.renderEstatisticas(this.lastStats);
            return;
        }
        
        // Mostrar skeleton loading apenas se não há dados em cache
        if (!this.lastStats) {
            this.showStatsSkeleton();
        }
        
        try {
            const response = await fetch('/api/estatisticas');
            if (response.ok) {
                const stats = await response.json();
                this.lastStats = stats;
                this.cache.lastEstatisticasLoad = now;
                this.renderEstatisticas(stats);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            if (!this.lastStats) {
                document.getElementById('statsCards').innerHTML = `
                    <div class="stat-card error">
                        <div class="stat-number">❌</div>
                        <div class="stat-label">Erro ao carregar</div>
                    </div>
                `;
            }
        }
    }
    
    showStatsSkeleton() {
        const container = document.getElementById('statsCards');
        container.innerHTML = `
            <div class="stat-card skeleton-card">
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text medium"></div>
            </div>
            <div class="stat-card skeleton-card">
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text medium"></div>
            </div>
            <div class="stat-card skeleton-card">
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text medium"></div>
            </div>
            <div class="stat-card skeleton-card">
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text medium"></div>
            </div>
        `;
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
    
    async showMainScreen() {
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
        
        // Inicializar PersonalizationManager se não existir
        if (!window.personalizationManager) {
            window.personalizationManager = new PersonalizationManager();
        }
        
        // Carregar personalização individual do usuário
        console.log('Carregando personalização para usuário:', this.currentUser.login);
        await window.personalizationManager.loadUserPersonalization(this.currentUser.login);
        
        // Carregar dados da aba inicial apenas (aba 'meuPerfil' está ativa por padrão)
        // Os dados das outras abas serão carregados quando o usuário clicar nelas
        this.loadEstatisticas();
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
    
    async switchTab(tabName) {
        // Adicionar loading ao botão da aba atual
        const currentBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (currentBtn) {
            currentBtn.classList.add('loading');
        }
        
        // Atualizar navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar conteúdo imediatamente
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        // Ações específicas com loading (SEM delay desnecessário)
        try {
            if (tabName === 'pacientes') {
                await this.loadPacientes();
            } else if (tabName === 'meuPerfil') {
                await this.loadEstatisticas();
            } else if (tabName === 'agenda') {
                await this.loadAgenda();
            } else if (tabName === 'arrecadacao') {
                await this.loadArrecadacao();
            } else if (tabName === 'personalizacao') {
                // Initialize personalization if not already done
                if (!window.personalizationManager) {
                    window.personalizationManager = new PersonalizationManager();
                }
            } else if (tabName === 'usuarios' && this.currentUser.tipo === 'Administrador') {
                await this.loadUsuarios();
            } else if (tabName === 'logs' && this.currentUser.tipo === 'Administrador') {
                await this.loadLogStats();
            }
        } catch (error) {
            console.error('Erro ao carregar aba:', error);
        }
        
        // Remover loading e ativar aba
        if (currentBtn) {
            currentBtn.classList.remove('loading');
            currentBtn.classList.add('active');
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
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
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
            <div class="usuario-item">
                <div class="usuario-header">
                    <div class="usuario-info">
                        <h3 class="usuario-nome">${usuario.nomeCompleto}</h3>
                        <p class="usuario-login">@${usuario.login}</p>
                        <div class="usuario-meta">
                            <span class="usuario-tipo ${usuario.tipo.toLowerCase()}">${usuario.tipo}</span>
                            <span class="usuario-registro">${usuario.tipoRegistro} ${usuario.numeroRegistro}</span>
                        </div>
                    </div>
                    <div class="usuario-actions">
                        <button class="btn btn-secondary" onclick="app.showEditarUsuarioModal(${usuario.id})">Editar</button>
                    </div>
                </div>
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
        
        // Criar paciente temporário com status pendente
        const tempPaciente = {
            ...pacienteData,
            id: 'temp_' + Date.now(),
            status: 'pending', // Status para indicar que está sendo enviado
            criadoEm: new Date().toISOString(),
            atendimentos: []
        };
        
        // Adicionar paciente temporário à lista imediatamente
        this.pacientes = this.pacientes || [];
        this.pacientes.unshift(tempPaciente);
        this.renderPacientes(this.pacientes);
        
        try {
            const response = await fetch('/api/pacientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pacienteData)
            });
            
            if (response.ok) {
                const pacienteReal = await response.json();
                
                // Substituir paciente temporário pelo real
                const tempIndex = this.pacientes.findIndex(p => p.id === tempPaciente.id);
                if (tempIndex !== -1) {
                    this.pacientes[tempIndex] = {
                        ...pacienteReal,
                        status: 'confirmed' // Status confirmado
                    };
                    this.renderPacientes(this.pacientes);
                }
                
                this.showMessage('Paciente cadastrado com sucesso!', 'success');
                form.reset();
                
                // Invalidar cache de estatísticas para refletir novo paciente
                this.invalidateCache('estatisticas');
                this.loadEstatisticas(true); // Force reload das estatísticas
                this.switchTab('pacientes');
                
                // Após 2 segundos, remove o status para comportamento normal
                setTimeout(() => {
                    if (this.pacientes[tempIndex]) {
                        delete this.pacientes[tempIndex].status;
                        this.renderPacientes(this.pacientes);
                    }
                }, 2000);
                
            } else {
                // Remover paciente temporário em caso de erro
                this.pacientes = this.pacientes.filter(p => p.id !== tempPaciente.id);
                this.renderPacientes(this.pacientes);
                
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            // Remover paciente temporário em caso de erro
            this.pacientes = this.pacientes.filter(p => p.id !== tempPaciente.id);
            this.renderPacientes(this.pacientes);
            
            this.showMessage('Erro ao cadastrar paciente', 'error');
        }
    }
    
    async loadPacientes(forceReload = false) {
        const now = Date.now();
        
        // Verificar cache se não for reload forçado
        if (!forceReload && 
            this.pacientes.length > 0 && 
            (now - this.cache.lastPacientesLoad) < this.cache.cacheDuration) {
            // Usar dados do cache
            this.renderPacientes(this.pacientes);
            return;
        }
        
        // Mostrar skeleton loading apenas se não há dados em cache
        if (this.pacientes.length === 0) {
            this.showSkeletonLoading('pacientesList');
        }
        
        try {
            const response = await fetch('/api/pacientes');
            if (response.ok) {
                this.pacientes = await response.json();
                this.cache.lastPacientesLoad = now;
                this.renderPacientes(this.pacientes);
            } else {
                document.getElementById('pacientesList').innerHTML = `
                    <div class="text-center" style="padding: 40px; color: #ef4444;">
                        ❌ Erro ao carregar pacientes
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('pacientesList').innerHTML = `
                <div class="text-center" style="padding: 40px; color: #ef4444;">
                    📡 Erro de conexão
                </div>
            `;
        }
    }
    
    showSkeletonLoading(containerId, count = 3) {
        const container = document.getElementById(containerId);
        const skeletonItems = [];
        
        for (let i = 0; i < count; i++) {
            skeletonItems.push(`
                <div class="paciente-card skeleton-card">
                    <div class="paciente-header">
                        <div class="skeleton skeleton-text medium"></div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                    <div class="paciente-info">
                        <div class="skeleton skeleton-text long"></div>
                        <div class="skeleton skeleton-text medium"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton skeleton-text long"></div>
                    </div>
                </div>
            `);
        }
        
        container.innerHTML = skeletonItems.join('');
    }
    
    // Cache management
    invalidateCache(type = 'all') {
        if (type === 'all' || type === 'pacientes') {
            this.cache.lastPacientesLoad = 0;
        }
        if (type === 'all' || type === 'estatisticas') {
            this.cache.lastEstatisticasLoad = 0;
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
            
            // Status indicator logic
            let statusIcon = '';
            let statusClass = '';
            if (paciente.status === 'pending') {
                statusIcon = '⏱️';
                statusClass = 'status-pending';
            } else if (paciente.status === 'confirmed') {
                statusIcon = '✅';
                statusClass = 'status-confirmed';
            }
            
            return `
                <div class="${cardClass}" onclick="app.showPacienteDetails(${paciente.id})">
                    <div class="paciente-header">
                        <div class="paciente-nome">
                            ${paciente.nomeCompleto}
                            ${statusIcon ? `<span class="status-indicator ${statusClass}">${statusIcon}</span>` : ''}
                        </div>
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
        // Mostrar skeleton loading para detalhes do paciente
        this.showPatientDetailsSkeleton();
        this.switchToDetalhePaciente();
        
        try {
            const response = await fetch(`/api/pacientes/${pacienteId}`);
            if (response.ok) {
                this.currentPaciente = await response.json();
                // Renderizar diretamente sem delay
                this.renderPacienteDetails();
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Erro ao carregar detalhes do paciente', 'error');
                this.showPatientDetailsError();
            }
        } catch (error) {
            this.showMessage('Erro de conexão', 'error');
            this.showPatientDetailsError();
        }
    }
    
    showPatientDetailsSkeleton() {
        const infoContainer = document.getElementById('pacienteInfoContent');
        const atendimentosContainer = document.getElementById('atendimentosList');
        
        // Skeleton para informações do paciente
        infoContainer.innerHTML = `
            <div class="profile-info">
                <div class="info-item">
                    <div class="skeleton skeleton-text medium"></div>
                    <div class="skeleton skeleton-text long"></div>
                </div>
                <div class="info-item">
                    <div class="skeleton skeleton-text short"></div>
                    <div class="skeleton skeleton-text medium"></div>
                </div>
                <div class="info-item">
                    <div class="skeleton skeleton-text medium"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
                <div class="info-item">
                    <div class="skeleton skeleton-text short"></div>
                    <div class="skeleton skeleton-text long"></div>
                </div>
            </div>
            
            <div class="medical-info-display">
                <div class="skeleton skeleton-text medium" style="margin-bottom: 20px;"></div>
                <div class="medical-card">
                    <div class="skeleton skeleton-text long"></div>
                    <div class="skeleton skeleton-text medium"></div>
                </div>
                <div class="medical-card">
                    <div class="skeleton skeleton-text long"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
                <div class="medical-card">
                    <div class="skeleton skeleton-text long"></div>
                    <div class="skeleton skeleton-text medium"></div>
                </div>
            </div>
        `;
        
        // Skeleton para atendimentos
        const skeletonAtendimentos = [];
        for (let i = 0; i < 2; i++) {
            skeletonAtendimentos.push(`
                <div class="atendimento-item skeleton-card">
                    <div class="atendimento-header">
                        <div style="flex: 1;">
                            <div class="skeleton skeleton-text medium" style="margin-bottom: 8px;"></div>
                            <div class="skeleton skeleton-text short"></div>
                        </div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                    <div class="skeleton skeleton-text long" style="margin-bottom: 8px;"></div>
                    <div class="skeleton skeleton-text medium"></div>
                </div>
            `);
        }
        atendimentosContainer.innerHTML = skeletonAtendimentos.join('');
    }
    
    showPatientDetailsError() {
        document.getElementById('pacienteInfoContent').innerHTML = `
            <div class="text-center" style="padding: 40px; color: #ef4444;">
                ❌ Erro ao carregar detalhes do paciente
            </div>
        `;
        document.getElementById('atendimentosList').innerHTML = `
            <div class="text-center" style="padding: 30px; color: #ef4444;">
                📡 Erro ao carregar atendimentos
            </div>
        `;
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
        
        container.innerHTML = atendimentosOrdenados.map(atendimento => {
            // Status indicator logic
            let statusIcon = '';
            let statusClass = '';
            if (atendimento.status === 'pending') {
                statusIcon = '⏱️';
                statusClass = 'status-pending';
            } else if (atendimento.status === 'confirmed') {
                statusIcon = '✅';
                statusClass = 'status-confirmed';
            }
            
            return `
            <div class="atendimento-item">
                <div class="atendimento-header">
                    <div class="atendimento-info">
                        <div class="atendimento-titulo" style="font-weight: bold; color: #667eea; font-size: 1.1em; display: flex; align-items: center;">
                            ${atendimento.titulo || 'Atendimento'}
                            ${statusIcon ? `<span class="status-indicator ${statusClass}" style="margin-left: 8px; font-size: 0.9em;">${statusIcon}</span>` : ''}
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
        `;
        }).join('');
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

        // Optimistic UI: Create temporary appointment and show immediately
        const tempAtendimento = {
            id: Date.now() + '_temp',
            ...atendimentoData,
            status: 'pending',
            data: this.formatDate(atendimentoData.data),
            criadoPorId: this.currentUser.id,
            criadoPor: this.currentUser.nome
        };

        // Add to current patient's appointments for immediate display
        this.currentPaciente.atendimentos = this.currentPaciente.atendimentos || [];
        this.currentPaciente.atendimentos.unshift(tempAtendimento);
        this.renderPacienteDetails(); // Show immediately
        
        try {
            const response = await fetch(`/api/pacientes/${this.currentPaciente.id}/atendimentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(atendimentoData)
            });
            
            if (response.ok) {
                // Replace temporary appointment with confirmed one
                const confirmedAtendimento = await response.json();
                confirmedAtendimento.status = 'confirmed';
                
                const tempIndex = this.currentPaciente.atendimentos.findIndex(a => a.id === tempAtendimento.id);
                if (tempIndex !== -1) {
                    this.currentPaciente.atendimentos[tempIndex] = confirmedAtendimento;
                    this.renderPacienteDetails(); // Update with confirmed status
                    
                    // Auto-remove status indicator after 2 seconds
                    setTimeout(() => {
                        delete confirmedAtendimento.status;
                        this.renderPacienteDetails();
                    }, 2000);
                }
                
                this.showMessage('Atendimento registrado com sucesso!', 'success');
                this.hideAtendimentoForm();
                
                // Invalidar e recarregar estatísticas
                this.invalidateCache('estatisticas');
                this.loadEstatisticas(true);
            } else {
                // Remove temporary appointment on error
                this.currentPaciente.atendimentos = this.currentPaciente.atendimentos.filter(a => a.id !== tempAtendimento.id);
                this.renderPacienteDetails();
                
                const error = await response.json();
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            // Remove temporary appointment on error
            this.currentPaciente.atendimentos = this.currentPaciente.atendimentos.filter(a => a.id !== tempAtendimento.id);
            this.renderPacienteDetails();
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
        // Encontrar o elemento do atendimento e adicionar loading
        const atendimentoElement = document.querySelector(`[onclick="app.confirmarExclusaoAtendimento('${atendimentoId}')"]`)?.closest('.atendimento-item');
        if (atendimentoElement) {
            atendimentoElement.classList.add('deleting');
        }
        
        try {
            const response = await fetch(`/api/pacientes/${this.currentPaciente.id}/atendimentos/${atendimentoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.showMessage('Atendimento excluído com sucesso!', 'success');
                
                // Remover atendimento localmente sem recarregar do servidor
                if (this.currentPaciente.atendimentos) {
                    const atendimentosAnteriores = this.currentPaciente.atendimentos.length;
                    
                    // Garantir que a comparação seja feita corretamente (string e number)
                    this.currentPaciente.atendimentos = this.currentPaciente.atendimentos.filter(
                        a => a.id != atendimentoId // Usar != para comparar string/number
                    );
                    
                    console.log(`Atendimentos: ${atendimentosAnteriores} → ${this.currentPaciente.atendimentos.length}`);
                    
                    // Verificar se realmente removeu
                    if (this.currentPaciente.atendimentos.length === atendimentosAnteriores) {
                        console.warn('Atendimento não foi removido da lista local. ID:', atendimentoId);
                        console.warn('IDs disponíveis:', this.currentPaciente.atendimentos.map(a => `${a.id} (${typeof a.id})`));
                    }
                }
                
                // Re-renderizar imediatamente a lista de atendimentos
                this.renderAtendimentos();
                
                // Forçar uma segunda renderização após 100ms para garantir
                setTimeout(() => {
                    this.renderAtendimentos();
                }, 100);
                
                // Invalidar e atualizar estatísticas em background
                this.invalidateCache('estatisticas');
                this.loadEstatisticas(true);
            } else {
                const error = await response.json();
                // Remover loading em caso de erro
                if (atendimentoElement) {
                    atendimentoElement.classList.remove('deleting');
                }
                this.showMessage(error.error, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir atendimento:', error);
            // Remover loading em caso de erro
            if (atendimentoElement) {
                atendimentoElement.classList.remove('deleting');
            }
            this.showMessage('Erro ao excluir atendimento', 'error');
        }
    }

    // === AGENDA/CALENDÁRIO ===
    async loadAgenda() {
        // Inicializar agenda
        this.currentDate = new Date();
        this.selectedDate = null;
        this.agendamentos = [];
        
        // Configurar event listeners da agenda
        this.setupAgendaEventListeners();
        
        // Carregar agendamentos do servidor
        await this.loadAgendamentos();
        
        // Renderizar calendário
        this.renderCalendario();
    }
    
    setupAgendaEventListeners() {
        // Evitar duplicação de event listeners
        if (this.agendaListenersSetup) return;
        this.agendaListenersSetup = true;
        
        // Navegação do calendário
        const voltarMesBtn = document.getElementById('voltarMesBtn');
        const proximoMesBtn = document.getElementById('proximoMesBtn');
        
        if (voltarMesBtn) {
            voltarMesBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendario();
            });
        }
        
        if (proximoMesBtn) {
            proximoMesBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendario();
            });
        }
        
        // Form de agendamento
        const agendamentoForm = document.getElementById('agendamentoForm');
        if (agendamentoForm) {
            agendamentoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNovoAgendamento();
            });
        }
    }
    
    async loadAgendamentos() {
        // Mostrar indicador de carregamento
        this.showLoadingIndicator('Carregando agendamentos...');
        
        try {
            const response = await fetch('/api/agendamentos');
            if (response.ok) {
                this.agendamentos = await response.json();
            } else {
                console.error('Erro ao carregar agendamentos');
                this.showMessage('Erro ao carregar agendamentos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            this.showMessage('Erro de conexão ao carregar agendamentos', 'error');
        } finally {
            this.hideLoadingIndicator();
        }
    }
    
    renderCalendario() {
        const mesAtual = document.getElementById('mesAtual');
        const calendarioGrid = document.getElementById('calendarioGrid');
        
        if (!mesAtual || !calendarioGrid) return;
        
        // Atualizar título do mês
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        mesAtual.textContent = `${meses[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        // Limpar grid
        calendarioGrid.innerHTML = '';
        
        // Obter primeiro dia do mês e quantos dias tem
        const primeiroDia = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const ultimoDia = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        
        // Dias do mês anterior (para preencher início da semana)
        const diasAntes = primeiroDia.getDay();
        const mesAnterior = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 0);
        
        for (let i = diasAntes - 1; i >= 0; i--) {
            const dia = mesAnterior.getDate() - i;
            const diaElement = this.createDiaElement(dia, true);
            calendarioGrid.appendChild(diaElement);
        }
        
        // Dias do mês atual
        const hoje = new Date();
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtual = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), dia);
            const isHoje = dataAtual.toDateString() === hoje.toDateString();
            const isSelecionado = this.selectedDate && dataAtual.toDateString() === this.selectedDate.toDateString();
            
            const diaElement = this.createDiaElement(dia, false, isHoje, isSelecionado, dataAtual);
            calendarioGrid.appendChild(diaElement);
        }
        
        // Dias do próximo mês (para completar a grade)
        const diasRestantes = 42 - (diasAntes + diasNoMes); // 6 semanas × 7 dias
        for (let dia = 1; dia <= diasRestantes; dia++) {
            const diaElement = this.createDiaElement(dia, true);
            calendarioGrid.appendChild(diaElement);
        }
    }
    
    createDiaElement(dia, outroMes, isHoje = false, isSelecionado = false, dataCompleta = null) {
        const diaElement = document.createElement('div');
        diaElement.className = 'dia-calendario';
        
        if (outroMes) {
            diaElement.classList.add('outro-mes');
        } else {
            if (isHoje) diaElement.classList.add('hoje');
            if (isSelecionado) diaElement.classList.add('selecionado');
            
            // Adicionar click listener apenas para dias do mês atual
            if (dataCompleta) {
                diaElement.addEventListener('click', () => {
                    this.selecionarDia(dataCompleta);
                });
            }
        }
        
        diaElement.innerHTML = `<div class="numero-dia">${dia}</div>`;
        
        // Adicionar indicadores de agendamentos
        if (!outroMes && dataCompleta) {
            const agendamentosNoDia = this.getAgendamentosNoDia(dataCompleta);
            if (agendamentosNoDia.length > 0) {
                const indicador = document.createElement('div');
                indicador.className = 'indicador-agendamentos';
                indicador.textContent = agendamentosNoDia.length;
                diaElement.appendChild(indicador);
                
                // Preview de todos os horários dos agendamentos
                const preview = document.createElement('div');
                preview.className = 'agendamentos-preview';
                
                // Ordenar por horário e pegar todos os horários
                const horarios = agendamentosNoDia
                    .sort((a, b) => a.horario.localeCompare(b.horario))
                    .map(agendamento => agendamento.horario);
                
                // Mostrar todos os horários, limitando a 4 para não sobrecarregar
                if (horarios.length <= 3) {
                    preview.innerHTML = horarios.join('<br>');
                } else {
                    preview.innerHTML = horarios.slice(0, 3).join('<br>') + '<br>...';
                }
                
                diaElement.appendChild(preview);
            }
        }
        
        return diaElement;
    }
    
    getAgendamentosNoDia(data) {
        const dataString = data.toISOString().split('T')[0];
        return this.agendamentos.filter(agendamento => agendamento.data === dataString);
    }
    
    selecionarDia(data) {
        // Sistema de duplo clique
        const now = Date.now();
        const clickKey = data.toDateString();
        
        // Verificar se é duplo clique (menos de 500ms entre cliques)
        if (this.lastClick && this.lastClick.key === clickKey && (now - this.lastClick.time) < 500) {
            // DUPLO CLIQUE - Mostrar modal de agendamento
            this.showNovoAgendamentoModal(data);
            this.lastClick = null; // Reset para evitar triplo clique
            return;
        }
        
        // CLIQUE SIMPLES - Apenas selecionar o dia
        this.lastClick = { key: clickKey, time: now };
        
        // Atualizar dia selecionado
        this.selectedDate = data;
        
        // Re-renderizar calendário para mostrar seleção
        this.renderCalendario();
        
        // Mostrar agendamentos do dia
        this.renderAgendamentosDoDia(data);
    }
    
    renderAgendamentosDoDia(data) {
        const title = document.getElementById('agendamentosDiaTitle');
        const container = document.getElementById('agendamentosList');
        
        if (!title || !container) return;
        
        const dataFormatada = this.formatDate(data.toISOString().split('T')[0]);
        title.textContent = `📋 Agendamentos de ${dataFormatada}`;
        
        const agendamentosNoDia = this.getAgendamentosNoDia(data);
        
        // Botão para novo agendamento
        const novoAgendamentoBtn = `
            <button class="btn-novo-agendamento" onclick="app.showNovoAgendamentoModal(new Date('${data.toISOString()}'))">
                ➕ Novo Agendamento
            </button>
        `;
        
        if (agendamentosNoDia.length === 0) {
            container.innerHTML = `
                ${novoAgendamentoBtn}
                <p class="empty-message">Nenhum agendamento para este dia</p>
            `;
            return;
        }
        
        // Ordenar por horário
        agendamentosNoDia.sort((a, b) => a.horario.localeCompare(b.horario));
        
        const agendamentosHTML = agendamentosNoDia.map(agendamento => `
            <div class="agendamento-item">
                <div class="agendamento-header">
                    <div class="agendamento-horario">🕒 ${agendamento.horario}</div>
                </div>
                <div class="agendamento-paciente">👤 ${agendamento.pacienteNome}</div>
                <div class="agendamento-tipo">🩺 ${agendamento.tipo}</div>
                ${agendamento.observacoes ? `<div class="agendamento-observacoes">📝 ${agendamento.observacoes}</div>` : ''}
                <div class="agendamento-actions">
                    <button class="btn-agendamento btn-editar-agendamento" onclick="app.editarAgendamento(${agendamento.id})">✏️ Editar</button>
                    <button class="btn-agendamento btn-excluir-agendamento" onclick="app.excluirAgendamento(${agendamento.id})">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = `
            ${novoAgendamentoBtn}
            ${agendamentosHTML}
        `;
    }
    
    async showNovoAgendamentoModal(data) {
        // Carregar lista de pacientes
        await this.loadPacientesParaAgendamento();
        
        // Preencher data
        const dataInput = document.getElementById('agendamentoData');
        if (dataInput) {
            dataInput.value = data.toISOString().split('T')[0];
        }
        
        // Limpar outros campos
        document.getElementById('agendamentoPaciente').value = '';
        document.getElementById('agendamentoHorario').value = '';
        document.getElementById('agendamentoTipo').value = '';
        document.getElementById('agendamentoObservacoes').value = '';
        
        // Mostrar modal
        document.getElementById('novoAgendamentoModal').classList.remove('hidden');
    }
    
    hideNovoAgendamentoModal() {
        document.getElementById('novoAgendamentoModal').classList.add('hidden');
    }
    
    async loadPacientesParaAgendamento() {
        // Garantir que temos a lista de pacientes
        if (!this.pacientes || this.pacientes.length === 0) {
            this.showLoadingIndicator('Carregando pacientes...');
            try {
                await this.loadPacientes();
            } finally {
                this.hideLoadingIndicator();
            }
        }
        
        const select = document.getElementById('agendamentoPaciente');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um paciente...</option>';
        
        this.pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id;
            option.textContent = paciente.nomeCompleto;
            select.appendChild(option);
        });
    }
    
    async handleNovoAgendamento() {
        // Prevenir submissão dupla
        if (this.submittingAgendamento) return;
        this.submittingAgendamento = true;
        
        const form = document.getElementById('agendamentoForm');
        const formData = new FormData(form);
        
        const agendamentoData = {
            data: formData.get('data'),
            pacienteId: parseInt(formData.get('pacienteId')),
            horario: formData.get('horario'),
            tipo: formData.get('tipo'),
            observacoes: formData.get('observacoes')
        };
        
        // Mostrar indicador de carregamento
        this.showLoadingIndicator('Criando agendamento...');
        
        try {
            const response = await fetch('/api/agendamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(agendamentoData)
            });
            
            if (response.ok) {
                const novoAgendamento = await response.json();
                
                // Adicionar à lista local (otimistic UI)
                this.agendamentos.push(novoAgendamento);
                
                this.showMessage('✅ Agendamento criado com sucesso!', 'success');
                this.hideNovoAgendamentoModal();
                
                // Re-renderizar calendário e agendamentos do dia
                this.renderCalendario();
                if (this.selectedDate) {
                    this.renderAgendamentosDoDia(this.selectedDate);
                }
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Erro ao criar agendamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            this.showMessage('Erro de conexão ao criar agendamento', 'error');
        } finally {
            this.hideLoadingIndicator();
            this.submittingAgendamento = false;
        }
    }
    
    async excluirAgendamento(agendamentoId) {
        const agendamento = this.agendamentos.find(a => a.id === agendamentoId);
        if (!agendamento) return;
        
        const confirmar = confirm(
            `Tem certeza que deseja excluir o agendamento?\n\n` +
            `👤 Paciente: ${agendamento.pacienteNome}\n` +
            `📅 Data: ${this.formatDate(agendamento.data)} às ${agendamento.horario}\n` +
            `🩺 Tipo: ${agendamento.tipo}\n\n` +
            `⚠️ Esta ação não pode ser desfeita!`
        );
        
        if (!confirmar) return;
        
        // Mostrar indicador de carregamento
        this.showLoadingIndicator('Excluindo agendamento...');
        
        try {
            const response = await fetch(`/api/agendamentos/${agendamentoId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Remover da lista local (optimistic UI)
                this.agendamentos = this.agendamentos.filter(a => a.id !== agendamentoId);
                
                this.showMessage('✅ Agendamento excluído com sucesso!', 'success');
                
                // Re-renderizar
                this.renderCalendario();
                if (this.selectedDate) {
                    this.renderAgendamentosDoDia(this.selectedDate);
                }
            } else {
                const error = await response.json();
                this.showMessage(error.error || 'Erro ao excluir agendamento', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            this.showMessage('Erro de conexão ao excluir agendamento', 'error');
        } finally {
            this.hideLoadingIndicator();
        }
    }
    
    editarAgendamento(agendamentoId) {
        // TODO: Implementar edição de agendamentos
        this.showMessage('Funcionalidade de edição será implementada em breve', 'info');
        console.log('Editar agendamento ID:', agendamentoId);
    }
    
    // Utilitários
    
    showLoadingIndicator(message = 'Carregando...') {
        // Criar overlay de loading se não existir
        let loadingOverlay = document.getElementById('loadingOverlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `<div class="spinner"></div>`;
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.style.display = 'flex';
    }
    
    hideLoadingIndicator() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
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

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    const app = new ProntuarioApp();
    // Expor globalmente para uso em onclick
    window.app = app;
});

// Fallback caso DOMContentLoaded já tenha disparado
if (document.readyState === 'loading') {
    // DOMContentLoaded ainda não disparou
} else {
    // DOM já está pronto
    const app = new ProntuarioApp();
    window.app = app;
}

/* ===== SISTEMA DE PERSONALIZAÇÃO ===== */
class PersonalizationManager {
    constructor() {
        this.currentTheme = {
            corPrimaria: '#8b5cf6',
            corSecundaria: '#667eea',
            corTerciaria: '#06b6d4',
            corTexto: '#333333',
            nomeSystema: 'Lizard Prontuário',
            logoUrl: 'logo.png',
            tema: 'padrao'
        };
        this.init();
    }

    init() {
        this.loadPersonalization();
        this.setupEventListeners();
        this.updatePreview();
    }

    setupEventListeners() {
        // Theme cards
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectTheme(e.currentTarget));
        });

        // Color inputs
        document.getElementById('corPrimaria')?.addEventListener('input', (e) => {
            this.updateColorPreview('primaria', e.target.value);
            this.updatePreview();
        });
        
        document.getElementById('corSecundaria')?.addEventListener('input', (e) => {
            this.updateColorPreview('secundaria', e.target.value);
            this.updatePreview();
        });

        document.getElementById('corTerciaria')?.addEventListener('input', (e) => {
            this.updateColorPreview('terciaria', e.target.value);
            this.updatePreview();
        });

        document.getElementById('corTexto')?.addEventListener('input', (e) => {
            this.updateColorPreview('texto', e.target.value);
            this.updatePreview();
        });

        // Dark mode toggle
        document.getElementById('modoEscuro')?.addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });

        // Name input
        document.getElementById('nomeSystema')?.addEventListener('input', (e) => {
            this.updatePreview();
        });

        // Logo upload
        document.getElementById('logoUpload')?.addEventListener('change', (e) => {
            this.handleLogoUpload(e);
        });

        // Form submission
        document.getElementById('personalizacaoForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePersonalization();
        });

        // Reset button
        document.getElementById('resetPersonalizacao')?.addEventListener('click', () => {
            this.resetToDefault();
        });
    }

    selectTheme(card) {
        // Remove active class from all cards
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        // Add active class to selected card
        card.classList.add('active');

        const theme = card.dataset.theme;
        const themes = {
            padrao: { primary: '#8b5cf6', secondary: '#667eea', tertiary: '#06b6d4', text: '#333333', dark: false },
            saude: { primary: '#059669', secondary: '#06b6d4', tertiary: '#0891b2', text: '#1f2937', dark: false },
            profissional: { primary: '#1e40af', secondary: '#3730a3', tertiary: '#1e3a8a', text: '#e2e8f0', dark: true },
            moderno: { primary: '#ec4899', secondary: '#f59e0b', tertiary: '#e11d48', text: '#374151', dark: false }
        };

        if (themes[theme]) {
            document.getElementById('corPrimaria').value = themes[theme].primary;
            document.getElementById('corSecundaria').value = themes[theme].secondary;
            document.getElementById('corTerciaria').value = themes[theme].tertiary;
            document.getElementById('corTexto').value = themes[theme].text;
            document.getElementById('modoEscuro').checked = themes[theme].dark;
            this.updateColorPreview('primaria', themes[theme].primary);
            this.updateColorPreview('secundaria', themes[theme].secondary);
            this.updateColorPreview('terciaria', themes[theme].tertiary);
            this.updateColorPreview('texto', themes[theme].text);
            this.toggleDarkMode(themes[theme].dark);
            this.updatePreview();
        }
    }

    updateColorPreview(type, color) {
        const preview = document.getElementById(`cor${type.charAt(0).toUpperCase() + type.slice(1)}Preview`);
        if (preview) {
            preview.style.background = color;
        }
    }

    updatePreview() {
        const nomeSystema = document.getElementById('nomeSystema')?.value || 'Lizard Prontuário';
        const corPrimaria = document.getElementById('corPrimaria')?.value || '#8b5cf6';
        const corSecundaria = document.getElementById('corSecundaria')?.value || '#667eea';
        const corTerciaria = document.getElementById('corTerciaria')?.value || '#06b6d4';
        const corTexto = document.getElementById('corTexto')?.value || '#333333';

        // Update preview card
        const previewHeader = document.getElementById('previewHeader');
        const previewNome = document.getElementById('previewNome');
        const previewNavBtn = document.querySelector('.preview-nav-btn.active');

        if (previewHeader) {
            previewHeader.style.background = `linear-gradient(135deg, ${corPrimaria} 0%, ${corSecundaria} 50%, ${corTerciaria} 100%)`;
        }
        
        if (previewNome) {
            previewNome.textContent = nomeSystema;
            previewNome.style.color = corTexto;
        }

        if (previewNavBtn) {
            previewNavBtn.style.background = corPrimaria;
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (5MB before processing)
        if (file.size > 5 * 1024 * 1024) {
            this.showMessage('Arquivo muito grande. Máximo 5MB.', 'error');
            return;
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            this.showMessage('Tipo de arquivo inválido. Use PNG, JPG ou SVG.', 'error');
            return;
        }

        // Create preview and compress image
        const reader = new FileReader();
        reader.onload = (e) => {
            if (file.type === 'image/svg+xml') {
                // SVG files can be used as-is
                const logoDataUrl = e.target.result;
                this.applyLogoPreview(logoDataUrl);
                this.pendingLogoData = logoDataUrl;
            } else {
                // Compress other image types
                this.compressAndApplyLogo(e.target.result);
            }
        };
        reader.readAsDataURL(file);
    }

    compressAndApplyLogo(originalDataUrl) {
        const img = new Image();
        img.onload = () => {
            // Create canvas for resizing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calculate new dimensions (max 200x200 pixels)
            const maxSize = 200;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }

            // Set canvas size and draw resized image
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to data URL with compression
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
            
            this.applyLogoPreview(compressedDataUrl);
            this.pendingLogoData = compressedDataUrl;
            
            console.log('Logo comprimido e otimizado para upload');
        };
        img.src = originalDataUrl;
    }

    applyLogoPreview(logoDataUrl) {
        // Update preview
        const previewLogo = document.getElementById('previewLogo');
        if (previewLogo) {
            previewLogo.src = logoDataUrl;
        }
        
        console.log('Logo carregado para preview, será salvo ao clicar em "Salvar"');
    }

    async loadPersonalization() {
        try {
            const response = await fetch('/api/personalizacao');
            if (response.ok) {
                const data = await response.json();
                this.applyPersonalization(data);
            }
        } catch (error) {
            console.error('Erro ao carregar personalização:', error);
        }
    }

    async loadUserPersonalization(userId) {
        if (!userId) return;
        
        try {
            const response = await fetch(`/api/personalizacao?userId=${encodeURIComponent(userId)}`);
            if (response.ok) {
                const data = await response.json();
                this.applyPersonalization(data);
                console.log('Personalização individual carregada para usuário:', userId);
            } else if (response.status === 404) {
                // Usuário não tem personalização salva, usar padrão
                this.resetToDefault();
            }
        } catch (error) {
            console.error('Erro ao carregar personalização do usuário:', error);
            // Em caso de erro, usar personalização padrão
            this.resetToDefault();
        }
    }

    applyPersonalization(config) {
        // Update form fields
        if (document.getElementById('nomeSystema')) {
            document.getElementById('nomeSystema').value = config.nomeSystem || config.nomeSistema || 'Lizard Prontuário';
        }
        if (document.getElementById('corPrimaria')) {
            document.getElementById('corPrimaria').value = config.corPrimaria || '#8b5cf6';
        }
        if (document.getElementById('corSecundaria')) {
            document.getElementById('corSecundaria').value = config.corSecundaria || '#667eea';
        }
        if (document.getElementById('corTerciaria')) {
            document.getElementById('corTerciaria').value = config.corTerciaria || '#06b6d4';
        }
        if (document.getElementById('corTexto')) {
            document.getElementById('corTexto').value = config.corTexto || '#333333';
        }
        if (document.getElementById('modoEscuro')) {
            document.getElementById('modoEscuro').checked = config.modoEscuro || false;
        }

        // Update color previews
        this.updateColorPreview('primaria', config.corPrimaria || '#8b5cf6');
        this.updateColorPreview('secundaria', config.corSecundaria || '#667eea');
        this.updateColorPreview('terciaria', config.corTerciaria || '#06b6d4');
        this.updateColorPreview('texto', config.corTexto || '#333333');

        // Update logo preview if exists
        if (config.logoUrl && config.logoUrl !== 'logo.png') {
            const previewLogo = document.getElementById('previewLogo');
            if (previewLogo) {
                previewLogo.src = config.logoUrl;
            }
        }

        // Apply to actual interface
        this.applyToInterface(config);
        this.updatePreview();
    }

    applyToInterface(config) {
        // Get colors
        const primary = config.corPrimaria || '#8b5cf6';
        const secondary = config.corSecundaria || '#667eea';
        const tertiary = config.corTerciaria || '#06b6d4';
        const textColor = config.corTexto || '#333333';
        
        // Helper function to generate color variations
        const generateColorVariations = (color) => {
            // Convert hex to RGB
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Generate variations
            const light = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
            const dark = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
            const accent = `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`;
            
            return { light, dark, accent };
        };
        
        const primaryVariations = generateColorVariations(primary);
        const secondaryVariations = generateColorVariations(secondary);
        const tertiaryVariations = generateColorVariations(tertiary);
        
        // Update CSS variables (only for this user's session)
        const root = document.documentElement;
        
        // Primary colors
        root.style.setProperty('--primary-purple', primary);
        root.style.setProperty('--light-purple', primaryVariations.light);
        root.style.setProperty('--dark-purple', primaryVariations.dark);
        root.style.setProperty('--accent-purple', primaryVariations.accent);
        
        // Secondary colors
        root.style.setProperty('--secondary-purple', secondary);
        
        // Tertiary colors
        root.style.setProperty('--tertiary-purple', tertiary);
        root.style.setProperty('--light-tertiary', tertiaryVariations.light);
        root.style.setProperty('--dark-tertiary', tertiaryVariations.dark);
        root.style.setProperty('--accent-tertiary', tertiaryVariations.accent);
        
        // Text colors (NEW!)
        root.style.setProperty('--text-color', textColor);
        root.style.setProperty('--text-light', this.lightenColor(textColor, 0.3));
        root.style.setProperty('--text-dark', this.darkenColor(textColor, 0.3));
        
        // Gradients with three colors
        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
        root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`);
        root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${primaryVariations.accent} 0%, ${secondary} 100%)`);
        root.style.setProperty('--gradient-tertiary', `linear-gradient(135deg, ${tertiary} 0%, ${primary} 100%)`);
        root.style.setProperty('--gradient-triple', `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${tertiary} 100%)`);
        
        const nomeSystem = config.nomeSystem || config.nomeSistema || 'Lizard Prontuário';
        
        // Update page title (individual for each user)
        document.title = nomeSystem;
        
        // Update system names in headers (only for this session)
        const systemHeaders = document.querySelectorAll('h1');
        systemHeaders.forEach(header => {
            if (header.textContent.includes('Lizard Prontuário') || 
                header.innerHTML.includes('Lizard Prontuário') ||
                header.hasAttribute('data-system-name')) {
                
                const logoHtml = header.querySelector('.logo-icon') ? 
                    header.querySelector('.logo-icon').outerHTML + ' ' : '';
                header.innerHTML = logoHtml + nomeSystem;
                header.setAttribute('data-system-name', 'true');
            }
        });
        
        // Update system names in other places
        const systemNameElements = document.querySelectorAll('[data-system-name-text]');
        systemNameElements.forEach(element => {
            element.textContent = nomeSystem;
        });
        
        // Update logo (only for this session)
        if (config.logoUrl && config.logoUrl !== 'logo.png') {
            const logos = document.querySelectorAll('.logo-icon');
            logos.forEach(logo => {
                logo.src = config.logoUrl;
            });
            console.log('Logo personalizado aplicado:', config.logoUrl.substring(0, 50) + '...');
        } else {
            // Reset to default logo
            const logos = document.querySelectorAll('.logo-icon');
            logos.forEach(logo => {
                logo.src = 'logo.png';
            });
        }

        // Apply dark mode
        if (config.modoEscuro) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Store personalization in sessionStorage (individual per user session)
        sessionStorage.setItem('currentUserPersonalization', JSON.stringify({
            userId: window.app?.currentUser?.id,
            config: config,
            appliedAt: new Date().getTime()
        }));
        
        console.log('Personalização completa aplicada individualmente para o usuário:', nomeSystem);
    }

    // Helper functions for color manipulation
    lightenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * amount));
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * amount));
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            // Ajustar cores de texto para modo escuro
            const textColorInput = document.getElementById('corTexto');
            if (textColorInput && textColorInput.value === '#333333') {
                textColorInput.value = '#e2e8f0';
                this.updateColorPreview('texto', '#e2e8f0');
            }
        } else {
            document.body.classList.remove('dark-mode');
            // Restaurar cores de texto para modo claro
            const textColorInput = document.getElementById('corTexto');
            if (textColorInput && textColorInput.value === '#e2e8f0') {
                textColorInput.value = '#333333';
                this.updateColorPreview('texto', '#333333');
            }
        }
        this.updatePreview();
        console.log('Modo escuro:', enabled ? 'ativado' : 'desativado');
    }

    async savePersonalization() {
        try {
            const config = {
                corPrimaria: document.getElementById('corPrimaria')?.value || '#8b5cf6',
                corSecundaria: document.getElementById('corSecundaria')?.value || '#667eea',
                corTerciaria: document.getElementById('corTerciaria')?.value || '#06b6d4',
                corTexto: document.getElementById('corTexto')?.value || '#333333',
                modoEscuro: document.getElementById('modoEscuro')?.checked || false,
                nomeSystem: document.getElementById('nomeSystema')?.value || 'Lizard Prontuário',
                tema: document.querySelector('.theme-card.active')?.dataset.theme || 'padrao'
            };

            // Include logo data if uploaded
            if (this.pendingLogoData) {
                config.logoUrl = this.pendingLogoData;
                console.log('Incluindo logo personalizado na salvagem');
            } else {
                config.logoUrl = 'logo.png'; // Default logo
            }

            const response = await fetch('/api/personalizacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                this.applyToInterface(config);
                this.showMessage('Personalização salva com sucesso!', 'success');
                
                // Clear pending logo data after successful save
                this.pendingLogoData = null;
            } else {
                throw new Error('Erro ao salvar');
            }
        } catch (error) {
            console.error('Erro ao salvar personalização:', error);
            this.showMessage('Erro ao salvar personalização.', 'error');
        }
    }

    resetToDefault() {
        const defaultConfig = {
            corPrimaria: '#8b5cf6',
            corSecundaria: '#667eea',
            corTerciaria: '#06b6d4',
            corTexto: '#333333',
            modoEscuro: false,
            nomeSistema: 'Lizard Prontuário',
            logoUrl: 'logo.png',
            tema: 'padrao'
        };

        this.applyPersonalization(defaultConfig);
        
        // Reset theme selection
        document.querySelectorAll('.theme-card').forEach(card => {
            card.classList.toggle('active', card.dataset.theme === 'padrao');
        });
    }

    clearUserPersonalization() {
        // Limpar personalização do sessionStorage
        sessionStorage.removeItem('currentUserPersonalization');
        
        // Voltar aos valores padrão do sistema
        const root = document.documentElement;
        root.style.removeProperty('--primary-purple');
        root.style.removeProperty('--secondary-purple');
        root.style.removeProperty('--tertiary-purple');
        root.style.removeProperty('--light-purple');
        root.style.removeProperty('--dark-purple');
        root.style.removeProperty('--accent-purple');
        root.style.removeProperty('--light-tertiary');
        root.style.removeProperty('--dark-tertiary');
        root.style.removeProperty('--accent-tertiary');
        root.style.removeProperty('--text-color');
        root.style.removeProperty('--text-light');
        root.style.removeProperty('--text-dark');
        root.style.removeProperty('--gradient-primary');
        root.style.removeProperty('--gradient-secondary');
        root.style.removeProperty('--gradient-accent');
        root.style.removeProperty('--gradient-tertiary');
        root.style.removeProperty('--gradient-triple');
        
        // Restaurar modo claro (remover modo escuro)
        document.body.classList.remove('dark-mode');
        
        // Restaurar título padrão
        document.title = 'Lizard Prontuário';
        
        // Restaurar nomes do sistema nos cabeçalhos
        const systemHeaders = document.querySelectorAll('[data-system-name="true"]');
        systemHeaders.forEach(header => {
            const logoHtml = header.querySelector('.logo-icon') ? 
                header.querySelector('.logo-icon').outerHTML + ' ' : '';
            header.innerHTML = logoHtml + 'Lizard Prontuário';
        });
        
        // Restaurar logos padrão
        const logos = document.querySelectorAll('.logo-icon');
        logos.forEach(logo => {
            logo.src = 'logo.png';
        });
        
        console.log('Personalização individual limpa no logout');
    }

    showMessage(message, type) {
        // Use the existing message system
        if (window.app && window.app.showMessage) {
            window.app.showMessage(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize personalization when needed
// Removed automatic DOMContentLoaded initialization since it's handled by switchTab