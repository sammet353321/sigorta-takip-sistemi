import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Teklif } from '@/types'; 
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, Filter, Eye, ArrowRight, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeePoliciesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPolicies();
  }, [user]);

  const fetchPolicies = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('policeler')
        .select('*, ilgili_kisi:users!ilgili_kisi_id(name), kesen:users!kesen_id(name)')
        .eq('kesen_id', user.id)
        .order('tarih', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (policy.plaka?.toLowerCase().includes(searchLower) || '') ||
      (policy.tc_vkn?.includes(searchLower) || '') ||
      (policy.ilgili_kisi?.name?.toLowerCase().includes(searchLower) || '') ||
      (policy.police_no?.toLowerCase().includes(searchLower) || '')
    );
  });

  const downloadExcel = () => {
    if (!filteredPolicies.length) return;

    const headers = ['AD SOYAD', 'DOĞUM TARİHİ', 'ŞİRKET', 'TARİH', 'ŞASİ', 'PLAKA', 'TC/VKN', 'BELGE NO', 'ARAÇ CİNSİ', 'BRÜT PRİM', 'TÜR', 'KESEN', 'İLGİLİ KİŞİ', 'POLİÇE NO', 'ACENTE', 'KART', 'EK BİLGİLER / İLETİŞİM', 'NET PRİM', 'KOMİSYON'];
    
    const csvContent = [
      headers.join(';'),
      ...filteredPolicies.map(p => {
        const date = p.dogum_tarihi ? format(new Date(p.dogum_tarihi), 'dd.MM.yyyy') : '';
        const createdDate = format(new Date(p.tarih), 'dd.MM.yyyy');
        const kesen = user?.name || 'Ben';
        const ilgiliKisi = p.ilgili_kisi?.name || '';
        const kartLink = p.kart_bilgisi || '';
        
        return [
          `"${p.ad_soyad || ''}"`,
          `"${date}"`,
          `"${p.sirket || ''}"`,
          `"${createdDate}"`,
          `"${p.sasi_no || ''}"`,
          `"${p.plaka || ''}"`,
          `"${p.tc_vkn || ''}"`,
          `"${p.belge_no || ''}"`,
          `"${p.arac_cinsi || ''}"`,
          `"${p.brut_prim || ''}"`,
          `"${p.tur || ''}"`,
          `"${kesen}"`,
          `"${ilgiliKisi}"`,
          `"${p.police_no || ''}"`,
          `"${p.acente || ''}"`,
          `"${kartLink}"`,
          `"${(p.ek_bilgiler || '').replace(/"/g, '""')}"`,
          `"${p.net_prim || ''}"`,
          `"${p.komisyon || ''}"`
        ].join(';');
      })
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `policeler_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Poliçelerim</h1>
          <p className="text-gray-500 text-sm">Sizin tarafınızdan kesilen poliçeler</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* --- YENİ BUTON --- */}
          <button 
            onClick={downloadExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={18} />
            Excel İndir
          </button>
          {/* ------------------ */}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Plaka, TC, Poliçe No ara..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold whitespace-nowrap">
                <th className="px-4 py-3">AD SOYAD</th>
                <th className="px-4 py-3">DOĞUM TARİHİ</th>
                <th className="px-4 py-3">ŞİRKET</th>
                <th className="px-4 py-3">TARİH</th>
                <th className="px-4 py-3">ŞASİ</th>
                <th className="px-4 py-3">PLAKA</th>
                <th className="px-4 py-3">TC / VKN</th>
                <th className="px-4 py-3">BELGE NO</th>
                <th className="px-4 py-3">ARAÇ CİNSİ</th>
                <th className="px-4 py-3">BRÜT PRİM</th>
                <th className="px-4 py-3">TÜR</th>
                <th className="px-4 py-3">KESEN</th>
                <th className="px-4 py-3">İLGİLİ KİŞİ (TALİ)</th>
                <th className="px-4 py-3">POLİÇE NO</th>
                <th className="px-4 py-3">ACENTE</th>
                <th className="px-4 py-3 text-center">KART</th>
                <th className="px-4 py-3">EK BİLGİLER / İLETİŞİM</th>
                <th className="px-4 py-3">NET PRİM</th>
                <th className="px-4 py-3">KOMİSYON</th>
                <th className="px-4 py-3 text-right">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={20} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={20} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr 
                    key={policy.id} 
                    className="hover:bg-blue-50 transition-colors cursor-pointer group whitespace-nowrap"
                    onClick={() => navigate(`/employee/policies/${policy.id}`)}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{policy.ad_soyad || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{policy.dogum_tarihi ? format(new Date(policy.dogum_tarihi), 'd.MM.yyyy') : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{policy.sirket || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(policy.tarih), 'd.MM.yyyy')}</td>
                    <td className="px-4 py-3 font-mono text-xs">{policy.sasi_no || '-'}</td>
                    <td className="px-4 py-3 font-bold">{policy.plaka || '-'}</td>
                    <td className="px-4 py-3 font-mono">{policy.tc_vkn || '-'}</td>
                    <td className="px-4 py-3 font-mono">{policy.belge_no || '-'}</td>
                    <td className="px-4 py-3">{policy.arac_cinsi || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{policy.brut_prim ? `₺${Number(policy.brut_prim).toLocaleString('tr-TR')}` : '-'}</td>
                    <td className="px-4 py-3">{policy.tur || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{(policy.kesen as any)?.name || 'Bilinmiyor'}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">
                        {(policy.ilgili_kisi as any)?.name || (policy.misafir_bilgi as any)?.group_name || 'Bilinmiyor'}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-600">{policy.police_no || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{policy.acente || '-'}</td>
                    <td className="px-4 py-3 text-center">
                        {/* Only show icon, no text/link */}
                        {policy.kart_bilgisi ? (
                            <a href={policy.kart_bilgisi} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-700" title="Görüntüle">
                                <Eye size={18} />
                            </a>
                        ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                        {policy.ek_bilgiler || '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">
                      ₺{Number(policy.net_prim || 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-medium">
                        {policy.komisyon ? `₺${Number(policy.komisyon).toLocaleString('tr-TR')}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
