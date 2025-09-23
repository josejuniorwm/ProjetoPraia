/* ========================================================================= */
/* PROJETO PRAIA - EnviarDocumento.servicetask11.js (Lógica de Envio Inicial) */
/* ========================================================================= */

function servicetask11(hAPI, execution) {
    var logger = execution.getLogger();
    logger.info("INÍCIO - Service Task 11: Envio do Documento (Projeto Praia)");

    // --- VARIÁVEIS DE CONFIGURAÇÃO SALVAS ---
    // REMOVIDO: var PROXY_URL_TOKEN = "http://75.119.141.135:3000/token-proxy";
    var DOCUSIGN_API_URL_BASE = "https://demo.docusign.net/restapi/v2.1/accounts/{accountId}";
    var ACCOUNT_ID = "8bbe50e4-ac9e-44dc-a990-3253a67ac353"; 
    
    // VARIÁVEL DO SERVIÇO DE INTEGRAÇÃO FLUIG (O PROXY)
    var PROXY_SERVICE_ID = "api_gt"; 

    // DADOS DO CLIENTE (HARD-CODED CONFORME SOLICITADO PARA O TESTE)
    var signatarioNome = hAPI.getCardValue("nome_signatario") || "jose junior";
    var signatarioEmail = hAPI.getCardValue("email_signatario") || "jose.junior@uberdesk.com.br"; // Usei os nomes de campo sugeridos
    
    // Hard-coded o Base64 para teste, se o campo do Card Data estiver vazio.
    // **ATENÇÃO: SUBSTITUA PELA SUA STRING BASE64 REAL DO PDF**
    var docBase64 = hAPI.getCardValue("documento_base64") || "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5nIChJZGVudGl0eSkgL1N1cHBsZW1lbnQgMCA+PgovRm9udERlc2NyaXB0b3IgMTIgMCBSCi9DSURUb0dJRE1hcCAvSWRlbnRpdHkKL0RXIDYwMiA+PgplbmRvYmoKMTUgMCBvYmoKPDwgL0xlbmd0aCA0NTUgPj4Kc3RyZWFtCi9DSURJbml0IC9Qcm9jU2V0IGZpbmRyZXNvdXJjZSBiZWdpbgoxMiBkaWN0IGJlZ2luCmJlZ2luY21hcAovQ0lEU3lzdGVtSW5mbyA8PCAvUmVnaXN0cnkgKEFkb2JlKSAvT3JkZXJpbmcgKFVDUykgL1N1cHBsZW1lbnQgMCA+PiBkZWYKL0NNYXBOYW1lIC9BZG9iZS1JZGVudGl0eS1VQ1MgZGVmCi9DTWFwVHlwZSAyIGRlZgoxIGJlZ2luY29kZXNwYWNlcmFuZ2UKPDAwMDA+IDxGRkZGPgplbmRjb2Rlc3BhY2VyYW5nZQoyIGJlZ2luYmZyYW5nZQo8MDAwMD4gPDAwMEQ+IFs8MDAzMT4gPDAwMzk+IDwwMDJGPiA8MDAzMD4gPDAwMzI+IDwwMDM1PiA8MDA3ND4gPDAwNjU+IDwwMDczPiA8MDAwOT4gPDAwNkY+IDwwMDZDPiA8MDBFMT4gXQplbmRiZnJhbmdlCmVuZGNtYXAKQ01hcE5hbWUgY3VycmVudGRpY3QgL0NNYXAgZGVmaW5lcmVzb3VyY2UgcG9wCmVuZAplbmQKCmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PCAvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTAKL0Jhc2VGb250IC9IYWNrLVJlZ3VsYXIKL0VuY29kaW5nIC9JZGVudGl0eS1ICi9EZXNjZW5kYW50Rm9udHMgWzE0IDAgUl0KL1RvVW5pY29kZSAxNSAwIFI+PgplbmRvYmoKMTYgMCBvYmoKPDwKL0xlbmd0aCAyCj4+CnN0cmVhbQr//AplbmRzdHJlYW0KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIApbCjYgMCBSCl0KL0NvdW50IDEKL1Byb2NTZXQgWy9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDXQo+PgplbmRvYmoKeHJlZgowIDE4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTU1IDAwMDAwIG4gCjAwMDAwMDYxOTMgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAowMDAwMDAwMjk5IDAwMDAwIG4gCjAwMDAwMDAzMzYgMDAwMDAgbiAKMDAwMDAwMDY1NiAwMDAwMCBuIAowMDAwMDAwNjM2IDAwMDAwIG4gCjAwMDAwMDA0NzAgMDAwMDAgbiAKMDAwMDAwMTMyOSAwMDAwMCBuIAowMDAwMDA2MDAzIDAwMDAwIG4gCjAwMDAwMDA1MjgyIDAwMDAwIG4gCjAwMDAwMDA1NjA5IDAwMDAwIG4gCjAwMDAwMDA2NTYy IDAwMDAwIG4gCjAwMDAwMDA2MTg2IDAwMDAwIG4gCjAwMDAwMDYwNjIgMDAwMDAgbiAKMDAwMDAwNTI4MiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDE4IAovSW5mbyAxIDAgUgovUm9vdCAyIDAgUgo+PgphdGFydHhyZWYKNzE1NgolJUVPRgo=";

    // --- 1. Obter Access Token do Proxy (JWT Grant) ---
    // Usamos PROXY_SERVICE_ID e o nome da função (que é o path)
    logger.info("Tentando obter Access Token via Serviço Fluig REST: " + PROXY_SERVICE_ID);

    // *Implementação real da chamada HTTP para o Proxy*
    var tokenResponse = callExternalService(PROXY_SERVICE_ID, "/token-proxy", "GET", null, logger); // Alterei a função
    var accessToken = tokenResponse.token;

    if (!accessToken) {
        hAPI.setCardValue("assDocSignPropoente", "FALHA_TOKEN");
        logger.error("ERRO: Não foi possível obter o Access Token do Proxy. Processo interrompido.");
        return false;
    }
    logger.info("Access Token obtido com sucesso.");

    // O restante do código segue inalterado...
    // --- 2. Montar e Enviar Envelope para DocuSign ---
    try {
        var envelopePayload = buildEnvelopePayload(docBase64, signatarioNome, signatarioEmail, logger);
        var sendUrl = DOCUSIGN_API_URL_BASE.replace("{accountId}", ACCOUNT_ID) + "/envelopes";

        // *Implementação real da chamada HTTP POST do Fluig para a DocuSign*
        var sendResponse = callDocuSignSendAPI(sendUrl, accessToken, envelopePayload, logger);

        if (sendResponse && sendResponse.envelopeId) {
            // SUCESSO NO ENVIO
            var envelopeId = sendResponse.envelopeId;

            // 3. Salvar o Envelope ID e definir o status inicial
            hAPI.setCardValue("envelopeIdDocuSign", envelopeId);
            hAPI.setCardValue("assDocSignPropoente", "PENDENTE");

            logger.info("Envelope enviado com sucesso. ID salvo: " + envelopeId + ". Avançando para o Polling.");
            return true; // AVANÇA o processo para a Service Task de Polling
        } else {
            // FALHA NO ENVIO
            hAPI.setCardValue("assDocSignPropoente", "FALHA_ENVIO");
            logger.error("ERRO: Falha ao enviar o Envelope para DocuSign. Resposta: " + sendResponse.message);
            return false;
        }

    } catch (e) {
        logger.error("ERRO FATAL na servicetask11 (Envio): " + e.message);
        hAPI.setCardValue("assDocSignPropoente", "ERRO_FATAL_ENVIO");
        return false;
    }
}

