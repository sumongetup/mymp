# Matcher (Phase 4)

Decides which MP, if any, a headline or video title is about, with a confidence from 0 to 1 and a written reason. Built on `@sangsad/shared`'s `normalise` and `nameSimilarity`, plus the per-MP alias table and context signals (constituency, district, party, "এমপি", "সংসদ সদস্য", "মন্ত্রী").

Thresholds from the brief: ≥ 0.85 auto-publish, 0.5–0.85 review queue, < 0.5 discard; any ambiguity between two MPs goes to review. Nothing here is implemented until Phase 4's plan is approved.
