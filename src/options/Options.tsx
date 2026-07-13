import { useState, useEffect } from 'react';
import { PROMPT_PADRAO } from './propmt';

const PROMPT_PADRAO_ANTIGO = `You are an expert Technical Recruiter and AI Data Extractor. Your task is to analyze unstructured web text from a job description and extract precise data.

CRITICAL RULES:
1. ONLY return a valid JSON object. No Markdown, no introductions.
2. ARRAYS MUST BE ATOMIC: Do NOT copy entire sentences. Extract only the specific keywords (e.g., instead of "conhecimento em C# e Java", output ["C#", "Java"]).
3. COMPANY NAME: Look closely at the title, email addresses, or "about us" sections to infer the company name.
4. SKILLS: Only list actual Hard Skills (tools, languages, frameworks) or Soft Skills. Do not list HR phrases like "without experience".

JSON Schema:
{
  "job_title": "The exact position title",
  "company": "Company name. Look carefully at the header or intro.",
  "seniority_level": "Intern, Junior, Mid-level, Senior (infer if not explicit)",
  "work_model": "Remote, Hybrid, or On-site",
  "location": "City, State, or Country",
  "mandatory_skills": ["Keyword 1", "Keyword 2"],
  "nice_to_have_skills": ["Keyword 1", "Keyword 2"],
  "core_responsibilities": ["Concise task 1", "Concise task 2"],
  "benefits_and_perks": ["Benefit 1", "Benefit 2"],
  "context": "1-2 sentence summary of the project or team"
}`;

function Options() {
  const [provider, setProvider] = useState('ollama');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PADRAO);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [model, setModel] = useState('llama3');
  const [numCtx, setNumCtx] = useState(4096);
  const [numPredict, setNumPredict] = useState(2048);
  const [temperature, setTemperature] = useState(0.1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  console.log(systemPrompt);
  useEffect(() => {
    chrome.storage.local.get(['provider', 'url', 'apiKey','model', 'systemPrompt', 'numCtx', 'numPredict', 'temperature'], (dados) => {
      if (dados.provider) setProvider(dados.provider as string);
      if (dados.url) setUrl(dados.url as string);
      if (dados.apiKey) setApiKey(dados.apiKey as string);
      if (dados.systemPrompt) setSystemPrompt(dados.systemPrompt as string);
      if (dados.model) setModel(dados.model as string);
      if (dados.numCtx) setNumCtx(dados.numCtx as number);
      if (dados.numPredict) setNumPredict(dados.numPredict as number);
      if (dados.temperature) setTemperature(dados.temperature as number);
    });
  }, []);

  const handleSave = () => {
    setStatus('saving');
    
    chrome.storage.local.set({
      provider,
      url,
      apiKey,
      systemPrompt,
      model,
      numCtx,
      numPredict,
      temperature
    }, () => {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    });
  };

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
              onChange={(e) => setProvider(e.target.value)}
              className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="chrome">Chrome Built-in AI (Gemini Nano)</option>
              <option value="ollama">Ollama (Servidor Local)</option>
              <option value="api">API Externa (OpenAI, Gemini, etc)</option>
            </select>
          </div>

          {(provider === 'ollama' || provider === 'api') && (
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-700">
                URL do Endpoint <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={provider === 'ollama' ? "http://localhost:11434/api/generate" : "https://api.openai.com/v1/chat/completions"}
                className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
              />
              {(provider === 'ollama') &&
              <div>
                <label className="font-semibold text-slate-700">
                  Nome do Modelo (ex: qwen3.5:latest):
                </label>
                <input 
                  type="text" 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="border p-2 rounded w-full"
                />
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-blue-500 text-sm mt-4 hover:underline"
                >
                {showAdvanced ? "Ocultar Configurações Avançadas" : "Mostrar Configurações Avançadas"}
                </button>
                {showAdvanced && (
                <div className="mt-4 p-4 border rounded bg-gray-50 space-y-3">
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
                  </div>
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
              </div>}
            </div>
          )}

          {provider === 'api' && (
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-slate-700">API Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="p-2 border border-slate-300 rounded bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
              />
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