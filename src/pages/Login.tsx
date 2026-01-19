import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Clear session on mount to fix stuck states
  useEffect(() => {
    const clearSession = async () => {
        // Only clear if we are definitely on login page and want a fresh start
        // But be careful not to clear if we just redirected here
        // Actually, let's just clear any potential bad state
        localStorage.removeItem('sb-aqubbkxsfwmhfbolkfah-auth-token'); // Clear Supabase token manually
    };
    // clearSession(); 
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Fetch user role to redirect
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        if (userData) {
          const role = userData.role;
          if (role === 'admin') navigate('/admin/dashboard');
          else if (role === 'employee') navigate('/employee/dashboard');
          else if (role === 'sub_agent') navigate('/sub-agent/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'Giriş yapılırken bir hata oluştu.';
      
      if (err.message === 'Invalid login credentials') {
        errorMessage = 'Hatalı e-posta veya şifre.';
      } else if (err.message.includes('Email not confirmed')) {
        errorMessage = 'E-posta adresi doğrulanmamış. Lütfen yöneticinizle iletişime geçin.';
      } else if (err.message.includes('Email logins are disabled')) {
        errorMessage = (
          <span>
            E-posta ile giriş sistemi Supabase panelinde kapalı. <br/>
            Lütfen <b>Authentication {'>'} Providers {'>'} Email</b> menüsünden <b>Enable Email provider</b> seçeneğini açınız.
          </span>
        ) as any;
      } else {
        errorMessage = `Hata: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sigorta Acentesi</h1>
          <p className="text-gray-500">Hesabınıza giriş yapın</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta Adresi</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button onClick={() => alert('Yönetici ile iletişime geçiniz.')} className="text-gray-500 hover:text-blue-600 font-medium transition-colors">
            Şifremi Unuttum
          </button>
        </div>
      </div>
    </div>
  );
}
