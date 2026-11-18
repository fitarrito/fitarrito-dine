import type { Metadata } from "next";
import WaiterPortal from "./WaiterPortal";

export const metadata: Metadata = {
  title: "Waiter Portal",
  description: "Manage your table orders",
};

export default function WaiterPage() {
  return <WaiterPortal />;
}
