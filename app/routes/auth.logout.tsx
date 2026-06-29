import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { buildLogoutCookie } from "~/modules/authentication/authentication.server";

export async function loader(_: LoaderFunctionArgs) {
  return redirect("/auth/login");
}

export async function action({ request }: ActionFunctionArgs) {
  return redirect("/auth/login", {
    headers: { "Set-Cookie": buildLogoutCookie(new URL(request.url).hostname) },
  });
}
