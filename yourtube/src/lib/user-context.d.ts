import type { User } from "firebase/auth";

export interface AppUser {
  _id: string;
  email: string;
  name?: string;
  image?: string;
  plan?: string;
  channelname?: string;
}

export interface UserContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (userdata: AppUser) => void;
  loginWithToken: (userdata: AppUser, token: string) => void;
  logout: () => Promise<void>;
  openAuthDialog: (mode?: string) => void;
  closeAuthDialog: () => void;
  authDialogOpen: boolean;
  authDialogMode: string;
  handleAuthSuccess: (firebaseUser: User) => Promise<void>;
  upgradeOpen: boolean;
  upgradeReason: string;
  upgradePlan: string;
  openUpgradeDialog: (reason?: string, plan?: string) => void;
  closeUpgradeDialog: () => void;
}

declare module "./user-context" {
  import type { Context } from "react";
  export const UserContext: Context<UserContextValue | null>;
}
