import { generateClaimCode, normalizeClaimCode } from "@/lib/claim-code";
import { getSupabase } from "@/lib/supabase";
import type {
  ReferralRedemptionRecord,
  ReferrerRecord,
  ReferrerRewardRecord,
  RewardChoice,
} from "@/lib/types";
import { normalizeUsPhone } from "@/lib/phone";

type ReferrerRow = {
  id: string;
  store_id: string;
  name: string;
  email: string;
  phone_e164: string;
  phone_display: string;
  created_at: string;
  last_weekly_email_at: string | null;
  email_opt_out_at: string | null;
  unsubscribe_token: string;
};

type RedemptionRow = {
  id: string;
  store_id: string;
  referrer_id: string;
  friend_name: string;
  friend_phone_e164: string;
  friend_email: string;
  reward_choice: RewardChoice;
  status: "reserved" | "redeemed" | "expired";
  reserved_at: string | null;
  expires_at: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  referrer_email_sent_at: string | null;
  friend_email_sent_at: string | null;
};

type RewardRow = {
  id: string;
  store_id: string;
  referrer_id: string;
  redemption_id: string;
  claim_code: string;
  status: "pending" | "claimed" | "expired";
  reward_choice: RewardChoice | null;
  expires_at: string;
  claimed_at: string | null;
  claimed_by: string | null;
};

function mapReferrer(row: ReferrerRow): ReferrerRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    email: row.email,
    phoneE164: row.phone_e164,
    phoneDisplay: row.phone_display,
    createdAt: row.created_at,
    lastWeeklyEmailAt: row.last_weekly_email_at,
    emailOptOutAt: row.email_opt_out_at,
    unsubscribeToken: row.unsubscribe_token,
  };
}

function mapRedemption(row: RedemptionRow): ReferralRedemptionRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    referrerId: row.referrer_id,
    friendName: row.friend_name,
    friendPhoneE164: row.friend_phone_e164,
    friendEmail: row.friend_email,
    rewardChoice: row.reward_choice,
    status: row.status,
    reservedAt: row.reserved_at,
    expiresAt: row.expires_at,
    redeemedBy: row.redeemed_by,
    redeemedAt: row.redeemed_at,
    referrerEmailSentAt: row.referrer_email_sent_at,
    friendEmailSentAt: row.friend_email_sent_at,
  };
}

const REDEMPTION_SELECT =
  "id, store_id, referrer_id, friend_name, friend_phone_e164, friend_email, reward_choice, status, reserved_at, expires_at, redeemed_by, redeemed_at, referrer_email_sent_at, friend_email_sent_at";

const RESERVATION_DAYS = 30;
const REFERRER_REWARD_DAYS = 90;

