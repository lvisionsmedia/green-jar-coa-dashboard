import { auth } from "@/auth";
import { getSessionRole } from "@/lib/session-access";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (getSessionRole(session) === "platform") {
    redirect("/platform");
  }

  redirect("/login");
}
