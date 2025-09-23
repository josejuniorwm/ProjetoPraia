/**
 * ==============================================================================
 * DOCUSIGN UTILITY SERVICE (docusignUtils.js) - VERSÃO OTIMIZADA
 * ==============================================================================
 * Este módulo contém a lógica de segurança (JWT Grant) e as chamadas REST para 
 * a eSignature API do DocuSign. Versão otimizada com melhor tratamento de erros,
 * retry automático, logging e integração com configurações centralizadas.
 * 
 * Funcionalidades:
 * - Integração com arquivo de configuração centralizado
 * - Tratamento robusto de erros com retry automático
 * - Logging detalhado para debug
 * - Validações de segurança aprimoradas
 * - Cache de token otimizado
 * ==============================================================================
 */

// Importar dependências
// Em produção, garantir que config.js e utils.js estejam disponíveis

// ******************************************************************************
// 1. CONFIGURAÇÕES CENTRALIZADAS
// ******************************************************************************
// As configurações agora são obtidas do arquivo config.js centralizado

// ******************************************************************************
// 2. FUNÇÕES ESSENCIAIS DE UTILIDADE (Mapeamento para APIs do Fluig/Rhino)
// ******************************************************************************

/**
 * Funções utilitárias SSJS/Rhino para manipulação de strings/arquivos.
 * Versão otimizada com melhor tratamento de erros e logging.
 */

/**
 * Lê o conteúdo do arquivo da chave privada do caminho seguro
 * @param {string} path - Caminho para a chave privada
 * @returns {string} Conteúdo da chave privada
 */
function readPrivateKeyContent(path) {
    var Logger = Utils.Logger;
    Logger.debug('Lendo chave privada', { path: path });
    
    try {
        // Validação de segurança do caminho
        if (!path || typeof path !== 'string') {
            throw new Error('Caminho da chave privada inválido');
        }
        
        // TODO: Implementar leitura segura no ambiente Fluig
        // Exemplo: Use o FileSystemUtil do Java/Fluig, se exposto ao Rhino.
        // var content = FileSystem.readFile(path);
        
        // Por enquanto, simular para desenvolvimento
        throw new Error('readPrivateKeyContent deve ser implementada para o ambiente Fluig específico');
        
    } catch (e) {
        Logger.error('Erro ao ler chave privada: ' + e.message);
        throw e;
    }
}

/**
 * Função de Criptografia RSA/SHA256 e Base64Url Safe para JWT
 * @param {string} headerPayloadString - String header.payload do JWT
 * @param {string} privateKey - Chave privada PEM
 * @returns {string} Assinatura Base64Url
 */
function jwtSign(headerPayloadString, privateKey) {
    var Logger = Utils.Logger;
    Logger.debug('Assinando JWT com RS256');
    
    try {
        // Validações de entrada
        if (!headerPayloadString || !privateKey) {
            throw new Error('Header/payload e chave privada são obrigatórios');
        }
        
        // ESTE É O PONTO CRÍTICO. 
        // O DocuSign exige RS256. Esta função deve:
        // 1. Fazer o hash SHA256 da string `header.payload`.
        // 2. Assinar o hash com a Chave Privada (RSA).
        // 3. Codificar o resultado usando Base64Url Safe.
        
        // TODO: Implementar criptografia real no ambiente Fluig
        // Assumindo que existe um utilitário de criptografia JS/Java exposto ao Rhino.
        // var signature = CryptoUtil.signRS256(headerPayloadString, privateKey);
        
        // Por enquanto, simular para desenvolvimento
        throw new Error('jwtSign deve ser implementada para o ambiente Fluig específico');
        
    } catch (e) {
        Logger.error('Erro ao assinar JWT: ' + e.message);
        throw e;
    }
}


// ******************************************************************************
// 3. GERAÇÃO DO ACCESS TOKEN (JWT GRANT) - VERSÃO OTIMIZADA
// ******************************************************************************