// =================================================================================
// FUNÇÕES AUXILIARES COM IMPLEMENTAÇÃO HTTP FLUIG (CLIENT SERVICE)
// =================================================================================

/**
 * Obtém o token JWT do Proxy Server usando o Serviço de Integração (api_gt).
 * @param {string} serviceId - O ID do serviço REST configurado no Fluig (ex: 'api_gt').
 * @param {string} methodPath - O path que o serviço deve chamar (ex: '/token-proxy').
 * @returns {object} { token: string }
 */
function callExternalService(serviceId, methodPath, method, payload, logger) {
    try {
        var integrationService = hAPI.getIntegrationService(serviceId);
        
        // Os headers são necessários para passar o AppToken
        var headers = {
            "Content-Type": "application/json",
            "AppToken": "e68e4fca-d941-423e-baca-a521318bf5c4" // O AppToken que o proxy espera!
        };

        var response = integrationService.callService(methodPath, method, headers, payload);
        
        // Verifica se a chamada foi um sucesso de rede e obteve o token
        if (response.getResult() == 200) {
            var jsonResponse = JSON.parse(response.getResponseMessage());
            
            if (jsonResponse.accessToken) { // O novo proxy retorna 'accessToken'
                return { token: jsonResponse.accessToken };
            } else {
                logger.error("Proxy (api_gt) retornou status 200, mas o JSON não continha 'accessToken'.");
                return { token: null };
            }
        } else {
            logger.error("Proxy (api_gt) retornou status: " + response.getResult() + " | Mensagem: " + response.getResponseMessage());
            return { token: null };
        }
        
    } catch (e) {
        logger.error("Erro ao chamar Serviço de Integração (api_gt) | Detalhe: " + e.message);
        return { token: null };
    }
}


