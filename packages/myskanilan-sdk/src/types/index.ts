export interface MySkanilanConfig {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface StudentProfile {
  id: string;
  nisn: string;
  name: string;
  email: string;
  role: string;
  academic: {
    jurusan: string;
    kelas: string;
    tahun_masuk: number;
    status: string;
  };
}

export interface StudentRfidLookupResult {
  user: StudentProfile;
  card: {
    card_uid: string;
    card_type: string;
    status: string;
  };
  wallet: {
    balance: number;
    daily_limit: {
      max_amount: number;
      spent_today: number;
      last_reset_date: string;
    };
    status: string;
  } | null;
}

export interface ChargeRequest {
  cardUid: string;
  amount: number;
  merchantCode: string;
  items?: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  description?: string;
}

export interface ChargeResult {
  reference_no: string;
  amount: number;
  payment_method: string;
  student: {
    name: string;
    kelas: string;
  };
  merchant: {
    code: string;
    name: string;
  };
  wallet: {
    balance_before: number;
    balance_after: number;
    spent_today: number;
    remaining_daily_quota: number;
  };
  timestamp: string;
}

export interface DirectOrderRequest {
  nisn: string;
  merchantCode: string;
  amount: number;
  items?: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  notes?: string;
  orderType?: 'dine_in' | 'takeaway';
}

export interface DirectOrderResult {
  reference_no: string;
  order_ticket_no: string;
  amount: number;
  items?: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  student: {
    name: string;
    kelas?: string;
  };
  merchant: {
    code: string;
    name: string;
  };
  wallet: {
    balance_before: number;
    balance_after: number;
    remaining_daily_quota: number;
  };
  order_type: string;
  notes?: string;
  timestamp: string;
}

export interface QrSessionResult {
  session_id: string;
  merchant: {
    code: string;
    name: string;
  };
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'expired';
  qr_image_data: string;
  expires_at: string;
  ttl_seconds: number;
}

export interface QrStatusResult {
  session_id: string;
  status: 'pending' | 'paid' | 'expired';
  amount: number;
  paid_by_name?: string;
  expires_at: string;
}

export interface FreezeCardRequest {
  cardUid: string;
  reason?: string;
}

export interface SetDailyLimitRequest {
  nisn: string;
  dailyLimit: number;
}

export interface SystemStatsResult {
  total_students: number;
  active_cards: number;
  frozen_cards: number;
  total_float_balance: number;
  transactions_today: number;
  volume_today: number;
}

export interface MerchantInfo {
  code: string;
  name: string;
  category: string;
  pic_name: string;
  status: string;
}

