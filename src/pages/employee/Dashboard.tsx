import { useEffect, useState } from 'react';
import { Clock, CheckCircle, FileText, ArrowRight, TrendingUp, Wallet, Award, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Teklif } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import { formatDistanceToNow, startOfWeek, startOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { playNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [todayQuotes, setTodayQuotes] = useState(0);
  const [todayPolicies, setTodayPolicies] = useState(0);
  const [quoteProductStats, setQuoteProductStats] = useState<Record<string, number>>({});
  
  // Policy Financials
  const [todayNet, setTodayNet] = useState(0);
  const [todayComm, setTodayComm] = useState(0);
  const [weekNet, setWeekNet] = useState(0);
  const [weekComm, setWeekComm] = useState(0);
  const [monthNet, setMonthNet] = useState(0);
  const [monthComm, setMonthComm] = useState(0);
  const [policyProductStats, setPolicyProductStats] = useState<Record<string, number>>({});
  
  // Lists
  const [pendingQuotes, setPendingQuotes] = useState<Teklif[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const today = new Date(); today.setHours(0,0,0,0);
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const monthStart = startOfMonth(new Date());

            // 1. Fetch User's Worked Quotes (Today)
            const { data: quotesData } = await supabase
                .from('teklifler')
                .select('*')
                .eq('kesen_id', user.id)
                .gte('guncellenme_tarihi', today.toISOString());
            
            if (isMounted && quotesData) {
                setTodayQuotes(quotesData.length);
                // Group by Product (tur)
                const stats: Record<string, number> = {};
                quotesData.forEach(q => {
                    const product = q.tur || 'Diğer';
                    stats[product] = (stats[product] || 0) + 1;
                });
                setQuoteProductStats(stats);
            }

            // 2. Fetch User's Policies (All time needed for stats? No, filter by ranges)
            // Fetch All Policies by User to calculate ranges in memory (or multiple queries)
            // For simplicity, let's fetch this month's policies as base
            const { data: policiesData } = await supabase
                .from('policeler')
                .select('*')
                .eq('kesen_id', user.id)
                .gte('tarih', monthStart.toISOString());
            
            if (isMounted && policiesData) {
                let tNet = 0, tComm = 0;
                let wNet = 0, wComm = 0;
                let mNet = 0, mComm = 0;
                let pStats: Record<string, number> = {};
                let tCount = 0;

                policiesData.forEach(p => {
                    const pDate = new Date(p.tarih);
                    const net = Number(p.net_prim || 0);
                    const comm = Number(p.komisyon || 0);
                    const product = p.urun || 'Diğer';

                    // Month
                    mNet += net; mComm += comm;
                    pStats[product] = (pStats[product] || 0) + 1;

                    // Week
                    if (pDate >= weekStart) {
                        wNet += net; wComm += comm;
                    }

                    // Today
                    if (pDate >= today) {
                        tNet += net; tComm += comm;
                        tCount++;
                    }
                });

                setTodayNet(tNet); setTodayComm(tComm); setTodayPolicies(tCount);
                setWeekNet(wNet); setWeekComm(wComm);
                setMonthNet(mNet); setMonthComm(mComm);
                setPolicyProductStats(pStats);
            }

            // 3. Fetch Pending Quotes Pool (All employees see this)
            const { data: pendingData } = await supabase
                .from('teklifler')
                .select(`*, ilgili_kisi:users!ilgili_kisi_id(name)`) 
                .eq('durum', 'bekliyor')
                .order('tarih', { ascending: false });
            
            if (isMounted && pendingData) setPendingQuotes(pendingData as any);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchData();

    // Realtime subscription
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teklifler' }, () => fetchData())
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      
      {/* 1. ROW: QUOTE PERFORMANCE */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
             <Clock className="mr-2 text-amber-500" /> Bugün Çalışılan Teklifler
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-amber-500">
                <p className="text-gray-500 text-xs uppercase font-bold">Toplam Teklif</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{todayQuotes}</h3>
                <div className="text-xs text-gray-400 mt-2">Bugün hesaplanan</div>
            </div>
            {/* Product Breakdown */}
            {Object.entries(quoteProductStats).map(([product, count]) => (
                 <div key={product} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs uppercase font-bold">{product}</p>
                    <h3 className="text-2xl font-bold text-gray-700 mt-1">{count}</h3>
                </div>
            ))}
        </div>
      </div>

      {/* 2. ROW: POLICY PERFORMANCE */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
             <Award className="mr-2 text-green-600" /> Poliçe Üretimi (Kişisel)
        </h2>
        
        {/* Financials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Today */}
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl shadow-sm border border-green-100">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-green-800 text-xs font-bold uppercase mb-1">Bugün Net Prim</p>
                        <h3 className="text-2xl font-bold text-green-700">₺{todayNet.toLocaleString('tr-TR')}</h3>
                        <div className="mt-3 inline-block bg-white px-2 py-1 rounded border border-green-200 shadow-sm">
                            <span className="text-xs text-gray-500 font-medium mr-1">Komisyon:</span>
                            <span className="text-sm font-bold text-green-600">₺{todayComm.toLocaleString('tr-TR')}</span>
                        </div>
                    </div>
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <TrendingUp size={20} className="text-green-600" />
                    </div>
                </div>
                <div className="mt-4 text-xs text-green-700 font-medium">
                    {todayPolicies} Adet Poliçe
                </div>
            </div>

            {/* Week */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Bu Hafta Net Prim</p>
                        <h3 className="text-2xl font-bold text-gray-800">₺{weekNet.toLocaleString('tr-TR')}</h3>
                        <div className="mt-3">
                            <span className="text-xs text-gray-400 font-medium mr-1">Komisyon:</span>
                            <span className="text-sm font-bold text-gray-600">₺{weekComm.toLocaleString('tr-TR')}</span>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-full">
                        <BarChart2 size={20} className="text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Month */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Bu Ay Net Prim</p>
                        <h3 className="text-2xl font-bold text-gray-800">₺{monthNet.toLocaleString('tr-TR')}</h3>
                        <div className="mt-3">
                            <span className="text-xs text-gray-400 font-medium mr-1">Komisyon:</span>
                            <span className="text-sm font-bold text-gray-600">₺{monthComm.toLocaleString('tr-TR')}</span>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-full">
                        <Wallet size={20} className="text-purple-500" />
                    </div>
                </div>
            </div>
        </div>

        {/* Product Breakdown (Policy) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
             {Object.entries(policyProductStats).map(([product, count]) => (
                 <div key={product} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{product}</p>
                    <h3 className="text-xl font-bold text-gray-700">{count}</h3>
                </div>
            ))}
        </div>
      </div>

      {/* 3. ROW: PENDING POOL */}
      <div>
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <FileText className="mr-2 text-blue-600" /> Bekleyen İş Havuzu (Genel)
            </h2>
            <Link to="/employee/quotes" className="text-sm text-blue-600 font-medium hover:underline flex items-center">
                Tümünü Gör <ArrowRight size={14} className="ml-1" />
            </Link>
         </div>
         
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             {pendingQuotes.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">Bekleyen iş yok, havuz boş!</div>
             ) : (
                 <div className="divide-y divide-gray-100">
                     {pendingQuotes.slice(0, 5).map(quote => (
                         <div key={quote.id} className="p-4 hover:bg-gray-50 flex justify-between items-center group cursor-pointer" onClick={() => window.location.href = `/employee/quotes/${quote.id}`}>
                             <div className="flex items-center space-x-4">
                                 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                 <div>
                                     <p className="font-bold text-gray-800">{quote.plaka}</p>
                                     <p className="text-xs text-gray-500">{(quote as any).ilgili_kisi?.name} • {quote.ad_soyad || 'Müşteri'}</p>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <span className="text-xs text-gray-400 block mb-1">
                                   {formatDistanceToNow(new Date(quote.tarih), { addSuffix: true, locale: tr })}
                                 </span>
                                 <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Hesapla</span>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      </div>

    </div>
  );
}