/**
 * Monta o JSON de Envelope para a DocuSign.
 */
function buildEnvelopePayload(docBase64, nome, email, logger) {
    if (!docBase64 || docBase64.length < 100) {
        logger.error("Base64 do documento está vazio ou inválido.");
        throw new Error("Documento Base64 inválido.");
    }

    // Configuração do Envelope e Tabs (Âncora)
    return {
        emailSubject: "Documento para Assinatura Eletrônica - Praia Clube",
        documents: [{
            documentBase64: docBase64,
            documentId: "1",
            fileExtension: "pdf",
            name: "Contrato de Admissão"
        }],
        recipients: {
            signers: [{
                email: email,
                name: nome,
                recipientId: "1",
                routingOrder: "1",
                tabs: {
                    signHereTabs: [{
                        anchorString: "ASSINAR AQUI", // **SUBSTITUA PELA SUA ÂNCORA REAL NO PDF**
                        anchorXOffset: "0",
                        anchorYOffset: "0"
                    }]
                }
            }]
        },
        status: "sent" // Envia imediatamente
    };
}

/**
 * Envia o Envelope para a DocuSign. (Esta função continua usando fluigAPI.getClientService para flexibilidade)
 * @returns {object} { envelopeId: string, message: string }
 */
function callDocuSignSendAPI(url, token, payload, logger) {
    try {
        var client = fluigAPI.getClientService();
        var data = {
            method: 'post',
            url: url,
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        };

        var response = client.post(data);
        var jsonResponse = JSON.parse(response.getResult());

        if (response.getHttpStatus() == 201) {
            return {
                envelopeId: jsonResponse.envelopeId,
                message: "Envio HTTP 201 Sucesso"
            };
        } else {
            return {
                envelopeId: null,
                message: "HTTP Status " + response.getHttpStatus() + " | Erro DocuSign: " + jsonResponse.message
            };
        }
    } catch (e) {
        logger.error("Erro ao chamar DocuSign Send API: " + e.message);
        return { envelopeId: null, message: "Erro de Conexão: " + e.message };
    }
}

// ... dentro da servicetask11

        if (sendResponse && sendResponse.envelopeId) {
            // SUCESSO NO ENVIO
            // ...
            logger.info("Envelope enviado com sucesso. ID salvo: " + envelopeId + ". Avançando para o Polling.");
            return true; // AVANÇA o processo para a Service Task de Polling
        } 
// ...