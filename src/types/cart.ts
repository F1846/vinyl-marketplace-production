export interface CartItem {
  productId: string;
  quantity: number;
  imageUrl?: string;
  artist?: string;
  title?: string;
  priceCents?: number;
  format?: string;
}

export interface CartState {
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}
