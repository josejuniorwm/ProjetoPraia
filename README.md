# Projeto Praia - Automação de Admissão de Sócios

## 1. Visão Geral

Este projeto tem como objetivo principal a automação do processo de admissão de novos sócios para o Praia Clube. A solução integra a plataforma de gestão de processos **Fluig Cloud** com a API de assinatura eletrônica **DocuSign eSignature**, orquestrando o envio e a verificação de documentos de forma automatizada.

### Tecnologias Principais
*   **Plataforma de Processos:** Fluig Cloud
*   **Assinatura Eletrônica:** DocuSign eSignature API
*   **Middleware de Autenticação:** Um proxy em Node.js (com Express.js) para gerenciar a autenticação JWT Grant com a DocuSign, abstraindo a complexidade do servidor Fluig.

---

## 2. Arquitetura e Fluxo de Trabalho Final

A arquitetura final adota uma abordagem assíncrona e desacoplada, dividindo as responsabilidades de envio e verificação para garantir um processo mais robusto, escalável e alinhado às boas práticas da plataforma Fluig.

![Arquitetura do Fluxo](https-::/i.imgur.com/example.png) <!-- Você pode gerar um diagrama de fluxo e substituir este link -->

### Fluxo Detalhado

1.  **Início do Processo:** O usuário preenche o formulário de admissão no Fluig com seus dados (nome, e-mail) e anexa o documento necessário.
2.  **Envio do Envelope (`servicetask22`):**
    *   Uma tarefa de serviço é acionada.
    *   O script lê os dados dinamicamente do formulário usando `hAPI.getCardValue()`. 
    *   Ele se comunica com o proxy Node.js para obter um token de acesso da DocuSign.
    *   Com o token, ele monta e envia o envelope para o signatário via API da DocuSign.
    *   Após o envio bem-sucedido, o `envelopeId` retornado pela DocuSign é salvo em um campo do formulário (`codigoEvelope`). A tarefa é concluída.
3.  **Ponto de Espera (Gateway Exclusivo):**
    *   O fluxo de trabalho principal avança para um Gateway Exclusivo e fica em estado de espera.
    *   A condição de saída do gateway é aguardar que o campo de controle `assDocSignPropoente` seja igual a "S".
4.  **Verificação Assíncrona (Processo de Timer):**
    *   Um processo secundário, disparado por um timer (ex: a cada 30 minutos), é executado de forma independente.
    *   Este processo lê o `codigoEvelope` do formulário.
    *   Ele consulta a API da DocuSign para verificar o status do envelope correspondente.
    *   Quando o status do envelope muda para 'completed', o processo de timer atualiza o campo `assDocSignPropoente` para "S".
5.  **Continuação do Fluxo:**
    *   Com o campo de controle atualizado, a condição do Gateway Exclusivo é satisfeita.
    *   O processo principal de admissão é liberado e continua para as próximas etapas.

---

## 3. A Jornada da Depuração: Histórico e Evolução

O desenvolvimento desta integração foi uma jornada de aprendizado e refinamento, passando por diversos desafios que moldaram a solução final.

### Abordagem Inicial: Polling Síncrono
A primeira versão (`v15` do script) consolidava tudo em uma única tarefa de serviço: autenticava, enviava o envelope e entrava em um loop de polling síncrono, usando `java.lang.Thread.sleep()` para pausar e verificar o status.

### Desafios Superados

*   **Conectividade e Firewall:** A depuração inicial lidou com problemas de conexão entre o servidor Fluig e o proxy Node.js.
*   **Autenticação (`PARTNER_AUTHENTICATION_FAILED`):** Resolvido ao aprimorar o proxy para buscar dinamicamente o `accountId` correto associado ao usuário da API.
*   **Bugs da Plataforma Fluig:** Erros como `404 Not Found` e `NullPointerException` foram contornados através da construção manual do endpoint da API, em vez de depender de parâmetros nativos que se mostraram problemáticos.
*   **Validação de Documentos (`PDF_VALIDATION_FAILED`):** Um erro persistente que foi solucionado ao garantir a integridade da string Base64 do documento enviado.
*   **O Fantasma do `servicetask81`:** O maior desafio da abordagem síncrona. Um antigo script associado a um evento de timer no fluxograma era disparado durante o `Thread.sleep()`, causando um `TypeError: Cannot find function getLogger` e interrompendo o processo principal. A solução foi remover a associação deste script "fantasma" do evento de timer.

A superação desses desafios, especialmente o último, motivou a mudança para a **arquitetura assíncrona atual**, que é inerentemente mais segura contra interferências externas e não bloqueia a thread do servidor de aplicação.

---

## 4. Próximos Passos

Com a lógica de envio (`servicetask22`) e a arquitetura desacoplada definidas, os próximos passos são:

1.  **Implementar o Processo de Verificação:** Criar o novo processo de workflow no Fluig, acionado por um mecanismo de timer, que conterá a lógica para consultar o status do envelope e atualizar o formulário principal.
2.  **Configurar o Gateway Exclusivo:** Garantir que a condição de saída do gateway no processo principal esteja corretamente configurada para `hAPI.getCardValue("assDocSignPropoente") == "S"`.
3.  **Testes de Ponta a Ponta:** Executar o fluxo completo com dados reais para validar a orquestração entre os dois processos.