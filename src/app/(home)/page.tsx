import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthContext } from "@/lib/authContext";
import { getDefaultRouteForRole } from "@/server/policy/routes";
import { HomeStoryClient } from "./HomeStoryClient";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth-token")?.value ??
    cookieStore.get("token")?.value;

  if (token) {
    try {
      const authContext = await createAuthContext(token);
      if (authContext.isAuthenticated && authContext.status === "ACTIVE") {
        redirect(getDefaultRouteForRole(authContext.role));
      }
    } catch {
      // invalid token → treat as unauthenticated, fall through
    }
  }

  return <HomeStoryClient />;
}
