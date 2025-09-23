/**
 * ==============================================================================
 * SERVICETASK11.JS - ENVIO DE DOCUMENTO PARA DOCUSIGN
 * ==============================================================================
 * Este arquivo implementa a funcionalidade de envio de documentos para assinatura
 * via DocuSign com tratamento robusto de erros, validações e retry automático.
 * 
 * Funcionalidades:
 * - Validação completa de campos obrigatórios
 * - Tratamento de erro robusto com retry automático
 * - Logging detalhado para facilitar debug
 * - Padronização de mensagens de erro
 * - Cache de token para otimização
 * - Comentários explicativos
 * ==============================================================================
 */

// Importar dependências (assumindo que estão no mesmo contexto)
// Em produção, estes arquivos devem estar no mesmo diretório ou importados adequadamente

/**
 * Função principal para envio de documento para DocuSign
 * Esta função é chamada pela tarefa de serviço do processo Fluig
 * 
 * @param {string} colleagueId - ID do usuário
 * @param {string} nextSequenceId - ID da próxima sequência
 * @param {Array} userList - Lista de usuários
 */
function servicetask11(colleagueId, nextSequenceId, userList) {
    var Logger = Utils.Logger;
    Logger.info('=== INICIANDO ENVIO DE DOCUMENTO PARA DOCUSIGN ===');
    
    try {
        // ******************************************************************************
        // 1. VALIDAÇÃO INICIAL E OBTENÇÃO DE DADOS
        // ******************************************************************************
        
        Logger.info('Etapa 1: Validando configurações e obtendo dados do processo');
        
        // Validar configurações do sistema
        var configValidation = validateConfig();
        if (!configValidation.valido) {
            var configError = 'Configurações inválidas: ' + configValidation.erros.join(', ');
            Logger.error(configError);
            throw new Error(configError);
        }
        
        // Obter dados do formulário Fluig
        var dadosFormulario = obterDadosFormulario();
        Logger.info('Dados do formulário obtidos', { 
            temDocumento: !!dadosFormulario.documentoId,
            numSignatarios: dadosFormulario.signatarios.length 
        });
        
        // ******************************************************************************
        // 2. VALIDAÇÃO DOS DADOS OBRIGATÓRIOS
        // ******************************************************************************
        
        Logger.info('Etapa 2: Validando dados obrigatórios');
        
        var validacao = validarDadosObrigatorios(dadosFormulario);
        if (!validacao.valido) {
            var validationError = 'Dados obrigatórios inválidos: ' + validacao.erros.join(', ');
            Logger.error(validationError);
            hAPI.setFailedProcess(validationError);
            return;
        }
        
        // ******************************************************************************
        // 3. CONVERSÃO DO DOCUMENTO PARA BASE64
        // ******************************************************************************
        
        Logger.info('Etapa 3: Convertendo documento para Base64');
        
        var documentoBase64;
        try {
            documentoBase64 = obterDocumentoBase64(dadosFormulario.documentoId);
            Logger.info('Documento convertido com sucesso', { 
                tamanho: documentoBase64.length 
            });
        } catch (e) {
            var docError = Utils.formatErrorMessage('Conversão de documento', e.message);
            Logger.error(docError);
            hAPI.setFailedProcess(docError);
            return;
        }
        
        // Validar documento Base64
        var docValidation = Utils.validateDocument(documentoBase64);
        if (!docValidation.valido) {
            var docValidationError = 'Documento inválido: ' + docValidation.erros.join(', ');
            Logger.error(docValidationError);
            hAPI.setFailedProcess(docValidationError);
            return;
        }
        
        // ******************************************************************************
        // 4. OBTENÇÃO DO ACCESS TOKEN COM RETRY
        // ******************************************************************************
        
        Logger.info('Etapa 4: Obtendo Access Token do DocuSign');
        
        var accessToken;
        try {
            accessToken = obterAccessTokenComRetry();
            Logger.info('Access Token obtido com sucesso');
        } catch (e) {
            var tokenError = Utils.formatErrorMessage('Obtenção de Access Token', e.message);
            Logger.error(tokenError);
            hAPI.setFailedProcess(tokenError);
            return;
        }
        
        // ******************************************************************************
        // 5. ENVIO DO ENVELOPE PARA DOCUSIGN
        // ******************************************************************************
        
        Logger.info('Etapa 5: Enviando envelope para DocuSign');
        
        var resultadoEnvio;
        try {
            resultadoEnvio = enviarEnvelopeComRetry(documentoBase64, dadosFormulario.signatarios, accessToken);
            Logger.info('Envelope enviado com sucesso', { 
                envelopeId: resultadoEnvio.envelopeId 
            });
        } catch (e) {
            var envioError = Utils.formatErrorMessage('Envio de envelope', e.message);
            Logger.error(envioError);
            hAPI.setFailedProcess(envioError);
            return;
        }
        
        // ******************************************************************************
        // 6. ATUALIZAÇÃO DOS CAMPOS DO FLUIG
        // ******************************************************************************
        
        Logger.info('Etapa 6: Atualizando campos do processo Fluig');
        
        try {
            atualizarCamposFluig(resultadoEnvio);
            Logger.info('Campos do Fluig atualizados com sucesso');
        } catch (e) {
            var updateError = Utils.formatErrorMessage('Atualização de campos', e.message);
            Logger.error(updateError);
            // Não falhar o processo por erro de atualização de campos
            // O envelope já foi enviado com sucesso
        }
        
        Logger.info('=== ENVIO DE DOCUMENTO CONCLUÍDO COM SUCESSO ===');
        
    } catch (e) {
        // Captura de erros críticos não tratados
        var criticalError = Utils.formatErrorMessage('Processo de envio', e.message);
        Logger.error(criticalError);
        hAPI.setFailedProcess(criticalError);
    }
}

