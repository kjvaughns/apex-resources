// Seed data — admin schema, used as KV fallback
const recordings = [
  { id: "r-kj-1", presenterId: "kj", title: "Beating the Price Objection — Version 1", topic: "Objections", date: "2026-05-21", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1aNpO39ZqQ3veCp1m4Aya8pa0QQ4Ffzjj/preview",
    desc: "One version of KJ's price-objection pitch — how he reframes \"it costs too much\" around the value of the protection." },
  { id: "r-kj-2", presenterId: "kj", title: "Beating the Price Objection — Version 2", topic: "Objections", date: "2026-05-07", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1Pu3KtI7zg5Bp0uvvHnIhWq7675Kt0Ts6/preview",
    desc: "A different take on the same price-objection pitch — another way KJ holds the price and moves toward the close." },
  { id: "r-kj-3", presenterId: "kj", title: "Selling More Coverage — Objection Handling", topic: "Objections", date: "2026-04-12", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1F4QK3vqzTO0R30SKp92KRuDNKhRQf1qj/preview",
    desc: "Handling objections when positioning additional coverage so clients land on the right level of protection." },
  { id: "r-obi-1", presenterId: "obi", title: "Obi Recording 1", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1mzo2RzPyZc1BwLu6-MJDT8VSQoDcRQ7w/preview", desc: "" },
  { id: "r-obi-2", presenterId: "obi", title: "Obi Recording 2", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1GTV9fIvOMmJKIq_4PsQxy6_IN8UVm-3O/preview", desc: "" },
  { id: "r-obi-3", presenterId: "obi", title: "Obi Recording 3", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1UfUKBFhBZIRryNAoJpVddvFapJZUwwhp/preview", desc: "" },
  { id: "r-obi-4", presenterId: "obi", title: "Obi Recording 4", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
    source: "https://drive.google.com/file/d/1v85PsodhALrGRf7BmBVv7AsA1FbD_4Od/preview", desc: "" },
];

const presenters = [
  { id: "kj",    name: "KJ",    role: "Regional Director", initials: "KJ" },
  { id: "obi",   name: "Obi",   role: "Senior Producer",   initials: "O" },
  { id: "chudi", name: "Chudi", role: "Field Trainer",     initials: "C" },
  { id: "sam",   name: "Sam",   role: "Agency Owner",      initials: "S" },
  { id: "moody", name: "Moody", role: "Top Producer",      initials: "M" },
];

const resources = [
  { id: "playbook", type: "pdf", title: "APEX Agent Playbook", date: "2026-05-28", status: "published", featured: true, isNew: true,
    desc: "The official APEX playbook — your start-to-finish guide to onboarding, daily activity, and the systems that drive production.",
    long: "The complete APEX Agent Playbook: how to get licensed and contracted, set up your tools, run your day, and follow the proven systems that turn new agents into consistent producers. Keep this open in your first 90 days and revisit it often.",
    tags: ["playbook", "onboarding", "systems"], duration: "", link: "assets/APEX_Agent_Playbook.pdf" },
  { id: "needs-quiz", type: "pdf", title: "Needs Analysis Quiz", date: "2026-05-28", status: "published", featured: false, isNew: true,
    desc: "A quick client needs-analysis quiz to uncover the real coverage gap before you present.",
    long: "Use this needs-analysis quiz on every appointment to surface income, debt, final-expense, and dependent needs in minutes — so the right coverage amount becomes obvious to the client.",
    tags: ["needs analysis", "discovery", "worksheet"], duration: "", link: "assets/Needs_Analysis_Quiz.pdf" },
  { id: "script-3", type: "guide", title: "Apex Script 3.0 — Senior Benefits", date: "2026-05-26", status: "published", featured: true, isNew: false,
    desc: "The current Senior State Benefits / life insurance phone script — intro through the close.",
    long: "The latest version of the APEX phone script for senior benefits and life insurance prospects. Covers the verification intro, qualifying questions, and the transition to the presentation. Internalize this before you dial.",
    tags: ["script", "senior benefits", "sales"], duration: "", link: "https://docs.google.com/document/d/1hgA1vKf0Bo0kgQ2nf45bN8tfdLwQMwkWyTbakAjZUKw/edit" },
  { id: "script-vet", type: "guide", title: "Apex Script — Veterans (VA Benefits)", date: "2026-05-24", status: "published", featured: false, isNew: false,
    desc: "The veteran burial-coverage opener and full call flow for VA-benefit prospects.",
    long: "The APEX phone script for the veterans market — the benefits-coordinator opener, how to verify existing burial coverage, and the path to a needs analysis. Pairs with the senior benefits script.",
    tags: ["script", "veterans", "final expense"], duration: "", link: "https://docs.google.com/document/d/1OeDu_6TABfIJtVHrn1TrJUjWGzgehYttoMj7ttSebxI/edit" },
  { id: "fast-start", type: "training", title: "New Agent Fast Start", date: "2026-05-27", status: "draft", featured: true, isNew: true,
    desc: "The 5-module fast-start track every new APEX agent runs in week one — tools, mindset, and the first 20 dials.",
    long: "The 5-module fast-start track every new APEX agent runs in week one — tools, mindset, and the first 20 dials.",
    tags: ["onboarding", "fast start", "new agent"], duration: "1h 12m", link: "#" },
  { id: "dialing", type: "training", title: "Dialing Discipline & Daily Activity", date: "2026-05-18", status: "draft", featured: false, isNew: false,
    desc: "How to protect your dial blocks, track activity, and keep momentum through the slow weeks.",
    long: "How to protect your dial blocks, track activity, and keep momentum through the slow weeks.",
    tags: ["activity", "discipline", "dialing"], duration: "47:20", link: "#" },
  { id: "calc", type: "tool", title: "Premium Quote Calculator", date: "2026-05-15", status: "draft", featured: false, isNew: false,
    desc: "Internal calculator for ballpark monthly premiums by age band and coverage amount.",
    long: "Internal calculator for ballpark monthly premiums by age band and coverage amount.",
    tags: ["tool", "quoting", "calculator"], duration: "", link: "#" },
];

const quickLinks = [
  { id: "ql-insura", label: "InsuraCloud", sub: "Quoting & e-apps", href: "#" },
  { id: "ql-ready",  label: "Readymode",   sub: "Power dialer",     href: "#" },
  { id: "ql-agent",  label: "AgentLink",   sub: "Contracting & comp", href: "#" },
  { id: "ql-web",    label: "Website",     sub: "apexfinancialempire.com", href: "#" },
];

module.exports = { recordings, presenters, resources, quickLinks };
