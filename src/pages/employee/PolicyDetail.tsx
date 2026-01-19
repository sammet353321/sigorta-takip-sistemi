import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Teklif } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function EmployeePolicyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Teklif | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [policyNumber, setPolicyNumber] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [isIssued, setIsIssued] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    try {
        const { data: quoteData, error: quoteError } = await supabase
            .from('teklifler')
            .select('*')
            .eq('id', id!)
            .single();
        
        if (quoteError) throw quoteError;
        setQuote(quoteData);

        // Check if already issued in this session context (simple check)
        if (quoteData.durum === 'policelesti') setIsIssued(true);

    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }

  const handleIssuePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    setSubmitting(true);

    try {
        // 1. Create Policy Record (Copy data from Teklif)
        const { error: policyError } = await supabase
            .from('policeler')
            .insert({
                teklif_id: quote.id,
                kesen_id: user!.id,
                ilgili_kisi_id: quote.ilgili_kisi_id,
                police_no: policyNumber,
                acente: agencyName,
                
                // Copy fields
                ad_soyad: quote.ad_soyad,
                plaka: quote.plaka,
                tc_vkn: quote.tc_vkn,
                arac_cinsi: quote.arac_cinsi,
                sasi: quote.sasi,
                belge_no: quote.belge_no,
                sirket: quote.sirket,
                brut_prim: quote.brut_prim,
                net_prim: quote.net_prim,
                komisyon: quote.komisyon,
                
                durum: 'aktif',
                pdf_url: 'https://example.com/policy.pdf' // Mock URL
            });

        if (policyError) throw policyError;

        // 2. Update Quote Status
        const { error: quoteUpdateError } = await supabase
            .from('teklifler')
            .update({ durum: 'policelesti', guncellenme_tarihi: new Date().toISOString() })
            .eq('id', quote.id);

        if (quoteUpdateError) throw quoteUpdateError;

        setIsIssued(true);
    } catch (error) {
        console.error('Error issuing policy:', error);
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (!quote) return <div>Teklif bulunamadı</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800">
        <ArrowLeft size={18} className="mr-1" /> Geri Dön
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Poliçeleştirme</h1>
          <p className="text-gray-500">Onaylanan teklif için poliçe yükleme işlemi.</p>
        </div>
        <StatusBadge status={isIssued ? 'policelesti' : quote.durum} className="text-sm px-4 py-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Onaylanan Teklif</h3>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                    <div>
                        <p className="font-bold text-lg text-blue-900">{quote.sirket}</p>
                        <p className="text-sm text-blue-700">Trafik Sigortası</p>
                    </div>
                    <p className="text-xl font-bold text-blue-900">₺{quote.net_prim?.toLocaleString()}</p>
                </div>

                <h3 className="font-semibold text-gray-800 mb-2 mt-6">Notlar</h3>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-amber-800 text-sm whitespace-pre-wrap">
                    {quote.notlar || 'Not yok.'}
                </div>
            </div>
        </div>

        <div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                {isIssued ? (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Poliçe Başarıyla Kesildi!</h2>
                        <p className="text-gray-500 mb-6">Poliçe numarası: <b>{policyNumber}</b>. Tali acenteye bildirim gönderildi.</p>
                        <button 
                            onClick={() => navigate('/employee/dashboard')}
                            className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900"
                        >
                            Panele Dön
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleIssuePolicy} className="space-y-6">
                        <h3 className="font-bold text-lg text-gray-800">Poliçe Detayları</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Poliçe Numarası</label>
                            <input 
                                type="text" 
                                required
                                value={policyNumber}
                                onChange={(e) => setPolicyNumber(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Örn: 12345678"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Acente Adı</label>
                            <input 
                                type="text" 
                                required
                                value={agencyName}
                                onChange={(e) => setAgencyName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Örn: Merkez Acente"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Poliçe PDF</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">PDF dosyasını yükleyin</p>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50"
                        >
                            {submitting ? 'İşleniyor...' : 'Poliçeyi Onayla ve Yükle'}
                        </button>
                    </form>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
