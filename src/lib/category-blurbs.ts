import type { Locale } from "@/lib/i18n";

/** Short editorial intros - why this rubrique matters. */
const BLURBS: Record<string, { fr: string; en: string }> = {
  politique: {
    fr: "Pouvoir, institutions et décisions qui redessinent les États africains.",
    en: "Power, institutions, and the decisions that reshape African states.",
  },
  securite: {
    fr: "Conflits, forces armées et la fragilité de la paix au quotidien.",
    en: "Conflict, armed forces, and the fragility of everyday peace.",
  },
  economie: {
    fr: "Ressources, marchés et la bataille pour la richesse du continent.",
    en: "Resources, markets, and the contest over the continent's wealth.",
  },
  societe: {
    fr: "Vies ordinaires, droits et le tissu social sous pression.",
    en: "Ordinary lives, rights, and a social fabric under strain.",
  },
  justice: {
    fr: "Droit, responsabilité et la lutte contre l'impunité.",
    en: "Law, accountability, and the fight against impunity.",
  },
  culture: {
    fr: "Idées, arts et les récits par lesquels l'Afrique se raconte.",
    en: "Ideas, arts, and the stories Africa tells about itself.",
  },
  afrique: {
    fr: "Courants régionaux et liens qui croisent les destins du continent.",
    en: "Regional currents and the ties that bind the continent's fates.",
  },
  opinion: {
    fr: "Analyses et prises de position pour dépasser la version officielle.",
    en: "Arguments and analysis that push past the official line.",
  },
};

const FALLBACK = {
  fr: "Faits, contexte et ce qui compte vraiment dans cette rubrique.",
  en: "Facts, context, and what actually matters in this section.",
};

export function categoryBlurb(slug: string, locale: Locale): string {
  const entry = BLURBS[slug] ?? FALLBACK;
  return locale === "en" ? entry.en : entry.fr;
}
