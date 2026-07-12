import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [textoExtraido, setTextoExtraido] = useState('');
  const [respostaIA, setRespostaIA] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['statusExtracao', 'resultadoIA', 'erroIA', 'textoBruto'], (data: { 
  statusExtracao?: string; 
  resultadoIA?: string; 
  erroIA?: string; 
  textoBruto?: string 
})=> {
      if (data.textoBruto) setTextoExtraido(data.textoBruto);

      if (data.statusExtracao === 'processando') {
        setStatus('loading');
      } else if (data.statusExtracao === 'concluido' && data.resultadoIA) {
        setRespostaIA(data.resultadoIA);
        setStatus('success');
      } else if (data.statusExtracao === 'erro') {
        setRespostaIA(`Erro: ${data.erroIA}`);
        setStatus('idle');
      }
    });

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.statusExtracao) {
        const novoStatus = changes.statusExtracao.newValue;

        if (novoStatus === 'concluido') {
          chrome.storage.local.get(['resultadoIA'], (data: { resultadoIA?: string }) => {
            setRespostaIA(data.resultadoIA || '');
            setStatus('success');
          });
        } else if (novoStatus === 'erro') {
          chrome.storage.local.get(['erroIA'], (data: { erroIA?: string }) => {
            setRespostaIA(`Erro: ${data.erroIA || 'Desconhecido'}`);
            setStatus('idle');
          });
        } else if (novoStatus === 'processando') {
          setStatus('loading');
          setRespostaIA('');
        }
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const copiarParaAreaDeTransferencia = async () => {
    if (!respostaIA) return;
    
    try {
      await navigator.clipboard.writeText(respostaIA);
      setCopiado(true);
      
      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const abrirConfiguracoes = () => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/src/options/index.html', '_blank');
    }
  };

  const handleExtrair = async () => {
    if (status === 'success') {
      setStatus('idle');
      setTextoExtraido('');
      setRespostaIA('');
      chrome.storage.local.remove(['statusExtracao', 'resultadoIA', 'erroIA', 'textoBruto']);
      return;
    }

    try {
      setStatus('loading');
      setTextoExtraido('Conectando com a página...');
      setRespostaIA('');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("Nenhuma aba ativa encontrada.");

      const respostaContent = await chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_TEXT" });
      if (!respostaContent?.text) throw new Error("Não foi possível extrair texto desta página.");
      
      const texto = respostaContent.text;
      setTextoExtraido(texto);

      await chrome.storage.local.set({ 
        textoBruto: texto, 
        statusExtracao: 'processando',
        resultadoIA: null,
        erroIA: null
      });

      chrome.runtime.sendMessage({ 
        action: "PROCESS_WITH_AI", 
        text: texto 
      });

    } catch (error: any) {
      console.error(error);
      setRespostaIA(`Erro: ${error.message}`);
      setStatus('idle');
      chrome.storage.local.set({ statusExtracao: 'erro', erroIA: error.message });
    }
  };

  return (
    <div className="w-[450px] p-4 bg-slate-50 text-slate-800 font-sans">
      
      <header className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          Extrator de Vagas
        </h1>
        <button 
          onClick={abrirConfiguracoes}
          className="text-slate-400 hover:text-slate-800 transition-colors"
          title="Configurações da IA"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.894 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.894-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <main className="flex flex-col gap-4">
        <div className="bg-white p-3 rounded-md border border-slate-200 shadow-sm text-sm">
          <span className="font-semibold text-slate-700">Status: </span>
          {status === 'idle' && <span className="text-slate-500">Pronto para ler a página</span>}
          {status === 'loading' && <span className="text-blue-600 animate-pulse">Processando...</span>}
          {status === 'success' && <span className="text-green-600 font-medium">Extração concluída!</span>}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enviado para a IA (Bruto)
            </label>
            <textarea 
              readOnly
              value={textoExtraido}
              placeholder="O texto capturado da página aparecerá aqui..."
              className="w-full h-20 p-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-500 resize-none focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Recebido da IA (Estruturado)
              </label>
              
              {status === 'success' && (
                <button 
                  onClick={copiarParaAreaDeTransferencia}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              )}
            </div>
            <textarea 
              readOnly
              value={respostaIA}
              placeholder={status === 'loading' ? 'A IA está gerando o relatório...' : 'O resultado formatado aparecerá aqui...'}
              className={`w-full h-40 p-2 text-sm font-mono bg-white border rounded resize-none focus:outline-none shadow-inner
                ${status === 'loading' ? 'border-blue-300 animate-pulse' : 'border-slate-300 text-slate-800'}`}
            />
          </div>
        </div>

        <button 
          onClick={handleExtrair}
          disabled={status === 'loading'}
          className={`w-full font-semibold py-2.5 px-4 rounded-md transition-all flex justify-center items-center gap-2 shadow-sm
            ${status === 'loading' 
              ? 'bg-blue-400 text-white cursor-not-allowed' 
              : status === 'success'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {status === 'loading' && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          
          {status === 'idle' && 'Extrair e Estruturar'}
          {status === 'loading' && 'Analisando...'}
          {status === 'success' && 'Nova Extração'}
        </button>
      </main>
    </div>
  );
}

export default App;