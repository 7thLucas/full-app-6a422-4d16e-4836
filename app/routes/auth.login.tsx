import { redirect, Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { ShieldCheck } from "lucide-react";
import {
  getUserFromRequest,
  signJwt,
  buildAuthCookie,
} from "~/modules/authentication/authentication.server";
import { AuthService } from "~/modules/authentication/authentication.service";
import { useConfigurables } from "~/modules/configurables";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

export async function loader({ request }: LoaderFunctionArgs) {
  if (getUserFromRequest(request)) return redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const user = await AuthService.login({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    const token = signJwt({
      sub: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      email_verified: user.email_verified,
    });
    return redirect("/", {
      headers: { "Set-Cookie": buildAuthCookie(token, new URL(request.url).hostname) },
    });
  } catch (error: any) {
    return { error: error.message ?? "Email atau kata sandi salah" };
  }
}

interface ActionData {
  error?: string;
}

export default function LoginRoute() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { config } = useConfigurables();

  const appName = config?.appName || "Amanah";
  const headline = config?.loginHeadline || "Pantau kepatuhan, jaga amanah.";
  const subtext =
    config?.loginSubtext ||
    "Sistem audit kepatuhan berbasis peran untuk pegawai garis depan BSI.";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt={appName} className="h-10 w-10 rounded-lg object-contain bg-sidebar-accent/40 p-1" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-lg font-semibold text-sidebar-accent-foreground">{appName}</p>
            <p className="text-sm text-sidebar-foreground/70">{config?.tagline || "Sistem Audit Kepatuhan"}</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-sidebar-accent-foreground">{headline}</h1>
          <p className="mt-4 text-sidebar-foreground/80">{subtext}</p>
        </div>

        <p className="text-xs text-sidebar-foreground/60">
          {config?.organizationName || "Bank Syariah Indonesia"} · HR &amp; Compliance
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-semibold text-foreground">{appName}</h1>
            <p className="text-sm text-muted-foreground">{config?.tagline || "Sistem Audit Kepatuhan"}</p>
          </div>

          <h2 className="text-xl font-semibold text-foreground">Masuk ke akun Anda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gunakan kredensial yang diberikan tim kepatuhan.
          </p>

          <Form method="post" className="mt-8 space-y-5">
            {actionData?.error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {actionData.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="officer@bsi.co.id" required autoComplete="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Memproses…" : "Masuk"}
            </Button>
          </Form>

          <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Akun demo</p>
            <ul className="space-y-1">
              <li><span className="font-medium text-foreground">officer@bsi.co.id</span> — Compliance Officer</li>
              <li><span className="font-medium text-foreground">manager@bsi.co.id</span> — Manajer Cabang</li>
              <li><span className="font-medium text-foreground">staff@bsi.co.id</span> — Pegawai (read-only)</li>
            </ul>
            <p className="mt-2">Kata sandi: <span className="font-medium text-foreground">Amanah123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