function mapReward(row: RewardRow): ReferrerRewardRecord {
  return {
    id: row.id,
    storeId: row.store_id,
    referrerId: row.referrer_id,
    redemptionId: row.redemption_id,
    claimCode: row.claim_code,
    status: row.status,
    rewardChoice: row.reward_choice,
    expiresAt: row.expires_at,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by,
  };
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function newUnsubscribeToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function getReferralStoreId(slug: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to resolve store: ${error.message}`);
  return data?.id ?? null;
}

export async function countSignupAttempts(
  ip: string,
  sinceIso: string,
): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("referral_signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("attempted_at", sinceIso);

  if (error) throw new Error(`Rate limit check failed: ${error.message}`);
  return count ?? 0;
}

export async function recordSignupAttempt(ip: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("referral_signup_attempts")
    .insert({ ip });

  if (error) throw new Error(`Failed to record signup attempt: ${error.message}`);
}

export async function findReferrerByEmailOrPhone(
  storeId: string,
  email: string,
  phoneE164: string,
): Promise<ReferrerRecord | null> {
  const supabase = getSupabase();

  const { data: byEmail, error: emailError } = await supabase
    .from("referrers")
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .eq("store_id", storeId)
    .eq("email", email)
    .maybeSingle();

  if (emailError) throw new Error(`Failed to find referrer: ${emailError.message}`);
  if (byEmail) return mapReferrer(byEmail as ReferrerRow);

  const { data: byPhone, error: phoneError } = await supabase
    .from("referrers")
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .eq("store_id", storeId)
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  if (phoneError) throw new Error(`Failed to find referrer: ${phoneError.message}`);
  return byPhone ? mapReferrer(byPhone as ReferrerRow) : null;
}

export async function createReferrer(input: {
  storeId: string;
  name: string;
  email: string;
  phoneE164: string;
  phoneDisplay: string;
  signupIp: string | null;
}): Promise<ReferrerRecord> {
  const supabase = getSupabase();
  const row = {
    id: newId("ref"),
    store_id: input.storeId,
    name: input.name,
    email: input.email,
    phone_e164: input.phoneE164,
    phone_display: input.phoneDisplay,
    unsubscribe_token: newUnsubscribeToken(),
    signup_ip: input.signupIp,
  };

  const { data, error } = await supabase
    .from("referrers")
    .insert(row)
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .single();

  if (error) throw new Error(`Failed to create referrer: ${error.message}`);
  return mapReferrer(data as ReferrerRow);
}

export async function getReferrerByPhone(
  storeId: string,
  phoneInput: string,
): Promise<ReferrerRecord | null> {
  const phone = normalizeUsPhone(phoneInput);
  if (!phone) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referrers")
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .eq("store_id", storeId)
    .eq("phone_e164", phone.e164)
    .maybeSingle();

  if (error) throw new Error(`Failed to get referrer: ${error.message}`);
  return data ? mapReferrer(data as ReferrerRow) : null;
}

export async function getReferrerById(
  id: string,
): Promise<ReferrerRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referrers")
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to get referrer: ${error.message}`);
  return data ? mapReferrer(data as ReferrerRow) : null;
}

export async function getReferrerByUnsubscribeToken(
  token: string,
): Promise<ReferrerRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referrers")
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) throw new Error(`Failed to get referrer by token: ${error.message}`);
  return data ? mapReferrer(data as ReferrerRow) : null;
}

export async function optOutReferrer(token: string): Promise<boolean> {
  const referrer = await getReferrerByUnsubscribeToken(token);
  if (!referrer) return false;

  const supabase = getSupabase();
  const { error } = await supabase
    .from("referrers")
    .update({ email_opt_out_at: new Date().toISOString() })
    .eq("id", referrer.id);

  if (error) throw new Error(`Failed to opt out: ${error.message}`);
  return true;
}

export type RedeemErrorCode =
  | "invalid_referrer_phone"
  | "referrer_not_found"
  | "invalid_friend_phone"
  | "invalid_friend_email"
  | "invalid_friend_name"
  | "self_referral_phone"
  | "self_referral_email"
  | "friend_phone_used"
  | "friend_email_used"
  | "invalid_reward_choice"
  | "reservation_not_found"
  | "reservation_expired"
  | "already_redeemed";

async function createReferrerRewardForRedemption(input: {
  storeId: string;
  referrerId: string;
  redemptionId: string;
}): Promise<ReferrerRewardRecord> {
  const supabase = getSupabase();
  const expiresAt = new Date(
    Date.now() + REFERRER_REWARD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  let claimCode = generateClaimCode();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rewardId = newId("rwd");
    const rewardInsert = await supabase
      .from("referrer_rewards")
      .insert({
        id: rewardId,
        store_id: input.storeId,
        referrer_id: input.referrerId,
        redemption_id: input.redemptionId,
        claim_code: claimCode,
        status: "pending",
        expires_at: expiresAt,
      })
      .select(
        "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
      )
      .single();

    if (!rewardInsert.error) {
      return mapReward(rewardInsert.data as RewardRow);
    }

    if (rewardInsert.error.code === "23505") {
      claimCode = generateClaimCode();
      continue;
    }

    throw new Error(`Failed to create reward: ${rewardInsert.error.message}`);
  }

  throw new Error("Failed to mint a unique claim code.");
}

export async function reserveFriendReferral(input: {
  storeId: string;
  referrerPhone: string;
  friendName: string;
  friendPhone: string;
  friendEmail: string;
  rewardChoice: RewardChoice;
}): Promise<
  | {
      ok: true;
      redemption: ReferralRedemptionRecord;
      referrer: ReferrerRecord;
    }
  | { ok: false; code: RedeemErrorCode; message: string }