/**
 * Obtém dados necessários do formulário Fluig
 * @returns {object} Objeto com documentoId e signatarios
 */
function obterDadosFormulario() {
    var Logger = Utils.Logger;
    Logger.debug('Obtendo dados do formulário');
    
    var fluigFields = Config.fluigFields;
    
    // Obter ID do documento
    var documentoId = hAPI.getCardValue(fluigFields.documentId);
    
    // Obter dados dos signatários
    // TODO: Implementar lógica para múltiplos signatários se necessário
    var signatarios = [
        {
            nome: hAPI.getCardValue(fluigFields.signerName),
            email: hAPI.getCardValue(fluigFields.signerEmail)
        }
    ];
    
    // Filtrar signatários vazios
    signatarios = signatarios.filter(function(s) {
        return Utils.isNotEmpty(s.nome) && Utils.isNotEmpty(s.email);
    });
    
    return {
        documentoId: documentoId,
        signatarios: signatarios
    };
}

/**
 * Valida dados obrigatórios para o envio
 * @param {object} dadosFormulario - Dados do formulário
 * @returns {object} { valido: boolean, erros: string[] }
 */
function validarDadosObrigatorios(dadosFormulario) {
    var Logger = Utils.Logger;
    Logger.debug('Validando dados obrigatórios');
    
    var erros = [];
    
    // Validar documento ID
    if (!Utils.isNotEmpty(dadosFormulario.documentoId)) {
        erros.push('ID do documento é obrigatório');
    }
    
    // Validar signatários
    if (!dadosFormulario.signatarios || dadosFormulario.signatarios.length === 0) {
        erros.push('Pelo menos um signatário é obrigatório');
    } else {
        // Validar cada signatário
        for (var i = 0; i < dadosFormulario.signatarios.length; i++) {
            var validacaoSignatario = Utils.validateSignatory(dadosFormulario.signatarios[i]);
            if (!validacaoSignatario.valido) {
                erros.push('Signatário ' + (i + 1) + ': ' + validacaoSignatario.erros.join(', '));
            }
        }
    }
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}

/**
 * Obtém documento em formato Base64
 * @param {string} documentoId - ID do documento
 * @returns {string} Documento em Base64
 */
function obterDocumentoBase64(documentoId) {
    var Logger = Utils.Logger;
    Logger.debug('Convertendo documento para Base64', { documentoId: documentoId });
    
    // TODO: Implementar conversão real do documento Fluig para Base64
    // Esta é uma função que deve ser implementada conforme o ambiente Fluig específico
    
    try {
        // Exemplo de implementação (deve ser ajustado para o ambiente real)
        // var documento = hAPI.getDocument(documentoId);
        // return documento.toBase64();
        
        // Por enquanto, simular para desenvolvimento
        throw new Error('Função getDocumentContentAsBase64 deve ser implementada');
        
    } catch (e) {
        throw new Error('Erro ao converter documento para Base64: ' + e.message);
    }
}

/**
 * Obtém Access Token com retry automático e cache
 * @returns {string} Access Token válido
 */
