/**
 * ==============================================================================
 * CONFIGURAÇÕES CENTRALIZADAS FLUIG-DOCUSIGN
 * ==============================================================================
 * Este arquivo contém todas as configurações necessárias para a integração
 * Fluig-DocuSign. Em produção, estas configurações devem ser lidas de um
 * dataset ou arquivo seguro do Fluig.
 */

var Config = {
    // ******************************************************************************
    // CREDENCIAIS DOCUSIGN - OBRIGATÓRIO: LER DE LOCAL SEGURO EM PRODUÇÃO
    // ******************************************************************************
    docusign: {
        // Estes valores NÃO devem estar no código-fonte em produção!
        integrationKey: 'SEU_INTEGRATION_KEY_CLIENT_ID',
        userId: 'SEU_USER_ID_GUID',
        accountId: 'SEU_DOCUSIGN_ACCOUNT_ID',
        privateKeyPath: '/path/seguro/para/sua/chave.pem',
        
        // URLs da API (Ambiente Demo - Mude para produção conforme necessário)
        authUrl: 'https://account-d.docusign.com/oauth/token',
        apiUrlBase: 'https://demodal.docusign.net/restapi/v2.1/accounts/',
        
        // URLs de produção (comentadas)
        // authUrl: 'https://account.docusign.com/oauth/token',
        // apiUrlBase: 'https://www.docusign.net/restapi/v2.1/accounts/',
    },
    
    // ******************************************************************************
    // CONFIGURAÇÕES DE TIMEOUT E RETRY
    // ******************************************************************************
    timeouts: {
        // Timeout para obtenção de token (milissegundos)
        tokenRequest: 30000,
        // Timeout para envio de envelope (milissegundos)
        envelopeRequest: 60000,
        // Timeout para consulta de status (milissegundos)
        statusRequest: 30000,
        // Timeout máximo para polling (milissegundos) - 30 minutos
        maxPollingTime: 1800000
    },
    
    retry: {
        // Número máximo de tentativas para obtenção de token
        maxTokenRetries: 3,
        // Número máximo de tentativas para envio de envelope
        maxEnvelopeRetries: 3,
        // Número máximo de tentativas para consulta de status
        maxStatusRetries: 5,
        // Delay inicial entre tentativas (milissegundos)
        initialDelay: 1000,
        // Multiplicador para backoff exponencial
        backoffMultiplier: 2
    },
    
    // ******************************************************************************
    // CONFIGURAÇÕES DO JWT
    // ******************************************************************************
    jwt: {
        // Algoritmo de assinatura
        algorithm: 'RS256',
        // Tempo de expiração do token (segundos) - 1 hora
        expirationTime: 3600,
        // Audience para ambiente demo
        audience: 'account-d.docusign.com',
        // Audience para ambiente de produção (comentado)
        // audience: 'account.docusign.com',
        // Escopo necessário para autenticação
        scope: 'signature impersonation'
    },
    
    // ******************************************************************************
    // CONFIGURAÇÕES DE CACHE
    // ******************************************************************************
    cache: {
        // Tempo de cache do token (milissegundos) - 50 minutos
        tokenCacheTime: 3000000,
        // Chave para cache do token no Fluig
        tokenCacheKey: 'docusign_access_token',
        // Chave para timestamp do cache
        tokenCacheTimestampKey: 'docusign_token_timestamp'
    },
    
    // ******************************************************************************
    // CONFIGURAÇÕES DE LOGGING
    // ******************************************************************************
    logging: {
        // Nível de log (DEBUG, INFO, WARN, ERROR)
        level: 'INFO',
        // Prefixo para logs da integração
        prefix: '[DOCUSIGN-INTEGRATION]',
        // Se deve incluir timestamp nos logs
        includeTimestamp: true
    },
    
    // ******************************************************************************
    // CONFIGURAÇÕES DO ENVELOPE
    // ******************************************************************************
    envelope: {
        // Assunto padrão para emails de assinatura
        defaultSubject: 'Documento para Assinatura Fluig',
        // Extensão padrão dos documentos
        defaultFileExtension: 'pdf',
        // Status padrão do envelope ao enviar
        defaultStatus: 'sent',
        // Configurações das abas de assinatura
        signatureTabs: {
            anchorUnits: 'pixels',
            anchorXOffset: '10',
            anchorYOffset: '20'
        }
    },
    
    // ******************************************************************************
    // CONFIGURAÇÕES DE POLLING
    // ******************************************************************************
    polling: {
        // Intervalo entre verificações de status (milissegundos) - 5 minutos
        interval: 300000,
        // Estados que indicam processo completo
        completionStates: ['completed', 'declined', 'voided'],
        // Estados que indicam processo pendente
        pendingStates: ['sent', 'delivered'],
        // Estados que indicam erro
        errorStates: ['error', 'failed'],
        // Valor padrão para status pendente
        pendingStatusValue: 'PENDENTE',
        // Valor para status de sucesso
        successStatusValue: 'S',
        // Valor para status de erro
        errorStatusValue: 'N'
    },
    
    // ******************************************************************************
    // CAMPOS DO FLUIG
    // ******************************************************************************
    fluigFields: {
        // Campo que armazena o ID do envelope DocuSign
        envelopeId: 'docusign_envelope_id',
        // Campo que armazena o status da assinatura
        signatureStatus: 'assDocSignPropoente',
        // Campo com ID do documento a ser assinado
        documentId: 'documento_id_field',
        // Campos dos signatários
        signerName: 'assinante_nome',
        signerEmail: 'assinante_email'
    }
};

/**
 * Função para obter configuração a partir de dataset do Fluig (em produção)
 * @param {string} configKey - Chave da configuração
 * @returns {*} Valor da configuração
 */
function getConfigFromDataset(configKey) {
    try {
        // Em produção, implementar leitura do dataset
        // var dataset = DatasetManager.getDataset('docusign_config');
        // return dataset.getValues()[configKey];
        
        // Por enquanto, retorna da configuração local
        return getNestedConfig(Config, configKey);
    } catch (e) {
        Logger.warn('Erro ao obter configuração do dataset: ' + e.message);
        return getNestedConfig(Config, configKey);
    }
}

/**
 * Função auxiliar para obter configuração aninhada
 * @param {object} obj - Objeto de configuração
 * @param {string} path - Caminho da configuração (ex: 'docusign.integrationKey')
 * @returns {*} Valor da configuração
 */
function getNestedConfig(obj, path) {
    return path.split('.').reduce(function(current, key) {
        return current && current[key];
    }, obj);
}

/**
 * Função para validar configurações obrigatórias
 * @returns {object} { valido: boolean, erros: string[] }
 */
function validateConfig() {
    var erros = [];
    var requiredConfigs = [
        'docusign.integrationKey',
        'docusign.userId',
        'docusign.accountId',
        'docusign.privateKeyPath'
    ];
    
    for (var i = 0; i < requiredConfigs.length; i++) {
        var config = getNestedConfig(Config, requiredConfigs[i]);
        if (!config || config.startsWith('SEU_')) {
            erros.push('Configuração obrigatória não definida: ' + requiredConfigs[i]);
        }
    }
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}