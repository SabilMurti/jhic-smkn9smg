import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMerchant extends Document {
  code: string;
  name: string;
  type: string;
  pic_name: string;
  phone: string;
  wallet_id: Types.ObjectId;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: 'kantin_utara' },
    pic_name: { type: String, required: true },
    phone: { type: String, default: '' },
    wallet_id: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
    status: { type: String, default: 'active' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);
