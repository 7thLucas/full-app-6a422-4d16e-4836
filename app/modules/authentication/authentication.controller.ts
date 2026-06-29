import type { Request, Response } from "express";
import { AuthService } from "./authentication.service";
import { signJwt, buildAuthCookie, buildLogoutCookie } from "./authentication.server";

function jwtPayload(user: { id: string; role: any; username: string; email: string; email_verified: boolean }) {
  return { sub: user.id, role: user.role, username: user.username, email: user.email, email_verified: user.email_verified };
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const user = await AuthService.register(req.body);
    const token = signJwt(jwtPayload(user));
    res.setHeader("Set-Cookie", buildAuthCookie(token, req.hostname));
    res.status(201).json({ success: true, user });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message ?? "Registration failed" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const user = await AuthService.login(req.body);
    const token = signJwt(jwtPayload(user));
    res.setHeader("Set-Cookie", buildAuthCookie(token, req.hostname));
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message ?? "Login failed" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.setHeader("Set-Cookie", buildLogoutCookie(req.hostname));
  res.json({ success: true, message: "Logged out successfully" });
}

export async function me(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: _req.user });
}

export async function sendVerification(req: Request, res: Response): Promise<void> {
  try {
    await AuthService.sendVerificationEmail(req.user!.id);
    res.json({ success: true, message: "Verification code sent." });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message ?? "Failed to send code" });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    await AuthService.verifyEmail(req.user!.id, req.body);
    // Re-fetch user so the updated JWT reflects email_verified: true
    const updated = await AuthService.getUserById(req.user!.id);
    if (updated) {
      const token = signJwt(jwtPayload(updated));
      res.setHeader("Set-Cookie", buildAuthCookie(token, req.hostname));
    }
    res.json({ success: true, message: "Email verified successfully." });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message ?? "Verification failed" });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    await AuthService.forgotPassword(req.body.email);
  } catch {
    // swallow to prevent email enumeration
  }
  res.json({ success: true, message: "If that email exists, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    await AuthService.resetPassword(req.body);
    res.json({ success: true, message: "Password reset successfully." });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message ?? "Reset failed" });
  }
}
