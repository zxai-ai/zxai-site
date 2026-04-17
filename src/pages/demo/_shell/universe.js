// Shared demo universe. Single source of truth for all 9 agent demos.
// Every demo reads from this file. No hardcoded data elsewhere.
//
// Naming convention: "YOUR Practice" / "YOUR Med Spa" / "YOUR Concierge".
// Presenter Mode (see presenter.js) swaps these strings client-side during
// live sales calls. Default always shows "YOUR ..." so no field is blank.

export const DEMO_UNIVERSE = {
  practice: {
    name: "YOUR Practice",
    medSpaName: "YOUR Med Spa",
    conciergeName: "YOUR Concierge",
    phone: "(555) 234-9000",
    address: "123 Main St, Dallas TX",
    website: "cedarhealthfm.example",
  },
  provider: {
    name: "Dr. Reeves",
    credentials: "MD",
    specialty: "Family Medicine",
  },
  patient: {
    firstName: "Sarah",
    lastName: "Lin",
    conciergeMember: true,
    botoxEightMonthsAgo: {
      units: 24,
      areas: "forehead, crow's feet",
      provider: "Dr. Reeves",
      averagePatientValue: 332,
    },
    wellnessVisitLastWeek: {
      type: "Annual Wellness Visit",
      provider: "Dr. Reeves",
      followUps: [
        { type: "lab_work", description: "Comprehensive metabolic panel + lipid panel", due: "within 2 weeks" },
        { type: "referral", description: "Sleep study referral if symptoms persist", due: "as needed" },
      ],
    },
    mriAuth: {
      procedure: "MRI Lumbar Spine",
      cpt: "72148",
      payer: "Aetna PPO",
      reason: "Chronic lower back pain, 3 months, failed conservative therapy",
    },
    thursdayAppointment: {
      provider: "Dr. Reeves",
      type: "Follow-up Visit",
      location: "YOUR Practice",
    },
  },
  priorAuth: {
    manualTimeline: [
      { day: 1, label: "Request created. Staff calls payer.", tone: "warning" },
      { day: 3, label: "On hold 47 minutes. Fax sent.", tone: "warning" },
      { day: 5, label: "No response. Staff calls again.", tone: "warning" },
      { day: 8, label: "Payer requests additional docs.", tone: "alert" },
      { day: 11, label: "Approved.", tone: "success" },
    ],
    aiTimeline: [
      { day: 1, label: "Form auto-populated. Submitted electronically. Clinical notes attached.", tone: "success" },
      { day: 1, label: "Agent follows up automatically.", tone: "success" },
      { day: 2, label: "Approved.", tone: "success" },
    ],
    // Stats tied to ZxAI's tech stack audit and MGMA benchmarks.
    // Per-auth time: audit states 3-5 hours → under 15 min.
    // Physician hours: 4.6/wk per physician is a standard industry figure for
    // pajama time spent on prior auth. No approval-rate claims: the agent
    // submits cleaner packets and follows up consistently, but the lift on
    // final approval rate is practice-specific and not claimed up front.
    stats: {
      timePerAuth:     { withAi: "Under 15 min",  manual: "3 to 5 hours" },
      staffHoursPerAuth: { withAi: 0,             manual: 2.3 },
      physicianHoursRecoveredPerWeek: 4.6,
      source: "Based on MGMA benchmarks and ZxAI client data.",
    },
  },
  revenueRecovery: {
    // Patient-pay A/R only. Insurance claims stay with the practice's existing
    // biller — explicit scope from the ZxAI Tech Stack Audit. The agent scans
    // A/R daily, sends SMS reminder sequences (day 1, 7, 14, 30) with a payment
    // link, tracks payments in real time, and escalates 60+ day accounts.
    agingBuckets: [
      { range: "Just billed",          tag: "day 1",      accounts: 14, value: 4820  },
      { range: "Reminder 2 sent",      tag: "day 7+",     accounts:  9, value: 3160  },
      { range: "Reminder 3 sent",      tag: "day 14+",    accounts:  5, value: 1980  },
      { range: "Escalated to staff",   tag: "60+ days",   accounts:  4, value: 2440  },
    ],
    feedItems: [
      { patientId: "1247", status: "reminder-1",  detail: "SMS #1 sent with payment link. Balance $85. Day 1." },
      { patientId: "1089", status: "paid",        detail: "Payment received via secure link. $210 collected." },
      { patientId: "1203", status: "reminder-2",  detail: "SMS #2 sent. Balance $540. Day 7." },
      { patientId: "0998", status: "escalated",   detail: "Flagged for staff follow-up. Balance $1,240 at 62 days." },
      { patientId: "1335", status: "paid",        detail: "Payment plan accepted. First installment $75 received." },
      { patientId: "1102", status: "reminder-3",  detail: "SMS #3 sent. Balance $320. Day 14." },
      { patientId: "1418", status: "paid",        detail: "Balance cleared in full. $148 received via payment link." },
      { patientId: "1276", status: "reminder-1",  detail: "SMS #1 sent. Balance $95. Day 1." },
      { patientId: "1051", status: "paid",        detail: "Payment received. $425 collected." },
      { patientId: "1398", status: "reminder-4",  detail: "SMS #4 sent. Balance $680. Day 30. Last automated touch before escalation." },
      { patientId: "1190", status: "paid",        detail: "Balance cleared. $112 collected." },
      { patientId: "1224", status: "escalated",   detail: "Flagged for staff follow-up. Balance $890 at 74 days." },
    ],
    // Metrics match the audit: $2,100 collected per week, days-in-A/R drops,
    // 20-40% patient-pay collection improvement.
    weeklyCollected: 2100,
    outstandingBalance: 12400,
    escalatedAccounts: 4,
    collectionLiftPct: { low: 20, high: 40 },
  },
  reputation: {
    // Audit-aligned flow: 2 hours after the appointment ends, send an SMS
    // satisfaction check. 4-5 stars get a Google review request with a direct
    // link. 1-3 stars get routed privately to the practice manager. Never
    // publish a public response to a negative review.
    patients: [
      {
        id: "1247",
        name: "Maria T.",
        visitType: "Wellness visit",
        visitedMinutesAgo: 135,
        satisfactionMessage: "Hi Maria, it's YOUR Practice. How was your visit with Dr. Reeves today, on a scale of 1 to 5? Reply with a number.",
        patientReply: "5!",
        outcome: "review-link",
        followupMessage: "Thanks Maria! Would you share a quick review on Google? It really helps us reach more people like you. [review link]",
        reviewPosted: true,
        reviewStars: 5,
        reviewText: "Dr. Reeves is incredible. Took time to listen, explained everything clearly. I actually feel heard for the first time in years.",
      },
      {
        id: "1089",
        name: "James K.",
        visitType: "Annual physical",
        visitedMinutesAgo: 128,
        satisfactionMessage: "Hi James, it's YOUR Practice. How was your visit with Dr. Reeves today, on a scale of 1 to 5? Reply with a number.",
        patientReply: "4",
        outcome: "review-link",
        followupMessage: "Thanks James! Would you share a quick review on Google? It really helps us reach more people like you. [review link]",
        reviewPosted: false,
      },
      {
        id: "1203",
        name: "Sarah L.",
        visitType: "Follow-up visit",
        visitedMinutesAgo: 121,
        satisfactionMessage: "Hi Sarah, it's YOUR Practice. How was your visit with Dr. Reeves today, on a scale of 1 to 5? Reply with a number.",
        patientReply: "3",
        outcome: "escalated",
        escalationSummary: "Flagged for practice manager. Neutral score after follow-up visit. Recent context: visit ran 12 minutes over scheduled time. No public review request sent.",
      },
      {
        id: "0998",
        name: "Anonymous",
        visitType: "Sick visit",
        visitedMinutesAgo: 118,
        satisfactionMessage: "Hi there, it's YOUR Practice. How was your visit today, on a scale of 1 to 5? Reply with a number.",
        patientReply: "1",
        outcome: "escalated-urgent",
        escalationSummary: "Urgent flag for practice manager. Low satisfaction after sick visit. Manager notified via dashboard and SMS. No public review request sent.",
      },
    ],
    weeklyStats: {
      requestsSent: 34,
      reviewsPosted: 12,
      averageStars: 4.8,
      flaggedForManager: 2,
    },
  },
  marketing: {
    brandKit: {
      logoMark: "YP",
      colors: [
        { name: "Primary",  hex: "#06B6D4" },
        { name: "Accent",   hex: "#0EA5E9" },
        { name: "Ink",      hex: "#0F172A" },
        { name: "Cream",    hex: "#F4EEDD" },
      ],
      voiceTags: ["Warm", "9th grade", "No jargon", "Peer to peer", "Specific numbers"],
      channels: ["Instagram", "Facebook", "Email", "Blog", "SMS", "Portal"],
      connectedAccounts: [
        { id: "ga4",        name: "Google Analytics 4", status: "connected" },
        { id: "gsc",        name: "Search Console",     status: "connected" },
        { id: "meta",       name: "Meta (FB + IG)",     status: "connected" },
        { id: "linkedin",   name: "LinkedIn",           status: "connected" },
        { id: "competitive-intel", name: "Competitive Intel", status: "connected" },
        { id: "canva",      name: "Canva + Creative",   status: "connected" },
      ],
      platformStats: {
        signalsActed: 12,
        piecesPublished: 74,
        emailCtrPct: 4.2,
        igImpressionGrowthPct: 11,
      },
    },

    signals: [
      {
        id: "sig-katie-wellness",
        source: "Call Center (Katie)",
        icon: "phone",
        headline: "4 patients asked about annual wellness visits this week",
        detail: "Katie logged 4 separate callers in the past 7 days asking what a wellness visit covers. Highest weekly volume this quarter. Intent is there, coverage is thin.",
        confidence: 92,
        opportunity: "High intent, low blog coverage. Competitor Riverside Family posted 12 days ago and is ranking above you for this keyword cluster.",
        campaignKey: "wellness-visit",
      },
      {
        id: "sig-gsc-concierge",
        source: "Search Console",
        icon: "chart",
        headline: "Impressions for \"concierge medicine dallas\" down 34%",
        detail: "GSC shows a 14-day impression decline across 6 tracked queries. Alpine MD published 3 posts in that window that now rank above YOUR Practice.",
        confidence: 87,
        opportunity: "Reclaim lost rank with a refreshed pillar page plus supporting social. Two of your existing pages need updating.",
        campaignKey: "concierge-reclaim",
      },
      {
        id: "sig-competitive-labs",
        source: "Competitive Intel",
        icon: "target",
        headline: "Competitor has 11 posts on \"reading your labs.\" You have 0.",
        detail: "Oak Hill Family Medicine has 11 posts on lab interpretation, combined 2,100 monthly local searches. Zero coverage on YOUR site. Direct content gap.",
        confidence: 89,
        opportunity: "High-intent keyword cluster, low local competition if you move fast. Patient education is brand-aligned.",
        campaignKey: "lab-results",
      },
      {
        id: "sig-reputation-theme",
        source: "Reputation Agent",
        icon: "star",
        headline: "3 recent 5-star reviews mentioned \"Dr. Reeves took time\"",
        detail: "Reputation Agent identified 'physician time' as a trending positive theme across 7 reviews this month. Aligned with concierge positioning.",
        confidence: 95,
        opportunity: "Turn real patient sentiment into testimonial-led content. Queued, ready to draft when you are.",
        campaignKey: null, // queued / not-yet-wired
        queued: true,
      },
      {
        id: "sig-seasonal-flu",
        source: "Calendar + CDC",
        icon: "calendar",
        headline: "Flu season peaks in your zip in 17 days",
        detail: "CDC forecast plus your 3-year historical pattern. Last year's flu campaign drove 41 new appointments and 22 shots.",
        confidence: 100,
        opportunity: "Evergreen annual campaign. Reuse last year's structure, refresh creative with this year's data.",
        campaignKey: null,
        queued: true,
      },
    ],

    campaigns: {
      "wellness-visit": {
        headline: "The appointment most patients keep putting off",
        positioning: "Reframe the wellness visit as the one appointment that catches things early. Not scary. Clear, confident, practical.",
        audience: "Active patients overdue by 60+ days, plus the general list.",
        channels: [
          {
            type: "instagram",
            label: "Instagram",
            body: "Your annual wellness visit is the appointment most patients put off.\n\nIt's also the one that catches what you can't feel yet.\n\n45 minutes. Once a year. Book yours before the year gets away from you.",
            meta: "1 post + story teaser",
            scheduled: "Tomorrow, 10:00 AM",
          },
          {
            type: "facebook",
            label: "Facebook",
            body: "The wellness visit you keep pushing off is the one most likely to change your year.\n\nIt's not a sick visit. It's the 45 minutes where your provider looks at the whole picture: labs, sleep, stress, what's changing. No rushing.\n\nBook yours in under a minute.",
            meta: "Feed post + boost",
            scheduled: "Tomorrow, 10:00 AM",
          },
          {
            type: "email",
            label: "Email newsletter",
            subject: "The appointment most patients skip",
            body: "Every year, thousands of patients put off their annual wellness visit. Every year, the ones who went get earlier answers than the ones who didn't.\n\nA wellness visit is not a sick visit. It's the one time a year you and your provider get to look at the whole picture. Labs. Vitals. Sleep. Stress. Family history.\n\nIt takes about 45 minutes. It's usually covered. And it's the closest thing we have to a reset button.\n\nBook yours here.",
            meta: "2,400 recipients",
            scheduled: "Wednesday, 9:00 AM",
          },
          {
            type: "blog",
            label: "Blog post",
            title: "The Annual Wellness Visit: What It Is, What It Isn't, and Why It Matters",
            outline: [
              "What a wellness visit actually covers",
              "Why it's different from a sick visit",
              "What to bring and what not to",
              "How often you should actually go",
              "What your labs tell your provider",
              "Booking your visit at YOUR Practice",
            ],
            meta: "~1,200 words, SEO targeting: annual wellness visit, preventive care, primary care dallas",
            scheduled: "Friday",
          },
          {
            type: "sms",
            label: "SMS reminder",
            body: "Hi from YOUR Practice. Your last annual wellness visit was over a year ago. Takes 45 minutes, usually covered. Book in 30 seconds: [link] Reply STOP to opt out.",
            meta: "To 312 patients 60+ days overdue",
            scheduled: "Saturday, 11:00 AM",
          },
          {
            type: "portal",
            label: "Patient portal",
            body: "Overdue for your annual wellness visit? Book now in under a minute.",
            meta: "Banner on patient portal homepage",
            scheduled: "Today",
          },
        ],
        creative: {
          images: [
            { style: "Editorial",    palette: "cyan-cream", overlay: "45 minutes. One year of answers." },
            { style: "Lifestyle",    palette: "warm-cream", overlay: "The appointment you keep putting off." },
            { style: "Clinical",     palette: "cool-navy",  overlay: "What we catch in 45 minutes." },
            { style: "Typographic",  palette: "cyan-ink",   overlay: "Once a year. That's it." },
          ],
          video: {
            duration: "0:15",
            title: "Why your wellness visit matters",
            palette: "cyan-cream",
            caption: "Three reasons the visit you're putting off is the one you need most.",
            format: "Reel + TikTok + YouTube Short",
          },
        },
      },

      "concierge-reclaim": {
        headline: "What concierge medicine actually is (no mystery)",
        positioning: "Plain-English explainer. Confidence without jargon. Aimed at reclaiming impressions lost to Alpine MD.",
        audience: "Prospects researching concierge options in Dallas-Fort Worth.",
        channels: [
          {
            type: "instagram",
            label: "Instagram",
            body: "Concierge medicine is not fancier medicine.\n\nIt's slower medicine. Longer visits. Direct access. Smaller patient panels so you're not a number.\n\nIf that's what you've been missing, we should talk.",
            meta: "1 post + 1 story",
            scheduled: "Monday, 10:00 AM",
          },
          {
            type: "facebook",
            label: "Facebook",
            body: "Most people hear concierge medicine and think expensive. The real difference is time.\n\nA typical provider sees 20 to 30 patients a day. A concierge provider sees 8 to 12. That's the whole thing. Everything else follows: longer visits, same-day appointments, text access, real conversations.\n\nNot for everyone. Worth a conversation if you've felt like a number.",
            meta: "Feed + boost to 25 mi radius",
            scheduled: "Monday, 10:00 AM",
          },
          {
            type: "email",
            label: "Email newsletter",
            subject: "If you've wondered what concierge actually means",
            body: "We get this question a lot. Usually from patients who've felt rushed somewhere else.\n\nConcierge medicine means your provider has 400 patients instead of 4,000. That changes every other part of your care. Same-day appointments. Text instead of portal. 45-minute visits instead of 11.\n\nIt's not for every family. The ones who benefit most have chronic conditions, young kids, or just want their healthcare to feel personal again.\n\nHappy to walk through it. Reply to this email or book 15 minutes with us.",
            meta: "Prospect list + warm leads",
            scheduled: "Tuesday, 9:00 AM",
          },
          {
            type: "blog",
            label: "Blog post (refresh)",
            title: "Concierge Medicine, Plainly Explained",
            outline: [
              "What the membership actually pays for",
              "What a typical month looks like",
              "Panel size and why it matters",
              "How it works alongside insurance",
              "Who concierge is really for",
              "Who it's not for",
            ],
            meta: "Updates existing page; adds schema + internal links",
            scheduled: "Thursday",
          },
          {
            type: "sms",
            label: "SMS to warm leads",
            body: "YOUR Practice: just published a plain-English guide to concierge medicine. 3 minute read, zero pressure. [link] Reply STOP to opt out.",
            meta: "82 warm leads with 'concierge' interest tag",
            scheduled: "Wednesday, 2:00 PM",
          },
          {
            type: "portal",
            label: "Member portal",
            body: "New guide for friends and family who've asked about your care. Shareable.",
            meta: "Portal card with share buttons",
            scheduled: "Today",
          },
        ],
        creative: {
          images: [
            { style: "Editorial",    palette: "cream-ink",  overlay: "400 patients. Not 4,000." },
            { style: "Lifestyle",    palette: "cyan-cream", overlay: "45 minutes. No rushing." },
            { style: "Minimalist",   palette: "ink-cyan",   overlay: "Concierge, plainly." },
            { style: "Typographic",  palette: "cool-navy",  overlay: "Your provider. Your time." },
          ],
          video: {
            duration: "0:15",
            title: "Concierge medicine in 15 seconds",
            palette: "cream-ink",
            caption: "What it is, what it isn't, and who it's for.",
            format: "Reel + TikTok + YouTube Short",
          },
        },
      },

      "lab-results": {
        headline: "Understanding your lab results without panicking",
        positioning: "Educational and calming. Addresses the panic-scroll moment patients have when labs drop in the portal. Anti-slop, deeply useful.",
        audience: "Recent-lab patients + search traffic on lab interpretation queries.",
        channels: [
          {
            type: "instagram",
            label: "Instagram carousel",
            body: "Your labs just dropped in the portal. You're scrolling. You're worried.\n\nStop. Three things your provider knows that you might not:\n\n1. Reference ranges are guides, not verdicts.\n2. One number out of range rarely means anything on its own.\n3. Your provider reads them as a pattern, not one at a time.\n\nQuestions? Message us through the portal.",
            meta: "3-slide carousel",
            scheduled: "Tomorrow, 11:00 AM",
          },
          {
            type: "facebook",
            label: "Facebook",
            body: "Lab results are confusing even when they're fine.\n\nReference ranges are guides, not rules. Healthy people often sit just outside them. What matters is what's changing over time.\n\nOne number out of range is usually not a big deal. Patterns matter more than single readings. If something actually concerns your provider, they'll call.\n\nNo panic scrolling required.",
            meta: "Educational post + save for later CTA",
            scheduled: "Tomorrow, 11:00 AM",
          },
          {
            type: "email",
            label: "Email newsletter",
            subject: "Your labs, decoded",
            body: "You open the portal. Your labs are in. Half the numbers look fine. Two are highlighted. You start googling.\n\nWe've all been there. Here's what actually helps:\n\nLabs tell your provider three things: where you are today, how you're trending, and what to watch next. A single value rarely tells a story. A trend does.\n\nIf something needs action, you'll hear from us. If not, a quick portal message usually clears up questions faster than Dr. Google.\n\nWe put together a short guide on reading lab results. Link below.",
            meta: "Active patients + recent-lab segment",
            scheduled: "Wednesday, 8:30 AM",
          },
          {
            type: "blog",
            label: "Blog post (pillar)",
            title: "A Plain English Guide to Your Lab Results",
            outline: [
              "What reference ranges actually are",
              "Why one out-of-range value isn't a diagnosis",
              "The difference between acute and chronic markers",
              "Lab panels we order and why",
              "Trending your results over time",
              "When to message us vs. when to wait",
            ],
            meta: "~1,800 words + schema + FAQ. Target: 'understanding lab results', 'what does my a1c mean'",
            scheduled: "Friday",
          },
          {
            type: "sms",
            label: "SMS to recent-lab patients",
            body: "Got your labs and have questions? We published a short guide on reading them. [link] Or message us in the portal. Reply STOP to opt out.",
            meta: "To 148 patients with labs in last 30 days",
            scheduled: "Thursday, 10:00 AM",
          },
          {
            type: "portal",
            label: "Patient portal card",
            body: "New: A plain English guide to reading your lab results.",
            meta: "Portal card pinned for 14 days",
            scheduled: "Today",
          },
        ],
        creative: {
          images: [
            { style: "Editorial",     palette: "cream-ink",   overlay: "Your labs, decoded." },
            { style: "Data-viz",      palette: "cyan-ink",    overlay: "Patterns, not single numbers." },
            { style: "Typographic",   palette: "warm-cream",  overlay: "Stop panic-googling." },
            { style: "Clinical",      palette: "cool-navy",   overlay: "Three things to know before you worry." },
          ],
          video: {
            duration: "0:15",
            title: "Your labs, explained in 15 seconds",
            palette: "cyan-ink",
            caption: "Reference ranges, trends, and when to actually worry.",
            format: "Reel + TikTok + YouTube Short",
          },
        },
      },
    },

    calendar: {
      // 30-day calendar view. Each day has 0..n scheduled pieces (pre-existing
      // content + what campaigns add). Days are relative to today (day 0).
      existingScheduled: [
        { offset: 0,  channel: "portal",    campaign: "seasonal-general" },
        { offset: 1,  channel: "instagram", campaign: "patient-testimonial" },
        { offset: 2,  channel: "email",     campaign: "monthly-newsletter" },
        { offset: 4,  channel: "blog",      campaign: "provider-spotlight" },
        { offset: 5,  channel: "instagram", campaign: "behind-the-scenes" },
        { offset: 7,  channel: "facebook",  campaign: "community-event" },
        { offset: 8,  channel: "email",     campaign: "flu-shot-reminder" },
        { offset: 11, channel: "instagram", campaign: "wellness-tip" },
        { offset: 12, channel: "blog",      campaign: "condition-series" },
        { offset: 14, channel: "portal",    campaign: "fall-hours" },
        { offset: 16, channel: "email",     campaign: "patient-survey" },
        { offset: 18, channel: "facebook",  campaign: "q-and-a" },
        { offset: 21, channel: "blog",      campaign: "ask-the-doc" },
        { offset: 23, channel: "instagram", campaign: "kitchen-tip" },
        { offset: 25, channel: "sms",       campaign: "appointment-reminder" },
      ],
    },

    // Legacy Phase 1 data kept for reference. Not used by the new command-center demo.
    evergreenTopics: [
      "Why annual wellness visits matter",
      "What to expect at your first visit",
      "Understanding your lab results",
      "The difference between family medicine and urgent care",
      "How concierge medicine works",
      "Preparing for a prior auth",
    ],
    // Pre-generated content. Stub samples for Phase 1, to be replaced by
    // Claude-generated outputs at build time (scripts/generate-marketing-samples.ts).
    // Two variants per topic per format so Regenerate has something to cycle to.
    presetOutputs: {
      "Why annual wellness visits matter": {
        social: [
          "The annual wellness visit is the one appointment that can change everything about the next year of your health. Labs, screenings, a real conversation with your provider. No rushing. Book yours before the year gets away from you.",
          "Skipping your annual wellness visit is the most common health decision patients regret. It catches what you can't feel yet. Book it this month. Your future self will thank you.",
        ],
        email: [
          { subject: "The appointment most patients skip", body: "Every year, thousands of patients put off their annual wellness visit. And every year, the ones who went get earlier answers than the ones who didn't.\n\nA wellness visit is not a sick visit. It's the one time a year you and your provider get to look at the whole picture. Labs. Vitals. Sleep. Stress. Family history. What's changing.\n\nIt takes about 45 minutes. It's usually covered. And it's the closest thing we have to a reset button.\n\nBook yours here." },
          { subject: "What a wellness visit actually does", body: "A wellness visit isn't about what's wrong right now. It's about what's changing slowly, and catching it before it gets loud.\n\nIn 45 minutes, your provider reviews your labs, updates your care plan, and flags anything that needs attention. No prescription pad unless you need one.\n\nWe reserve wellness slots in advance. Pick a time that works for you here." },
        ],
        blog: [
          { title: "The Annual Wellness Visit: What It Is, What It Isn't, and Why It Matters", outline: [
            "What a wellness visit covers",
            "Why it's different from a sick visit",
            "What to bring (and what not to)",
            "How often you should actually go",
            "What your labs tell your provider",
            "Booking your visit at YOUR Practice",
          ] },
          { title: "Six Things Your Annual Wellness Visit Can Catch Early", outline: [
            "Silent blood pressure changes",
            "Early markers for diabetes risk",
            "Sleep issues you didn't think to mention",
            "Medication interactions you forgot about",
            "Vaccines you're overdue for",
            "Mental health shifts since last year",
          ] },
        ],
      },
      "What to expect at your first visit": {
        social: [
          "First visit with a new provider? Here's the whole thing in 60 seconds. Bring your ID, insurance card, medication list, and questions. Expect about 60 minutes. You'll leave with a plan.",
          "New patients ask what the first visit is like. Short answer: longer than a normal visit, mostly about getting to know you. Your history, your goals, your medications. We write it all down so you never repeat yourself again.",
        ],
        email: [
          { subject: "Your first visit at YOUR Practice", body: "You booked your first visit. Here's what to expect.\n\nBring your photo ID, insurance card, and a list of medications. If you have recent records, bring those too.\n\nThe visit runs about 60 minutes. The first 20 are paperwork and getting your history. The rest is you and your provider talking. Not rushing.\n\nYou'll leave with a plan: follow-up labs, next visit, anything that needs attention. Nothing about your visit is billed as a surprise.\n\nSee you soon." },
          { subject: "First visit: here's the playbook", body: "First visits are a little longer than regular ones because we're learning you from scratch. Plan for 60 minutes.\n\nBring: ID, insurance card, current meds, any records you can dig up. A list of questions helps. Write them down before you come, or you'll forget half of them.\n\nAnd no, you don't need to be sick. A lot of our best first visits are patients who just want to get a baseline." },
        ],
        blog: [
          { title: "What Happens at Your First Visit", outline: [
            "Checking in and paperwork",
            "Vitals and your chart review",
            "Your history conversation",
            "The physical exam",
            "Next steps and labs",
            "What gets sent to your portal afterward",
          ] },
          { title: "New Patient? Here's Your Pre-Visit Checklist", outline: [
            "Documents to bring",
            "Medications list format",
            "Family history to gather",
            "Questions to write down",
            "What to wear",
            "Portal setup before you arrive",
          ] },
        ],
      },
      "Understanding your lab results": {
        social: [
          "Lab results showing up in your portal can feel like a foreign language. A few quick reminders: ranges are guides, not verdicts. One number isn't a diagnosis. And your provider will always walk you through what actually matters.",
          "Your labs are back. You're scrolling, you're googling, you're worried. Stop. One out-of-range number rarely means anything on its own. Your provider reads them together, in context. Message us if you want a walkthrough.",
        ],
        email: [
          { subject: "How to read your lab results without panicking", body: "Lab results are confusing even when they're fine. A few things that help:\n\nReference ranges are guides, not rules. Healthy people often sit just outside them. The real question is what's changing over time.\n\nOne number out of range is usually not a big deal. Patterns matter more than single readings.\n\nIf something genuinely concerns your provider, they'll call. If you have questions, message us through the portal.\n\nNo panic scrolling required." },
          { subject: "What your labs actually mean", body: "Your labs are in. If you're staring at them wondering which number to worry about, read this first.\n\nLabs tell your provider three things: where you are today, how you're trending, and what to watch next. A single value rarely tells a story. A trend does.\n\nYour provider is reading the whole panel together, not one line at a time. If anything actually needs action, you'll hear from us.\n\nQuestions? Send them through the portal." },
        ],
        blog: [
          { title: "A Plain English Guide to Your Lab Results", outline: [
            "What reference ranges really are",
            "Why one out-of-range value isn't a diagnosis",
            "The difference between acute and chronic markers",
            "Lab panels we order and why",
            "Trending your results over time",
            "When to message us vs. when to wait",
          ] },
          { title: "The Five Lab Numbers Most Patients Ask About", outline: [
            "A1C and what it's really measuring",
            "LDL vs HDL cholesterol",
            "Vitamin D in context",
            "TSH and your thyroid",
            "Inflammatory markers",
            "Why your provider reads them together",
          ] },
        ],
      },
      "The difference between family medicine and urgent care": {
        social: [
          "Family medicine knows your history. Urgent care patches you up. Both matter, but they do different jobs. Use urgent care for acute issues. Use your family medicine provider for everything else. Your chart stays with you.",
          "When to go where: urgent care for things that need a same-day answer. Family medicine for the relationship that lasts decades. We coordinate with urgent care so records flow back to YOUR Practice automatically.",
        ],
        email: [
          { subject: "When to call us vs. go to urgent care", body: "Short version:\n\nUrgent care: today-only issues. Possible sprain, rapid-onset fever, minor injury, UTI symptoms at 9pm on a Saturday.\n\nFamily medicine: everything that needs context. Chronic conditions, medication management, labs, screenings, anything that benefits from someone who knows your chart.\n\nOne more thing: when you do go to urgent care, let us know. We pull their notes into your chart so nothing falls through the cracks." },
          { subject: "Family medicine vs. urgent care: a 60-second guide", body: "Not sure where to go? Use this:\n\nIf it's acute and you can't wait for an appointment: urgent care.\nIf it's part of a longer story or needs a medication you already take: call us first.\n\nWe can almost always see same-week. Often same-day. And because we have your whole history, we catch things urgent care can't." },
        ],
        blog: [
          { title: "Family Medicine vs. Urgent Care: When to Go Where", outline: [
            "What urgent care is built for",
            "What family medicine is built for",
            "Same-day options at YOUR Practice",
            "How records flow between them",
            "The cost difference most patients miss",
            "When to head straight to the ER instead",
          ] },
          { title: "Your Healthcare Map: Primary Care, Urgent Care, ER", outline: [
            "The three-tier system",
            "Typical wait times at each",
            "Cost ranges by type",
            "When continuity matters most",
            "How to build a care team that talks to each other",
            "What to do at 2am on a Tuesday",
          ] },
        ],
      },
      "How concierge medicine works": {
        social: [
          "Concierge medicine is not fancier medicine. It's slower medicine. Longer visits. Direct access to your provider. Smaller patient panels so you're not a number. If that sounds like what you've been missing, we should talk.",
          "Concierge medicine in one sentence: you pay a membership, you get your provider's time. No 11-minute visits, no portal purgatory. Your provider actually remembers you because they have 400 patients, not 4,000.",
        ],
        email: [
          { subject: "What concierge medicine actually is", body: "Most people hear 'concierge' and think 'expensive.' The real difference is time.\n\nA typical family medicine provider sees 20 to 30 patients a day. A concierge provider sees 8 to 12. That's the whole thing. Everything else follows.\n\nLonger visits. Same-day appointments. Text access. Real conversations instead of a rushed checklist.\n\nIt's not for everyone. But if you've felt like a number, it's worth a conversation." },
          { subject: "Is concierge medicine worth it?", body: "Concierge medicine means your provider has 400 patients instead of 4,000. That changes every other part of your care.\n\nYou get same-day or next-day appointments. You text instead of portal. You spend 45 minutes with your provider, not 11. And your membership covers a lot of what copays used to cost.\n\nNot every family needs this model. The ones who benefit most have chronic conditions, young kids, or just want their healthcare to feel personal again." },
        ],
        blog: [
          { title: "Concierge Medicine, Plainly Explained", outline: [
            "What the membership actually pays for",
            "What a typical month looks like",
            "Panel size and why it matters",
            "How it works with insurance",
            "Who concierge is really for",
            "Who it's not for",
          ] },
          { title: "The Case For (and Against) Concierge Medicine", outline: [
            "What you get: access, time, continuity",
            "What you pay: membership structures explained",
            "How concierge and insurance coexist",
            "Who benefits most (and why)",
            "Who probably shouldn't switch",
            "Questions to ask before you join",
          ] },
        ],
      },
      "Preparing for a prior auth": {
        social: [
          "Your provider ordered a procedure. Now there's 'prior auth' in your way. Here's the one-minute version: it's your insurance saying they need to approve the cost first. We handle 95% of it. You just wait. We'll update you when it clears.",
          "Prior auth is the part of healthcare nobody warned you about. Good news: you mostly don't do anything. We file, we follow up, we fight if we have to. Your only job is to answer the phone if your insurer calls.",
        ],
        email: [
          { subject: "What prior auth is, and what we do about it", body: "If your provider ordered a procedure or medication and you heard the words 'prior auth,' here's what that means.\n\nPrior authorization is your insurance reviewing whether they'll cover the cost before it happens. Annoying, but standard.\n\nWe submit the paperwork. We follow up. If they deny, we appeal. You don't need to call anyone. Most authorizations clear within a week. We'll update you the moment it's approved.\n\nIf your insurer calls you directly, take the call. Otherwise, sit tight." },
          { subject: "Prior auth, handled", body: "Prior auth is one of those things that sounds complicated and mostly isn't, because we handle it.\n\nHere's the short version: when your provider orders something expensive, your insurance wants to approve it first. We file. We follow up. We appeal denials. You wait.\n\nIf you hear nothing for a few days, that's normal. Average turnaround is 3 to 7 days. If your insurer needs to talk to you directly, they'll call. Otherwise, you don't need to do anything." },
        ],
        blog: [
          { title: "Prior Authorization: What Patients Actually Need to Know", outline: [
            "What prior auth is (and what it isn't)",
            "Why your insurer requires it",
            "What your role is vs. your provider's",
            "Typical timelines",
            "What happens when it's denied",
            "How to speed things up when you can",
          ] },
          { title: "A Patient's Guide to Prior Auth Without the Headache", outline: [
            "Procedures and meds most likely to need it",
            "The documents your provider submits on your behalf",
            "How long each type of auth usually takes",
            "What to do if your insurer contacts you",
            "How appeals work if denied",
            "When to call us vs. when to wait",
          ] },
        ],
      },
    },
    stats: {
      coordinatorHoursPerWeek: 6,
      agentDraftSeconds: 30,
    },
  },
  webSeo: {
    // Web/SEO stays live. Universe only holds fallback copy for outages.
    fallbackReportUrl: "/demo/web-seo/sample-report.html",
    fallbackCopy: "Your site is big. Book the full audit to get the complete scan.",
  },

  agents: [
    {
      num: "01",
      slug: "front-desk",
      name: "Front Desk",
      persona: "Katie",
      format: "voice-live",
      accent: "#06B6D4",
      tracks: ["all"],
      tagline: "Answers the phone. Books consults. Live.",
      proofPoint: "Your front desk spends 3 to 6 minutes per call. Katie handles them all at once.",
    },
    {
      num: "02",
      slug: "scheduling",
      name: "Scheduling",
      persona: "Mia",
      format: "voice-scripted",
      accent: "#0EA5E9",
      tracks: ["all"],
      tagline: "Confirms appointments. Reschedules without the phone tag.",
      proofPoint: "That call takes your front desk 4 to 6 minutes. Multiply by 30 patients a day. Mia does all of them before your staff clocks in.",
    },
    {
      num: "03",
      slug: "prior-auth",
      name: "Prior Auth",
      persona: null,
      format: "visual",
      accent: "#6366F1",
      tracks: ["functional"],
      tagline: "Files. Follows up. Wins approvals in days, not weeks.",
      proofPoint: "Your physicians spend 4.6 hours a week on this. That's a full patient day gone to hold music.",
    },
    {
      num: "04",
      slug: "revenue-recovery",
      name: "Revenue Recovery",
      persona: null,
      format: "visual",
      accent: "#8B5CF6",
      tracks: ["all"],
      tagline: "Collects patient balances without the awkward phone call.",
      proofPoint: "Patient-pay collection rate improves 20 to 40 percent. Your staff stops making awkward calls and gets one clean list of accounts that actually need a human.",
    },
    {
      num: "05",
      slug: "reactivation",
      name: "Reactivation",
      persona: "Jordan",
      format: "voice-scripted",
      accent: "#A855F7",
      tracks: ["medspa"],
      tagline: "Calls every lapsed patient. Books them back.",
      proofPoint: "That patient is worth $332 on average. You have 200+ of them sitting in your list right now. Jordan calls every single one.",
    },
    {
      num: "06",
      slug: "retention",
      name: "Retention",
      persona: "Sam",
      format: "voice-scripted",
      accent: "#EC4899",
      tracks: ["concierge"],
      tagline: "Follows up on every visit. Keeps members active.",
      proofPoint: "Your members pay $300 to $500 a month for this level of attention. Sam makes sure they actually get it, without eating your physician's time.",
    },
    {
      num: "07",
      slug: "reputation",
      name: "Reputation",
      persona: null,
      format: "visual",
      accent: "#14B8A6",
      tracks: ["all"],
      tagline: "Asks every happy patient for a review. Catches every unhappy one first.",
      proofPoint: "Google rating climbs week over week. Negative feedback gets intercepted and handled privately instead of becoming a 1-star public post.",
    },
    {
      num: "08",
      slug: "marketing",
      name: "Marketing",
      persona: null,
      format: "visual",
      accent: "#F43F5E",
      tracks: ["all"],
      tagline: "Drafts posts, emails, and newsletters on demand.",
      proofPoint: "Your marketing coordinator spends 6 hours a week on content. This agent drafts it in 30 seconds. Your team just approves and posts.",
    },
    {
      num: "09",
      slug: "web-seo",
      name: "Web/SEO",
      persona: null,
      format: "visual-live",
      accent: "#F59E0B",
      tracks: ["all"],
      tagline: "Audits your site live. Finds what's costing you patients.",
      proofPoint: "That was 60 seconds. The Web/SEO Agent does this every day, on your site and your competitors.",
    },
  ],
};

// Helpers used across demos.

export function getAgent(slug) {
  return DEMO_UNIVERSE.agents.find((a) => a.slug === slug);
}

export function trackLabel(trackKey) {
  const map = {
    all: "All Practices",
    concierge: "Concierge",
    functional: "Functional Medicine",
    medspa: "Med Spa",
  };
  return map[trackKey] || trackKey;
}
