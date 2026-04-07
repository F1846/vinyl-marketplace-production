// ─── Enums ─────────────────────────────────────────

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

// ─── Shipping Address ─────────────────────────────

export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

// ─── Order ────────────────────────────────────────

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  status: OrderStatus;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Order Item ───────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  priceAtPurchaseCents: number;
  createdAt: Date;
}

// ─── Order with items (common read shape) ─────────

export interface OrderWithItems extends Order {
  items: OrderItemWithProduct[];
}

export interface OrderItemWithProduct extends OrderItem {
  product: {
    artist: string;
    title: string;
    format: string;
    imageUrl: string | null;
  };
}

// ─── Order timeline event ─────────────────────────

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: Date;
  description: string;
  details?: string;
}

// ─── State machine transition rules ───────────────

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function getValidNextStates(status: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[status];
}
