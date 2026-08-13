# Africa Insight - Sudan journalist outreach (Aug 2026)

English outreach to on-the-ground contributors (Khartoum, Darfur, Kordofan) for **weekly country situation reports**.

## Need

Weekly reports covering five pillars (same model as our Shinta-style country briefs):

1. Politics & diplomacy
2. Economy
3. Society
4. Justice & rights
5. Security

## Headers

| Field | Value |
|--------|--------|
| From | `Africa Insight <noreply@africa-insight.org>` |
| Reply-To | `info@africa-insight.org` |

Uses the **Africa Insight Resend account** (`RESEND_API_KEY` in `Afrika/.env`).

## Send

```bash
cd /Users/mac/Documents/McBuleliP2P
npx tsx scripts/send-sudan-journalist-outreach-email.ts --id 03 --layout card --to EMAIL --send
npx tsx scripts/send-sudan-journalist-outreach-email.ts --all --layout card --to hi@mcbuleli.org --send
```

Facebook / LinkedIn profiles without a public email: paste the matching `.txt` / `.html` into Messenger or InMail.
