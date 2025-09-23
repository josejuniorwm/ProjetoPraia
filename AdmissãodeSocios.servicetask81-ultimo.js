/* ========================================================================= */
/* PROJETO PRAIA - AdmissãodeSocios.servicetask81.js (Lógica de Envio e Polling) */
/* ATUALIZAÇÃO: Uso do Serviço REST Fluig 'api_gt' para Token Proxy */
/* ========================================================================= */

function servicetask81(hAPI, execution) {
    var logger = execution.getLogger();
    logger.info("INÍCIO - Service Task 81: Envio/Consulta DocuSign (Projeto Praia)");

    // VARIÁVEIS DE CARD DATA
    var envelopeId = hAPI.getCardValue("envelopeIdDocuSign");
    var docBase64 = hAPI.getCardValue("documento_base64");
    var signatarioNome = hAPI.getCardValue("nome_signatario") || "José Junior"; // Usando CardData ou fallback
    var signatarioEmail = hAPI.getCardValue("email_signatario") || "jose.junior.teste@praiaclube.com.br"; // Usando CardData ou fallback

    // --- VARIÁVEIS DE CONFIGURAÇÃO SALVAS ---
    var PROXY_SERVICE_ID = "api_gt"; // O ID do Serviço REST cadastrado no Fluig
    var PROXY_METHOD_PATH = "/token-proxy"; // O path que o Proxy espera
    
    // DOCUSIGN API URL (Sem Account ID, pois será substituído dinamicamente)
    var DOCUSIGN_API_URL_BASE = "https://demo.docusign.net/restapi/v2.1/accounts/{accountId}"; 
    var ACCOUNT_ID = "8bbe50e4-ac9e-44dc-a990-3253a67ac353"; // ID da conta DocuSign (substitua o ID real)

    try {
        if (!envelopeId || envelopeId == "") {
            // =============================================================
            // 1. PRIMEIRA EXECUÇÃO: OBTER TOKEN E ENVIAR DOCUMENTO
            // =============================================================
            logger.info("Primeira execução: Enviando Envelope para DocuSign.");

            // --- 1.1 Obter Access Token do Proxy (Usando o Serviço REST) ---
            var tokenResponse = callExternalService(PROXY_SERVICE_ID, PROXY_METHOD_PATH, "GET", null, logger);
            var accessToken = tokenResponse.token;
            var accountId = tokenResponse.accountId;

            if (!accessToken) {
                hAPI.setCardValue("assDocSignPropoente", "FALHA_TOKEN");
                logger.error("ERRO: Não foi possível obter o Access Token do Proxy.");
                return false; 
            }
            // Usa o accountId retornado, se disponível, senão usa o hard-coded
            var finalAccountId = accountId || ACCOUNT_ID;

            // --- 1.2 Montar e Enviar Envelope ---
            var envelopePayload = buildEnvelopePayload(docBase64, signatarioNome, signatarioEmail, logger);
            var sendUrl = DOCUSIGN_API_URL_BASE.replace("{accountId}", finalAccountId) + "/envelopes";
            
            var sendResponse = callDocuSignSendAPI(sendUrl, accessToken, envelopePayload, logger);

            if (sendResponse && sendResponse.envelopeId) {
                // SUCESSO NO ENVIO
                hAPI.setCardValue("envelopeIdDocuSign", sendResponse.envelopeId);
                hAPI.setCardValue("assDocSignPropoente", "PENDENTE");
                logger.info("Envelope enviado com sucesso. ID: " + sendResponse.envelopeId);
                // Retorna 'false' para manter na tarefa e iniciar o Polling no próximo ciclo
                return false; 
            } else {
                // FALHA NO ENVIO
                hAPI.setCardValue("assDocSignPropoente", "FALHA_ENVIO");
                logger.error("ERRO: Falha ao enviar o Envelope para DocuSign. Mensagem: " + sendResponse.message);
                return false;
            }

        } else {
            // =============================================================
            // 2. EXECUÇÕES SUBSEQUENTES: POLLING (CONSULTA DE STATUS)
            // =============================================================
            logger.info("Polling em andamento. Consultando status do Envelope ID: " + envelopeId);

            // --- 2.1 Obter Access Token do Proxy (Usando o Serviço REST) ---
            var tokenResponse = callExternalService(PROXY_SERVICE_ID, PROXY_METHOD_PATH, "GET", null, logger);
            var accessToken = tokenResponse.token;
            var accountId = tokenResponse.accountId;

            if (!accessToken) {
                logger.error("ERRO: Não foi possível obter o Access Token do Proxy para Polling. Tentará novamente.");
                hAPI.setCardValue("assDocSignPropoente", "PENDENTE");
                return false; 
            }
            var finalAccountId = accountId || ACCOUNT_ID;

            // --- 2.2 Consultar Status na DocuSign ---
            var statusUrl = DOCUSIGN_API_URL_BASE.replace("{accountId}", finalAccountId) + "/envelopes/" + envelopeId;
            var statusResponse = callDocuSignStatusAPI(statusUrl, accessToken, logger);
            var status = statusResponse.status;

            if (status && status.toLowerCase() === "completed") {
                // SUCESSO: ASSINADO
                hAPI.setCardValue("assDocSignPropoente", "S"); // Status 'S' para sucesso (Condição de saída do Gateway)
                logger.info("SUCESSO! Assinatura CONCLUÍDA. Processo avançará.");
                return true; // AVANÇA o processo para a próxima tarefa
            } else if (status) {
                // AINDA PENDENTE (sent, delivered, etc.)
                hAPI.setCardValue("assDocSignPropoente", "PENDENTE"); // Mantém o status 'PENDENTE'
                logger.info("Assinatura ainda PENDENTE. Status atual: " + status);
                return false; // Manter o Polling ativo (o temporizador do Fluig fará a repetição)
            } else {
                // ERRO NA CONSULTA
                hAPI.setCardValue("assDocSignPropoente", "FALHA_CONSULTA");
                logger.error("ERRO: Falha ao consultar o status na DocuSign. Mensagem: " + statusResponse.message);
                return false;
            }
        }
    } catch (e) {
        logger.error("ERRO FATAL na servicetask81: " + e.message);
        hAPI.setCardValue("assDocSignPropoente", "ERRO_FATAL");
        return false;
    }
}

