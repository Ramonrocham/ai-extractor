import { useState, useEffect } from 'react';
import { PROMPT_PADRAO } from './propmt';

const MODEL_PLACEHOLDER: Record<string, string> = {
  ollama: 'llama3',
  chatgpt: 'gpt-4o-mini',
  claude: 'claude-haiku-4-5-20251001',
};

const URL_PLACEHOLDER: Record<string, string> = {
  ollama: 'http://127.0.0.1:11434/api/chat',
  chatgpt: 'https://api.openai.com/v1/chat/completions (padrão — deixe em branco pra usar)',
  claude: 'https://api.anthropic.com/v1/messages (padrão — deixe em branco pra usar)',
};

function Options() {
  const [provider, setProvider] = useState('ollama');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PADRAO);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [model, setModel] = useState('');
  const [numCtx, setNumCtx] = useState(8192);
  const [numPredict, setNumPredict] = useState(2048);
  const [temperature, setTemperature] = useState(0.1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      ['provider', 'url', 'apiKey', 'model', 'systemPrompt', 'numCtx', 'numPredict', 'temperature'],
      (dados) => {
        if (dados.provider) setProvider(dados.provider as string);
        if (dados.url) setUrl(dados.url as string);
        if (dados.apiKey) setApiKey(dados.apiKey as string);
        if (dados.systemPrompt) setSystemPrompt(dados.systemPrompt as string);
        if (dados.model) setModel(dados.model as string);
        if (dados.numCtx) setNumCtx(dados.numCtx as number);
        if (dados.numPredict) setNumPredict(dados.numPredict as number);
        if (dados.temperature) setTemperature(dados.temperature as number);
      }
    );
  }, []);

  const handleSave = () => {
    setStatus('saving');

    chrome.storage.local.set(
      { provider, url, apiKey, systemPrompt, model, numCtx, numPredict, temperature },
      () => {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 3000);
      }
    );
  };
  /**
   * limpa model na troca de provider
   */
  const handleProviderChange = (novoProvider: string) => {
    setProvider(novoProvider);
    setModel('');
  };

  const precisaDeUrl = provider === 'ollama' || provider === 'chatgpt' || provider === 'claude';
  const urlObrigatoria = provider === 'ollama';
  const precisaDeApiKey = provider === 'chatgpt' || provider === 'claude';
  const precisaDeModelo = provider === 'ollama' || provider === 'chatgpt' || provider === 'claude';
  const precisaDeAvancado = provider === 'ollama' || provider === 'chatgpt' || provider === 'claude';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        
        <header className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Configurações da IA
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Escolha como o Extrator de Vagas deve processar os dados.
          </p>
        </header>

        <main className="flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-slate-700">Provedor de IA</label>
            <select 
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="chrome">Chrome Built-in AI (Gemini Nano)</option>
              <option value="ollama">Ollama (Servidor Local)</option>
              <option value="chatgpt">ChatGPT (OpenAI)</option>
              <option value="claude">Claude (Anthropic)</option>
            </select>
          </div>

          {precisaDeUrl && (
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-700">
                URL do Endpoint {urlObrigatoria && <span className="text-red-500">*</span>}
              </label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={URL_PLACEHOLDER[provider]}
                className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
              />
              {!urlObrigatoria && (
                <p className="text-xs text-slate-400">
                  Opcional — deixe em branco pra usar o endpoint oficial. Só preencha se estiver usando um proxy ou uma conta compatível (ex: Azure OpenAI).
                </p>
              )}
            </div>
          )}

          {precisaDeApiKey && (
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-700">
                API Key <span className="text-red-500">*</span>
              </label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'chatgpt' ? 'sk-...' : 'sk-ant-...'}
                className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          )}

          {precisaDeModelo && (
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-700">
                Nome do Modelo
              </label>
              <input 
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={MODEL_PLACEHOLDER[provider]}
                className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          )}

          {precisaDeAvancado && (
            <div>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-500 text-sm hover:underline"
              >
                {showAdvanced ? "Ocultar Configurações Avançadas" : "Mostrar Configurações Avançadas"}
              </button>
              {showAdvanced && (
                <div className="mt-4 p-4 border rounded bg-gray-50 space-y-3">
                  {provider === 'ollama' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Context Window (num_ctx) - RAM
                      </label>
                      <input 
                        type="number" 
                        value={numCtx} 
                        step="1024"
                        onChange={(e) => setNumCtx(Number(e.target.value))} 
                        className="w-full border rounded p-1 text-sm mt-1"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Mínimo recomendado: 8192 — abaixo disso o Ollama trunca o prompt silenciosamente.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Max Tokens (num_predict) - Resposta
                    </label>
                    <input 
                      type="number" 
                      value={numPredict} 
                      step="512"
                      onChange={(e) => setNumPredict(Number(e.target.value))} 
                      className="w-full border rounded p-1 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Temperatura (Criatividade)
                    </label>
                    <input 
                      type="number" 
                      value={temperature} 
                      step="0.1" 
                      min="0" 
                      max="2"
                      onChange={(e) => setTemperature(Number(e.target.value))} 
                      className="w-full border rounded p-1 text-sm mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-4">
            <div className="flex justify-between items-end">
              <label className="font-semibold text-slate-700">System Prompt</label>
              <button 
                onClick={() => setSystemPrompt(PROMPT_PADRAO)}
                className="text-xs text-blue-600 hover:underline"
              >
                Restaurar Padrão
              </button>
            </div>
            <textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-48 p-3 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-[11px] resize-y"
            />
          </div>

        </main>

        <footer className="mt-8 pt-4 border-t border-slate-200 flex justify-end items-center gap-4">
          {status === 'saved' && <span className="text-green-600 font-medium text-sm">Configurações salvas!</span>}
          <button 
            onClick={handleSave}
            disabled={status === 'saving'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors disabled:bg-blue-400"
          >
            {status === 'saving' ? 'Salvando...' : 'Salvar Preferências'}
          </button>
        </footer>

      </div>
    </div>
  );
}

export default Options;