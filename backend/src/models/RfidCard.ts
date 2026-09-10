import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRfidCard extends Document {
  card_uid: string;
  uid_hash: string;
  card_type: string;
  user_id: Types.ObjectId;
  status: 'active' | 'frozen' | 'revoked';
  pin_security: {
    has_pin: boolean;
    pin_code?: string;
  };
  created_at: Date;
  updated_at: Date;
}

const RfidCardSchema = new Schema<IRfidCard>(
  {
    card_uid: { type: String, required: true, unique: true, index: true },
    uid_hash: { type: String, required: true, unique: true },
    card_type: { type: String, default: 'mifare_ultralight_c' },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, default: 'active', enum: ['active', 'frozen', 'revoked'] },
    pin_security: {
      has_pin: { type: Boolean, default: false },
      pin_code: { type: String }
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const RfidCard = mongoose.model<IRfidCard>('RfidCard', RfidCardSchema);
