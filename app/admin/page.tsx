import { redirect } from "next/navigation";

/** Legacy /admin on the apex domain → platform. */
export default function AdminRedirectPage() {
  redirect("/platform");
}
