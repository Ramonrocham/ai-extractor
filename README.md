# AI Extractor Extension

Um extrator de dados de vagas de emprego estruturado via Inteligência Artificial, construído como uma extensão para o Google Chrome.

## Sobre o Projeto (Escopo)

O **AI Extractor** nasceu com o objetivo de capturar textos desestruturados de páginas de vagas de emprego (como LinkedIn e Gupy) e convertê-los em um objeto JSON estrito e padronizado.

O grande diferencial deste projeto é a sua **arquitetura de cliente LLM**. Em vez de ficar preso a um único provedor de IA, a extensão possui um roteador inteligente (`roteadorIA`) que permite ao usuário escolher entre rodar modelos localmente (garantindo privacidade e custo zero) ou utilizar as APIs mais poderosas do mercado na nuvem.

> **Aviso de Portfólio:** Este é um projeto de cunho educacional e de portfólio. Foi desenvolvido para explorar a integração de Extensões de Navegador com APIs de *Large Language Models* (LLMs), manipulação de estados complexos em React e arquitetura de software focada no princípio Open/Closed (fácil de estender para novos provedores, sem modificar o núcleo).
> 
> 

## Tecnologias Utilizadas

* **Frontend:** React, TypeScript e Tailwind CSS.


* **Armazenamento:** `chrome.storage.local` para lidar com grandes volumes de dados e evitar limites.


* **Integração de IA:**
* Ollama (Local SLMs/LLMs)


* OpenAI API (ChatGPT)


* Anthropic API (Claude)


* Chrome Built-in AI (Gemini Nano *on-device*)



---

## Como Configurar os Provedores de IA

Acesse a página de Opções da extensão clicando com o botão direito no ícone dela e selecionando **"Opções"**. A interface permite configurar os seguintes provedores:

### 1. Ollama (Servidor Local)

A opção perfeita para quem quer processar dados sem enviar informações para a nuvem.

* **Pré-requisito:** Ter o [Ollama](https://ollama.com/) instalado e rodando na máquina.
* **URL do Endpoint:** `http://127.0.0.1:11434/api/chat` (Obrigatório).


* **Nome do Modelo:** Digite o nome do modelo que você baixou (ex: `llama3`, `qwen2.5:3b`).


* **Avançado:** Recomenda-se manter o `num_ctx` em `8192` para evitar que o modelo perca contexto, e `temperature` em `0.1` para forçar a IA a respeitar a formatação JSON passado pelo prompt.



### 2. ChatGPT (OpenAI)

Para utilizar os modelos de ponta da OpenAI, garantindo um JSON perfeito nativamente (`response_format: { type: 'json_object' }`).

* **API Key:** Obrigatório. Insira sua chave `sk-...` gerada no painel da OpenAI.


* **Nome do Modelo:** Padrão sugerido é o `gpt-4o-mini` (rápido e de baixo custo).


* **URL do Endpoint:** Deixe em branco para usar o endpoint oficial. Só preencha se estiver usando um *proxy* ou uma infraestrutura compatível, como o Azure OpenAI.



### 3. Claude (Anthropic)

Utiliza a API de *Messages* da Anthropic.

* **API Key:** Obrigatório. Insira sua chave `sk-ant-...`.


* **Nome do Modelo:** Padrão sugerido é o `claude-haiku-4-5-20251001`.


* **URL do Endpoint:** Deixe em branco, a menos que utilize um *proxy*.



### 4. Chrome Built-in AI (Gemini Nano)

Utiliza o modelo integrado diretamente no motor do Google Chrome (através da API experimental `LanguageModel`), processando o texto diretamente no navegador do usuário, sem necessidade de servidores externos.

* **Atenção:** Esta é uma funcionalidade experimental. A janela de contexto é limitada (~4K tokens). Se as extrações falharem com vagas muito longas, ajuste o *System Prompt* na interface para uma versão mais enxuta.


* **Pré-requisito:** Necessário ativar as *flags* experimentais de IA no seu navegador Chrome.



---

## Configurações Avançadas e System Prompt

A aba de configurações permite gerenciar parâmetros refinados do motor de inferência:

* **Context Window (`num_ctx`):** Define a "mesa de trabalho" da IA em memória RAM. Crucial para rodar o Ollama sem quebrar prompts grandes.


* **Max Tokens (`num_predict`):** O limite de palavras geradas na resposta (Padrão: 2048).


* **Temperatura:** Controle de "criatividade". Mantido em 0.1 para priorizar o raciocínio lógico e determinístico ao montar o JSON.



A extensão também conta com um editor de **System Prompt** embutido, permitindo que as regras de extração (como as heurísticas de JSON estrito) sejam testadas e atualizadas diretamente na interface, persistindo os dados no `chrome.storage.local`.

---

## Como Instalar

Como a extensão ainda não está publicada na Chrome Web Store, a instalação é feita manualmente em poucos passos:

1. Vá até a página de [Releases](../../releases) deste repositório (ou clique em "Releases" na barra lateral direita).
2. Baixe o arquivo `.zip` da versão mais recente (ex: `ai-extractor-vX.X.X.zip`).
3. Extraia o conteúdo do arquivo `.zip` em uma pasta no seu computador.
4. Abra o Google Chrome e acesse a página de extensões digitando `chrome://extensions/` na barra de endereços.
5. No canto superior direito, ative a opção **"Modo do desenvolvedor"** (Developer mode).
6. Clique no botão **"Carregar sem compactação"** (Load unpacked) que aparecerá no canto superior esquerdo.
7. Selecione a pasta que você extraiu no passo 3.
8. Pronto! O ícone da extensão já deve aparecer no seu navegador.