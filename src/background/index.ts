chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "PROCESS_WITH_AI") {
    chrome.storage.local.set({ 
      statusExtracao: 'processando', 
      resultadoIA: null, 
      erroIA: null,
      textoBruto: request.text 
    });

    processarComIA(request.text)
      .then(resultado => {
        chrome.storage.local.set({ statusExtracao: 'concluido', resultadoIA: resultado });
        sendResponse({ result: resultado }); 
      })
      .catch(erro => {
        chrome.storage.local.set({ statusExtracao: 'erro', erroIA: erro.message });
        sendResponse({ error: erro.message });
      });
      
    return true; 
  }
});

type AIConfig = {
  provider: string;
  url?: string;
  apiKey?: string;
  systemPrompt: string;
  model?: String;
};

type AIProviderFunction = (textoDaVaga: string, config: AIConfig) => Promise<string>;

const processarComOllama: AIProviderFunction = async (textoDaVaga, config) => {
  const urlLocal = config.url || 'http://127.0.0.1:11434/api/generate';
  const model = config.model || 'llama3';
  const promptCompleto = `${config.systemPrompt}\n\n--- TEXTO DA VAGA ---\n${textoDaVaga}`;
  
  try {
    const resposta = await fetch(urlLocal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model, 
        prompt: promptCompleto,
        stream: false, 
        options: {
          num_predict: 2048 
        }
      })
    });

    if (!resposta.ok) {
      const erroServidor = await resposta.text();
      console.error(`[Ollama Debug] Erro do Servidor:`, erroServidor);
      throw new Error(`Erro ${resposta.status} no servidor: ${erroServidor}`);
    }

    const json = await resposta.json();
    return json.response;

  } catch (err: any) {
    console.error(`[Ollama Debug] EXCEÇÃO FATAL NO FETCH:`, err);
    throw new Error(`Detalhe do erro: ${err.message || 'Erro desconhecido'}`);
  }
};

const processarComChrome: AIProviderFunction = async (textoDaVaga, config) => {
  const promptCompleto = `${config.systemPrompt}\n\n--- TEXTO DA VAGA ---\n${textoDaVaga}`;
  
  try {
    const aiAPI = (globalThis as any).ai;
    if (!aiAPI || !aiAPI.languageModel) {
      throw new Error("API nativa do Chrome não encontrada. As flags estão ativas?");
    }

    const session = await aiAPI.languageModel.create();
    const resposta = await session.prompt(promptCompleto);
    session.destroy();
    
    return resposta;
  } catch (err: any) {
    throw new Error(`Falha no Chrome AI: ${err.message}`);
  }
};

const roteadorIA: Record<string, AIProviderFunction> = {
  ollama: processarComOllama,
  chrome: processarComChrome,
};

async function processarComIA(textoDaVaga: string) {
  const dados = await chrome.storage.sync.get(['provider', 'url', 'apiKey', 'systemPrompt', 'model']);
  
  const config: AIConfig = {
    provider: (dados.provider as string) || 'ollama',
    url: dados.url as string,
    apiKey: dados.apiKey as string,
    systemPrompt: (dados.systemPrompt as string) || 'Extraia os dados em JSON.',
    model: (dados.model as String) || 'llama3'
  };

  const executarChamadaIA = roteadorIA[config.provider];

  if (!executarChamadaIA) {
    throw new Error(`O provedor '${config.provider}' ainda não foi implementado.`);
  }

  return await executarChamadaIA(textoDaVaga, config);
}