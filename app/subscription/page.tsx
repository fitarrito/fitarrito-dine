import { Suspense } from "react";
import { Pacifico } from "next/font/google";
import SubscriptionPageContent from "./SubscriptionPageContent";

const subscriptionScript = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-subscription-script",
});

export default function SubscriptionPage() {
  return (
    <div
      className={`${subscriptionScript.variable} w-full min-w-0 flex justify-center px-2 sm:px-4`}
    >
      <Suspense fallback={<p>Loading...</p>}>
        <SubscriptionPageContent />
      </Suspense>
    </div>
  );
}
