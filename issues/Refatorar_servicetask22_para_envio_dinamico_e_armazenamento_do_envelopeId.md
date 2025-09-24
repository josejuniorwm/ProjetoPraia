# Refatorar servicetask22 para envio dinâmico e armazenamento do envelopeId

Esta tarefa consiste em refatorar o script `servicetask22` para remover a lógica de polling e integrar-se completamente aos formulários dinâmicos do Fluig.

**Requisitos:**

1.  **Remover Lógica de Polling:**
    *   Eliminar o loop `while` e as chamadas `java.lang.Thread.sleep()`.  
    *   O script deve ter a responsabilidade única de **enviar o envelope**.

2.  **Utilizar Dados Dinâmicos do Formulário:**
    *   Substituir os dados mocados (hardcoded) pelas seguintes chamadas da API do Fluig:
        *   `var documentId = hAPI.getCardValue("docRefSingn");`
        *   `var myEmail = hAPI.getCardValue("email");`
        *   `var myName = hAPI.getCardValue("name");`

3.  **Armazenar o ID do Envelope:**
    *   Após a criação bem-sucedida do envelope na DocuSign, o `envelopeId` retornado deve ser salvo em um campo do formulário.
    *   Utilizar a chamada: `hAPI.setCardValue("codigoEvelope", envelopeId);`

4.  **Tratamento de Erros:**
    *   O script deve incluir um tratamento de erro robusto.
    *   Se o envio do envelope falhar, uma exceção deve ser lançada para interromper o processo no Fluig e sinalizar o erro.