> {
  const friendName = input.friendName.trim();
  if (!friendName) {
    return {
      ok: false,
      code: "invalid_friend_name",
      message: "Enter your name.",
    };
  }

  const referrerPhone = normalizeUsPhone(input.referrerPhone);
  if (!referrerPhone) {
    return {
      ok: false,
      code: "invalid_referrer_phone",
      message: "Enter a valid US phone number for the person who invited you.",
    };
  }

  const friendPhone = normalizeUsPhone(input.friendPhone);
  if (!friendPhone) {
    return {
      ok: false,
      code: "invalid_friend_phone",
      message: "Enter a valid US phone number.",
    };
  }

  const friendEmail = input.friendEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(friendEmail)) {
    return {
      ok: false,
      code: "invalid_friend_email",
      message: "Enter a valid email address.",
    };
  }

  if (
    input.rewardChoice !== "gram" &&
    input.rewardChoice !== "thc_drink"
  ) {
    return {
      ok: false,
      code: "invalid_reward_choice",
      message: "Choose a free gram or THC drink.",
    };
  }

  const referrer = await getReferrerByPhone(input.storeId, referrerPhone.e164);
  if (!referrer) {
    return {
      ok: false,
      code: "referrer_not_found",
      message: "No referrer found with that phone number.",
    };
  }

  if (friendPhone.e164 === referrer.phoneE164) {
    return {
      ok: false,
      code: "self_referral_phone",
      message: "You can’t use your own number as the referral code.",
    };
  }

  if (friendEmail === referrer.email) {
    return {
      ok: false,
      code: "self_referral_email",
      message: "You can’t use the referrer’s email.",
    };
  }

  const supabase = getSupabase();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + RESERVATION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const reservedAt = now.toISOString();

  const { data: existingPhone } = await supabase
    .from("referral_redemptions")
    .select(REDEMPTION_SELECT)
    .eq("store_id", input.storeId)
    .eq("friend_phone_e164", friendPhone.e164)
    .maybeSingle();

  if (existingPhone) {
    const row = existingPhone as RedemptionRow;
    if (row.status === "redeemed") {
      return {
        ok: false,
        code: "friend_phone_used",
        message: "This phone already used a referral.",
      };
    }
    if (row.status === "reserved") {
      const stillOpen =
        !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
      if (stillOpen) {
        return {
          ok: false,
          code: "friend_phone_used",
          message:
            "You already reserved a reward with this phone. Show it at the register.",
        };
      }
      // Expired — refresh reservation in place
      const { data: refreshed, error: refreshError } = await supabase
        .from("referral_redemptions")
        .update({
          referrer_id: referrer.id,
          friend_name: friendName,
          friend_email: friendEmail,
          reward_choice: input.rewardChoice,
          status: "reserved",
          reserved_at: reservedAt,
          expires_at: expiresAt,
          redeemed_by: null,
          redeemed_at: null,
        })
        .eq("id", row.id)
        .select(REDEMPTION_SELECT)
        .single();

      if (refreshError) {
        throw new Error(`Failed to refresh reservation: ${refreshError.message}`);
      }

      return {
        ok: true,
        redemption: mapRedemption(refreshed as RedemptionRow),
        referrer,
      };
    }
  }

  const { data: existingEmail } = await supabase
    .from("referral_redemptions")
    .select("id, status, expires_at, friend_phone_e164")
    .eq("store_id", input.storeId)
    .eq("friend_email", friendEmail)
    .maybeSingle();

  if (existingEmail) {
    const row = existingEmail as Pick<
      RedemptionRow,
      "id" | "status" | "expires_at" | "friend_phone_e164"
    >;
    if (row.status === "redeemed") {
      return {
        ok: false,
        code: "friend_email_used",
        message: "This email already used a referral.",
      };
    }
    if (row.status === "reserved") {
      const stillOpen =
        !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
      if (stillOpen && row.friend_phone_e164 !== friendPhone.e164) {
        return {
          ok: false,
          code: "friend_email_used",
          message: "This email already has a reservation.",
        };
      }
    }
  }

  const redemptionId = newId("rdm");
  const insert = await supabase
    .from("referral_redemptions")
    .insert({
      id: redemptionId,
      store_id: input.storeId,
      referrer_id: referrer.id,
      friend_name: friendName,
      friend_phone_e164: friendPhone.e164,
      friend_email: friendEmail,
      reward_choice: input.rewardChoice,
      status: "reserved",
      reserved_at: reservedAt,
      expires_at: expiresAt,
      redeemed_by: null,
      redeemed_at: null,
    })
    .select(REDEMPTION_SELECT)
    .single();

  if (insert.error) {
    if (insert.error.code === "23505") {
      if (insert.error.message.includes("friend_phone")) {
        return {
          ok: false,
          code: "friend_phone_used",
          message: "This phone already used a referral.",
        };
      }
      if (insert.error.message.includes("friend_email")) {
        return {
          ok: false,
          code: "friend_email_used",
          message: "This email already used a referral.",
        };
      }
    }
    throw new Error(`Failed to create reservation: ${insert.error.message}`);
  }

  return {
    ok: true,
    redemption: mapRedemption(insert.data as RedemptionRow),
    referrer,
  };
}

