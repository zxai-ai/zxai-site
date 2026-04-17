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
    stats: {
      withAi: { perWeek: 34, approvalRate: 94, staffHours: 0 },
      manual: { perWeek: 8, approvalRate: 71, staffHours: 2.3 },
      physicianHoursRecovered: 9.5,
    },
  },
  revenueRecovery: {
    agingBuckets: [
      { range: "0-30 days",  claims: 12, value: 18400 },
      { range: "31-60 days", claims: 8,  value: 12200 },
      { range: "61-90 days", claims: 5,  value: 7800  },
      { range: "90+ days",   claims: 3,  value: 4100  },
    ],
    feedItems: [
      { claimId: "4412", status: "resubmitted", detail: "Identified missing modifier on CPT 99214. Resubmitting with correction." },
      { claimId: "3897", status: "paid",         detail: "Payer responded. Payment of $342 received." },
      { claimId: "4201", status: "appealed",     detail: "Denial appealed. Supporting documentation attached automatically." },
      { claimId: "3654", status: "working",      detail: "Underpayment detected ($128 vs $210 allowed). Filing adjustment." },
      { claimId: "4455", status: "paid",         detail: "Claim #4455 paid in full. $580 recovered." },
      { claimId: "4018", status: "resubmitted",  detail: "Duplicate claim rejection cleared. Resubmitting with corrected POS." },
      { claimId: "3902", status: "paid",         detail: "Appeal successful. $1,240 recovered." },
      { claimId: "4521", status: "working",      detail: "Identified bundling error on CPT 93000. Requesting reprocessing." },
      { claimId: "3711", status: "paid",         detail: "Payment received after appeal. $428 recovered." },
      { claimId: "4604", status: "appealed",     detail: "Medical necessity denial appealed with clinical notes." },
      { claimId: "4290", status: "paid",         detail: "Timely filing extension accepted. $612 recovered." },
      { claimId: "4077", status: "resubmitted",  detail: "Patient eligibility confirmed. Resubmitting with updated insurance." },
    ],
    monthlyRecovered: 42800,
    industryResolutionDays: 45,
    agentResolutionDays: 4.2,
    annualWriteoffRange: "$40K to $80K",
  },
  reputation: {
    presetReviews: [
      {
        stars: 5,
        author: "Maria T.",
        text: "Dr. Reeves is incredible. She took time to listen, explained everything clearly, and I actually feel heard for the first time in years. The whole team was warm from check-in to checkout.",
        response: "Thank you so much, Maria. Dr. Reeves and the team will be glad to hear this. That's exactly the kind of visit we want every patient to have. Looking forward to seeing you next time.",
      },
      {
        stars: 4,
        author: "James K.",
        text: "Dr. Reeves is great, very thorough. The only downside was the 45-minute wait. Front desk was friendly though.",
        response: "Thank you for the kind words about Dr. Reeves. We're glad you had a thorough visit. We hear you on the wait time and are actively working to improve scheduling. We'd love to see you again soon.",
      },
      {
        stars: 2,
        author: "Anonymous",
        text: "Appointment felt rushed. Front desk didn't explain the paperwork. Not sure I'll be back.",
        response: "We're sorry your visit fell short. Every patient deserves to feel heard and to leave with a clear understanding of their paperwork. We'd like to make this right. Please reach out to us directly at (555) 234-9000.",
      },
      {
        stars: 1,
        author: "Anonymous",
        text: "Waited over an hour. No one apologized. Will not be coming back.",
        response: "We're sorry to hear about your experience. A wait like that is not the standard we hold ourselves to. We'd like to make this right. Please reach out to us directly at (555) 234-9000 so we can address this personally.",
      },
    ],
    stats: {
      reviewsBeforeBooking: 89,
      patientsLostPerUnansweredNegative: 30,
      agentResponseSeconds: 30,
    },
  },
  marketing: {
    evergreenTopics: [
      "Why annual wellness visits matter",
      "What to expect at your first visit",
      "Understanding your lab results",
      "The difference between family medicine and urgent care",
      "How concierge medicine works",
      "Preparing for a prior auth",
    ],
    // Pre-generated content. One-time generation via Claude API at build time.
    // Regenerated quarterly or when brand voice evolves. Two variants per topic
    // per format so the Regenerate button has something to cycle to.
    presetOutputs: {
      // Populated by scripts/generate-marketing-samples.ts at build time.
      // Shape: { [topic]: { social: [v1, v2], email: [v1, v2], blog: [v1, v2] } }
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
      tagline: "Works every claim. Never stops. Never misses an appeal window.",
      proofPoint: "The average practice writes off $40K to $80K a year in recoverable claims. This agent never stops working the queue.",
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
      tagline: "Answers every review. Every time. In under a minute.",
      proofPoint: "89% of patients check reviews before booking. One unanswered negative review costs you 30 potential patients.",
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
