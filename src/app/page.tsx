import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const auth = await createAuthContext(token);
    if (auth && auth.isAuthenticated && auth.isActive && auth.role) {
      redirect(getDefaultRouteForRole(auth.role, auth.gateId || undefined));
    }
  } catch {
    // token invalid / expired → fall through
  }

  redirect("/login");
}
