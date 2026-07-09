export const SEED_CATEGORY_NAMES = [
  'Bebidas',
  'Lácteos',
  'Snacks',
  'Limpieza',
  'Frutas',
  'Granos',
] as const;

export type SeedProduct = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  supplier: string;
};

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    sku: 'BEB001',
    name: 'Agua Mineral 500ml',
    category: 'Bebidas',
    price: 1500,
    stock: 150,
    minStock: 50,
    supplier: 'Distribuidora Andina',
  },
  {
    sku: 'BEB002',
    name: 'Jugo de Naranja 1L',
    category: 'Bebidas',
    price: 3200,
    stock: 30,
    minStock: 40,
    supplier: 'Lácteos del Valle',
  },
  {
    sku: 'LAC001',
    name: 'Leche Entera 1L',
    category: 'Lácteos',
    price: 2100,
    stock: 200,
    minStock: 60,
    supplier: 'Lácteos del Valle',
  },
  {
    sku: 'LAC002',
    name: 'Yogur Natural 500g',
    category: 'Lácteos',
    price: 2800,
    stock: 15,
    minStock: 25,
    supplier: 'Lácteos del Valle',
  },
  {
    sku: 'SNA001',
    name: 'Papas Fritas 200g',
    category: 'Snacks',
    price: 2500,
    stock: 80,
    minStock: 30,
    supplier: 'SnacksCorp',
  },
  {
    sku: 'LIM001',
    name: 'Detergente 1L',
    category: 'Limpieza',
    price: 4500,
    stock: 45,
    minStock: 20,
    supplier: 'Químicos del Sur',
  },
];
