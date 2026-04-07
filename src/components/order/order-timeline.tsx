import { OrderStatus, OrderTimelineEvent } from "@/types/order";
import { CheckCircle, Circle, Package, Truck, MapPin, XCircle } from "lucide-react";

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  pending: Circle,
  processing: Package,
  shipped: Truck,
  delivered: MapPin,
  cancelled: XCircle,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface OrderTimelineProps {
  events: OrderTimelineEvent[];
  currentStatus: OrderStatus;
}

export function OrderTimeline({ events, currentStatus }: OrderTimelineProps) {
  const orderedStatuses: Exclude<OrderStatus, "cancelled">[] = ["pending", "processing", "shipped", "delivered"];
  const timelineStatuses: OrderStatus[] =
    currentStatus === "cancelled"
      ? ["cancelled"]
      : orderedStatuses.slice(0, orderedStatuses.indexOf(currentStatus) + 1);

  return (
    <ol className="space-y-4">
      {timelineStatuses.map((status) => {
          const event = events.find((e) => e.status === status);
          const Icon = STATUS_ICONS[status] || Circle;
          const isActive = status === currentStatus;
          const isPast =
            currentStatus !== "cancelled" && orderedStatuses.indexOf(currentStatus) > orderedStatuses.indexOf(status as Exclude<OrderStatus, "cancelled">);

          return (
            <li key={status} className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 ${isPast || isActive ? "text-accent" : "text-muted"}`} />
              <div>
                <p className={`text-sm font-medium ${isPast || isActive ? "text-foreground" : "text-muted"}`}>
                  {STATUS_LABELS[status]}
                </p>
                {event && (
                  <p className="text-xs text-muted">
                    {event.timestamp.toLocaleDateString()} {event.timestamp.toLocaleTimeString()}
                    {event.details && ` - ${event.details}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
    </ol>
  );
}
