# 🎨 ADICIONANDO SEU LOGO PERSONALIZADO

## 📁 **ONDE COLOCAR A IMAGEM:**

1. **Salve sua imagem** na pasta: `public/`
2. **Nome do arquivo**: `logo.png` (ou qualquer formato: .jpg, .gif, .svg)
3. **Caminho completo**: `C:\Users\Lucas\OneDrive\Desktop\pron\sistema-prontuario-medico\public\logo.png`

## ⚙️ **SE QUISER USAR OUTRO NOME:**

Se sua imagem tem outro nome (ex: `meu-logo.jpg`), edite no arquivo `public/index.html`:

```html
<!-- Linha 14: -->
<h1><img src="meu-logo.jpg" alt="Logo" class="logo-icon"> Lizard Prontuário</h1>

<!-- Linha 51: -->
<h1><img src="meu-logo.jpg" alt="Logo" class="logo-icon"> Lizard Prontuário</h1>
```

## 🎯 **ESPECIFICAÇÕES RECOMENDADAS:**

- **Tamanho**: 32x32 pixels (ou maior, será redimensionado)
- **Formato**: PNG com fundo transparente (melhor qualidade)
- **Proporção**: 1:1 (quadrado)
- **Fundo**: Preto como você pediu
- **Design**: Camaleão roxo

## ✨ **EFEITOS JÁ APLICADOS:**

- ✅ **Borda circular** automática
- ✅ **Sombra elegante**
- ✅ **Efeito hover** (cresce 10% e muda sombra)
- ✅ **Tamanho fixo** 32x32 pixels
- ✅ **Alinhamento** perfeito com o texto

## 🚀 **DEPOIS DE ADICIONAR:**

1. Salve sua imagem como `logo.png` na pasta `public/`
2. Execute `node server.js`
3. Acesse `http://localhost:3000`
4. Seu logo aparecerá no lugar do emoji 🦎

## 📋 **FORMATOS SUPORTADOS:**
- `.png` ✅ (recomendado)
- `.jpg` ✅ 
- `.jpeg` ✅
- `.gif` ✅
- `.svg` ✅
