chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "PROCESS_WITH_AI") {
    chrome.storage.local.set({ 
      statusExtracao: 'processando', 
      resultadoIA: null, 
      erroIA: null,
      textoBruto: request.text 
    });


    const manterWorkerAcordado = setInterval(() => {
      chrome.storage.local.get(['statusExtracao'], () => {});
    }, 20000);

    processarComIA(request.text)
      .then(resultado => {
        chrome.storage.local.set({ statusExtracao: 'concluido', resultadoIA: resultado });
        sendResponse({ result: resultado }); 
      })
      .catch(erro => {
        chrome.storage.local.set({ statusExtracao: 'erro', erroIA: erro.message });
        sendResponse({ error: erro.message });
      })
      .finally(() => {
        clearInterval(manterWorkerAcordado);
      });
      
    return true; 
  }
});

type AIConfig = {
  provider: string;
  url?: string;
  apiKey?: string;
  systemPrompt: string;
  model?: string;
  numCtx: number;
  numPredict: number;
  temperature: number;
};

type AIProviderFunction = (textoDaVaga: string, config: AIConfig) => Promise<string>;

const processarComOllama: AIProviderFunction = async (textoDaVaga, config) => {
  const urlLocal = config.url || 'http://127.0.0.1:11434/api/chat';
  const model = config.model || 'llama3';
  
  try {
    const resposta = await fetch(urlLocal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: textoDaVaga },
        ],
        stream: false,
        format: "json",
        options: {
          num_ctx: config.numCtx,
          num_predict: config.numPredict,
          temperature: config.temperature,
        },
      }),
    });

    if (!resposta.ok) {
      const erroServidor = await resposta.text();
      console.error(`[Ollama Debug] Erro do Servidor:`, erroServidor);
      throw new Error(`Erro ${resposta.status} no servidor: ${erroServidor}`);
    }

    const json = await resposta.json();
    return json.message.content;

  } catch (err: any) {
    console.error(`[Ollama Debug] EXCEÇÃO FATAL NO FETCH:`, err);
    throw new Error(`Detalhe do erro: ${err.message || 'Erro desconhecido'}`);
  }
};

/**
 * Provider: Chrome AI integrada (Gemini Nano on-device via Prompt API).
 */
const processarComChrome: AIProviderFunction = async (textoDaVaga, config) => {
  try {
    const LanguageModelAPI = (globalThis as any).LanguageModel;
    if (!LanguageModelAPI) {
      throw new Error("API nativa do Chrome (LanguageModel) não encontrada. As flags estão ativas?");
    }

    const session = await LanguageModelAPI.create({
      initialPrompts: [{ role: 'system', content: config.systemPrompt }],
    });

    const resposta = await session.prompt(textoDaVaga);
    session.destroy();

    const respostaTratada = resposta.replace(/^```(?:json)?/im, '').replace(/```$/m, '').trim();

    return respostaTratada;
  } catch (err: any) {
    throw new Error(`Falha no Chrome AI: ${err.message}`);
  }
};

/**
 * Provider: ChatGPT (OpenAI Chat Completions API).
 */
const processarComChatGPT: AIProviderFunction = async (textoDaVaga, config) => {
  if (!config.apiKey) {
    throw new Error("API key não configurada para o ChatGPT.");
  }

  const url = config.url || 'https://api.openai.com/v1/chat/completions';
  const model = config.model || 'gpt-4o-mini';

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: textoDaVaga },
        ],
        temperature: config.temperature,
        max_tokens: config.numPredict || 2048,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resposta.ok) {
      const erroServidor = await resposta.text();
      console.error(`[ChatGPT Debug] Erro do Servidor:`, erroServidor);
      throw new Error(`Erro ${resposta.status} no servidor: ${erroServidor}`);
    }

    const json = await resposta.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta da API não contém choices[0].message.content.');
    }
    return content;
  } catch (err: any) {
    console.error(`[ChatGPT Debug] EXCEÇÃO FATAL NO FETCH:`, err);
    throw new Error(`Detalhe do erro: ${err.message || 'Erro desconhecido'}`);
  }
};

/**
 * Provider: Claude (Anthropic Messages API).
 */
const processarComClaude: AIProviderFunction = async (textoDaVaga, config) => {
  if (!config.apiKey) {
    throw new Error("API key não configurada para o Claude.");
  }

  const url = config.url || 'https://api.anthropic.com/v1/messages';
  const model = config.model || 'claude-haiku-4-5-20251001';

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: config.numPredict || 2048,
        system: config.systemPrompt,
        messages: [{ role: 'user', content: textoDaVaga }],
        temperature: config.temperature,
      }),
    });

    if (!resposta.ok) {
      const erroServidor = await resposta.text();
      console.error(`[Claude Debug] Erro do Servidor:`, erroServidor);
      throw new Error(`Erro ${resposta.status} no servidor: ${erroServidor}`);
    }

    const json = await resposta.json();
    const textBlock = (json.content as any[])?.find((b) => b.type === 'text');
    if (!textBlock) {
      throw new Error('Resposta da API Claude não contém bloco de texto.');
    }
    return textBlock.text;
  } catch (err: any) {
    console.error(`[Claude Debug] EXCEÇÃO FATAL NO FETCH:`, err);
    throw new Error(`Detalhe do erro: ${err.message || 'Erro desconhecido'}`);
  }
};

const roteadorIA: Record<string, AIProviderFunction> = {
  ollama: processarComOllama,
  chrome: processarComChrome,
  chatgpt: processarComChatGPT,
  claude: processarComClaude,
};

async function processarComIA(textoDaVaga: string) {
  const dados = await chrome.storage.local.get([
    'provider', 'url', 'apiKey', 'systemPrompt', 'model',
    'numCtx', 'numPredict', 'temperature',
  ]);
  
  const config: AIConfig = {
    provider: (dados.provider as string) || 'ollama',
    url: dados.url as string,
    apiKey: dados.apiKey as string,
    systemPrompt: (dados.systemPrompt as string) || 'Extraia os dados em JSON.',
    model: (dados.model as string) || 'llama3',
    numCtx: Number(dados.numCtx) || 8192,
    numPredict: Number(dados.numPredict) || 2048, 
    temperature: Number(dados.temperature) || 0.1,
  };

  const executarChamadaIA = roteadorIA[config.provider];

  if (!executarChamadaIA) {
    throw new Error(`O provedor '${config.provider}' ainda não foi implementado.`);
  }

  return await executarChamadaIA(textoDaVaga, config);
}