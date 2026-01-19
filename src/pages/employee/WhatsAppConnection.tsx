import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { QrCode, Smartphone, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react';

export default function WhatsAppConnection() {
    const { user } = useAuth();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchSession();

        // Subscribe to changes
        const channel = supabase
            .channel('whatsapp-session')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'whatsapp_sessions',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                const newSession = payload.new as any;
                setSession(newSession);
                if (newSession?.qr_code) setQrCode(newSession.qr_code);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    async function fetchSession() {
        try {
            const { data, error } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .eq('user_id', user?.id)
                .single();
            
            if (data) {
                setSession(data);
                if (data.qr_code) setQrCode(data.qr_code);
            }
        } catch (error) {
            console.error('Error fetching session:', error);
        } finally {
            setLoading(false);
        }
    }

    async function startConnection() {
        if (!user) return;
        setLoading(true);
        try {
            // First check if there is an existing session and delete/update it
            const { data: existingSession } = await supabase
                .from('whatsapp_sessions')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (existingSession) {
                // If exists, update it to 'scanning' and clear old data
                const { error: updateError } = await supabase
                    .from('whatsapp_sessions')
                    .update({
                        status: 'scanning',
                        qr_code: null,
                        phone_number: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
                
                if (updateError) throw updateError;
                
                // Fetch the updated session to set state
                const { data: updatedSession } = await supabase
                    .from('whatsapp_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                setSession(updatedSession);

            } else {
                // If not exists, insert new
                const { data, error } = await supabase
                    .from('whatsapp_sessions')
                    .insert({
                        user_id: user.id,
                        status: 'scanning',
                        qr_code: null,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;
                setSession(data);
            }
            
            // Backend will pick up the 'scanning' status change
        } catch (error: any) {
            console.error('Error starting connection:', error);
            // alert('Bağlantı başlatılamadı: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function disconnect() {
        if (!user) return;
        if (!confirm('WhatsApp bağlantısını kesmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('whatsapp_sessions')
                .update({ 
                    status: 'disconnected', 
                    qr_code: null, 
                    phone_number: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) throw error;
            setSession(prev => ({ ...prev, status: 'disconnected', qr_code: null, phone_number: null }));
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }

    if (loading && !session) return <div className="p-8 text-center">Yükleniyor...</div>;

    const status = session?.status || 'disconnected';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Smartphone className="text-green-600" />
                WhatsApp Bağlantısı
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 text-center space-y-6">
                    {status === 'disconnected' && (
                        <div className="py-8">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <WifiOff size={40} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Bağlantı Yok</h2>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Müşterilerinizle iletişim kurmak için kendi WhatsApp hesabınızı bağlayın. 
                                "Bağlan" butonuna tıkladıktan sonra ekrana gelen QR kodu telefonunuzdan taratın.
                            </p>
                            <button 
                                onClick={startConnection}
                                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center mx-auto gap-2"
                            >
                                <QrCode size={20} />
                                QR Kod Oluştur
                            </button>
                        </div>
                    )}

                    {status === 'scanning' && (
                        <div className="py-8">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Telefonunuzdan Taratın</h2>
                            
                            {qrCode ? (
                                <div className="bg-white p-4 inline-block rounded-lg border-2 border-gray-100 shadow-inner mb-4">
                                    {/* Display QR Code - Assuming Base64 or simple text. 
                                        If text, we need a QR library. For now, assuming image src or placeholder.
                                        If backend sends raw string, we need 'qrcode.react'.
                                        For this demo, I'll assume backend sends a Data URL.
                                    */}
                                    {qrCode.startsWith('data:image') ? (
                                        <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                                    ) : (
                                        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center text-xs text-gray-500 break-all p-2">
                                            {/* Fallback if raw text */}
                                            QR Kod Bekleniyor... <br/> (Backend entegrasyonu gerekli)
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-64 h-64 bg-gray-100 flex flex-col items-center justify-center mx-auto rounded-lg animate-pulse mb-4">
                                    <RefreshCw className="animate-spin text-gray-400 mb-2" size={32} />
                                    <span className="text-gray-500 text-sm">QR Kod Hazırlanıyor...</span>
                                </div>
                            )}
                            
                            <p className="text-sm text-gray-500">
                                WhatsApp &gt; Ayarlar &gt; Bağlı Cihazlar &gt; Cihaz Bağla
                            </p>
                            <button onClick={disconnect} className="mt-6 text-red-500 text-sm hover:underline">
                                İptal Et
                            </button>
                        </div>
                    )}

                    {status === 'connected' && (
                        <div className="py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                <Wifi size={40} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Bağlantı Başarılı!</h2>
                            <p className="text-gray-600 mb-6">
                                WhatsApp hesabınız sisteme bağlı. Artık mesajları buradan yönetebilirsiniz.
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 max-w-xs mx-auto mb-6">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bağlı Numara</p>
                                <p className="text-lg font-mono font-bold text-gray-800">{session.phone_number || 'Bilinmiyor'}</p>
                            </div>
                            <button 
                                onClick={disconnect}
                                className="border border-red-200 text-red-600 px-6 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center mx-auto gap-2"
                            >
                                <LogOut size={18} />
                                Bağlantıyı Kes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs">i</span>
                    Bilgilendirme
                </h4>
                <p>
                    Bu özellik cihazınızda internet bağlantısı gerektirir. WhatsApp Web altyapısı kullanıldığı için
                    telefonunuzun internete bağlı olduğundan emin olun.
                </p>
            </div>
        </div>
    );
}