// =================================================================================
// FUNÇÕES AUXILIARES COM IMPLEMENTAÇÃO HTTP FLUIG (CLIENT SERVICE)
// =================================================================================

/**
 * Obtém o token JWT do Proxy Server usando o Serviço de Integração (api_gt).
 * @returns {object} { token: string, accountId: string }
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
        
        if (response.getResult() == 200) {
            var jsonResponse = JSON.parse(response.getResponseMessage());
            
            if (jsonResponse.accessToken) { 
                return { 
                    token: jsonResponse.accessToken, 
                    accountId: jsonResponse.accountId 
                };
            } else {
                logger.error("Proxy (api_gt) retornou status 200, mas o JSON não continha 'accessToken'.");
                return { token: null, accountId: null };
            }
        } else {
            logger.error("Proxy (api_gt) retornou status: " + response.getResult() + " | Mensagem: " + response.getResponseMessage());
            return { token: null, accountId: null };
        }
        
    } catch (e) {
        logger.error("Erro ao chamar Serviço de Integração (api_gt) | Detalhe: " + e.message);
        return { token: null, accountId: null };
    }
}

/**
 * Monta o JSON de Envelope para a DocuSign.
 */
function buildEnvelopePayload(docBase64, nome, email, logger) {
    if (!docBase64 || docBase64.length < 100) {
        logger.error("Base64 do documento está vazio ou inválido.");
        // A DocuSign deve ter um Base64 válido, substituí o hard-coded aqui pelo campo de Card Data.
        // Se a variável documento_base64 não existir no formulário, a execução pode falhar neste ponto.
        throw new Error("Documento Base64 inválido ou não encontrado no Card Data."); 
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
 * Envia o Envelope para a DocuSign.
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

/**
 * Consulta o status do Envelope na DocuSign.
 * @returns {object} { status: string, message: string }
 */
function callDocuSignStatusAPI(url, token, logger) {
    try {
        var client = fluigAPI.getClientService();
        var data = {
            method: 'get',
            url: url,
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        };

        var response = client.get(data);
        var jsonResponse = JSON.parse(response.getResult());

        if (response.getHttpStatus() == 200) {
            return {
                status: jsonResponse.status, // Ex: 'sent', 'delivered', 'completed'
                message: "Consulta HTTP 200 Sucesso"
            };
        } else {
            return {
                status: null,
                message: "HTTP Status " + response.getHttpStatus() + " | Erro DocuSign: " + jsonResponse.message
            };
        }
    } catch (e) {
        logger.error("Erro ao chamar DocuSign Status API: " + e.message);
        return { status: null, message: "Erro de Conexão: " + e.message };
    }
}