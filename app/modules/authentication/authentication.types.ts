export enum UserRole {
  Unauthenticated = "unauthenticated",
  Authenticated = "authenticated",
  Admin = "admin",
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  /**
   * Extensible bag for non-auth data (display name, preferences, etc.).
   * Other modules write here — the auth module never reads it.
   */
  profile: Record<string, any>;
  createdAt: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailDto {
  code: string;
}

export interface AuthApiResponse {
  success: boolean;
  user?: PublicUser;
  message?: string;
  error?: string;
}