/**
 * Gera Access Token DocuSign usando JWT Grant
 * Versão otimizada com validações, retry e logging aprimorado
 * @returns {string} Access Token válido
 */
function getDocuSignAccessToken() {
    var Logger = Utils.Logger;
    Logger.info('Iniciando obtenção de Access Token DocuSign');
    
    try {
        // Obter configurações centralizadas
        var docusignConfig = Config.docusign;
        var jwtConfig = Config.jwt;
        var timeoutConfig = Config.timeouts;
        
        // Validar configurações obrigatórias
        var configValidation = validateConfig();
        if (!configValidation.valido) {
            throw new Error('Configurações inválidas: ' + configValidation.erros.join(', '));
        }
        
        Logger.debug('Configurações validadas com sucesso');
        
        // Ler chave privada
        var privateKeyContent = readPrivateKeyContent(docusignConfig.privateKeyPath);
        
        if (!privateKeyContent) {
            throw new Error("Chave privada do DocuSign não encontrada ou inacessível: " + docusignConfig.privateKeyPath);
        }
        
        Logger.debug('Chave privada carregada com sucesso');
        
        // Montar o JWT Header e Payload
        var now = Math.floor(Date.now() / 1000);
        
        var header = {
            "alg": jwtConfig.algorithm,
            "typ": "JWT"
        };
        
        var payload = {
            "iss": docusignConfig.integrationKey,
            "sub": docusignConfig.userId,
            "iat": now,
            "exp": now + jwtConfig.expirationTime,
            "aud": jwtConfig.audience,
            "scope": jwtConfig.scope
        };
        
        Logger.debug('JWT payload preparado', { 
            iss: docusignConfig.integrationKey,
            sub: docusignConfig.userId,
            exp: payload.exp 
        });
        
        // Codificação Base64Url
        var b64Header = Base64Util.encodeURLSafe(JSON.stringify(header));
        var b64Payload = Base64Util.encodeURLSafe(JSON.stringify(payload));
        
        var headerPayload = b64Header + "." + b64Payload;
        
        // Assinar o JWT
        var signature = jwtSign(headerPayload, privateKeyContent);
        var jwtToken = headerPayload + "." + signature;
        
        Logger.debug('JWT token gerado e assinado');
        
        // Trocar o JWT por Access Token
        return exchangeJWTForAccessToken(jwtToken, docusignConfig, timeoutConfig);
        
    } catch (e) {
        Logger.error('Erro ao obter Access Token: ' + e.message);
        throw e;
    }
}

/**
 * Troca JWT por Access Token via requisição OAuth
 * @param {string} jwtToken - JWT assinado
 * @param {object} docusignConfig - Configurações DocuSign
 * @param {object} timeoutConfig - Configurações de timeout
 * @returns {string} Access Token
 */
function exchangeJWTForAccessToken(jwtToken, docusignConfig, timeoutConfig) {
    var Logger = Utils.Logger;
    Logger.debug('Trocando JWT por Access Token');
    
    try {
        var authPayload = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwtToken;
        
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        
        Logger.debug('Fazendo requisição OAuth', { url: docusignConfig.authUrl });
        
        var response = Utils.doHttpRequestWithRetry(
            docusignConfig.authUrl,
            'POST',
            authPayload,
            headers,
            timeoutConfig.tokenRequest
        );
        
        var jsonResponse = JSON.parse(response.getResult());
        
        if (jsonResponse.access_token) {
            Logger.info('Access Token obtido com sucesso', { 
                expiresIn: jsonResponse.expires_in 
            });
            return jsonResponse.access_token;
        } else {
            var errorMsg = jsonResponse.error_description || jsonResponse.error || 'Erro desconhecido na autenticação OAuth';
            throw new Error('Falha no OAuth DocuSign: ' + errorMsg);
        }
        
    } catch (e) {
        Logger.error('Erro na troca JWT por Access Token: ' + e.message);
        throw e;
    }
}


