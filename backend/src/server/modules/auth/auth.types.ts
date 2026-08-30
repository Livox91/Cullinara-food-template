export interface AuthUserDto {
  id: string;
  email: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface VerificationRequestResult {
  channel: "EMAIL" | "PHONE";
  maskedTarget: string;
  expiresAt: string;
  delivery: "QUEUED";
}

export interface VerificationResult {
  channel: "EMAIL" | "PHONE";
  verifiedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt: string;
}

export interface AuthResult {
  user: AuthUserDto;
  tokens: TokenPair;
}