export async function findReservedByFriendPhone(
  storeId: string,
  phoneInput: string,
): Promise<{
  redemption: ReferralRedemptionRecord;
  referrer: ReferrerRecord;
} | null> {
  const phone = normalizeUsPhone(phoneInput);
  if (!phone) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referral_redemptions")
    .select(REDEMPTION_SELECT)
    .eq("store_id", storeId)
    .eq("friend_phone_e164", phone.e164)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up reservation: ${error.message}`);
  if (!data) return null;

  const redemption = mapRedemption(data as RedemptionRow);
  if (redemption.status === "reserved" && redemption.expiresAt) {
    if (new Date(redemption.expiresAt).getTime() <= Date.now()) {
      await supabase
        .from("referral_redemptions")
        .update({ status: "expired" })
        .eq("id", redemption.id);
      return null;
    }
  }

  const referrer = await getReferrerById(redemption.referrerId);
  if (!referrer) return null;

  return { redemption, referrer };
}

export async function completeReservedRedemption(input: {
  storeId: string;
  redemptionId: string;
  redeemedBy: string;
  rewardChoice?: RewardChoice;
  withPurchase: boolean;
}): Promise<
  | {
      ok: true;
      redemption: ReferralRedemptionRecord;
      reward: ReferrerRewardRecord;
      referrer: ReferrerRecord;
    }
  | { ok: false; code: RedeemErrorCode; message: string }
> {
  if (!input.withPurchase) {
    return {
      ok: false,
      code: "reservation_not_found",
      message: "Confirm the friend made a purchase.",
    };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referral_redemptions")
    .select(REDEMPTION_SELECT)
    .eq("store_id", input.storeId)
    .eq("id", input.redemptionId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load reservation: ${error.message}`);
  if (!data) {
    return {
      ok: false,
      code: "reservation_not_found",
      message: "Reservation not found.",
    };
  }

  const existing = mapRedemption(data as RedemptionRow);
  if (existing.status === "redeemed") {
    return {
      ok: false,
      code: "already_redeemed",
      message: "This referral was already redeemed.",
    };
  }
  if (
    existing.status === "expired" ||
    (existing.expiresAt &&
      new Date(existing.expiresAt).getTime() <= Date.now())
  ) {
    await supabase
      .from("referral_redemptions")
      .update({ status: "expired" })
      .eq("id", existing.id);
    return {
      ok: false,
      code: "reservation_expired",
      message: "This reservation expired. Ask the friend to reserve again.",
    };
  }
  if (existing.status !== "reserved") {
    return {
      ok: false,
      code: "reservation_not_found",
      message: "No open reservation for this friend.",
    };
  }

  const rewardChoice = input.rewardChoice ?? existing.rewardChoice;
  const redeemedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("referral_redemptions")
    .update({
      status: "redeemed",
      reward_choice: rewardChoice,
      redeemed_by: input.redeemedBy,
      redeemed_at: redeemedAt,
    })
    .eq("id", existing.id)
    .eq("status", "reserved")
    .select(REDEMPTION_SELECT)
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to complete reservation: ${updateError.message}`);
  }
  if (!updated) {
    return {
      ok: false,
      code: "already_redeemed",
      message: "This referral was already redeemed.",
    };
  }

  const referrer = await getReferrerById(existing.referrerId);
  if (!referrer) {
    return {
      ok: false,
      code: "referrer_not_found",
      message: "Referrer not found.",
    };
  }

  const reward = await createReferrerRewardForRedemption({
    storeId: input.storeId,
    referrerId: referrer.id,
    redemptionId: existing.id,
  });

  return {
    ok: true,
    redemption: mapRedemption(updated as RedemptionRow),
    reward,
    referrer,
  };
}

export async function redeemFriendReferral(input: {
  storeId: string;
  referrerPhone: string;
  friendName: string;
  friendPhone: string;
  friendEmail: string;
  rewardChoice: RewardChoice;
  redeemedBy: string;
}): Promise<
  | {
      ok: true;
      redemption: ReferralRedemptionRecord;
      reward: ReferrerRewardRecord;
      referrer: ReferrerRecord;
    }
  | { ok: false; code: RedeemErrorCode; message: string }
> {
  const referrerPhone = normalizeUsPhone(input.referrerPhone);
  if (!referrerPhone) {
    return {
      ok: false,
      code: "invalid_referrer_phone",
      message: "Enter a valid US phone number for the referrer.",
    };
  }

  const friendPhone = normalizeUsPhone(input.friendPhone);
  if (!friendPhone) {
    return {
      ok: false,
      code: "invalid_friend_phone",
      message: "Enter a valid US phone number for the friend.",
    };
  }

  const friendEmail = input.friendEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(friendEmail)) {
    return {
      ok: false,
      code: "invalid_friend_email",
      message: "Enter a valid email for the friend.",
    };
  }

  const referrer = await getReferrerByPhone(input.storeId, referrerPhone.e164);
  if (!referrer) {
    return {
      ok: false,
      code: "referrer_not_found",
      message: "No referrer found with that phone number.",
    };
  }

  if (friendPhone.e164 === referrer.phoneE164) {
    return {
      ok: false,
      code: "self_referral_phone",
      message: "Friend phone cannot match the referrer’s phone.",
    };
  }

  if (friendEmail === referrer.email) {
    return {
      ok: false,
      code: "self_referral_email",
      message: "Friend email cannot match the referrer’s email.",
    };
  }

  // Prefer completing an existing reservation for this friend phone
  const reserved = await findReservedByFriendPhone(
    input.storeId,
    friendPhone.e164,
  );
  if (reserved && reserved.redemption.status === "reserved") {
    return completeReservedRedemption({
      storeId: input.storeId,
      redemptionId: reserved.redemption.id,
      redeemedBy: input.redeemedBy,
      rewardChoice: input.rewardChoice,
      withPurchase: true,
    });
  }

  const supabase = getSupabase();
  const friendName = input.friendName.trim();
  if (!friendName) {
    return {
      ok: false,
      code: "invalid_friend_name",
      message: "Enter the friend’s name.",
    };
  }

  const { data: phoneHit } = await supabase
    .from("referral_redemptions")
    .select(REDEMPTION_SELECT)
    .eq("store_id", input.storeId)
    .eq("friend_phone_e164", friendPhone.e164)
    .maybeSingle();

  if (phoneHit) {
    const row = phoneHit as RedemptionRow;
    if (row.status === "redeemed") {
      return {
        ok: false,
        code: "friend_phone_used",
        message: "Already used a referral (friend phone).",
      };
    }
    // expired or stale reserved — redeem in place via complete path after refresh
    const now = new Date().toISOString();
    const { data: refreshed, error: refreshError } = await supabase
      .from("referral_redemptions")
      .update({
        referrer_id: referrer.id,
        friend_name: friendName,
        friend_email: friendEmail,
        reward_choice: input.rewardChoice,
        status: "reserved",
        reserved_at: now,
        expires_at: new Date(
          Date.now() + RESERVATION_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
        redeemed_by: null,
        redeemed_at: null,
      })
      .eq("id", row.id)
      .select(REDEMPTION_SELECT)
      .single();

    if (refreshError) {
      throw new Error(`Failed to refresh redemption: ${refreshError.message}`);
    }

    return completeReservedRedemption({
      storeId: input.storeId,
      redemptionId: (refreshed as RedemptionRow).id,
      redeemedBy: input.redeemedBy,
      rewardChoice: input.rewardChoice,
      withPurchase: true,
    });
  }

  const { data: emailHit } = await supabase
    .from("referral_redemptions")
    .select("id, status")
    .eq("store_id", input.storeId)
    .eq("friend_email", friendEmail)
    .maybeSingle();

  if (emailHit) {
    const emailRow = emailHit as Pick<RedemptionRow, "id" | "status">;
    if (emailRow.status === "redeemed") {
      return {
        ok: false,
        code: "friend_email_used",
        message: "Already used a referral (friend email).",
      };
    }
  }

  const redemptionId = newId("rdm");
  const now = new Date().toISOString();

  const redemptionInsert = await supabase
    .from("referral_redemptions")
    .insert({
      id: redemptionId,
      store_id: input.storeId,
      referrer_id: referrer.id,
      friend_name: friendName,
      friend_phone_e164: friendPhone.e164,
      friend_email: friendEmail,
      reward_choice: input.rewardChoice,
      status: "redeemed",
      reserved_at: now,
      redeemed_by: input.redeemedBy,
      redeemed_at: now,
    })
    .select(REDEMPTION_SELECT)
    .single();

  if (redemptionInsert.error) {
    if (redemptionInsert.error.code === "23505") {
      if (redemptionInsert.error.message.includes("friend_phone")) {
        return {
          ok: false,
          code: "friend_phone_used",
          message: "Already used a referral (friend phone).",
        };
      }
      if (redemptionInsert.error.message.includes("friend_email")) {
        return {
          ok: false,
          code: "friend_email_used",
          message: "Already used a referral (friend email).",
        };
      }
    }
    throw new Error(
      `Failed to create redemption: ${redemptionInsert.error.message}`,
    );
  }

  try {
    const reward = await createReferrerRewardForRedemption({
      storeId: input.storeId,
      referrerId: referrer.id,
      redemptionId,
    });
    return {
      ok: true,
      redemption: mapRedemption(redemptionInsert.data as RedemptionRow),
      reward,
      referrer,
    };
  } catch (rewardError) {
    await supabase.from("referral_redemptions").delete().eq("id", redemptionId);
    throw rewardError;
  }
}

export async function markRedemptionEmailSent(
  redemptionId: string,
  which: "referrer" | "friend",
): Promise<void> {
  const supabase = getSupabase();
  const field =
    which === "referrer" ? "referrer_email_sent_at" : "friend_email_sent_at";
  const { error } = await supabase
    .from("referral_redemptions")
    .update({ [field]: new Date().toISOString() })
    .eq("id", redemptionId);

  if (error) throw new Error(`Failed to mark email sent: ${error.message}`);
}

export async function getRewardByClaimCode(
  storeId: string,
  codeInput: string,
): Promise<(ReferrerRewardRecord & { referrer: ReferrerRecord }) | null> {
  const code = normalizeClaimCode(codeInput);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referrer_rewards")
    .select(
      "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
    )
    .eq("store_id", storeId)
    .eq("claim_code", code)
    .maybeSingle();

  if (error) throw new Error(`Failed to lookup claim code: ${error.message}`);
  if (!data) return null;

  const reward = mapReward(data as RewardRow);
  const referrer = await getReferrerById(reward.referrerId);
  if (!referrer) return null;

  return { ...reward, referrer };
}

export async function claimReferrerReward(input: {
  storeId: string;
  claimCode: string;
  rewardChoice: RewardChoice;
  claimedBy: string;
}): Promise<
  | { ok: true; reward: ReferrerRewardRecord; referrer: ReferrerRecord }
  | { ok: false; message: string }
> {
  const found = await getRewardByClaimCode(input.storeId, input.claimCode);
  if (!found) {
    return { ok: false, message: "Claim code not found." };
  }

  if (found.status === "claimed") {
    return { ok: false, message: "This claim code was already used." };
  }

  if (found.status === "expired" || new Date(found.expiresAt) < new Date()) {
    if (found.status !== "expired") {
      const supabase = getSupabase();
      await supabase
        .from("referrer_rewards")
        .update({ status: "expired" })
        .eq("id", found.id);
    }
    return { ok: false, message: "This claim code has expired." };
  }

  const supabase = getSupabase();
  const claimedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("referrer_rewards")
    .update({
      status: "claimed",
      reward_choice: input.rewardChoice,
      claimed_at: claimedAt,
      claimed_by: input.claimedBy,
    })
    .eq("id", found.id)
    .eq("status", "pending")
    .select(
      "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
    )
    .maybeSingle();

  if (error) throw new Error(`Failed to claim reward: ${error.message}`);
  if (!data) {
    return { ok: false, message: "This claim code was already used." };
  }

  return {
    ok: true,
    reward: mapReward(data as RewardRow),
    referrer: found.referrer,
  };
}

export async function getReferralStats(storeId: string) {
  const supabase = getSupabase();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    referrers,
    redemptionsAll,
    redemptionsWeek,
    reserved,
    pending,
    claimed,
    expired,
  ] = await Promise.all([
    supabase
      .from("referrers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("referral_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "redeemed"),
    supabase
      .from("referral_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "redeemed")
      .gte("redeemed_at", weekAgo),
    supabase
      .from("referral_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "reserved"),
    supabase
      .from("referrer_rewards")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "pending"),
    supabase
      .from("referrer_rewards")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "claimed"),
    supabase
      .from("referrer_rewards")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "expired"),
  ]);

  return {
    referrers: referrers.count ?? 0,
    redemptionsAllTime: redemptionsAll.count ?? 0,
    redemptionsThisWeek: redemptionsWeek.count ?? 0,
    reservedPending: reserved.count ?? 0,
    pendingRewards: pending.count ?? 0,
    claimedRewards: claimed.count ?? 0,
    expiredRewards: expired.count ?? 0,
  };
}

export async function listRecentRedemptions(storeId: string, limit = 25) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referral_redemptions")
    .select(REDEMPTION_SELECT)
    .eq("store_id", storeId)
    .order("reserved_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list redemptions: ${error.message}`);

  const redemptions = ((data ?? []) as RedemptionRow[]).map(mapRedemption);
  const rewardIds = redemptions.map((r) => r.id);

  let rewardsByRedemption = new Map<string, RewardRow>();
  if (rewardIds.length > 0) {
    const { data: rewards, error: rewardError } = await supabase
      .from("referrer_rewards")
      .select(
        "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
      )
      .in("redemption_id", rewardIds);

    if (rewardError) {
      throw new Error(`Failed to list rewards: ${rewardError.message}`);
    }

    rewardsByRedemption = new Map(
      ((rewards ?? []) as RewardRow[]).map((r) => [r.redemption_id, r]),
    );
  }

  const referrerIds = [...new Set(redemptions.map((r) => r.referrerId))];
  const referrerMap = new Map<string, ReferrerRecord>();
  if (referrerIds.length > 0) {
    const { data: referrers, error: referrerError } = await supabase
      .from("referrers")
      .select(
        "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
      )
      .in("id", referrerIds);

    if (referrerError) {
      throw new Error(`Failed to list referrers: ${referrerError.message}`);
    }

    for (const row of (referrers ?? []) as ReferrerRow[]) {
      referrerMap.set(row.id, mapReferrer(row));
    }
  }

  return redemptions.map((r) => {
    const reward = rewardsByRedemption.get(r.id);
    const referrer = referrerMap.get(r.referrerId);
    return {
      ...r,
      claimCode: reward?.claim_code ?? null,
      rewardStatus: reward?.status ?? null,
      referrerName: referrer?.name ?? null,
      referrerPhoneDisplay: referrer?.phoneDisplay ?? null,
      referrerEmail: referrer?.email ?? null,
    };
  });
}

