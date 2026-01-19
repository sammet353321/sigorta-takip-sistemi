
import { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, ScanLine } from 'lucide-react';
import { analyzeLicenseWithGemini } from '@/lib/gemini';
import { toast } from 'react-hot-toast';

interface GeminiTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GeminiTestModal({ isOpen, onClose }: GeminiTestModalProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    tc_vkn: '',
    plaka: '',
    belge_no: '',
    sasi_no: '',
    arac_cinsi: '',
    marka: '',
    model: ''
  });

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagePreview(URL.createObjectURL(file));
      await processImage(file);
    }
  };

  const processImage = async (file: File) => {
    setLoading(true);
    try {
      const result = await analyzeLicenseWithGemini(file);
      setFormData({
        tc_vkn: result.tc_vkn || '',
        plaka: result.plaka || '',
        belge_no: result.belge_no || '',
        sasi_no: result.sasi_no || '',
        arac_cinsi: result.arac_cinsi || '',
        marka: result.marka || '',
        model: result.model || ''
      });
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <ScanLine className="mr-2 text-blue-600" />
            Gemini OCR Test Paneli
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image Upload */}
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all relative overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 font-medium">Ruhsat Fotoğrafı Yükle</p>
                </>
              )}
              
              {loading && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
                  <p className="text-blue-600 font-bold">Gemini Analiz Ediyor...</p>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <p className="font-bold mb-1">Nasıl Çalışır?</p>
              <p>Yüklenen fotoğraf Google Gemini 2.0 Flash modeline gönderilir ve yapay zeka tarafından analiz edilerek yandaki alanlar doldurulur.</p>
            </div>
          </div>

          {/* Right: Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TC / Vergi No</label>
              <input 
                type="text" 
                value={formData.tc_vkn} 
                onChange={(e) => setFormData({...formData, tc_vkn: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plaka</label>
                <input 
                  type="text" 
                  value={formData.plaka} 
                  onChange={(e) => setFormData({...formData, plaka: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belge No</label>
                <input 
                  type="text" 
                  value={formData.belge_no} 
                  onChange={(e) => setFormData({...formData, belge_no: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şasi No (17 Hane)</label>
              <input 
                type="text" 
                value={formData.sasi_no} 
                onChange={(e) => setFormData({...formData, sasi_no: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Araç Cinsi</label>
              <input 
                type="text" 
                value={formData.arac_cinsi} 
                onChange={(e) => setFormData({...formData, arac_cinsi: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                <input 
                  type="text" 
                  value={formData.marka} 
                  onChange={(e) => setFormData({...formData, marka: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input 
                  type="text" 
                  value={formData.model} 
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                Kapat
            </button>
        </div>
      </div>
    </div>
  );
}
