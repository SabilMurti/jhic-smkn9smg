import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWallet extends Document {
  user_id: Types.ObjectId;
  account_type: 'student' | 'merchant' | 'staff';
  balance: number;
  daily_limit: {
    max_amount: number;
    spent_today: number;
    last_reset_date: string;
  };
  status: 'active' | 'frozen' | 'closed';
  security_flags: {
    is_frozen: boolean;
    freeze_reason?: string;
    require_pin_above: number;
  };
  created_at: Date;
  updated_at: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    account_type: { type: String, default: 'student' },
    balance: { type: Number, default: 0, min: 0 },
    daily_limit: {
      max_amount: { type: Number, default: 200000 },
      spent_today: { type: Number, default: 0 },
      last_reset_date: { type: String, default: () => new Date().toISOString().slice(0, 10) }
    },
    status: { type: String, default: 'active', enum: ['active', 'frozen', 'closed'] },
    security_flags: {
      is_frozen: { type: Boolean, default: false },
      freeze_reason: { type: String },
      require_pin_above: { type: Number, default: 50000 }
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
