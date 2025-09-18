/**
 * ==============================================================================
 * * DOCUSIGN UTILITY SERVICE (docusignUtils.js)
 * * Este módulo contém a lógica de segurança (JWT Grant) e as chamadas REST para 
 * a eSignature API do DocuSign. É projetado para ser chamado a partir do events.js.
 * * ==============================================================================
 */

// ******************************************************************************
// 1. CONFIGURAÇÕES - OBRIGATÓRIO: LER DE UM DATASET OU ARQUIVO SEGURO
// ******************************************************************************

// Estes valores NÃO devem estar no código-fonte em produção!
var DS_INTEGRATION_KEY = 'SEU_INTEGRATION_KEY_CLIENT_ID'; 
var DS_USER_ID = 'SEU_USER_ID_GUID';
var DS_ACCOUNT_ID = 'SEU_DOCUSIGN_ACCOUNT_ID'; // Necessário para a API eSignature
var DS_PRIVATE_KEY_PATH = '/path/seguro/para/sua/chave.pem'; // Caminho no servidor Fluig

// URLs de API (Ambiente Demo - Mude para 'www.docusign.net' em produção)
var DS_AUTH_URL = 'https://account-d.docusign.com/oauth/token';
var DS_API_URL_BASE = 'https://demodal.docusign.net/restapi/v2.1/accounts/';

// ******************************************************************************
// 2. FUNÇÕES ESSENCIAIS DE UTILIDADE (Mapeamento para APIs do Fluig/Rhino)
// ******************************************************************************

/**
 * Funções utilitárias SSJS/Rhino para manipulação de strings/arquivos.
 * NOTA: Você deve implementar/mapear estas funções para o seu ambiente Fluig.
 */

// Mapeamento: Lê o conteúdo do arquivo da chave privada do caminho seguro.
function readPrivateKeyContent(path) {
    // Exemplo: Use o FileSystemUtil do Java/Fluig, se exposto ao Rhino.
    // Retorna o conteúdo da chave privada como uma string PEM.
    return FileSystem.readFile(path); 
}

// Mapeamento: Função de Criptografia RSA/SHA256 e Base64Url Safe.
function jwtSign(headerPayloadString, privateKey) {
    // ESTE É O PONTO CRÍTICO. 
    // O DocuSign exige RS256. Esta função deve:
    // 1. Fazer o hash SHA256 da string `header.payload`.
    // 2. Assinar o hash com a Chave Privada (RSA).
    // 3. Codificar o resultado usando Base64Url Safe.
    
    // Assumindo que existe um utilitário de criptografia JS/Java exposto ao Rhino.
    var signature = CryptoUtil.signRS256(headerPayloadString, privateKey);
    return signature; 
}


// ******************************************************************************
// 3. GERAÇÃO DO ACCESS TOKEN (JWT GRANT)
// ******************************************************************************

function getDocuSignAccessToken() {
    var privateKeyContent = readPrivateKeyContent(DS_PRIVATE_KEY_PATH);

    if (!privateKeyContent) {
        throw new Error("Chave privada do DocuSign não encontrada ou inacessível.");
    }
    
    // 3.1. Montar o JWT Header e Payload
    var now = Math.floor(Date.now() / 1000);
    var expiresIn = 3600; // 1 hora
    
    var header = {
        "alg": "RS256", // Algoritmo Assinado
        "typ": "JWT"
    };
    
    var payload = {
        "iss": DS_INTEGRATION_KEY,
        "sub": DS_USER_ID,
        "iat": now,
        "exp": now + expiresIn,
        "aud": 'account-d.docusign.com',
        "scope": 'signature impersonation' // Escopo necessário
    };
    
    // 3.2. Codificação Base64Url (Assumindo que uma função utilitária lida com isso)
    var b64Header = Base64Util.encodeURLSafe(JSON.stringify(header));
    var b64Payload = Base64Util.encodeURLSafe(JSON.stringify(payload));
    
    var headerPayload = b64Header + "." + b64Payload;
    
    // 3.3. Assinar o JWT
    var signature = jwtSign(headerPayload, privateKeyContent);
    var jwtToken = headerPayload + "." + signature;

    // 3.4. Trocar o JWT por Access Token (Requisição POST)
    var authPayload = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwtToken;

    var response = hAPI.doHttpRequest(DS_AUTH_URL, 'POST', authPayload, {
        'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    var jsonResponse = JSON.parse(response.getResult());
    
    if (jsonResponse.access_token) {
        return jsonResponse.access_token;
    } else {
        // Lançar um erro detalhado para ser capturado no events.js
        throw new Error('Falha no OAuth DocuSign: ' + (jsonResponse.error_description || 'Erro Desconhecido'));
    }
}


// ******************************************************************************
// 4. ENVIO DO ENVELOPE (E-Signature API Call)
// ******************************************************************************

/**
 * Envia o documento para assinatura, após obter o Access Token.
 * @param {string} documentoBase64 - Conteúdo do documento em Base64.
 * @param {Array} signatarios - Array de objetos { nome: string, email: string }.
 * @returns {object} { sucesso: boolean, envelopeId: string, mensagem: string }
 */
function enviarEnvelopeDocuSign(documentoBase64, signatarios) {
    try {
        // 4.1. Obter o Access Token seguro
        var accessToken = getDocuSignAccessToken();
        
        // 4.2. Mapeamento de Signatários
        var recipients = signatarios.map(function(s, index) {
            return {
                email: s.email,
                name: s.nome,
                recipientId: (index + 1),
                routingOrder: (index + 1),
                tabs: {
                    signHereTabs: [{
                        anchorString: "/assinar" + (index + 1) + "/", // Âncora no documento (ex: /assinar1/)
                        anchorUnits: "pixels",
                        anchorXOffset: "10",
                        anchorYOffset: "20"
                    }]
                }
            };
        });

        // 4.3. Montar o Payload do Envelope
        var envelopePayload = {
            emailSubject: "Documento para Assinatura Fluig - " + getValue("WKNumProceso"),
            documents: [{
                documentId: "1",
                name: "Documento do Processo Fluig",
                documentBase64: documentoBase64,
                fileExtension: "pdf",
                order: 1
            }],
            recipients: {
                signers: recipients
            },
            status: "sent" // Envia imediatamente
        };
        
        // 4.4. Chamada Final para a API eSignature
        var apiUrl = DS_API_URL_BASE + DS_ACCOUNT_ID + '/envelopes';
        
        var headers = {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        };

        var response = hAPI.doHttpRequest(apiUrl, 'POST', JSON.stringify(envelopePayload), headers);
        var jsonResponse = JSON.parse(response.getResult());
        
        if (jsonResponse.envelopeId) {
            return {
                sucesso: true,
                envelopeId: jsonResponse.envelopeId
            };
        } else {
            // Captura erros da API DocuSign
            return {
                sucesso: false,
                mensagem: jsonResponse.message || 'Falha ao enviar envelope DocuSign.'
            };
        }

    } catch (e) {
        // Retorna o erro de autenticação/criptografia para o events.js
        return {
            sucesso: false,
            mensagem: 'Erro de Autenticação (JWT): ' + e.message
        };
    }
}