import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isStaffHostHeaderList } from "@lib/staffHost";
import OrderTypeScreen from "./components/OrderTypeScreen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const headerStore = await headers();
  const isStaffSite = isStaffHostHeaderList([
    headerStore.get("x-forwarded-host"),
    headerStore.get("x-vercel-forwarded-host"),
    headerStore.get("host"),
  ]);

  if (isStaffSite) {
    redirect("/staff/dashboard");
  }

  return <OrderTypeScreen />;
}
