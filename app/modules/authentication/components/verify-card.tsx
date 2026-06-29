import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

interface LoaderData {
  maskedEmail: string;
}

interface ActionData {
  success?: boolean;
  message?: string;
  error?: string;
}

export function VerifyCard() {
  const { maskedEmail } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isVerifying = navigation.state === "submitting" && navigation.formData?.get("_intent") !== "resend";
  const isResending = navigation.state === "submitting" && navigation.formData?.get("_intent") === "resend";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>.
            Enter it below to activate your account.
          </CardDescription>
        </CardHeader>

        <Form method="post">
          <input type="hidden" name="_intent" value="verify" />

          <CardContent className="space-y-4">
            {actionData?.error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {actionData.error}
              </div>
            )}
            {actionData?.success && actionData.message && (
              <div className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                {actionData.message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Verifying…" : "Verify email"}
            </Button>
          </CardFooter>
        </Form>

        <div className="px-6 pb-6">
          <Form method="post">
            <input type="hidden" name="_intent" value="resend" />
            <Button
              type="submit"
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              disabled={isResending}
            >
              {isResending ? "Sending…" : "Didn't receive a code? Resend"}
            </Button>
          </Form>
        </div>
      </Card>
    </div>
  );
}
