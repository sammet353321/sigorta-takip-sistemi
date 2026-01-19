import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Police } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, Shield, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminPoliciesPage() {
    const [policies, setPolicies] = useState<Police[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPolicies();
    }, []);

    async function fetchPolicies() {
        try {
            const { data, error } = await supabase
                .from('policeler')
                .select('*, ilgili_kisi:users!ilgili_kisi_id(name), kesen:users!kesen_id(name)')
                .order('tarih', { ascending: false });

            if (error) {
                 // Ignore network abort errors
                if (error.code !== '20' && error.message !== 'FetchError: The user aborted a request.') {
                    throw error;
                }
                return;
            }
            setPolicies(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredPolicies = policies.filter(p => 
        (p.plaka && p.plaka.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.police_no && p.police_no.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const exportToExcel = () => {
        const dataToExport = filteredPolicies.map(p => ({
            'AD SOYAD': p.ad_soyad || '-',
            'DOĞUM TARİHİ': p.dogum_tarihi ? format(new Date(p.dogum_tarihi), 'dd.MM.yyyy') : '-',
            'ŞİRKET': p.sirket || '-',
            'TARİH': format(new Date(p.tarih), 'dd.MM.yyyy'),
            'ŞASİ': p.sasi_no || '-',
            'PLAKA': p.plaka || '-',
            'TC/VKN': p.tc_vkn || '-',
            'BELGE NO': p.belge_no || '-',
            'ARAÇ CİNSİ': p.arac_cinsi || '-',
            'BRÜT PRİM': p.brut_prim || 0,
            'TÜR': p.tur || '-',
            'KESEN': (p as any).kesen?.name || '-',
            'İLGİLİ KİŞİ': p.ilgili_kisi?.name || '-',
            'POLİÇE NO': p.police_no || '-',
            'ACENTE': p.acente || '-',
            'KART': p.kart_bilgisi || '-',
            'EK BİLGİLER / İLETİŞİM': p.ek_bilgiler || '-',
            'NET PRİM': p.net_prim || 0,
            'KOMİSYON': p.komisyon || 0,
            'DURUM': p.durum === 'aktif' ? 'Aktif' : 
                     p.durum === 'iptal' ? 'İptal' : p.durum
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Poliçeler");
        XLSX.writeFile(wb, `Tum_Policeler_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Tüm Poliçeler</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Excel İndir
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Plaka veya Poliçe No Ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                            <th className="px-6 py-3">Poliçe No</th>
                            <th className="px-6 py-3">Plaka</th>
                            <th className="px-6 py-3">Şirket</th>
                            <th className="px-6 py-3">Tali Acente</th>
                            <th className="px-6 py-3">Kesen</th>
                            <th className="px-6 py-3">Net Prim</th>
                            <th className="px-6 py-3">Tarih</th>
                            <th className="px-6 py-3">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPolicies.map((policy) => (
                            <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium">{policy.police_no}</td>
                                <td className="px-6 py-4">{policy.plaka}</td>
                                <td className="px-6 py-4">{policy.sirket}</td>
                                <td className="px-6 py-4">{policy.ilgili_kisi?.name || '-'}</td>
                                <td className="px-6 py-4">{(policy as any).kesen?.name || '-'}</td>
                                <td className="px-6 py-4 font-medium text-green-600">₺{policy.net_prim?.toLocaleString('tr-TR')}</td>
                                <td className="px-6 py-4 text-gray-500">
                                    {format(new Date(policy.tarih), 'd MMM yyyy', { locale: tr })}
                                </td>
                                <td className="px-6 py-4"><StatusBadge status={policy.durum} /></td>
                            </tr>
                        ))}
                        {filteredPolicies.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-8 text-gray-500">Kayıt bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
