import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Teklif } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, Send, CheckCircle, CreditCard, Upload } from 'lucide-react';

export default function SubAgentQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Teklif | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [policyNote, setPolicyNote] = useState('');

  useEffect(() => {
    if (id) fetchQuoteDetails();
  }, [id]);

  async function fetchQuoteDetails() {
    try {
        const { data: quoteData, error: quoteError } = await supabase
            .from('teklifler')
            .select('*')
            .eq('id', id!)
            .single();
        
        if (quoteError) throw quoteError;
        setQuote(quoteData);
    } catch (error) {
        console.error('Error details:', error);
    } finally {
        setLoading(false);
    }
  }

  const submitPolicyRequest = async () => {
    if (!quote) return;
    setLoading(true);

    try {
        const updatedNotes = quote.notlar 
            ? `${quote.notlar}\n\n[Poliçe Talebi Notu]: ${policyNote}` 
            : `[Poliçe Talebi Notu]: ${policyNote}`;

        const { error } = await supabase
            .from('teklifler')
            .update({ 
                durum: 'policelestirme_bekliyor',
                notlar: updatedNotes,
                guncellenme_tarihi: new Date().toISOString()
            })
            .eq('id', quote.id);

        if (error) throw error;

        setIsModalOpen(false);
        fetchQuoteDetails();
    } catch (error) {
        console.error('Error submitting request:', error);
    } finally {
        setLoading(false);
    }
  };

  if (loading && !quote) return <div>Yükleniyor...</div>;
  if (!quote) return <div>Teklif bulunamadı</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800">
        <ArrowLeft size={18} className="mr-1" /> Geri Dön
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teklif Detayı</h1>
          <p className="text-gray-500">#{quote.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={quote.durum} className="text-sm px-4 py-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Araç Bilgileri</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Plaka</span>
                        <span className="font-medium">{quote.plaka}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Ad Soyad</span>
                        <span className="font-medium">{quote.ad_soyad}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">TC/VKN</span>
                        <span className="font-medium">{quote.tc_vkn}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Araç Cinsi</span>
                        <span className="font-medium">{quote.arac_cinsi}</span>
                    </div>
                </div>
            </div>
            
            {quote.notlar && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Notlar:</h4>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{quote.notlar}</p>
                </div>
            )}
        </div>

        {/* Right: Price / Status */}
        <div className="lg:col-span-2">
            {quote.durum === 'bekliyor' || quote.durum === 'islemde' ? (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Teklifiniz Hazırlanıyor</h3>
                    <p className="text-gray-500">Çalışanlarımız en uygun fiyatları hesaplamak için çalışıyor. Bildirimleri açık tutun.</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-500 ring-1 ring-green-500">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500 text-xs uppercase">
                                {quote.sirket?.substring(0, 3) || 'SGR'}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">{quote.sirket}</h4>
                                <p className="text-green-600 text-sm font-medium">Trafik Sigortası</p>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">₺{quote.net_prim?.toLocaleString('tr-TR')}</p>
                            <p className="text-xs text-gray-400">Net Prim</p>
                        </div>

                        <div>
                            {quote.durum === 'policelestirme_bekliyor' ? (
                                <span className="flex items-center space-x-1 text-amber-600 font-bold bg-amber-50 px-4 py-2 rounded-lg">
                                    <CheckCircle size={18} />
                                    <span>Poliçeleştirme Bekleniyor</span>
                                </span>
                            ) : (
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Poliçeleştir
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Poliçeleştirme Talebi</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Teklifi onaylıyor musunuz?
                </p>

                <div className="space-y-4 mb-6">
                    <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center space-x-3 text-gray-700">
                            <CreditCard size={20} />
                            <span className="font-medium">Kredi Kartı Bilgileri</span>
                        </div>
                        <input type="text" placeholder="Kart Numarası" className="mt-2 w-full border rounded p-2 text-sm" disabled />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Çalışana Not</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                            rows={3}
                            placeholder="Örn: Taksitli çekim yapılsın..."
                            value={policyNote}
                            onChange={(e) => setPolicyNote(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        İptal
                    </button>
                    <button 
                        onClick={submitPolicyRequest}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Gönderiliyor...' : 'Talebi Gönder'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
