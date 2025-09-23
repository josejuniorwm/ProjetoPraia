# Projeto Praia - Documentação Técnica

## 1. Visão Geral

O Projeto Praia é uma solução de integração automatizada que conecta o ambiente Fluig do Praia Clube com a plataforma DocuSign para automatizar o processo de admissão de sócios.

### 1.1 Objetivo Principal
Automatizar completamente o ciclo de vida do processo de admissão de sócios, desde o envio do documento até a verificação da assinatura.

## 2. Arquitetura e Tecnologias

### 2.1 Componentes Principais
- **Plataforma Principal:** TOTVS Fluig (versão Cloud)
  - URL: `https://praiaclube201511.fluig.cloudtotvs.com.br:10201/`

- **Serviço de Assinatura:** DocuSign (eSignature API)

- **Ambiente de Desenvolvimento:**
  - Eclipse com plugin Fluig Studio
  - Server-Side JavaScript (SSJS)

- **Servidor Proxy:**
  - Tecnologia: Node.js (Express.js)
  - Endpoint: `http://75.119.141.135:3000/token-proxy`
  - Arquivo Principal: `proxyServer.js` (anteriormente `jwtConsole.js`)

### 2.2 Autenticação
- Método: JWT Grant
- Gerenciamento: Via servidor proxy
- Objetivo: Obtenção segura do Access Token

## 3. Fluxo do Processo (Workflow BPM)

### 3.1 Início do Processo
- Gatilho: Automático via SOAP
- Sem intervenção manual necessária

### 3.2 Fluxo de Execução
1. **Início Automático**
   - Recebimento dos dados do novo sócio via SOAP
   - Avanço automático para primeira tarefa de serviço

2. **Tarefa Principal de Serviço**
   - Identificador: `servicetask81`
   - Nome: "Consultar Assinatura na Docusign"
   - Status: Ponto de parada do processo

3. **Lógica de Polling**
   - **Primeira Execução:**
     - Chama proxy para token DocuSign
     - Envia PDF para assinatura
     - Salva `envelopeIdDocuSign`
     - Define status (`assDocSignPropoente`) como "PENDENTE"
   
   - **Execuções Subsequentes:**
     - Verifica status do envelope via ID
     - Atualiza campo de status conforme necessário

4. **Gateway de Decisão**
   - Tipo: Exclusive Gateway
   - Verifica campo: `assDocSignPropoente`
   - **Caminhos:**
     - Sucesso ("S"): Avança para próxima etapa
     - Pendente ("N" ou "PENDENTE"): Mantém em loop

## 4. Componentes e Scripts

### 4.1 Script Principal
- **Nome:** `AdmissãodeSocios.servicetask81.js`
- **Localização:** Pasta de scripts do processo (Projeto Fluig/Eclipse)
- **Funcionalidades:**
  - Chamada ao serviço proxy
  - Obtenção do Access Token
  - Envio de envelope DocuSign
  - Consulta de status (polling)
  - Atualização de campos no Fluig

### 4.2 Configuração de Autenticação
- **Arquivo:** `jwtConfig.json`
- **Conteúdo:** Credenciais para autenticação JWT
  - Client ID
  - User ID
  - Chave Privada

## 5. Status do Projeto

### 5.1 Atual
- ✅ Código do script principal finalizado
- ✅ Servidor proxy implementado e funcional
- ✅ Integrações básicas estabelecidas

### 5.2 Próximos Passos
- 🔄 Iniciar fase de testes
  - Validar envio de documentos
  - Testar funcionamento do polling
  - Verificar decisões do gateway

## 6. Repositório

- **GitHub:** [josejuniorwm/ProjetoPraia](https://github.com/josejuniorwm/ProjetoPraia)
- **Mantido por:** [@josejuniorwm](https://github.com/josejuniorwm)

## 7. Notas de Desenvolvimento

- Manter backup dos arquivos de configuração
- Documentar alterações no workflow
- Registrar casos de teste e resultados
- Acompanhar métricas de performance do polling

---

*Última atualização: 2025-09-23 15:32:46*