// ******************************************************************************
// 4. ENVIO DO ENVELOPE (E-Signature API Call) - VERSÃO OTIMIZADA
// ******************************************************************************

/**
 * Envia o documento para assinatura DocuSign
 * Versão otimizada com validações, retry automático e logging detalhado
 * @param {string} documentoBase64 - Conteúdo do documento em Base64.
 * @param {Array} signatarios - Array de objetos { nome: string, email: string }.
 * @returns {object} { sucesso: boolean, envelopeId: string, mensagem: string }
 */
function enviarEnvelopeDocuSign(documentoBase64, signatarios) {
    var Logger = Utils.Logger;
    Logger.info('Iniciando envio de envelope DocuSign');
    
    try {
        // ******************************************************************************
        // 4.1. VALIDAÇÕES DE ENTRADA
        // ******************************************************************************
        
        Logger.debug('Validando dados de entrada');
        
        // Validar documento
        var docValidation = Utils.validateDocument(documentoBase64);
        if (!docValidation.valido) {
            return {
                sucesso: false,
                mensagem: 'Documento inválido: ' + docValidation.erros.join(', ')
            };
        }
        
        // Validar signatários
        if (!signatarios || signatarios.length === 0) {
            return {
                sucesso: false,
                mensagem: 'Pelo menos um signatário é obrigatório'
            };
        }
        
        for (var i = 0; i < signatarios.length; i++) {
            var signatarioValidation = Utils.validateSignatory(signatarios[i]);
            if (!signatarioValidation.valido) {
                return {
                    sucesso: false,
                    mensagem: 'Signatário ' + (i + 1) + ' inválido: ' + signatarioValidation.erros.join(', ')
                };
            }
        }
        
        Logger.info('Dados validados com sucesso', { 
            numSignatarios: signatarios.length 
        });
        
        // ******************************************************************************
        // 4.2. OBTENÇÃO DO ACCESS TOKEN
        // ******************************************************************************
        
        Logger.debug('Obtendo Access Token');
        var accessToken = getDocuSignAccessToken();
        
        // ******************************************************************************
        // 4.3. PREPARAÇÃO DO ENVELOPE
        // ******************************************************************************
        
        Logger.debug('Preparando envelope DocuSign');
        
        var envelope = prepareEnvelope(documentoBase64, signatarios);
        
        // ******************************************************************************
        // 4.4. ENVIO DO ENVELOPE
        // ******************************************************************************
        
        Logger.debug('Enviando envelope para DocuSign API');
        
        return sendEnvelopeToDocuSign(envelope, accessToken);
        
    } catch (e) {
        Logger.error('Erro no envio de envelope: ' + e.message);
        return {
            sucesso: false,
            mensagem: Utils.formatErrorMessage('Envio de envelope', e.message)
        };
    }
}

/**
 * Prepara o envelope DocuSign com documentos e signatários
 * @param {string} documentoBase64 - Documento em Base64
 * @param {Array} signatarios - Lista de signatários
 * @returns {object} Envelope preparado
 */
function prepareEnvelope(documentoBase64, signatarios) {
    var Logger = Utils.Logger;
    var envelopeConfig = Config.envelope;
    
    Logger.debug('Mapeando signatários para formato DocuSign');
    
    // Mapear signatários para formato DocuSign
    var recipients = signatarios.map(function(s, index) {
        return {
            email: s.email,
            name: s.nome,
            recipientId: (index + 1).toString(),
            routingOrder: (index + 1).toString(),
            tabs: {
                signHereTabs: [{
                    anchorString: "/assinar" + (index + 1) + "/",
                    anchorUnits: envelopeConfig.signatureTabs.anchorUnits,
                    anchorXOffset: envelopeConfig.signatureTabs.anchorXOffset,
                    anchorYOffset: envelopeConfig.signatureTabs.anchorYOffset
                }]
            }
        };
    });
    
    // Preparar envelope payload
    var envelope = {
        emailSubject: envelopeConfig.defaultSubject + " - " + (getValue("WKNumProceso") || new Date().getTime()),
        documents: [{
            documentId: "1",
            name: "Documento do Processo Fluig",
            documentBase64: documentoBase64,
            fileExtension: envelopeConfig.defaultFileExtension,
            order: 1
        }],
        recipients: {
            signers: recipients
        },
        status: envelopeConfig.defaultStatus
    };
    
    Logger.debug('Envelope preparado', { 
        numDocuments: envelope.documents.length,
        numRecipients: recipients.length 
    });
    
    return envelope;
}