function obterAccessTokenComRetry() {
    var Logger = Utils.Logger;
    var config = Config.cache;
    
    // Verificar se há token válido em cache
    var tokenCache = Utils.getCacheItem(config.tokenCacheKey);
    if (tokenCache && Utils.isCacheValid(config.tokenCacheKey, config.tokenCacheTime)) {
        Logger.debug('Token obtido do cache');
        return tokenCache;
    }
    
    Logger.debug('Obtendo novo Access Token');
    
    var retryConfig = Config.retry;
    
    return Utils.retryOperation(function() {
        try {
            var token = getDocuSignAccessToken();
            
            // Armazenar token no cache
            Utils.setCacheItem(config.tokenCacheKey, token, config.tokenCacheTime);
            
            return token;
        } catch (e) {
            Logger.warn('Falha ao obter Access Token: ' + e.message);
            throw e;
        }
    }, retryConfig.maxTokenRetries, retryConfig.initialDelay, retryConfig.backoffMultiplier);
}

/**
 * Envia envelope para DocuSign com retry automático
 * @param {string} documentoBase64 - Documento em Base64
 * @param {Array} signatarios - Lista de signatários
 * @param {string} accessToken - Access Token válido
 * @returns {object} Resultado do envio
 */
function enviarEnvelopeComRetry(documentoBase64, signatarios, accessToken) {
    var Logger = Utils.Logger;
    var retryConfig = Config.retry;
    
    Logger.debug('Enviando envelope com retry', { 
        numSignatarios: signatarios.length 
    });
    
    return Utils.retryOperation(function() {
        try {
            var resultado = enviarEnvelopeOtimizado(documentoBase64, signatarios, accessToken);
            
            if (!resultado.sucesso) {
                throw new Error(resultado.mensagem || 'Falha desconhecida no envio');
            }
            
            return resultado;
        } catch (e) {
            Logger.warn('Falha ao enviar envelope: ' + e.message);
            throw e;
        }
    }, retryConfig.maxEnvelopeRetries, retryConfig.initialDelay, retryConfig.backoffMultiplier);
}

/**
 * Versão otimizada da função de envio de envelope
 * @param {string} documentoBase64 - Documento em Base64
 * @param {Array} signatarios - Lista de signatários
 * @param {string} accessToken - Access Token
 * @returns {object} Resultado do envio
 */
function enviarEnvelopeOtimizado(documentoBase64, signatarios, accessToken) {
    var Logger = Utils.Logger;
    var docusignConfig = Config.docusign;
    var envelopeConfig = Config.envelope;
    var timeoutConfig = Config.timeouts;
    
    Logger.debug('Preparando envelope DocuSign');
    
    try {
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
        
        // Preparar payload do envelope
        var envelopePayload = {
            emailSubject: envelopeConfig.defaultSubject + " - " + getValue("WKNumProceso"),
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
        
        // Preparar cabeçalhos
        var headers = {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        };
        
        // URL da API
        var apiUrl = docusignConfig.apiUrlBase + docusignConfig.accountId + '/envelopes';
        
        Logger.debug('Enviando requisição para DocuSign API');
        
        // Fazer requisição com timeout
        var response = Utils.doHttpRequestWithRetry(
            apiUrl, 
            'POST', 
            JSON.stringify(envelopePayload), 
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
                mensagem: 'Envelope enviado com sucesso'
            };
        } else {
            var errorMsg = jsonResponse.message || jsonResponse.errorDetails || 'Falha desconhecida na API DocuSign';
            Logger.error('Erro na resposta da API DocuSign', { erro: errorMsg });
            
            return {
                sucesso: false,
                mensagem: 'Erro da API DocuSign: ' + errorMsg
            };
        }
        
    } catch (e) {
        Logger.error('Erro ao enviar envelope: ' + e.message);
        throw e;
    }
}

/**
 * Atualiza campos do Fluig com resultado do envio
 * @param {object} resultadoEnvio - Resultado do envio do envelope
 */
function atualizarCamposFluig(resultadoEnvio) {
    var Logger = Utils.Logger;
    var fluigFields = Config.fluigFields;
    var pollingConfig = Config.polling;
    
    Logger.debug('Atualizando campos do Fluig');
    
    try {
        // Salvar ID do envelope
        hAPI.setCardValue(fluigFields.envelopeId, resultadoEnvio.envelopeId);
        
        // Definir status como pendente
        hAPI.setCardValue(fluigFields.signatureStatus, pollingConfig.pendingStatusValue);
        
        Logger.info('Campos atualizados', { 
            envelopeId: resultadoEnvio.envelopeId,
            status: pollingConfig.pendingStatusValue
        });
        
    } catch (e) {
        throw new Error('Erro ao atualizar campos do Fluig: ' + e.message);
    }
}