/**
 * Função de Serviço (ServiceTask) para o Fluig.
 * Nome: servicetask114
 * Objetivo: Realizar a integração completa com a DocuSign para envio de um documento para assinatura.
 *
 * @param {number} attempt - O número da tentativa de execução da tarefa (padrão do Fluig).
 * @param {string} message - Uma mensagem de tentativa anterior (padrão do Fluig).
 * 
 * Fluxo de Execução:
 * 1. ETAPA 0: Carrega os dados do proponente (nome, e-mail) e a referência do documento do formulário do Fluig.
 *    - Acessa o GED (Gestão Eletrônica de Documentos) do Fluig para buscar o arquivo físico.
 *    - Converte o arquivo para o formato Base64, que é o exigido pela API da DocuSign.
 * 2. ETAPA 1: Autentica-se com o serviço de proxy (middleware em Node.js).
 *    - O proxy é responsável por lidar com a autenticação OAuth JWT Grant com a DocuSign.
 *    - Retorna um `accessToken` (token de acesso temporário) e o `accountId` (ID da conta DocuSign).
 * 3. ETAPA 2: Monta e envia o envelope para a API da DocuSign.
 *    - Constrói o objeto JSON (`envelopeDefinition`) com todos os detalhes do envio.
 *    - **Ponto Crítico:** Garante que todas as variáveis vindas do Fluig (que são objetos Java) sejam
 *      convertidas para strings puras de JavaScript antes de serem serializadas para JSON.
 *    - Realiza a chamada POST para a DocuSign para criar e enviar o envelope.
 * 4. ETAPA FINAL: Trata a resposta da DocuSign.
 *    - Se o envio for bem-sucedido (status HTTP 201), extrai o `envelopeId` da resposta.
 *    - Salva o `envelopeId` de volta em um campo do formulário Fluig para referência futura.
 *    - Em caso de qualquer erro, registra um log detalhado e lança uma exceção para interromper o processo no Fluig.
 */
