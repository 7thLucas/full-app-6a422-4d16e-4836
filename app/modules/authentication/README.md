# @qb/authentication

Full-stack authentication module for Remix v2 + Express + MongoDB/Typegoose projects.

## What it provides

- **User model** (`tbl_users`) with roles: `unauthenticated`, `authenticated`, `admin`
- **JWT in httpOnly cookie** (`auth_token`) — XSS-safe, subdomain-aware domain resolution
- **Express API endpoints**: register, login, logout, me, forgot-password, reset-password
- **Express middleware**: `requireAuth`, `requireAdmin`, `optionalAuth`
- **React context**: `AuthProvider` + `useAuth()` hook
- **UI card components**: login, register, forgot-password, reset-password
- **Admin seed**: creates an admin user on first startup if none exists

## Cookie domain behavior

The cookie domain is resolved automatically from the request hostname:

| Hostname | Cookie domain |
|----------|---------------|
| IP (e.g. `192.168.1.1`) | none (bound to exact IP) |
| `localhost` | none (bound to localhost) |
| `sub.app.example.com` | `.example.com` (covers all subdomains) |

## Prerequisites

### 1. shadcn/ui components

This module uses Card, Input, Button, and Label from shadcn/ui. Install them with:

```bash
bunx shadcn@latest add card input button label
```

Or via the shadcn MCP tool:
```
mcp__shadcn__get_add_command_for_items(["@shadcn/card", "@shadcn/input", "@shadcn/button", "@shadcn/label"])
```

You also need `~/lib/utils.ts` with the `cn` function:

```ts
// app/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Install its dependencies:
```bash
npm install clsx tailwind-merge
```

### 2. npm packages

```bash
npm install jsonwebtoken bcryptjs cookie
npm install -D @types/jsonwebtoken @types/bcryptjs @types/cookie
```

## Environment variables

Copy the contents of `.env.example` into the project root `.env`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for signing JWTs — minimum 32 characters |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`, `24h`, `3600s`) — default `7d` |
| `APP_URL` | Base URL used in password reset links |
| `SEED_ADMIN_ENABLE` | Set to `true` to create an admin on first startup |
| `SEED_ADMIN_USERNAME` | Admin username |
| `SEED_ADMIN_EMAIL` | Admin email |
| `SEED_ADMIN_PASSWORD` | Admin initial password — **change this** |

## Integration steps

### Step 1 — Copy the module

Place this folder at `app/modules/authentication/`.

### Step 2 — Install prerequisites

