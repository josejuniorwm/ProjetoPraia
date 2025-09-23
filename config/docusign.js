/**
 * Configurações da Integração Fluig-DocuSign
 */
const config = {
    // DocuSign API
    DOCUSIGN_API_URL_BASE: "https://demo.docusign.net/restapi/v2.1/accounts/{accountId}",
    ACCOUNT_ID: "8bbe50e4-ac9e-44dc-a990-3253a67ac353",
    
    // Proxy Service
    PROXY_SERVICE_ID: "api_gt",
    PROXY_METHOD_PATH: "/token-proxy",
    PROXY_APP_TOKEN: "e68e4fca-d941-423e-baca-a521318bf5c4",
    
    // Retry Configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 segundos
    
    // Polling Configuration
    MAX_POLLING_ATTEMPTS: 48, // 24 horas (30 minutos * 48)
    POLLING_INTERVAL: 1800000, // 30 minutos em milissegundos
    
    // Status Codes
    STATUS: {
        PENDING: "PENDENTE",
        SUCCESS: "S",
        TOKEN_FAILURE: "FALHA_TOKEN",
        SEND_FAILURE: "FALHA_ENVIO",
        QUERY_FAILURE: "FALHA_CONSULTA",
        FATAL_ERROR: "ERRO_FATAL"
    }
};

module.exports = config;