import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
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
  contact: {
    phone: string;
    address: string;
  };
  rfid_binding?: {
    card_uid: string;
    assigned_at: Date;
  };
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    nisn: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'siswa', index: true },
    academic: {
      jurusan: { type: String, default: 'Rekayasa Perangkat Lunak' },
      kelas: { type: String, default: 'XII RPL 1' },
      tahun_masuk: { type: Number, default: 2024 },
      status: { type: String, default: 'aktif' }
    },
    contact: {
      phone: { type: String, default: '' },
      address: { type: String, default: '' }
    },
    rfid_binding: {
      card_uid: { type: String, index: true },
      assigned_at: { type: Date }
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const User = mongoose.model<IUser>('User', UserSchema);
