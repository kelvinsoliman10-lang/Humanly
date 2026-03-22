import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure PDF.js worker using Vite's ?url import for local hosting
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const extractTextFromImage = async (file) => {
  if (typeof Tesseract === 'undefined') {
    throw new Error('El motor de OCR no está listo. Por favor, verifica tu conexión a internet.');
  }
  
  try {
    const worker = await Tesseract.createWorker('spa+eng', 1, {
      logger: m => console.log('OCR:', m.status, Math.round(m.progress * 100) + '%')
    });
    
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error('Tesseract Error:', error);
    throw new Error('Error al leer la imagen. Intenta de nuevo.');
  }
};

export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false 
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' '); 
      fullText += pageText + '\n';
    }
    
    // Use OCR if text is suspicious/missing
    if (fullText.trim().length < 50 && typeof Tesseract !== 'undefined') {
      console.log('PDF looks like a scan, using OCR fallback...');
      let ocrText = '';
      const worker = await Tesseract.createWorker('spa+eng');
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport }).promise;
        const pageImg = canvas.toDataURL('image/png');
        const { data: { text } } = await worker.recognize(pageImg);
        ocrText += text + '\n';
      }
      
      await worker.terminate();
      return ocrText;
    }
    
    if (!fullText.trim()) throw new Error('Contenido no detectable.');
    return fullText;
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    throw new Error(`Error en PDF: ${error.message}`);
  }
};

export const extractTextFromDOCX = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const extractTextFromPPTX = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  let fullText = '';
  
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
    return numA - numB;
  });

  for (const slidePath of slideFiles) {
    const content = await zip.file(slidePath).async('string');
    const matches = content.match(/<a:t>([^<]*)<\/a:t>/g);
    if (matches) {
      const slideText = matches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
      fullText += `--- Diapositiva ---\n${slideText}\n\n`;
    }
  }
  
  return fullText;
};

export const extractText = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return await extractTextFromPDF(file);
    case 'docx':
      return await extractTextFromDOCX(file);
    case 'pptx':
      return await extractTextFromPPTX(file);
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return await extractTextFromImage(file);
    case 'txt':
      return await file.text();
    default:
      throw new Error('Formato de archivo no soportado. Usa PDF, DOCX, PPTX, TXT o Imágenes.');
  }
};
