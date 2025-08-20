// Módulo de criptografia para dados sensíveis
const CryptoJS = require('crypto-js');

// Chave de criptografia (em produção, deve vir de variável de ambiente)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'prontuario-medico-key-2025-lorsgordors-secure';

/**
 * Criptografa um texto usando AES-256
 */
function encrypt(text) {
    if (!text || text === '') return '';
    try {
        const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Erro ao criptografar:', error);
        return text; // Retorna original se falhar
    }
}

/**
 * Descriptografa um texto usando AES-256
 */
function decrypt(encryptedText) {
    if (!encryptedText || encryptedText === '') return '';
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Erro ao descriptografar:', error);
        return encryptedText; // Retorna original se falhar
    }
}

/**
 * Criptografa dados sensíveis de um paciente
 */
function encryptPatientData(paciente) {
    if (!paciente) return paciente;
    
    const encrypted = { ...paciente };
    
    // Campos que devem ser criptografados
    const sensitiveFields = [
        'cpf',
        'telefone', 
        'email',
        'endereco',
        'observacoes'
    ];
    
    sensitiveFields.forEach(field => {
        if (encrypted[field]) {
            encrypted[field] = encrypt(encrypted[field]);
        }
    });
    
    // Criptografar histórico médico
    if (encrypted.historicoMedico && Array.isArray(encrypted.historicoMedico)) {
        encrypted.historicoMedico = encrypted.historicoMedico.map(entry => ({
            ...entry,
            descricao: entry.descricao ? encrypt(entry.descricao) : '',
            observacoes: entry.observacoes ? encrypt(entry.observacoes) : ''
        }));
    }
    
    return encrypted;
}

/**
 * Descriptografa dados sensíveis de um paciente
 */
function decryptPatientData(paciente) {
    if (!paciente) return paciente;
    
    const decrypted = { ...paciente };
    
    // Campos que devem ser descriptografados
    const sensitiveFields = [
        'cpf',
        'telefone',
        'email', 
        'endereco',
        'observacoes'
    ];
    
    sensitiveFields.forEach(field => {
        if (decrypted[field]) {
            decrypted[field] = decrypt(decrypted[field]);
        }
    });
    
    // Descriptografar histórico médico
    if (decrypted.historicoMedico && Array.isArray(decrypted.historicoMedico)) {
        decrypted.historicoMedico = decrypted.historicoMedico.map(entry => ({
            ...entry,
            descricao: entry.descricao ? decrypt(entry.descricao) : '',
            observacoes: entry.observacoes ? decrypt(entry.observacoes) : ''
        }));
    }
    
    return decrypted;
}

/**
 * Criptografa dados sensíveis de usuários
 */
function encryptUserData(usuario) {
    if (!usuario) return usuario;
    
    const encrypted = { ...usuario };
    
    // Campos sensíveis do usuário
    if (encrypted.numeroRegistro) {
        encrypted.numeroRegistro = encrypt(encrypted.numeroRegistro);
    }
    
    return encrypted;
}

/**
 * Descriptografa dados sensíveis de usuários
 */
function decryptUserData(usuario) {
    if (!usuario) return usuario;
    
    const decrypted = { ...usuario };
    
    // Campos sensíveis do usuário
    if (decrypted.numeroRegistro) {
        decrypted.numeroRegistro = decrypt(decrypted.numeroRegistro);
    }
    
    return decrypted;
}

module.exports = {
    encrypt,
    decrypt,
    encryptPatientData,
    decryptPatientData,
    encryptUserData,
    decryptUserData
};
