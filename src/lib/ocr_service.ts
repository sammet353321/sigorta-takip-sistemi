
import Tesseract from 'tesseract.js';

// --- IMAGE PRE-PROCESSING ---
const preprocessImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(img.src);
                return;
            }

            // 1. Resize if too large (Max width 2000px to improve speed/memory)
            const MAX_WIDTH = 2000;
            let width = img.width;
            let height = img.height;
            
            if (width > MAX_WIDTH) {
                height = (MAX_WIDTH / width) * height;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            
            // Draw original image
            ctx.drawImage(img, 0, 0, width, height);
            
            // 2. Convert to Grayscale & Increase Contrast
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Grayscale (Luminosity method)
                const gray = 0.21 * data[i] + 0.72 * data[i + 1] + 0.07 * data[i + 2];
                
                // Contrast Stretching / Binarization (Simple Threshold)
                // Threshold value of 128 is standard, but for documents sometimes lighter or darker works better.
                // Here we make it high contrast: < 140 -> 0 (Black), > 140 -> 255 (White)
                // This helps remove background noise/patterns on the license document.
                const val = gray < 140 ? 0 : 255;
                
                data[i] = val;     // R
                data[i + 1] = val; // G
                data[i + 2] = val; // B
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(URL.createObjectURL(file));
    });
};

// --- TESSERACT (Local OCR) ---
export const analyzeWithTesseract = async (file: File) => {
    console.log("OCR Başlatılıyor: Görüntü işleniyor...");
    
    // 1. Preprocess the image (Grayscale + Threshold)
    const processedImageUrl = await preprocessImage(file);
    
    // 2. Recognize text with Tesseract
    const result = await Tesseract.recognize(
        processedImageUrl,
        'tur', // Turkish language
        { 
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR İlerleme: %${Math.round(m.progress * 100)}`);
                }
            }
        }
    );
    
    // 3. Normalize Text
    // Replace common OCR errors (0 <-> O, 1 <-> I, etc can be tricky globally, so we handle locally in regex)
    const rawText = result.data.text;
    const text = rawText.toUpperCase()
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C')
        .replace(/\./g, ' ') // Replace dots with spaces to avoid splitting issues
        .replace(/\s+/g, ' '); // Collapse multiple spaces

    console.log("İşlenmiş Metin:", text);

    // --- SMART PARSING LOGIC ---
    
    // A. PLAKA (License Plate)
    // Format: 2 digits + 1-3 letters + 2-5 digits
    // Regex explanation:
    // \b: Word boundary
    // (0[1-9]|[1-7][0-9]|8[01]): 01-81 (City codes)
    // \s*: Optional space
    // [A-Z]{1,3}: 1 to 3 letters
    // \s*: Optional space
    // \d{2,5}: 2 to 5 digits
    // \b: Word boundary
    const plakaRegex = /\b(0[1-9]|[1-7][0-9]|8[01])\s*[A-Z]{1,3}\s*\d{2,5}\b/g;
    const plakaMatches = text.match(plakaRegex);
    
    // Filter matches: Remove any match that is purely numeric (though regex enforces letters) or too long
    let bestPlaka = '';
    if (plakaMatches) {
        // Find the best match (usually the one closest to standard formats like 34AB123)
        // We prefer matches that look isolated or have standard lengths
        bestPlaka = plakaMatches[0].replace(/\s+/g, '');
    }

    // B. TC / VKN
    // TC: 11 digits, starts with 1-9
    // VKN: 10 digits
    // We look for 10 or 11 consecutive digits.
    // We ignore 17-digit numbers (VINs) or dates (2025...)
    const numbersRegex = /\b\d{10,11}\b/g;
    const numberMatches = text.match(numbersRegex);
    let bestTCVKN = '';
    
    if (numberMatches) {
        // Filter out numbers that start with "202..." (likely years/timestamps) if they are 11 digits? 
        // Actually timestamps are usually longer or formatted.
        // TC numbers usually don't start with 0.
        const validNumbers = numberMatches.filter(n => {
            if (n.length === 11 && n.startsWith('0')) return false; // Invalid TC
            if (n.startsWith('202') && n.length > 4) return false; // Likely a year/date artifact
            return true;
        });
        
        if (validNumbers.length > 0) {
            bestTCVKN = validNumbers[0];
        }
    }

    // C. ŞASİ NO (VIN)
    // 17 chars, Alphanumeric
    
    let bestSasi = '';
    
    // Strategy 1: Look for keyword "SASI" and grab the next word
    const sasiKeywordMatch = text.match(/(?:SASI|ŞASİ|NO|NUMARASI)\s*[:.]?\s*([A-HJ-NPR-Z0-9]{17})/i);
    if (sasiKeywordMatch) {
        bestSasi = sasiKeywordMatch[1];
    } else {
        // Strategy 2: Raw Regex for 17 chars
        const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
        const potentialVins = text.match(vinRegex);
        
        if (potentialVins) {
            const validVins = potentialVins.filter(v => {
                // Filter out purely numeric strings starting with 202 (years)
                // Filter out strings starting with 2202 (timestamps)
                if (/^\d+$/.test(v) && (v.startsWith('202') || v.startsWith('220'))) return false;
                
                // VINs usually have at least one letter, or if all numbers, shouldn't look like a timestamp
                // But some old VINs are numbers.
                // Let's rely on the length and not-starting-with-year heuristic.
                return true;
            });
            
            if (validVins.length > 0) {
                // Prefer the one that mixes letters and numbers if available
                const alphanumericVin = validVins.find(v => /[A-Z]/.test(v) && /\d/.test(v));
                bestSasi = alphanumericVin || validVins[0];
            }
        }
    }

    // D. BELGE NO
    // Format: 2 letters + 6 digits (e.g. AB 123456)
    // Often labeled as (Y.1) or BELGE
    const belgeRegex = /\b[A-Z]{2}\s*\d{6}\b/;
    const belgeMatch = text.match(belgeRegex);
    const bestBelgeNo = belgeMatch ? belgeMatch[0].replace(/\s+/g, '') : '';

    // E. ARAÇ CİNSİ
    const aracCinsiKeywords = ['OTOMOBIL', 'KAMYONET', 'MOTOSIKLET', 'TRAKTOR', 'KAMYON', 'MINIBUS', 'OTOBUS', 'PANELVAN', 'CEKICI'];
    const foundCinsi = aracCinsiKeywords.find(k => text.includes(k));
    const bestCinsi = foundCinsi ? foundCinsi.replace('OTOMOBIL', 'OTOMOBİL').replace('TRAKTOR', 'TRAKTÖR').replace('MOTOSIKLET', 'MOTOSİKLET').replace('OTOBUS', 'OTOBÜS') : '';

    return {
        plaka: bestPlaka,
        tc_vkn: bestTCVKN,
        belge_no: bestBelgeNo,
        sasi_no: bestSasi,
        arac_cinsi: bestCinsi,
        method: 'Tesseract (Enhanced)'
    };
};
