import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { AuthService } from "~/modules/authentication/authentication.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const tokenUser = getUserFromRequest(request);
  if (!tokenUser) return redirect("/auth/login");

  // Resolve the Amanah role from the persisted profile to pick a landing page.
  const full = await AuthService.getUserById(tokenUser.id);
  const role = (full?.profile as any)?.amanahRole;
  if (role === "staff") return redirect("/me");
  return redirect("/dashboard");
}

export default function Index() {
  return null;
}