export async function listPendingRewards(storeId: string, limit = 50) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referrer_rewards")
    .select(
      "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
    )
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("expires_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to list pending rewards: ${error.message}`);

  const rewards = ((data ?? []) as RewardRow[]).map(mapReward);
  const referrerIds = [...new Set(rewards.map((r) => r.referrerId))];
  const referrerMap = new Map<string, ReferrerRecord>();

  if (referrerIds.length > 0) {
    const { data: referrers, error: referrerError } = await supabase
      .from("referrers")
      .select(
        "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
      )
      .in("id", referrerIds);

    if (referrerError) {
      throw new Error(`Failed to list referrers: ${referrerError.message}`);
    }

    for (const row of (referrers ?? []) as ReferrerRow[]) {
      referrerMap.set(row.id, mapReferrer(row));
    }
  }

  return rewards.map((r) => {
    const referrer = referrerMap.get(r.referrerId);
    return {
      ...r,
      referrerName: referrer?.name,
      referrerPhoneDisplay: referrer?.phoneDisplay,
      referrerEmail: referrer?.email,
    };
  });
}

export async function findPendingRewardsByReferrerPhone(
  storeId: string,
  phoneInput: string,
) {
  const referrer = await getReferrerByPhone(storeId, phoneInput);
  if (!referrer) return { referrer: null, rewards: [] as ReferrerRewardRecord[] };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referrer_rewards")
    .select(
      "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
    )
    .eq("store_id", storeId)
    .eq("referrer_id", referrer.id)
    .eq("status", "pending")
    .order("expires_at", { ascending: true });

  if (error) throw new Error(`Failed to find pending rewards: ${error.message}`);

  return {
    referrer,
    rewards: ((data ?? []) as RewardRow[]).map(mapReward),
  };
}