function servicetask114(attempt, message) {
    // Prefixo para facilitar a busca e filtragem de logs no servidor Fluig.
    var logId = "--- [servicetask114 - vFinal-Comentado] ---\n";
    log.info(logId + "Iniciando processo completo: Obter Token e Enviar Envelope.");
    
    // Inicializa variáveis que serão usadas em múltiplos escopos.
    var accessToken = "", accountId = "";

    try {
        // =================================================================================
        // ETAPA 0: Ler dados do formulário e do documento no GED
        // =================================================================================
        log.info(logId + "ETAPA 0: Lendo dados do formulário e do GED...");

        // hAPI.getCardValue busca o valor de um campo do formulário pelo seu atributo 'name'.
        var documentId = hAPI.getCardValue("docRefSingn"); // ID do documento publicado no GED.
        var myEmail = hAPI.getCardValue("email");         // E-mail do proponente/signatário.
        var myName = hAPI.getCardValue("name");           // Nome do proponente/signatário.

        // Validação básica para garantir que os dados essenciais foram preenchidos.
        if (!documentId || !myEmail || !myName) {
            throw "Dados do formulário incompletos. Verifique os campos 'docRefSingn', 'email' e 'name'.";
        }

        // Acessando os serviços nativos do Fluig para manipulação de documentos.
        var documentService = fluigAPI.getDocumentService();
        var id = java.lang.Integer.valueOf(String(documentId)); // Converte o ID para o tipo Java Integer.
        
        // Busca o conteúdo binário do arquivo no GED.
        var contentBytes = documentService.getDocumentContentAsBytes(id);
        // Converte o array de bytes para uma string Base64. Este é o formato que a DocuSign espera.
        var docBase64FromGED = java.util.Base64.getEncoder().encodeToString(contentBytes);

        // Validação para garantir que o documento foi lido corretamente.
        if (!docBase64FromGED || docBase64FromGED.length() === 0) {
            throw "Não foi possível ler o conteúdo do documento ID: " + documentId + " do GED.";
        }
        
        log.info(logId + "ETAPA 0: Sucesso! Dados carregados: Nome=" + myName + ", Email=" + myEmail + ", DocID=" + documentId);

        // =================================================================================
        // ETAPA 1: Obter Token de Acesso via Proxy
        // =================================================================================
        log.info(logId + "ETAPA 1: Chamando o proxy de autenticação...");

        // `fluigAPI.getAuthorizeClientService()` é o serviço para fazer chamadas a APIs externas cadastradas no Fluig.
        var clientService = fluigAPI.getAuthorizeClientService();
        var tokenRequestData = {
            companyId: getValue("WKCompany") + "", // ID da empresa no Fluig.
            serviceCode: "api_gtw",                 // Alias do serviço REST cadastrado no Fluig para o proxy.
            endpoint: "/token-proxy",               // Endpoint específico no proxy que gera o token.
            method: "GET",                          // Método HTTP da requisição.
            timeoutService: "60000",                // Timeout em milissegundos.
            headers: { "AppToken": "e68e4fca-d941-423e-baca-a521318bf5c4" }, // Header de segurança customizado para o proxy.
        };
        // `clientService.invoke` executa a chamada. É crucial passar os dados como uma string JSON.
        var tokenResponse = clientService.invoke(JSON.stringify(tokenRequestData));
        
        // Verifica se a chamada HTTP foi bem-sucedida (código 200) e se houve um corpo de resposta.
        if (tokenResponse.getHttpStatusResult() == 200 && tokenResponse.getResult()) {
            var jsonResponse = JSON.parse(tokenResponse.getResult());
            accessToken = jsonResponse.accessToken;
            accountId = jsonResponse.accountId;
            log.info(logId + "ETAPA 1: SUCESSO! Token e Account ID obtidos.");
        } else {
            throw "Falha na ETAPA 1 (Proxy). Status: " + tokenResponse.getHttpStatusResult() + ". Corpo: " + tokenResponse.getResult();
        }

        // =================================================================================
        // ETAPA 2: Enviar Envelope para a DocuSign
        // =================================================================================
        log.info(logId + "ETAPA 2: Montando e enviando o envelope para a DocuSign...");

        // Este é o objeto principal que descreve a transação para a DocuSign.
        var envelopeDefinition = {
            emailSubject: "Projeto Praia: Documento para Assinatura", // Assunto do e-mail que o signatário receberá.
            status: "sent", // Define que o envelope deve ser enviado imediatamente após a criação.
            documents: [{
                /*
                 * EXPLICAÇÃO DA CORREÇÃO CRÍTICA (`"" + docBase64FromGED`):
                 * O motor JavaScript do Fluig (Rhino) trabalha com tipos de dados Java.
                 * A variável `docBase64FromGED` não é uma string pura de JavaScript, mas sim um objeto `java.lang.String`.
                 * O método `JSON.stringify` padrão do Rhino não sabe como converter certos objetos Java complexos,
                 * resultando no erro "...has no public instance field or method named 'toJSON'".
                 * Ao concatenar a variável com uma string vazia (`"" + ...`), forçamos o Rhino a converter
                 * o objeto `java.lang.String` para uma string primitiva de JavaScript, que o `JSON.stringify` consegue processar corretamente.
                 */
                documentBase64: "" + docBase64FromGED,
                name: "ContratoAdesaoSocio.pdf", // Nome do arquivo como aparecerá para o signatário.
                fileExtension: "pdf",
                documentId: "1" // ID único para o documento dentro deste envelope.
            }],
            recipients: {
                signers: [{
                    // A mesma correção `"" + ...` é aplicada aqui para garantir a conversão para strings JS.
                    email: "" + myEmail,
                    name: "" + myName,
                    recipientId: "1", // ID único para o destinatário dentro deste envelope.
                    tabs: { // 'Tabs' são os campos que o signatário irá preencher ou assinar.
                        signHereTabs: [{
                            // `anchorString` é uma "âncora" de texto no documento. A DocuSign posicionará
                            // a aba de assinatura perto da primeira ocorrência deste texto.
                            anchorString: "/sn1/",
                            anchorYOffset: "-0.5", // Ajuste fino da posição vertical.
                            anchorUnits: "inches"  // Unidade de medida para o ajuste.
                        }]
                    }
                }]
            }
        };
        
        // Montando os headers para a chamada à API da DocuSign.
        var docusignHeaders = { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" };
        var finalEndpoint = "/restapi/v2.1/accounts/" + accountId + "/envelopes"; // Endpoint padrão para criar envelopes.

        // Montando o objeto de requisição final para o `clientService.invoke`.
        var envelopeRequestData = {
            companyId: getValue("WKCompany") + "",
            serviceCode: "docusign_api", // Alias do serviço REST cadastrado no Fluig para a DocuSign.
            endpoint: finalEndpoint,
            method: "POST",
            timeoutService: "60000",
            headers: docusignHeaders,
            params: envelopeDefinition // O corpo da requisição é passado dentro do objeto `params`.
        };

        log.info(logId + "ETAPA 2: Chamando o serviço 'docusign_api'...");
        
        var envelopeResponse = clientService.invoke(JSON.stringify(envelopeRequestData));
        var envelopeResponseBody = envelopeResponse.getResult();

        log.info(logId + "ETAPA 2: Resposta recebida da DocuSign - Status: " + envelopeResponse.getHttpStatusResult());
        
        // Status 201 (Created) é a resposta de sucesso para a criação de um envelope.
        if (envelopeResponse.getHttpStatusResult() == 201) {
            var jsonResponseDocusign = JSON.parse(envelopeResponseBody);
            var envelopeId = jsonResponseDocusign.envelopeId;
            log.info(logId + "🏆🏆🏆 VITÓRIA! Envelope enviado. Envelope ID: " + envelopeId + " 🏆🏆🏆");
            
            // Armazena o ID do envelope de volta no formulário para rastreamento futuro.
            hAPI.setCardValue("codigoEvelope", envelopeId);
            
        } else {
            // Se a resposta não for 201, algo deu errado. Lança uma exceção com os detalhes.
            log.error(logId + "Corpo da resposta de erro: " + envelopeResponseBody);
            throw "Falha na ETAPA 2 (DocuSign). Status: " + envelopeResponse.getHttpStatusResult() + ".";
        }

    } catch (e) {
        // Bloco de captura para qualquer exceção lançada no `try`.
        log.error(logId + "!!! OCORREU UMA EXCEÇÃO GERAL !!!\n" + (e.message || e.toString()));
        // Lança a exceção novamente para que o Fluig marque a atividade como "Com Erro".
        throw (e.message || e.toString());
    }
    log.info(logId + "--- Fim do Processo ---");
}