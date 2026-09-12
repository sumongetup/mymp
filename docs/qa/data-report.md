# Data integrity report

Generated 2026-09-12 07:23 UTC by `npx tsx scripts/qa-data.ts` from the committed snapshot in `data/` (built 2026-09-11 12:06 UTC) and the live admin tables.

**0 failing checks, 21 passing, 7 notes.**

| | Check | Detail |
|---|---|---|
| ✅ | General seats: no duplicate numbers |  |
| ✅ | General seats: all 300 present |  |
| ✅ | District numbering: 64 districts, ordinals run without gaps |  |
| ✅ | Seat slugs: unique |  |
| ✅ | Reserved seats: 50 present, numbered 301–350 without gaps |  |
| ✅ | Total members: 348 sitting = 348 filled seats (the home chart uses statistics().total, computed from members) |  |
| ✅ | Party totals: 11 parties sum to 348 = 348 members; general and reserved splits add up |  |
| ✅ | Majority: computed as floor(350/2)+1 = 176 in statistics(), not hardcoded |  |
| ✅ | Every member (349) has a Bangla name, a seat, a party and a seat type |  |
| ℹ️ | Namesakes: same normalised name, different seats (not duplicates) | মোঃ নুরুল আমীন [রংপুর-৬] / নুরুল আমিন [চট্টগ্রাম-১]; মোঃ আনোয়ারুল ইসলাম [কুড়িগ্রাম-১] / মোঃ আনোয়ারুল ইসলাম [নাটোর-৩]; মোঃ মোস্তাফিজুর রহমান [কুড়িগ্রাম-৪] / মোঃ মোস্তাফিজুর রহমান [নওগাঁ-১]; মোঃ নূরুল ইসলাম [চাঁপাইনবাবগঞ্জ-৩] / মোহাম্মদ নূরুল ইসলাম [ভোলা-৪] / নূরুল ইসলাম [সুনামগঞ্জ-৪]; মোঃ এনামুল হক [নওগাঁ-২] / মোহাম্মদ এনামুল হক [চট্টগ্রাম-১২]; এডভোকেট মোঃ জালাল উদ্দীন [কিশোরগঞ্জ-২] / মোঃ জালাল উদ্দিন [চাঁদপুর-২]; ডাঃ মোঃ শফিকুর রহমান [ঢাকা-১৫] / মোঃ সফিকুর রহমান (কিরন) [শরিয়তপুর-২]; আবুল কালাম [নারায়ণগঞ্জ-৫] / মোঃ আবুল কালাম [কুমিল্লা-৯]; এস, এম, জিলানী [গোপালগঞ্জ-৩] / এস, এম, ফয়সল [হবিগঞ্জ-৪]; শাহজাহান চৌধুরী [চট্টগ্রাম-১৫] / শাহজাহান চৌধুরী [কক্সবাজার-৪] |
| ✅ | No member appears twice under two spellings |  |
| ℹ️ | Honorific spellings in source names (kept as the source writes them; search and matching fold them) | ব্যারিস্টার ×1, মুহাম্মদ ×3, মোঃ ×74, মোহাম্মদ ×16, ডাঃ ×3, ব্যারিষ্টার ×1 |
| ✅ | References: every member, seat, party and committee id used by seats, committees, notices, officers, news, results, posts and history exists |  |
| ℹ️ | Seats without a sitting member | ঠাকুরগাঁও-১ (vacant since 2026-08-21); চট্টগ্রাম-৪ (no member) |
| ✅ | Parties: each has at least one member |  |
| ℹ️ | Committees with no members: 35 of 66 | 35 are marked rosterCurrent=false (parliament has not published a 13th-parliament roster; the page says so) |
| ✅ | Districts: 64 derived from seat names; none without seats by construction |  |
| ℹ️ | General seats with no published result | চট্টগ্রাম-২; চট্টগ্রাম-৪; খাগড়াছড়ি |
| ✅ | Unique offices: at most one holder each in posts, activity.speakers and member offices |  |
| ✅ | Ministers: every current minister, state minister and deputy minister has a ministry |  |
| ✅ | House offices agree between activity.speakers and posts |  |
| ✅ | Dates: none in the future, no end before its start (term end 2031-02-16, 2026-08-21 is the parliament's scheduled end) |  |
| ℹ️ | Photos | skipped (--no-photos) |
| ✅ | overrides: all 797 rows point at an existing member, seat, party or committee |  |
| ✅ | news_posts: all 259 rows reference existing members and seats |  |
| ✅ | election_results: 298 rows (297 published), one per seat and parliament, all seats exist |  |
| ℹ️ | hidden_entities | none |
| ✅ | posts tables exist |  |
