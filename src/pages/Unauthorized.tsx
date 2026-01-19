import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">403</h1>
      <p className="text-xl text-gray-600 mb-8">Bu sayfaya erişim yetkiniz yok.</p>
      <Link to="/login" className="text-blue-600 hover:underline">Giriş sayfasına dön</Link>
    </div>
  );
}
