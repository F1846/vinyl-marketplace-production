// ─── Enums ─────────────────────────────────────────

export const allOrderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof allOrderStatuses)[number];
export type PaymentMethod = "card" | "paypal" | "pickup";
export type DeliveryMethod = "shipping" | "pickup";

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
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  phoneNumber?: string | null;
  additionalInfo?: string | null;
  pickupLocation?: string | null;
  pickupNote?: string | null;
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
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paypalOrderId: string | null;
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

export interface TrackingCheckpoint {
  message: string;
  location: string | null;
  status: string | null;
  timestamp: string | null;
}

export interface TrackingSummary {
  provider: "17track" | "aftership" | "carrier";
  trackingNumber: string;
  carrierSlug: string | null;
  carrierName: string | null;
  carrierStatus: string | null;
  carrierStatusLabel: string;
  message: string | null;
  trackingUrl: string | null;
  lastUpdatedAt: string | null;
  checkpoints: TrackingCheckpoint[];
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

export function getOrderStatusRank(status: OrderStatus): number {
  return allOrderStatuses.indexOf(status);
}
