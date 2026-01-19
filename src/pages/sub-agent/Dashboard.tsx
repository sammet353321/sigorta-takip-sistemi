import { useEffect, useState } from 'react';
import { PlusCircle, Search, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Teklif } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function SubAgentDashboard() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Teklif[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchQuotes();
    }
  }, [user]);

  async function fetchQuotes() {
    try {
      const { data, error } = await supabase
        .from('teklifler')
        .select('*')
        .eq('ilgili_kisi_id', user!.id)
        .order('tarih', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredQuotes = quotes.filter(quote => 
    quote.plaka.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Hoş Geldiniz, {user?.name}!</h2>
          <p className="text-blue-700 mt-1">Hızlıca yeni bir teklif isteği oluşturun veya durumunu takip edin.</p>
        </div>
        <Link 
          to="/sub-agent/quotes/new"
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition-all"
        >
          <PlusCircle size={20} />
          <span>Yeni Teklif İsteği</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Son Teklif İstekleri</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Plaka Ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Henüz bir teklif isteğiniz bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3">Plaka</th>
                  <th className="px-6 py-3">Müşteri</th>
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Durum</th>
                  <th className="px-6 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center space-x-2">
                      <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                          <FileText size={16} />
                      </div>
                      <span>{quote.plaka}</span>
                    </td>
                    <td className="px-6 py-4">{quote.ad_soyad || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(quote.tarih), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={quote.durum} />
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                          to={`/sub-agent/quotes/${quote.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                          {quote.durum === 'hesaplandi' || quote.durum === 'policelestirme_bekliyor' ? 'İncele' : 'Detay'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
