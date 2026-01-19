import clsx from 'clsx';
import { TeklifDurumu, PoliceDurumu } from '@/types';

interface StatusBadgeProps {
  status: TeklifDurumu | PoliceDurumu | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  // Teklif Durumları
  bekliyor: { label: 'Bekliyor', color: 'bg-gray-100 text-gray-700' },
  islemde: { label: 'İnceleniyor', color: 'bg-blue-100 text-blue-700' },
  hesaplandi: { label: 'Hesaplandı', color: 'bg-indigo-100 text-indigo-700' },
  policelestirme_bekliyor: { label: 'Poliçeleştirme Bekleniyor', color: 'bg-amber-100 text-amber-700' },
  reddedildi: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
  policelesti: { label: 'Poliçeleşti', color: 'bg-green-100 text-green-700' },
  
  // Poliçe Durumları
  aktif: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  iptal: { label: 'İptal', color: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  
  return (
    <span className={clsx(
      "px-2.5 py-0.5 rounded-full text-xs font-medium",
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}
