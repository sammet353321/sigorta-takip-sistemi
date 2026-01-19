import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Teklif } from '@/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, Filter, Eye, ArrowRight, Download } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function EmployeeQuotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Teklif[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchQuotes();
  }, [user]);

  const fetchQuotes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Fetch all quotes for employees to see pool
      // User requested "bütün çalışanların teklifi çıksın"
      const { data, error } = await supabase
        .from('teklifler')
        .select('*, ilgili_kisi:users!ilgili_kisi_id(name), kesen:users!kesen_id(name)')
        .order('guncellenme_tarihi', { ascending: false });

      if (error) throw error;
      setQuotes(data as any || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (quote.plaka?.toLowerCase().includes(searchLower) || '') ||
      (quote.tc_vkn?.includes(searchLower) || '') ||
      ((quote as any).ilgili_kisi?.name?.toLowerCase().includes(searchLower) || '');

    const matchesStatus = filterStatus === 'all' || quote.durum === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const downloadExcel = () => {
    if (!filteredQuotes.length) return;

    // CSV Başlıkları
    const headers = ['AD SOYAD', 'DOĞUM TARİHİ', 'TARİH', 'ŞASİ', 'PLAKA', 'TC/VKN', 'BELGE NO', 'ARAÇ CİNSİ', 'TÜR', 'KESEN', 'İLGİLİ KİŞİ', 'POLİÇE NO', 'EK BİLGİLER', 'DURUM'];
    
    // Veriyi CSV formatına dönüştür
    const csvContent = [
      headers.join(';'),
      ...filteredQuotes.map(q => {
        const date = q.dogum_tarihi ? format(new Date(q.dogum_tarihi), 'dd.MM.yyyy') : '';
        const createdDate = format(new Date(q.guncellenme_tarihi || q.tarih), 'dd.MM.yyyy HH:mm');
        const kesen = (q as any).kesen?.name || '';
        const ilgiliKisi = (q as any).ilgili_kisi?.name || '';
        
        return [
          `"${q.ad_soyad || ''}"`,
          `"${date}"`,
          `"${createdDate}"`,
          `"${q.sasi_no || ''}"`,
          `"${q.plaka || ''}"`,
          `"${q.tc_vkn || ''}"`,
          `"${q.belge_no || ''}"`,
          `"${q.arac_cinsi || ''}"`,
          `"${q.tur || ''}"`,
          `"${kesen}"`,
          `"${ilgiliKisi}"`,
          `"${q.police_no || ''}"`,
          `"${(q.ek_bilgiler || '').replace(/"/g, '""')}"`, // Tırnak işaretlerini escape et
          `"${q.durum}"`
        ].join(';');
      })
    ].join('\n');

    // Excel için UTF-8 BOM ekle ve indir
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `teklifler_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teklifler</h1>
          <p className="text-gray-500 text-sm">Size atanan ve bekleyen tüm teklifler</p>
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
              placeholder="Plaka, TC, İsim ara..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white w-full sm:w-48"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="bekliyor">Bekliyor</option>
              <option value="islemde">İşlemde</option>
              <option value="hesaplandi">Hesaplandı</option>
              <option value="onaylandi">Onaylandı</option>
              <option value="policelestirme_bekliyor">Poliçeleştirme Bekliyor</option>
              <option value="policelesti">Poliçeleşti</option>
              <option value="reddedildi">Reddedildi</option>
            </select>
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
                <th className="px-4 py-3">DURUM</th>
                <th className="px-4 py-3 text-right">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={21} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr 
                    key={quote.id} 
                    className="hover:bg-blue-50 transition-colors cursor-pointer group whitespace-nowrap"
                    onClick={() => navigate(`/employee/quotes/${quote.id}`)}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">{quote.ad_soyad || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{quote.dogum_tarihi ? format(new Date(quote.dogum_tarihi), 'd.MM.yyyy') : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(quote.guncellenme_tarihi || quote.tarih), 'd.MM.yyyy HH:mm')}</td>
                    <td className="px-4 py-3 font-mono text-xs">{quote.sasi_no || '-'}</td>
                    <td className="px-4 py-3 font-bold">{quote.plaka || '-'}</td>
                    <td className="px-4 py-3 font-mono">{quote.tc_vkn || '-'}</td>
                    <td className="px-4 py-3 font-mono">{quote.belge_no || '-'}</td>
                    <td className="px-4 py-3">{quote.arac_cinsi || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                    <td className="px-4 py-3">{quote.tur || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{(quote as any).kesen?.name || '-'}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{(quote as any).ilgili_kisi?.name || 'Bilinmiyor'}</td>
                    <td className="px-4 py-3 text-gray-600">{quote.police_no || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                    <td className="px-4 py-3 text-center">
                        {quote.kart_bilgisi ? (
                            <a href={quote.kart_bilgisi} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-700">
                                <Eye size={18} />
                            </a>
                        ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={quote.ek_bilgiler || ''}>
                        {quote.ek_bilgiler || quote.misafir_bilgi?.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                    <td className="px-4 py-3 text-gray-600">-</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={quote.durum} />
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
