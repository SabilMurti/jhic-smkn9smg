export interface MenuItem {
  id: string;
  name: string;
  category: 'makanan' | 'minuman' | 'snack';
  price: number;
  emoji: string;
  description: string;
}

export const CANTEEN_MENU: MenuItem[] = [
  {
    id: 'm1',
    name: 'Nasi Ayam Geprek Skanilan',
    category: 'makanan',
    price: 15000,
    emoji: '🍗',
    description: 'Ayam krispi sambal bawang segar + nasi hangat'
  },
  {
    id: 'm2',
    name: 'Mie Goreng Spesial Telur',
    category: 'makanan',
    price: 12000,
    emoji: '🍜',
    description: 'Mie tumis sayuran sawi, bakso, dan telur ceplok'
  },
  {
    id: 'm3',
    name: 'Bakso Sapi Kuah Hangat',
    category: 'makanan',
    price: 13000,
    emoji: '🍲',
    description: 'Bakso urat sapi asli dengan bihun kuah kaldu sapi'
  },
  {
    id: 'm4',
    name: 'Nasi Katsu Saus Teriyaki',
    category: 'makanan',
    price: 16000,
    emoji: '🍱',
    description: 'Chicken fillet renyah dengan saus teriyaki manis gurih'
  },
  {
    id: 'd1',
    name: 'Es Teh Manis Solo Jumbo',
    category: 'minuman',
    price: 4000,
    emoji: '🧋',
    description: 'Teh melati wangi khas Solo dengan gula pasir asli'
  },
  {
    id: 'd2',
    name: 'Es Jeruk Peras Murni',
    category: 'minuman',
    price: 5000,
    emoji: '🍊',
    description: 'Jeruk peras segar alami kaya vitamin C'
  },
  {
    id: 'd3',
    name: 'Air Mineral 600ml',
    category: 'minuman',
    price: 3000,
    emoji: '💧',
    description: 'Air mineral kemasan higienis dingin / biasa'
  },
  {
    id: 's1',
    name: 'Roti Bakar Coklat Keju',
    category: 'snack',
    price: 8000,
    emoji: '🍞',
    description: 'Roti tebal panggangan mentega dengan meses & keju cheddar'
  },
  {
    id: 's2',
    name: 'Risoles Rogout Ayam (2 pcs)',
    category: 'snack',
    price: 5000,
    emoji: '🥟',
    description: 'Kulit lumpia renyah isi wortel creamy & ayam suwir'
  },
  {
    id: 's3',
    name: 'Pisang Nugget Choco Glaze',
    category: 'snack',
    price: 7000,
    emoji: '🍌',
    description: 'Pisang goreng crispy berlapis glaze cokelat leleh'
  }
];
