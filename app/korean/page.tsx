import { redirect } from "next/navigation";

export default function KoreanPage() {
  redirect("/menu?category=pan-asian");
}
