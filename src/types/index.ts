
export type Role = 'admin' | 'employee' | 'sub_agent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export type TeklifDurumu = 'bekliyor' | 'islemde' | 'hesaplandi' | 'policelestirme_bekliyor' | 'reddedildi' | 'policelesti';

export interface Teklif {
  id: string;
  ad_soyad?: string;
  dogum_tarihi?: string;
  sirket?: string;
  tarih: string; // created_at
  sasi?: string;
  plaka: string;
  tc_vkn?: string;
  belge_no?: string;
  arac_cinsi?: string;
  brut_prim?: number;
  tur?: string;
  kesen_id?: string;
  ilgili_kisi_id: string; // sub_agent_id
  police_no?: string;
  acente?: string;
  kart_bilgisi?: string;
  ek_bilgiler?: string;
  net_prim?: number;
  komisyon?: number;
  
  durum: TeklifDurumu;
  notlar?: string;
  guncellenme_tarihi: string;

  // Joins
  ilgili_kisi?: { name: string }; // joined user
}

export type PoliceDurumu = 'aktif' | 'iptal';

export interface Police {
  id: string;
  ad_soyad?: string;
  dogum_tarihi?: string;
  sirket?: string;
  tarih: string;
  sasi?: string;
  plaka: string;
  tc_vkn?: string;
  belge_no?: string;
  arac_cinsi?: string;
  brut_prim?: number;
  tur?: string;
  kesen_id?: string;
  ilgili_kisi_id: string;
  police_no: string;
  acente?: string;
  kart_bilgisi?: string;
  ek_bilgiler?: string;
  net_prim?: number;
  komisyon?: number;
  
  teklif_id?: string;
  pdf_url?: string;
  durum: PoliceDurumu;
  guncellenme_tarihi: string;

  ilgili_kisi?: { name: string };
}
