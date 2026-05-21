import OrderTrackingClient from "@/components/OrderTrackingClient";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <OrderTrackingClient orderId={resolvedParams.id} />;
}
