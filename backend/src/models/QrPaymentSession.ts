import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQrPaymentSession extends Document {
  session_id: string;
  merchant_code: string;
  merchant_name: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'expired';
  qr_data: string;
  qr_image_data?: string;
  paid_by_user_id?: Types.ObjectId;
  paid_by_name?: string;
  transaction_id?: Types.ObjectId;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

const QrPaymentSessionSchema = new Schema<IQrPaymentSession>(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    merchant_code: { type: String, required: true, index: true },
    merchant_name: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: 'Pembelian Kantin MySkanilan' },
    status: { type: String, default: 'pending', enum: ['pending', 'paid', 'expired'], index: true },
    qr_data: { type: String, required: true },
    qr_image_data: { type: String },
    paid_by_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    paid_by_name: { type: String },
    transaction_id: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    expires_at: { type: Date, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const QrPaymentSession = mongoose.model<IQrPaymentSession>('QrPaymentSession', QrPaymentSessionSchema);
