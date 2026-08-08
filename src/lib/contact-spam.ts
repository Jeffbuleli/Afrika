/**
 * Lightweight spam heuristics for the public contact / suggestions form.
 * Score >= BLOCK_SCORE → silent reject (fake success).
 * Score >= SPAM_SCORE → accept but mark status=spam (admin can review).
 */

export const SPAM_SCORE = 4;
export const BLOCK_SCORE = 7;

const PITCH_PATTERNS: RegExp[] = [
  /\bsite\s*web\b/i,
  /\bweb\s*site\b/i,
  /\b(?:refonte|redesign|revamp)\b/i,
  /\bseo\b/i,
  /\bdigital\s+marketing\b/i,
  /\b(?:agence|agency)\b/i,
  /\b(?:devis|quote|pricing|tarif)\b/i,
  /\b(?:wordpress|wix|shopify)\b/i,
  /\b(?:améliorer|improve|boost|augmenter)\s+(?:votre|your)\s+(?:portée|reach|visibilité|visibility|trafic|traffic)\b/i,
  /\b(?:seriez[- ]vous ouvert|would you be open|are you open)\b/i,
  /\b(?:courte discussion|short (?:call|discussion|chat)|quick call)\b/i,
  /\b(?:offre une analyse|offers? (?:valuable|great) (?:analysis|insights?))\b/i,
  /\bbien structuré(?:e)?\b/i,
  /\bwell[- ]structured\b/i,
  /\bgrowth\s+hack/i,
  /\bbacklinks?\b/i,
  /\bguest\s+post/i,
  /\blink\s+building/i,
];

/** Gmail / freemail with many single-letter dotted segments: pr.an.ab.hue.c.o.d.e.1@… */
function dottedFreemailScore(email: string | null): number {
  if (!email) return 0;
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return 0;
  const freemail = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "ymail.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "aol.com",
    "gmx.com",
    "mail.com",
  ]);
  if (!freemail.has(domain)) return 0;

  const dots = (local.match(/\./g) || []).length;
  const singleLetterParts = local
    .split(".")
    .filter((p) => p.length === 1 && /[a-z0-9]/.test(p)).length;

  let score = 0;
  if (dots >= 4) score += 3;
  else if (dots >= 2) score += 1;
  if (singleLetterParts >= 3) score += 3;
  else if (singleLetterParts >= 2) score += 2;
  // Pure digit tail after many dots (…e.1)
  if (/\.\d+$/.test(local) && dots >= 3) score += 1;
  return score;
}

function pitchScore(message: string): number {
  let hits = 0;
  for (const re of PITCH_PATTERNS) {
    if (re.test(message)) hits += 1;
  }
  if (hits >= 3) return 5;
  if (hits === 2) return 3;
  if (hits === 1) return 2;
  return 0;
}

function linkScore(message: string): number {
  const urls = message.match(/https?:\/\/|www\./gi) || [];
  if (urls.length >= 3) return 3;
  if (urls.length >= 1) return 1;
  return 0;
}

export type SpamAssessment = {
  score: number;
  reasons: string[];
  action: "allow" | "spam" | "block";
};

export function assessContactSpam(input: {
  name: string;
  email: string | null;
  message: string;
  kind: "suggestion" | "contact";
  /** ms since form was rendered (client clock). */
  formAgeMs: number | null;
  userAgent: string | null;
}): SpamAssessment {
  const reasons: string[] = [];
  let score = 0;

  const emailScore = dottedFreemailScore(input.email);
  if (emailScore) {
    score += emailScore;
    reasons.push(`email_pattern:+${emailScore}`);
  }

  const pitch = pitchScore(input.message);
  if (pitch) {
    score += pitch;
    reasons.push(`pitch:+${pitch}`);
  }

  const links = linkScore(input.message);
  if (links) {
    score += links;
    reasons.push(`links:+${links}`);
  }

  // Commercial pitch filed as "suggestion" is a strong signal.
  if (input.kind === "suggestion" && pitch >= 3) {
    score += 2;
    reasons.push("suggestion_as_pitch:+2");
  }

  if (input.formAgeMs != null) {
    if (input.formAgeMs < 2500) {
      score += 4;
      reasons.push("too_fast:+4");
    } else if (input.formAgeMs < 5000 && pitch >= 2) {
      score += 2;
      reasons.push("fast_pitch:+2");
    }
  }

  if (!input.userAgent || input.userAgent.trim().length < 20) {
    score += 2;
    reasons.push("ua:+2");
  }

  // Name looks like "Pranab R·" / single letter last name + pitch
  if (/^[A-Za-zÀ-ÿ]{2,}\s+[A-Za-zÀ-ÿ]\.?$/.test(input.name.trim()) && pitch >= 2) {
    score += 1;
    reasons.push("short_name:+1");
  }

  let action: SpamAssessment["action"] = "allow";
  if (score >= BLOCK_SCORE) action = "block";
  else if (score >= SPAM_SCORE) action = "spam";

  return { score, reasons, action };
}
