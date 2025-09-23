/**
 * ==============================================================================
 * FUNÇÕES UTILITÁRIAS COMPARTILHADAS FLUIG-DOCUSIGN
 * ==============================================================================
 * Este arquivo contém funções utilitárias que são compartilhadas entre os
 * diferentes serviços da integração Fluig-DocuSign.
 */

var Utils = {
    
    // ******************************************************************************
    // UTILITÁRIOS DE LOGGING
    // ******************************************************************************
    
    /**
     * Logger personalizado com diferentes níveis
     */
    Logger: {
        /**
         * Registra log de debug
         * @param {string} message - Mensagem a ser logada
         * @param {object} data - Dados adicionais opcionais
         */
        debug: function(message, data) {
            this._log('DEBUG', message, data);
        },
        
        /**
         * Registra log de informação
         * @param {string} message - Mensagem a ser logada
         * @param {object} data - Dados adicionais opcionais
         */
        info: function(message, data) {
            this._log('INFO', message, data);
        },
        
        /**
         * Registra log de aviso
         * @param {string} message - Mensagem a ser logada
         * @param {object} data - Dados adicionais opcionais
         */
        warn: function(message, data) {
            this._log('WARN', message, data);
        },
        
        /**
         * Registra log de erro
         * @param {string} message - Mensagem a ser logada
         * @param {object} data - Dados adicionais opcionais
         */
        error: function(message, data) {
            this._log('ERROR', message, data);
        },
        
        /**
         * Função interna para logging
         * @param {string} level - Nível do log
         * @param {string} message - Mensagem
         * @param {object} data - Dados adicionais
         */
        _log: function(level, message, data) {
            var config = getNestedConfig(Config, 'logging') || {};
            var configLevel = config.level || 'INFO';
            var prefix = config.prefix || '[DOCUSIGN-INTEGRATION]';
            
            // Verifica se deve logar baseado no nível configurado
            var levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
            if (levels[level] < levels[configLevel]) {
                return;
            }
            
            var timestamp = config.includeTimestamp ? new Date().toISOString() + ' ' : '';
            var fullMessage = timestamp + prefix + ' [' + level + '] ' + message;
            
            if (data) {
                fullMessage += ' | Data: ' + JSON.stringify(data);
            }
            
            // Usar o logger apropriado do Fluig
            if (typeof log !== 'undefined') {
                switch (level) {
                    case 'ERROR':
                        log.error(fullMessage);
                        break;
                    case 'WARN':
                        log.warn(fullMessage);
                        break;
                    default:
                        log.info(fullMessage);
                }
            } else {
                // Fallback para console se log não estiver disponível
                console.log(fullMessage);
            }
        }
    },
    
    // ******************************************************************************
    // UTILITÁRIOS DE VALIDAÇÃO
    // ******************************************************************************
    
    /**
     * Valida se um email é válido
     * @param {string} email - Email a ser validado
     * @returns {boolean} True se válido
     */
    isValidEmail: function(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * Valida se uma string não está vazia
     * @param {string} str - String a ser validada
     * @returns {boolean} True se não vazia
     */
    isNotEmpty: function(str) {
        return str && typeof str === 'string' && str.trim().length > 0;
    },
    
    /**
     * Valida campos obrigatórios de um signatário
     * @param {object} signatario - Objeto com dados do signatário
     * @returns {object} { valido: boolean, erros: string[] }
     */
    validateSignatory: function(signatario) {
        var erros = [];
        
        if (!signatario) {
            erros.push('Signatário não pode ser nulo');
            return { valido: false, erros: erros };
        }
        
        if (!this.isNotEmpty(signatario.nome)) {
            erros.push('Nome do signatário é obrigatório');
        }
        
        if (!this.isValidEmail(signatario.email)) {
            erros.push('Email do signatário é obrigatório e deve ser válido');
        }
        
        return {
            valido: erros.length === 0,
            erros: erros
        };
    },
    
    /**
     * Valida documento Base64
     * @param {string} documentoBase64 - Documento em Base64
     * @returns {object} { valido: boolean, erros: string[] }
     */
    validateDocument: function(documentoBase64) {
        var erros = [];
        
        if (!this.isNotEmpty(documentoBase64)) {
            erros.push('Documento Base64 é obrigatório');
        } else {
            // Validação básica de Base64
            try {
                atob(documentoBase64);
            } catch (e) {
                erros.push('Documento deve estar em formato Base64 válido');
            }
        }
        
        return {
            valido: erros.length === 0,
            erros: erros
        };
    },
    
    // ******************************************************************************
    // UTILITÁRIOS DE RETRY
    // ******************************************************************************
    
    /**
     * Executa uma função com retry automático
     * @param {function} func - Função a ser executada
     * @param {number} maxRetries - Número máximo de tentativas
     * @param {number} initialDelay - Delay inicial em milissegundos
     * @param {number} backoffMultiplier - Multiplicador para backoff
     * @returns {*} Resultado da função ou throw do último erro
     */
    retryOperation: function(func, maxRetries, initialDelay, backoffMultiplier) {
        maxRetries = maxRetries || 3;
        initialDelay = initialDelay || 1000;
        backoffMultiplier = backoffMultiplier || 2;
        
        var currentDelay = initialDelay;
        
        for (var attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.Logger.debug('Tentativa ' + attempt + ' de ' + maxRetries);
                return func();
            } catch (error) {
                this.Logger.warn('Falha na tentativa ' + attempt + ': ' + error.message);
                
                if (attempt === maxRetries) {
                    this.Logger.error('Todas as tentativas falharam');
                    throw error;
                }
                
                // Sleep/delay antes da próxima tentativa
                this._sleep(currentDelay);
                currentDelay *= backoffMultiplier;
            }
        }
    },
    
    /**
     * Função de sleep simples
     * @param {number} milliseconds - Tempo em milissegundos
     */
    _sleep: function(milliseconds) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + milliseconds) {
            // Busy wait - em ambiente real, usar setTimeout se disponível
        }
    },
    
    // ******************************************************************************
    // UTILITÁRIOS DE CACHE
    // ******************************************************************************
    
    /**
     * Obtém item do cache do Fluig
     * @param {string} key - Chave do cache
     * @returns {*} Valor em cache ou null
     */
    getCacheItem: function(key) {
        try {
            // Em produção, usar o cache do Fluig se disponível
            // return hAPI.getCardValue(key);
            
            // Simulação de cache em memória para desenvolvimento
            if (typeof this._cache === 'undefined') {
                this._cache = {};
            }
            return this._cache[key] || null;
        } catch (e) {
            this.Logger.warn('Erro ao obter item do cache: ' + e.message);
            return null;
        }
    },
    
    /**
     * Define item no cache do Fluig
     * @param {string} key - Chave do cache
     * @param {*} value - Valor a ser armazenado
     * @param {number} ttl - Time to live em milissegundos (opcional)
     */
    setCacheItem: function(key, value, ttl) {
        try {
            // Em produção, usar o cache do Fluig se disponível
            // hAPI.setCardValue(key, value);
            
            // Simulação de cache em memória para desenvolvimento
            if (typeof this._cache === 'undefined') {
                this._cache = {};
            }
            
            this._cache[key] = value;
            
            if (ttl) {
                var timestampKey = key + '_timestamp';
                this._cache[timestampKey] = new Date().getTime();
                
                // Auto-limpeza após TTL (simplificado)
                var self = this;
                setTimeout(function() {
                    self.removeCacheItem(key);
                    self.removeCacheItem(timestampKey);
                }, ttl);
            }
        } catch (e) {
            this.Logger.warn('Erro ao definir item no cache: ' + e.message);
        }
    },
    
    /**
     * Remove item do cache
     * @param {string} key - Chave do cache
     */
    removeCacheItem: function(key) {
        try {
            if (typeof this._cache !== 'undefined') {
                delete this._cache[key];
            }
        } catch (e) {
            this.Logger.warn('Erro ao remover item do cache: ' + e.message);
        }
    },
    
    /**
     * Verifica se item do cache ainda é válido
     * @param {string} key - Chave do cache
     * @param {number} ttl - Time to live em milissegundos
     * @returns {boolean} True se ainda válido
     */
    isCacheValid: function(key, ttl) {
        try {
            var timestampKey = key + '_timestamp';
            var timestamp = this.getCacheItem(timestampKey);
            
            if (!timestamp) {
                return false;
            }
            
            var now = new Date().getTime();
            return (now - timestamp) < ttl;
        } catch (e) {
            this.Logger.warn('Erro ao verificar validade do cache: ' + e.message);
            return false;
        }
    },
    
    // ******************************************************************************
    // UTILITÁRIOS DE FORMATAÇÃO
    // ******************************************************************************
    
    /**
     * Formata mensagem de erro padronizada
     * @param {string} operacao - Nome da operação
     * @param {string} erro - Mensagem de erro
     * @param {object} detalhes - Detalhes adicionais opcionais
     * @returns {string} Mensagem formatada
     */
    formatErrorMessage: function(operacao, erro, detalhes) {
        var message = 'Falha na operação: ' + operacao + '. Erro: ' + erro;
        
        if (detalhes) {
            message += '. Detalhes: ' + JSON.stringify(detalhes);
        }
        
        return message;
    },
    
    /**
     * Formata mensagem de sucesso padronizada
     * @param {string} operacao - Nome da operação
     * @param {object} resultado - Resultado da operação
     * @returns {string} Mensagem formatada
     */
    formatSuccessMessage: function(operacao, resultado) {
        var message = 'Sucesso na operação: ' + operacao;
        
        if (resultado) {
            message += '. Resultado: ' + JSON.stringify(resultado);
        }
        
        return message;
    },
    
    // ******************************************************************************
    // UTILITÁRIOS DE HTTP
    // ******************************************************************************
    
    /**
     * Executa requisição HTTP com timeout e retry
     * @param {string} url - URL da requisição
     * @param {string} method - Método HTTP
     * @param {string} payload - Corpo da requisição
     * @param {object} headers - Cabeçalhos HTTP
     * @param {number} timeout - Timeout em milissegundos
     * @returns {object} Resposta da requisição
     */
    doHttpRequestWithRetry: function(url, method, payload, headers, timeout) {
        var self = this;
        var config = getNestedConfig(Config, 'retry') || {};
        
        return this.retryOperation(function() {
            return self._doHttpRequest(url, method, payload, headers, timeout);
        }, config.maxStatusRetries, config.initialDelay, config.backoffMultiplier);
    },
    
    /**
     * Executa requisição HTTP simples
     * @param {string} url - URL da requisição
     * @param {string} method - Método HTTP
     * @param {string} payload - Corpo da requisição
     * @param {object} headers - Cabeçalhos HTTP
     * @param {number} timeout - Timeout em milissegundos
     * @returns {object} Resposta da requisição
     */
    _doHttpRequest: function(url, method, payload, headers, timeout) {
        this.Logger.debug('Executando requisição HTTP', {
            url: url,
            method: method,
            hasPayload: !!payload,
            headers: Object.keys(headers || {})
        });
        
        try {
            // Em produção, usar hAPI.doHttpRequest com timeout se suportado
            var response = hAPI.doHttpRequest(url, method, payload, headers);
            
            if (response && response.getResult) {
                var result = response.getResult();
                this.Logger.debug('Resposta HTTP recebida', { 
                    statusCode: response.getStatusCode ? response.getStatusCode() : 'unknown',
                    hasContent: !!result 
                });
                return response;
            } else {
                throw new Error('Resposta HTTP inválida');
            }
        } catch (e) {
            this.Logger.error('Erro na requisição HTTP: ' + e.message);
            throw e;
        }
    }
};

// Exportar Utils para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}