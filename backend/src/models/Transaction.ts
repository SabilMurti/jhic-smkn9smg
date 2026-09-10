import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  reference_no: string;
  type: 'payment' | 'topup' | 'refund';
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  source_wallet_id?: Types.ObjectId;
  destination_wallet_id?: Types.ObjectId;
  merchant_code?: string;
  payment_method: 'rfid_card' | 'qr_code' | 'cash' | 'bank_transfer' | 'virtual_account' | 'direct_wallet';
  description?: string;
  cart_items?: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  balance_snapshot?: {
    before: number;
    after: number;
  };
  created_at: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    reference_no: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ['payment', 'topup', 'refund'] },
    status: { type: String, default: 'completed', enum: ['completed', 'pending', 'failed'] },
    amount: { type: Number, required: true },
    source_wallet_id: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    destination_wallet_id: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    merchant_code: { type: String },
    payment_method: { type: String, default: 'rfid_card', enum: ['rfid_card', 'qr_code', 'cash', 'bank_transfer', 'virtual_account', 'direct_wallet'] },
    description: { type: String },
    cart_items: [
      {
        name: { type: String },
        qty: { type: Number, default: 1 },
        price: { type: Number }
      }
    ],
    balance_snapshot: {
      before: { type: Number },
      after: { type: Number }
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
