export type CoaRecord = {
  id: string;
  storeId: string;
  fileName: string;
  blobUrl: string;
  fileSize: number;
  uploadedAt: string;
};

export type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type StoreUserRecord = {
  id: string;
  storeId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type SessionRole = "platform" | "store";

export type RewardChoice = "gram" | "thc_drink";

export type ReferrerRecord = {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phoneE164: string;
  phoneDisplay: string;
  createdAt: string;
  lastWeeklyEmailAt: string | null;
  emailOptOutAt: string | null;
  unsubscribeToken: string;
};

export type ReferralRedemptionRecord = {
  id: string;
  storeId: string;
  referrerId: string;
  friendName: string;
  friendPhoneE164: string;
  friendEmail: string;
  rewardChoice: RewardChoice;
  redeemedBy: string;
  redeemedAt: string;
  referrerEmailSentAt: string | null;
  friendEmailSentAt: string | null;
  claimCode?: string | null;
  rewardStatus?: "pending" | "claimed" | "expired" | null;
};

export type ReferrerRewardRecord = {
  id: string;
  storeId: string;
  referrerId: string;
  redemptionId: string;
  claimCode: string;
  status: "pending" | "claimed" | "expired";
  rewardChoice: RewardChoice | null;
  expiresAt: string;
  claimedAt: string | null;
  claimedBy: string | null;
  referrerName?: string;
  referrerPhoneDisplay?: string;
  referrerEmail?: string;
};