/**
 * Envia o envelope para a API DocuSign
 * @param {object} envelope - Envelope preparado
 * @param {string} accessToken - Access Token válido
 * @returns {object} Resultado do envio
 */
function sendEnvelopeToDocuSign(envelope, accessToken) {
    var Logger = Utils.Logger;
    var docusignConfig = Config.docusign;
    var timeoutConfig = Config.timeouts;
    
    try {
        // URL da API
        var apiUrl = docusignConfig.apiUrlBase + docusignConfig.accountId + '/envelopes';
        
        // Cabeçalhos
        var headers = {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        };
        
        Logger.debug('Enviando requisição para DocuSign', { url: apiUrl });
        
        // Fazer requisição com retry
        var response = Utils.doHttpRequestWithRetry(
            apiUrl,
            'POST',
            JSON.stringify(envelope),
            headers,
            timeoutConfig.envelopeRequest
        );
        
        var jsonResponse = JSON.parse(response.getResult());
        
        if (jsonResponse.envelopeId) {
            Logger.info('Envelope enviado com sucesso', { 
                envelopeId: jsonResponse.envelopeId 
            });
            
            return {
                sucesso: true,
                envelopeId: jsonResponse.envelopeId,
                mensagem: Utils.formatSuccessMessage('Envio de envelope', { envelopeId: jsonResponse.envelopeId })
            };
        } else {
            var errorMsg = getDocuSignErrorMessage(jsonResponse);
            Logger.error('Erro na resposta da API DocuSign', { erro: errorMsg });
            
            return {
                sucesso: false,
                mensagem: 'Erro da API DocuSign: ' + errorMsg
            };
        }
        
    } catch (e) {
        Logger.error('Erro ao enviar envelope para API: ' + e.message);
        throw e;
    }
}

/**
 * Extrai mensagem de erro da resposta DocuSign
 * @param {object} response - Resposta da API
 * @returns {string} Mensagem de erro formatada
 */
function getDocuSignErrorMessage(response) {
    if (response.message) {
        return response.message;
    }
    
    if (response.errorDetails && response.errorDetails.length > 0) {
        return response.errorDetails.map(function(detail) {
            return detail.message || detail.errorCode;
        }).join('; ');
    }
    
    if (response.error) {
        return response.error;
    }
    
    return 'Erro desconhecido na API DocuSign';
}

// ******************************************************************************
// 5. FUNÇÕES AUXILIARES PARA VALIDAÇÃO E UTILIDADE
// ******************************************************************************

/**
 * Valida se Base64Util está disponível e funcional
 * @returns {boolean} True se disponível
 */
function validateBase64Util() {
    try {
        if (typeof Base64Util === 'undefined') {
            throw new Error('Base64Util não está disponível');
        }
        
        // Teste básico
        var test = Base64Util.encodeURLSafe('test');
        return typeof test === 'string' && test.length > 0;
        
    } catch (e) {
        Utils.Logger.error('Base64Util não funcional: ' + e.message);
        return false;
    }
}

/**
 * Função de fallback para Base64Url se Base64Util não estiver disponível
 * @param {string} str - String para codificar
 * @returns {string} String codificada em Base64Url
 */
function fallbackBase64UrlEncode(str) {
    // TODO: Implementar codificação Base64Url de fallback
    // Por enquanto, lançar erro explicativo
    throw new Error('Base64Util não disponível e fallback não implementado');
}