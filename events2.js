function beforeTaskSave(colleagueId, nextSequenceId, userList) {
    var activity = getValue("WKNumState"); // Etapa atual do processo
    var isMobile = getValue("WKMobile"); // Verifica se o acesso é mobile

    // Identifica o momento exato em que o documento deve ser enviado para assinatura.
    // Exemplo: Quando o processo sai da etapa '10' (Criação/Análise) para a próxima.
    if (activity == 10) { 
        try {
            // 1. COLETAR DADOS DO FLUIG PARA O DOCUSIGN
            // O ID do documento a ser assinado deve ser recuperado do Fluig.
            // Geralmente, o documento é um anexo ou um documento da Central de Documentos.
            
            // --- Exemplo de recuperação do documento (Ajuste conforme o seu método) ---
            var documentoId = hAPI.getCardValue("documento_id_field"); // Campo do formulário com o ID do doc
            var documentoBase64 = getDocumentContentAsBase64(documentoId); // Função utilitária SSJS para conversão
            
            // --- Exemplo de Signatários (Recuperação de campos de formulário) ---
            var signatarios = [
                {
                    nome: hAPI.getCardValue("assinante_nome"),
                    email: hAPI.getCardValue("assinante_email")
                }
                // Adicione lógica de loop para vários signatários, se necessário.
            ];

            
            // 2. CHAMADA AO SERVIÇO DOCUSIGN
            // Chamamos sua função JavaScript que lida com JWT e o envio REST.
            var resultadoEnvio = enviarEnvelopeDocuSign(documentoBase64, signatarios);
            
            
            // 3. TRATAMENTO DO RESULTADO
            if (resultadoEnvio.sucesso) {
                // Se o envio foi OK, salva o ID do Envelope para rastreamento futuro
                hAPI.setCardValue("docusign_envelope_id", resultadoEnvio.envelopeId);
                log.info("Sucesso: Envelope DocuSign " + resultadoEnvio.envelopeId + " enviado.");
                
            } else {
                // Se houve falha (Token, API, etc.), impede o avanço do processo
                var msgErro = "Falha na integração DocuSign: " + resultadoEnvio.mensagem;
                hAPI.setFailedProcess(msgErro);
                log.error(msgErro);
            }

        } catch (e) {
            // Captura erros críticos (ex: chave privada não encontrada)
            var msgErroCritico = "Erro Crítico no SSJS: " + e.message;
            hAPI.setFailedProcess(msgErroCritico);
            log.error(msgErroCritico);
        }
    }
    
    // Se a lógica do DocuSign não causou um erro (hAPI.setFailedProcess), 
    // o processo será salvo e avançará.
}

// ATENÇÃO: A função 'getDocumentContentAsBase64' e as funções DocuSign 
// (getDocuSignAccessToken, enviarEnvelopeDocuSign) DEVEM ser definidas ANTES 
// desta função beforeTaskSave, no mesmo arquivo events.js ou importadas.