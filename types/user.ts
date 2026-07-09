export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  emailVerified: boolean;
  mfaEnabled: boolean;
  disabled: boolean;
  createdAt: string | null; // ISO
  lastLoginAt: string | null; // ISO
};

export type UserDetail = {
  profile: UserProfile;
  counts: Record<string, number>;
};

export type PlatformStats = {
  totalUsers: number;
  disabledUsers: number;
  mfaUsers: number;
  newLast30Days: number;
  providers: Record<string, number>;
};