export async function getRedemptionWithDetails(id: string, storeId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("referral_redemptions")
    .select(
      "id, store_id, referrer_id, friend_name, friend_phone_e164, friend_email, reward_choice, redeemed_by, redeemed_at, referrer_email_sent_at, friend_email_sent_at",
    )
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get redemption: ${error.message}`);
  if (!data) return null;

  const redemption = mapRedemption(data as RedemptionRow);
  const referrer = await getReferrerById(redemption.referrerId);
  if (!referrer) return null;

  const { data: rewardData, error: rewardError } = await supabase
    .from("referrer_rewards")
    .select(
      "id, store_id, referrer_id, redemption_id, claim_code, status, reward_choice, expires_at, claimed_at, claimed_by",
    )
    .eq("redemption_id", id)
    .maybeSingle();

  if (rewardError) throw new Error(`Failed to get reward: ${rewardError.message}`);
  if (!rewardData) return null;

  return {
    redemption,
    referrer,
    reward: mapReward(rewardData as RewardRow),
  };
}

export async function getReferrerProgress(referrerId: string) {
  const supabase = getSupabase();
  const [redemptions, pending, claimed] = await Promise.all([
    supabase
      .from("referral_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrerId),
    supabase
      .from("referrer_rewards")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrerId)
      .eq("status", "pending"),
    supabase
      .from("referrer_rewards")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrerId)
      .eq("status", "claimed"),
  ]);

  return {
    friendsRedeemed: redemptions.count ?? 0,
    pendingCodes: pending.count ?? 0,
    claimedRewards: claimed.count ?? 0,
  };
}

export async function listWeeklyEmailCandidates(limit = 500) {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch opted-in referrers ordered by oldest activity; filter 7-day rule in app
  // because PostgREST can't easily express COALESCE(last_weekly_email_at, created_at).
  const { data, error } = await supabase
    .from("referrers")
    .select(
      "id, store_id, name, email, phone_e164, phone_display, created_at, last_weekly_email_at, email_opt_out_at, unsubscribe_token",
    )
    .is("email_opt_out_at", null)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) throw new Error(`Failed to list weekly candidates: ${error.message}`);

  const eligible = ((data ?? []) as ReferrerRow[])
    .map(mapReferrer)
    .filter((r) => {
      const baseline = r.lastWeeklyEmailAt ?? r.createdAt;
      return baseline < cutoff;
    })
    .slice(0, limit);

  return eligible;
}

export async function markWeeklyEmailSent(referrerId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("referrers")
    .update({ last_weekly_email_at: new Date().toISOString() })
    .eq("id", referrerId);

  if (error) throw new Error(`Failed to mark weekly email: ${error.message}`);
}

export async function expireOverdueRewards(): Promise<number> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("referrer_rewards")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", now)
    .select("id");

  if (error) throw new Error(`Failed to expire rewards: ${error.message}`);
  return data?.length ?? 0;
}

export async function purgeOldSignupAttempts(): Promise<void> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("referral_signup_attempts")
    .delete()
    .lt("attempted_at", cutoff);
}
