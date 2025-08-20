# 🚀 DEPLOY NA RENDER - GUIA COMPLETO

## 📝 PASSO A PASSO

### 1️⃣ **Preparar o Token GitHub**
- Acesse: https://github.com/settings/tokens
- Clique em "Generate new token" → "Generate new token (classic)"
- Nome: `Render Deploy Token`
- Prazo: **No expiration**
- Permissões necessárias:
  - ✅ `repo` (Full control of private repositories)
  - ✅ `contents:write` (Write access to repository contents)
- Clique em **Generate token**
- **COPIE O TOKEN** (só aparece uma vez!)

### 2️⃣ **Deploy na Render**
1. Acesse: https://render.com
2. Conecte sua conta GitHub
3. Clique em **"New +"** → **"Web Service"**
4. Selecione seu repositório `sistema-prontuario-medico`
5. Configure:
   - **Name**: `prontuario-medico-lorsgordors`
   - **Region**: `Frankfurt (EU Central)`
   - **Branch**: `main`
   - **Root Directory**: (deixe vazio)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

### 3️⃣ **Configurar Variáveis de Ambiente**
Na página do seu serviço na Render, vá em **"Environment"**:

```
GITHUB_TOKEN = cole_seu_token_aqui
GITHUB_REPO = lorsgordors/dados.prontuario
NODE_ENV = production
```

### 4️⃣ **Primeiro Deploy**
- Clique em **"Create Web Service"**
- Aguarde o build (5-10 minutos)
- Sua URL será: `https://prontuario-medico-lorsgordors.onrender.com`

## 🔧 CONFIGURAÇÕES IMPORTANTES

### **Inicialização Automática**
Se for o primeiro deploy, execute no seu PC:
```bash
node init-github.js
```

### **Credenciais Padrão:**
- **Usuário**: `admin`
- **Senha**: `admin123`

### **Logs de Deployment**
- Na Render, vá em **"Logs"** para ver se tudo deu certo
- Procure por: `✅ GitHub inicializado`

## ⚠️ TROUBLESHOOTING

### **Erro de Token:**
- Verifique se o token tem as permissões `repo` e `contents:write`
- Confirme se a variável `GITHUB_TOKEN` está configurada

### **Repositório não encontrado:**
- Confirme se `GITHUB_REPO` está como `lorsgordors/dados.prontuario`
- Verifique se o repositório existe e está privado

### **Cold Start (Sleep):**
- Render Free dorme após 15 min sem uso
- Primeira requisição pode demorar 1-2 minutos
- Use um ping service para manter ativo

## 🎯 VANTAGENS DO GITHUB COMO DB

✅ **Dados persistem** mesmo com restart do Render
✅ **Backup automático** (histórico no GitHub)
✅ **Auditoria completa** (commits mostram mudanças)
✅ **Sem limite de storage** (GitHub grátis = 1GB)
✅ **Funciona offline** para desenvolvimento local

## 📱 ACESSO FINAL

Depois do deploy:
- **URL**: `https://prontuario-medico-lorsgordors.onrender.com`
- **Login**: `admin` / `admin123`
- **Mobile**: Funciona perfeitamente em qualquer dispositivo