Install npm packages and shadcn/ui components as described in [Prerequisites](#prerequisites).

### Step 3 — Add Remix route files

Create these files in `app/routes/`:

**`auth.login.tsx`**
```tsx
import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { getUserFromRequest, signJwt, buildAuthCookie } from "~/modules/authentication/authentication.server";
import { AuthService } from "~/modules/authentication/authentication.service";
import { LoginCard } from "~/modules/authentication";

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
    const token = signJwt({ sub: user.id, role: user.role, username: user.username, email: user.email });
    return redirect("/", { headers: { "Set-Cookie": buildAuthCookie(token, new URL(request.url).hostname) } });
  } catch (error: any) {
    return { error: error.message ?? "Invalid credentials" };
  }
}

export default function LoginRoute() {
  return <LoginCard />;
}
```

**`auth.register.tsx`**
```tsx
import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { getUserFromRequest, signJwt, buildAuthCookie } from "~/modules/authentication/authentication.server";
import { AuthService } from "~/modules/authentication/authentication.service";
import { RegisterCard } from "~/modules/authentication";

export async function loader({ request }: LoaderFunctionArgs) {
  if (getUserFromRequest(request)) return redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    const user = await AuthService.register({
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    const token = signJwt({ sub: user.id, role: user.role, username: user.username, email: user.email });
    return redirect("/", { headers: { "Set-Cookie": buildAuthCookie(token, new URL(request.url).hostname) } });
  } catch (error: any) {
    return { error: error.message ?? "Registration failed" };
  }
}

export default function RegisterRoute() {
  return <RegisterCard />;
}
```

**`auth.forgot-password.tsx`**
```tsx
import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { AuthService } from "~/modules/authentication/authentication.service";
import { ForgotPasswordCard } from "~/modules/authentication";

export async function loader({ request }: LoaderFunctionArgs) {
  if (getUserFromRequest(request)) return redirect("/");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try { await AuthService.forgotPassword(String(formData.get("email") ?? "")); } catch {}
  return { success: true, message: "If that email exists, a reset link has been sent. Check your inbox." };
}

export default function ForgotPasswordRoute() {
  return <ForgotPasswordCard />;
}
```

**`auth.reset-password.tsx`**
```tsx
import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { getUserFromRequest } from "~/modules/authentication/authentication.server";
import { AuthService } from "~/modules/authentication/authentication.service";
import { ResetPasswordCard } from "~/modules/authentication";

export async function loader({ request }: LoaderFunctionArgs) {
  if (getUserFromRequest(request)) return redirect("/");
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return redirect("/auth/forgot-password");
  return { token };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  try {
    await AuthService.resetPassword({
      token: String(formData.get("token") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });
    return redirect("/auth/login");
  } catch (error: any) {
    return { error: error.message ?? "Reset failed. The link may have expired." };
  }
}

export default function ResetPasswordRoute() {
  return <ResetPasswordCard />;
}
```

**`auth.logout.tsx`**
```tsx
import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { buildLogoutCookie } from "~/modules/authentication/authentication.server";

export async function loader(_: LoaderFunctionArgs) {
  return redirect("/auth/login");
}

export async function action({ request }: ActionFunctionArgs) {
  return redirect("/auth/login", {
    headers: { "Set-Cookie": buildLogoutCookie(new URL(request.url).hostname) },
  });
}
```

### Step 4 — Wrap the app with `AuthProvider`

In `app/root.tsx`, import and wrap your outlet:

```tsx
import { AuthProvider } from "~/modules/authentication/use-authentication";

// Inside your App component:
<ConfigurablesProvider>
  <AuthProvider>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Outlet />
    </ThemeProvider>
  </AuthProvider>
</ConfigurablesProvider>
```

### Step 5 — Copy environment variables

Merge `.env.example` from this module into your project root `.env`.

## API reference

All endpoints are mounted at `/api/auth/*` via Express auto-discovery.

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/auth/register` | No | Register a new user, sets `auth_token` cookie |
| `POST` | `/api/auth/login` | No | Authenticate, sets `auth_token` cookie |
| `POST` | `/api/auth/logout` | No | Clears `auth_token` cookie |
| `GET` | `/api/auth/me` | Yes | Returns the current user |
| `POST` | `/api/auth/forgot-password` | No | Sends password reset email |
| `POST` | `/api/auth/reset-password` | No | Resets password via token |

## Hooks and components

### `useAuth()`

```tsx
import { useAuth } from "~/modules/authentication";

function MyComponent() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <p>Please log in.</p>;
  return <p>Welcome, {user?.username}!</p>;
}
```

### `AuthProvider`

Wrap your app (done in `app/root.tsx`). Fetches `/api/auth/me` on mount.

### Card components

| Component | Route rendered at |
|-----------|-------------------|
| `<LoginCard />` | `/auth/login` |
| `<RegisterCard />` | `/auth/register` |
| `<ForgotPasswordCard />` | `/auth/forgot-password` |
| `<ResetPasswordCard />` | `/auth/reset-password` |

### Express middleware

```ts
import { requireAuth, requireAdmin, optionalAuth } from "~/modules/authentication/authentication.middleware";

// Protect a route
router.get("/protected", requireAuth, handler);

// Admin only
router.delete("/admin/users/:id", requireAdmin, handler);

// Attach user if logged in, continue regardless
router.get("/public", optionalAuth, handler);
```

## Roles

| Role | Value | Description |
|------|-------|-------------|
| `UserRole.Unauthenticated` | `"unauthenticated"` | Not stored in DB; represents anonymous visitors |
| `UserRole.Authenticated` | `"authenticated"` | Default role for registered users |
| `UserRole.Admin` | `"admin"` | Full admin access |

## Security notes

- **`authentication.server.ts`** uses the `.server.ts` suffix — Vite/Remix excludes it from the client bundle. `JWT_SECRET` never reaches the browser.
- **`password_hash`** and reset tokens are stripped in `toPublicUser()` before leaving the service layer.
- **Forgot password** always returns a success response regardless of whether the email exists (prevents email enumeration).
- **Reset tokens** are stored as SHA-256 hashes in the database; only the plain token is sent via email.
- **Cookies** are `HttpOnly` (JS cannot read), `Secure` in production, `SameSite=Lax`.
