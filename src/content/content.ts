chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  
  if (request.action === "EXTRACT_TEXT") {
    const rawText = document.body.innerText;
    
    const cleanText = rawText
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    sendResponse({ text: cleanText });
  }

  return true; 
});