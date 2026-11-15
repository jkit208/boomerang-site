// Static site generator for useboomerang.ai. Zero dependencies.
// Usage: node build.mjs  -> writes ./dist
// Every price, stat and link comes from site.config.json so the site can't drift.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';

const C = JSON.parse(readFileSync('site.config.json', 'utf8'));
const OUT = 'dist';
const TODAY = new Date().toISOString().slice(0, 10);
const plan = (id) => C.pricing.plans.find((p) => p.id === id);
const PRO = plan('pro'), CORE = plan('core');
const fee = C.pricing.setupFee, trial = C.pricing.trialDays;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => '$' + n.toLocaleString('en-US');
const pages = [];

// ---------- shared pieces ----------
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 25c2-9 7-16 17-19 1.6-.5 3 .9 2.4 2.4-.4 1-1.4 1.6-2.4 1.8C15.5 12 11.6 17 10 24.6c-.3 1.5-1.8 2.3-3.1 1.7-.7-.3-1-1-.9-1.3z" fill="#ff6a1a"/><circle cx="24" cy="23" r="3.2" fill="#fff"/></svg>`;

function nav() {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap">
  <a class="logo" href="/" aria-label="Boomerang home">${LOGO}<span>Boomerang<small>BY LHOTSE</small></span></a>
  <button class="menu-toggle" aria-label="Menu" aria-expanded="false">☰</button>
  <ul>
    <li><a href="/#how">How it works</a></li>
    <li><a href="/missed-call-calculator/">Calculator</a></li>
    <li><a href="/pricing/">Pricing</a></li>
    <li><a href="/missed-call-statistics/">Missed-call stats</a></li>
    <li><a href="${C.appUrl}">Log in</a></li>
    <li><a class="btn btn-primary" href="${C.signupUrl}">Start free trial</a></li>
  </ul>
</div></header>`;
}

function footer() {
  return `<footer><div class="wrap">
  <div class="foot">
    <div><a class="logo" href="/">${LOGO}<span style="color:#fff">Boomerang</span></a>
      <p style="margin-top:14px">Missed-call text-back, AI lead qualification and estimate booking for home service businesses.</p></div>
    <div><h4>Product</h4><ul>
      <li><a href="/#how">How it works</a></li><li><a href="/pricing/">Pricing</a></li>
      <li><a href="/missed-call-calculator/">Missed call calculator</a></li><li><a href="/missed-call-statistics/">Missed call statistics</a></li>
      <li><a href="${C.appUrl}">Customer login</a></li></ul></div>
    <div><h4>Industries</h4><ul>
      ${C.industries.map((i) => `<li><a href="/industries/${i.slug}/">${esc(i.name)}</a></li>`).join('')}</ul></div>
    <div><h4>Company</h4><ul>
      <li><a href="mailto:${C.contactEmail}">Contact</a></li><li><a href="/privacy/">Privacy policy</a></li></ul></div>
  </div>
  <div class="foot-base"><span>© ${new Date().getFullYear()} ${esc(C.company)}. Boomerang and Trust Dial are trademarks of ${esc(C.company)}.</span><span>Made by people who run a service business.</span></div>
</div></footer>`;
}

function layout({ path, title, description, body, jsonld = [], ogTitle }) {
  const url = C.siteUrl + path;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Boomerang', legalName: C.company, url: C.siteUrl, logo: C.siteUrl + '/favicon.svg', email: C.contactEmail },
    ...jsonld,
  ];
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Boomerang">
<meta property="og:title" content="${esc(ogTitle || title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${C.siteUrl}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e1a2b">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head><body>
${nav()}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/app.js" defer></script>
</body></html>`;
}

function page(path, opts) { pages.push(path); const file = join(OUT, path, 'index.html'); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, layout({ path, ...opts })); }

const crumbsLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: C.siteUrl + it[1] })) });
const faqLd = (qs) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const appLd = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Boomerang', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Missed-call text-back, AI lead qualification and estimate booking for home service businesses.', offers: C.pricing.plans.map((p) => ({ '@type': 'Offer', name: 'Boomerang ' + p.name, price: p.monthly, priceCurrency: C.pricing.currency, url: C.siteUrl + '/pricing/' })) };

// ---------- reusable sections ----------
const ctaBtns = (dark = true) => `<div class="btn-row"><a class="btn btn-primary" href="${C.signupUrl}">Start your ${trial}-day free trial</a><a class="btn btn-ghost" href="/pricing/">See pricing</a></div>`;

function player(ind) {
  const data = {
    business: ind.chat[1][1].match(/with (.+?)\./)?.[1] || 'Your Business',
    chat: ind.chat,
    emergency: ind.emergency || 'A pipe burst and water is everywhere!',
    booked: bookedLine(ind),
  };
  return `<div class="player" data-player aria-label="Animated demo of Boomerang">
  <div class="player-tabs" role="tablist">
    <button role="tab" data-scene="missed" aria-selected="true">Missed call → booked</button>
    <button role="tab" data-scene="emergency" aria-selected="false">Emergency</button>
    <button role="tab" data-scene="setup" aria-selected="false">How setup works</button>
  </div>
  <div class="stage"></div>
  <div class="caption" aria-live="polite">A customer calls while you’re on a job.</div>
  <div class="progress"><span></span></div>
  <div class="player-ctrl"><button type="button">Pause</button></div>
  <script type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
</div>`;
}
function bookedLine(ind) {
  const last = ind.chat[ind.chat.length - 1][1];
  const when = last.match(/for (.+?)\.|for (.+?)!|set for (.+?)[.!]/);
  const addr = ind.chat.find((m) => m[0] === 'in' && /\d{5}/.test(m[1]));
  return [when ? (when[1] || when[2] || when[3]) : 'Thursday at 3:00 PM', addr ? addr[1] : ''].filter(Boolean).join(' · ');
}

function statsSection(ids, heading = 'Missed calls are the most expensive thing you never see', sub = 'The research is old and new, big and small, but it all points one way: speed wins the job.') {
  const s = C.stats.filter((x) => !ids || ids.includes(x.id));
  return `<section class="alt"><div class="wrap center">
  <span class="eyebrow">The numbers</span><h2>${heading}</h2><p class="lead">${sub}</p>
  <div class="stat-grid" style="text-align:left">${s.map((x) => `<article class="stat"><div class="v">${x.value}</div><h3>${esc(x.headline)}</h3><p>${esc(x.detail)}</p><cite>Source: <a href="${x.url}" rel="noopener" target="_blank">${esc(x.source)}</a></cite></article>`).join('')}</div>
  <p style="margin-top:28px"><a href="/missed-call-statistics/" style="font-weight:700">See every stat and where it comes from →</a></p>
</div></section>`;
}

function calculator(d = C.calculatorDefaults) {
  return `<div class="calc" data-calc data-plan-price="${PRO.monthly}">
  <div class="calc-in">
    <label><span class="row">Missed calls per week <output for="missed"></output></span><input type="range" name="missed" min="1" max="40" value="${d.missedPerWeek}"></label>
    <label><span class="row">Average job value <output for="value"></output></span><input type="range" name="value" min="100" max="15000" step="50" value="${d.jobValue}"></label>
    <label><span class="row">% of callers who would book <output for="close"></output></span><input type="range" name="close" min="5" max="90" value="${d.closeRate}"></label>
    <label><span class="row">% Boomerang wins back (your guess) <output for="recover"></output></span><input type="range" name="recover" min="10" max="100" value="${d.recoverRate}"></label>
  </div>
  <div class="calc-out" aria-live="polite">
    <div><div class="lbl">Walking away each month</div><div class="big" data-out="lostMonth">$0</div></div>
    <div class="sub"><div><span class="lbl">Per year</span><b data-out="lostYear">$0</b></div><div><span class="lbl">Won back / year</span><b data-out="recYear" style="color:var(--go)">$0</b></div></div>
    <div class="roi" data-out="roi"></div>
  </div>
</div>`;
}

const DIAL = {
  autonomous: [['Lead', 'Sara qualifies the caller.'], ['Calendar', 'She checks your real open times.'], ['Booked', 'Customer picks a time. It lands on your calendar.'], ['You', 'Get a text with every detail. No action needed.']],
  assisted: [['Lead', 'Sara qualifies the caller.'], ['You', 'Get a text: “Mike, 60 ft pine near garage, 1420 Maple Ct. When can you go?”'], ['Reply', 'You text back in plain English: “Thursday at 3”.'], ['Booked', 'Sara checks for conflicts, confirms with the customer, books it.'], ['Safety net', 'No reply in about an hour? Sara books it so the lead doesn’t go cold.']],
  assisted_business_hours: [['Open', 'During business hours, Sara runs it by you first, like Assisted.'], ['Closed', 'After hours and weekends, she books on her own, like Autonomous.'], ['Switch', 'Change it any time from your dashboard.']],
};
function trustDial() {
  return `<div class="dial-wrap" data-dial>
  <div class="dial" role="group" aria-label="Trust Dial settings">
    <button data-mode="autonomous" aria-pressed="false"><span class="dot"></span><span><b>Autonomous</b><small>Sara books on her own, 24/7.</small></span></button>
    <button data-mode="assisted" aria-pressed="false"><span class="dot"></span><span><b>Assisted</b><small>Sara runs every booking by you first.</small></span></button>
    <button data-mode="assisted_business_hours" aria-pressed="true"><span class="dot"></span><span><b>Assisted during business hours</b><small>Asks you while you’re open, books on her own after hours.</small></span></button>
  </div>
  <div class="dial-flow" aria-live="polite"></div>
  <script type="application/json">${JSON.stringify(DIAL)}</script>
</div>`;
}

const FEATURES = [
  ['⚡', 'Texts back in seconds', 'Every unanswered call gets a text from your local business number, in your business name.'],
  ['🧠', 'Asks your questions', 'Service, size, address, ZIP, hazards. Ready-made question sets for your trade, and she skips what she already knows.'],
  ['🚨', 'Catches emergencies', '“A tree is on my roof” pages you, or your on-call tech after hours, in about a second.'],
  ['📷', 'Photos come through', 'Customers text pictures of the job. They show up in your thread instantly.'],
  ['📍', 'Checks your service area', 'Out-of-area leads get a polite answer instead of a wasted drive.'],
  ['🗓️', 'Books on your calendar', 'Pro: Sara offers real open times and books the estimate on Google Calendar.'],
  ['🌐', 'Your website, too', 'Pro: one line of code adds a “Request an estimate” button that feeds Sara.'],
  ['🇪🇸', 'English and Spanish', 'Sara replies in the language your customer writes in.'],
  ['✋', 'You can always step in', 'Text a customer yourself and Sara steps out of that thread. Pause her any time.'],
];
const features = () => `<div class="feat-grid">${FEATURES.map(([i, h, p]) => `<div class="feat"><div class="ic" aria-hidden="true">${i}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>`;

function plans() {
  return `<div class="plans">${C.pricing.plans.map((p) => `<div class="plan${p.featured ? ' featured' : ''}">
  ${p.featured ? '<span class="tag">Most popular</span>' : ''}
  <h3>${p.name}</h3><p class="fine" style="margin:0">${esc(p.tagline)}</p>
  <div class="price">${money(p.monthly)}<small>/month</small></div>
  <p class="fine">or ${money(p.annual)}/year (2 months free)</p>
  <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  <a class="btn ${p.featured ? 'btn-primary' : 'btn-ghost'}" href="${C.signupUrl}">Start free trial</a>
</div>`).join('')}</div>
<p class="plan-terms fine">${trial}-day free trial on both plans, starting the day your texting goes live. One-time ${money(fee)} setup fee covers carrier texting registration, your local number and onboarding. No contract, no per-text fees, cancel any time from your dashboard.</p>`;
}

const FAQ = [
  ['Do I have to change my phone number?', 'No. Your published number stays the same and still rings you first. Only calls you don’t answer forward to your Boomerang number, which is where Sara texts from.'],
  ['What happens when I do answer?', 'Nothing. Boomerang only steps in on calls you miss.'],
  ['What’s the difference between Core and Pro?', `Core texts back, qualifies the lead and hands it to you to book. Pro does all of that and books the estimate straight onto your Google Calendar, with the Trust Dial controlling how much Sara does on her own. Pro also adds the website button, outbound calling and texting from the dashboard, and custom templates.`],
  ['Will my customers know they’re texting with AI?', 'Sara introduces herself by name as your assistant, and every first text includes opt-out instructions. Most customers just care that someone got back to them fast.'],
  ['Can I take over a conversation?', 'Yes. The moment you text a customer yourself, Sara steps out of that thread for good unless you turn her back on. You can also pause her on any contact.'],
  ['Which calendars does it work with?', 'Google Calendar today, including multiple calendars.'],
  ['How long does setup take?', `Our part takes about a day. Texting goes live once the carriers approve your business for business texting (A2P registration), which usually takes a few days to two weeks. We handle the paperwork, and your free trial doesn’t start until texting is live.`],
  ['What is the setup fee for?', `The one-time ${money(fee)} covers your carrier texting registration, your local Boomerang number and onboarding. It’s non-refundable because the registration work happens right away.`],
  ['Is there a contract?', 'No. Month to month (or yearly if you want two months free). Cancel in one click from Settings → Manage billing.'],
  ['What kinds of businesses use Boomerang?', 'Owner-operated home service businesses: tree service, lawn care, landscaping, pressure washing, pest control, roofing and other trades where the owner is on a job when the phone rings.'],
];
function faqBlock(qs = FAQ) {
  return `<div class="faq">${qs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
}

function cta(h = 'Stop paying for leads you never talk to.') {
  return `<section><div class="wrap"><div class="cta">
  <h2>${h}</h2><p style="max-width:560px;margin:0 auto 26px">Set up once. Sara texts back every missed call from then on.</p>
  <div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="${C.signupUrl}">Start your ${trial}-day free trial</a></div>
  <p class="fine" style="margin-top:16px">${money(fee)} one-time setup. No contract.</p>
</div></div></section>`;
}

function proof() {
  return `<section class="dark"><div class="wrap proof">
  <div><span class="eyebrow">Why us</span><h2>Built by an operator, not just a vendor</h2>
  <p class="lead">Boomerang started because we kept missing calls on our own lawn care business while we were behind a mower. We still run every new feature on it first. Owner trust is the whole product: you decide how much Sara does.</p></div>
  <div><div class="proof-nums">${C.proof.items.map((i) => `<div><b>${i.value}</b><span>${esc(i.label)}</span></div>`).join('')}</div>
  <p class="fine" style="margin-top:14px">${esc(C.proof.label)}.</p></div>
</div></section>`;
}

const industries = () => `<div class="ind-grid">${C.industries.map((i) => `<a href="/industries/${i.slug}/">${esc(i.name)}</a>`).join('')}</div>`;

// ---------- HOME ----------
const tree = C.industries[0];
page('/', {
  title: 'Boomerang | Missed Call Text Back & AI Booking for Home Service Businesses',
  ogTitle: 'Boomerang: every missed call, texted back and booked',
  description: `Boomerang texts back every missed call in seconds, qualifies the lead with AI, flags emergencies and books the estimate on your calendar. Built for home service businesses. From ${money(CORE.monthly)}/mo.`,
  jsonld: [appLd, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Boomerang', url: C.siteUrl }, faqLd(FAQ)],
  body: `<section class="hero"><div class="wrap hero-grid">
  <div>
    <span class="eyebrow">Missed call text back + AI booking</span>
    <h1>You can’t answer every call. <em>Sara can.</em></h1>
    <p class="lead">Boomerang texts back every call you miss in seconds, asks the questions you would ask, and books the estimate on your calendar while you’re still on the job.</p>
    ${ctaBtns()}
    <ul class="hero-points"><li>Keep your number. Only missed calls come to us.</li><li>You decide how much Sara books on her own.</li><li>Done-for-you setup, including carrier texting registration.</li></ul>
  </div>
  ${player(tree)}
</div></section>
${statsSection(['voicemail', 'abandon', 'fivemin'])}
<section class="dark" id="how"><div class="wrap">
  <span class="eyebrow">How it works</span><h2>From missed call to booked estimate, without you touching your phone</h2>
  <div class="steps">
    <div class="step"><h3>You miss a call</h3><p>You’re up a tree, under a sink or behind a mower. Your phone rings you first, and if you don’t pick up, the call comes to Boomerang.</p></div>
    <div class="step"><h3>Sara texts them back</h3><p>Within seconds, from your local business number. She asks what they need, where, and anything else your trade needs to know. Emergencies page you instantly.</p></div>
    <div class="step"><h3>The job lands on your calendar</h3><p>On Pro, Sara offers real open times and books the estimate. On Core, you get a qualified lead by text, ready to call back and close.</p></div>
  </div>
</div></section>
<section id="calculator"><div class="wrap">
  <span class="eyebrow">The math</span><h2>What are missed calls costing you?</h2>
  <p class="lead">Plug in your own numbers. Most owners are surprised, and a single recovered job usually pays for months of Boomerang.</p>
  ${calculator()}
  <p class="fine" style="margin-top:14px">Monthly estimate = missed calls per week × 4.33 × job value × % who would book. “Won back” applies your guess for how many of those Sara saves.</p>
</div></section>
<section class="alt"><div class="wrap">
  <span class="eyebrow">The Trust Dial™</span><h2>Sara’s autonomy is a dial you set, not a black box</h2>
  <p class="lead">Every other AI answering tool asks you to hand over your schedule. Boomerang lets you choose how much Sara books on her own, and change your mind any time. Tap a setting.</p>
  ${trustDial()}
</div></section>
<section><div class="wrap">
  <span class="eyebrow">Features</span><h2>Everything a great office manager would do with a missed call</h2>
  ${features()}
</div></section>
${proof()}
<section class="alt" id="pricing"><div class="wrap center">
  <span class="eyebrow">Pricing</span><h2>Simple pricing. One recovered job pays for it.</h2>
  ${plans()}
</div></section>
<section id="industries"><div class="wrap center">
  <span class="eyebrow">Industries</span><h2>Built for the trades</h2><p class="lead">Sara comes with question sets for your kind of work.</p>
  ${industries()}
</div></section>
<section class="alt"><div class="wrap"><h2 class="center">Questions owners ask</h2>${faqBlock()}</div></section>
${cta()}`,
});

// ---------- PRICING ----------
const ROWS = [
  ['Missed-call text-back in seconds', 1, 1], ['AI intake and lead qualification', 1, 1], ['Emergency detection and paging', 1, 1],
  ['Customer photos in your thread', 1, 1], ['Service-area check by ZIP', 1, 1], ['FAQ answers, English and Spanish', 1, 1],
  ['Inbox, voicemail playback, pause / resume Sara', 1, 1], ['Done-for-you carrier texting registration', 1, 1],
  ['Books estimates on Google Calendar', 0, 1], ['Trust Dial™ autonomy settings', 0, 1], ['Multiple calendars', 0, 1],
  ['Website “Request an estimate” button', 0, 1], ['Start new texts and call customers from the dashboard', 0, 1], ['Custom estimate windows and templates', 0, 1],
];
const PFAQ = FAQ.filter(([q]) => /Core and Pro|setup fee|contract|setup take/.test(q));
page('/pricing/', {
  title: `Boomerang Pricing | Core ${money(CORE.monthly)}/mo, Pro ${money(PRO.monthly)}/mo`,
  description: `Boomerang pricing: Core ${money(CORE.monthly)}/month for AI missed-call text-back and lead qualification, Pro ${money(PRO.monthly)}/month adds calendar booking. ${trial}-day free trial, no contract.`,
  jsonld: [appLd, faqLd(PFAQ), crumbsLd([['Home', '/'], ['Pricing', '/pricing/']])],
  body: `<section class="page-hero"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Pricing</div>
  <h1>Pricing that pays for itself on the first saved job</h1><p class="lead">Two plans. No per-text fees, no contract, ${trial}-day free trial.</p></div></section>
<section class="alt"><div class="wrap">${plans()}
  <table class="cmp"><thead><tr><th>Feature</th><th>Core</th><th>Pro</th></tr></thead><tbody>
  ${ROWS.map(([f, c, p]) => `<tr><td>${esc(f)}</td><td>${c ? '<span class="yes">✓</span>' : '<span class="no">–</span>'}</td><td>${p ? '<span class="yes">✓</span>' : '<span class="no">–</span>'}</td></tr>`).join('')}
  </tbody></table></div></section>
<section><div class="wrap"><h2 class="center">Run your numbers first</h2>${calculator()}</div></section>
<section class="alt"><div class="wrap"><h2 class="center">Pricing questions</h2>${faqBlock(PFAQ)}</div></section>
${cta()}`,
});

// ---------- CALCULATOR ----------
page('/missed-call-calculator/', {
  title: 'Missed Call Calculator: How Much Revenue Are Missed Calls Costing You?',
  description: 'Free missed call calculator for service businesses. Enter missed calls per week, job value and close rate to see how much revenue walks away each month and year.',
  jsonld: [crumbsLd([['Home', '/'], ['Missed call calculator', '/missed-call-calculator/']]), { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Missed Call Revenue Calculator', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' }, url: C.siteUrl + '/missed-call-calculator/' }],
  body: `<section class="page-hero"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Missed call calculator</div>
  <h1>Missed call calculator</h1><p class="lead">See how much revenue walks away when calls go to voicemail. It takes 20 seconds.</p></div></section>
<section class="alt"><div class="wrap">${calculator()}</div></section>
<section><div class="wrap prose">
  <h2>How the calculator works</h2>
  <p>Monthly lost revenue = missed calls per week × 4.33 weeks × average job value × the share of those callers who would have booked. The yearly figure is that times 12. “Won back” multiplies the loss by your own guess for how many of those callers a fast text-back saves.</p>
  <h2>How to find your numbers</h2>
  <p><b>Missed calls per week:</b> open your phone’s recent calls and count the missed calls from unknown numbers last week. Most owners undercount, because a caller who doesn’t leave a voicemail is easy to forget.</p>
  <p><b>Average job value:</b> use your typical first job, not your biggest one. If customers usually come back (mowing, pest control), the real value is higher.</p>
  <p><b>Share who would book:</b> of the people who reach you live, how many become jobs? 30% to 60% is common for service calls.</p>
  <h2>Why missed calls cost more than they look</h2>
  <p>In a 2025 survey of 1,000 U.S. consumers, only <a href="https://www.callrail.com/blog/missed-calls-cost-businesses-more-than-ever" rel="noopener">42% said they leave a voicemail</a> when a business doesn’t answer, and 21% immediately call someone else. Research on lead response also shows that the odds of qualifying a lead are about <a href="/missed-call-statistics/">21 times better at 5 minutes than at 30</a>. A missed call is a race, and the clock starts when it rings out.</p>
  <p><a class="btn btn-primary" href="${C.signupUrl}" style="margin-top:10px">Start your ${trial}-day free trial</a></p>
</div></section>
${statsSection(['voicemail', 'abandon', 'hour'], 'The research behind the math')}`,
});

// ---------- STATISTICS ----------
page('/missed-call-statistics/', {
  title: `Missed Call Statistics for Small Businesses (${new Date().getFullYear()}): What the Research Actually Says`,
  description: 'Sourced missed call and lead response statistics for small and home service businesses: how many calls go unanswered, how many callers leave voicemail, and how fast you must respond.',
  jsonld: [crumbsLd([['Home', '/'], ['Missed call statistics', '/missed-call-statistics/']]), { '@context': 'https://schema.org', '@type': 'Article', headline: 'Missed Call Statistics for Small Businesses', dateModified: TODAY, author: { '@type': 'Organization', name: 'Boomerang' }, publisher: { '@type': 'Organization', name: 'Boomerang' } }],
  body: `<section class="page-hero"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Missed call statistics</div>
  <h1>Missed call statistics for small businesses</h1><p class="lead">The numbers that get passed around, traced back to where they actually come from. Updated ${TODAY}.</p></div></section>
<section class="alt"><div class="wrap">
  <div class="stat-grid">${C.stats.map((x) => `<article class="stat"><div class="v">${x.value}</div><h3>${esc(x.headline)}</h3><p>${esc(x.detail)}</p><cite>Source: <a href="${x.url}" rel="noopener" target="_blank">${esc(x.source)}</a></cite></article>`).join('')}</div>
</div></section>
<section><div class="wrap prose">
  <h2>A note on the numbers you see online</h2>
  <p>Search “missed call statistics” and you’ll find the same handful of figures everywhere: 62% of calls go unanswered, 80% of callers won’t leave a voicemail, 85% never call back. Some of those trace to real but small studies, and some trace to nothing at all. We only list figures we could follow back to a named source, and we tell you how big that source is.</p>
  <h2>What the research supports</h2>
  <p><b>Many calls to small businesses don’t reach a person.</b> The often-quoted 62% comes from a small study of 85 businesses, where 37.8% of calls were answered by a person. It isn’t an industry-wide rate, but it matches what most owners see in their own call logs during busy season.</p>
  <p><b>Most callers don’t leave a message.</b> CallRail’s 2025 survey found only 42% of consumers leave a voicemail, 21% immediately call another business, and 78% have given up on a business after an unanswered call.</p>
  <p><b>Speed decides who gets the job.</b> The 2007 Lead Response Management study (15,000+ leads) found the odds of qualifying a lead were 21 times better when contacted within 5 minutes instead of 30. Harvard Business Review’s 2011 audit of 2,241 companies found firms that responded within an hour were nearly 7 times more likely to qualify the lead, and 23% of companies never responded at all.</p>
  <h2>What it means for a service business</h2>
  <p>You can’t pick up every call, but you can respond to every call in under five minutes. A text back in seconds keeps the caller from dialing the next company, and gives you a written record of what they need. That is exactly what <a href="/">Boomerang</a> does.</p>
  <p>Want to see what this means in dollars for your business? Try the <a href="/missed-call-calculator/">missed call calculator</a>.</p>
</div></section>
${cta('Answer every call in under a minute, without picking up the phone.')}`,
});

// ---------- INDUSTRIES ----------
for (const ind of C.industries) {
  const qs = [
    [`How does missed call text back work for ${ind.plural}?`, `When you can’t answer, the call forwards to your Boomerang number and Sara texts the caller back within seconds from your local business number. She asks what they need, where the job is and anything else your trade needs to know, then books the estimate (Pro) or texts you the qualified lead (Core).`],
    ['Do I have to change my phone number?', 'No. Your number stays the same and rings you first. Only missed calls come to Boomerang.'],
    [`How much does it cost?`, `Core is ${money(CORE.monthly)}/month and Pro is ${money(PRO.monthly)}/month, plus a one-time ${money(fee)} setup fee. Both include a ${trial}-day free trial that starts when your texting goes live.`],
  ];
  page(`/industries/${ind.slug}/`, {
    title: `${ind.title} | Boomerang`,
    description: ind.description,
    jsonld: [appLd, faqLd(qs), crumbsLd([['Home', '/'], ['Industries', '/#industries'], [ind.name, `/industries/${ind.slug}/`]])],
    body: `<section class="hero"><div class="wrap hero-grid">
  <div><div class="crumbs"><a href="/">Home</a> / ${esc(ind.name)}</div>
    <span class="eyebrow">For ${esc(ind.plural)}</span>
    <h1>${esc(ind.hook)}</h1>
    <p class="lead">${esc(ind.description)}</p>
    ${ctaBtns()}</div>
  ${player(ind)}
</div></section>
<section><div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:48px;align-items:start">
  <div><span class="eyebrow">The problem</span><h2>Your phone rings when your hands are full</h2><p class="lead">${esc(ind.pain)}</p></div>
  <div><span class="eyebrow">What Sara asks</span><h2>The questions you would ask</h2>
    <ul class="qlist">${ind.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
    <p class="fine" style="margin-top:12px">You can adjust the questions to fit how you work.${ind.emergency ? ' Real emergencies skip the questions and page you instantly.' : ''}</p></div>
</div></section>
<section class="alt"><div class="wrap"><span class="eyebrow">The math</span><h2>What missed ${esc(ind.job)} calls cost you</h2>
  ${calculator({ ...C.calculatorDefaults, missedPerWeek: ind.missedPerWeek, jobValue: ind.jobValue })}
  <p class="fine" style="margin-top:14px">Starting values are typical for ${esc(ind.plural)}. Slide them to match your business.</p></div></section>
<section><div class="wrap"><span class="eyebrow">The Trust Dial™</span><h2>You decide how much Sara books on her own</h2>${trustDial()}</div></section>
${statsSection(['voicemail', 'fivemin', 'hour'])}
<section><div class="wrap center"><h2>Pricing</h2>${plans()}</div></section>
<section class="alt"><div class="wrap"><h2 class="center">Questions</h2>${faqBlock(qs)}
  <p class="center" style="margin-top:30px">Other trades: ${C.industries.filter((i) => i.slug !== ind.slug).map((i) => `<a href="/industries/${i.slug}/">${esc(i.name)}</a>`).join(' · ')}</p></div></section>
${cta()}`,
  });
}

// ---------- PRIVACY ----------
page('/privacy/', {
  title: 'Privacy Policy | Boomerang',
  description: 'How Boomerang by Lhotse Automations collects, uses and protects information.',
  body: `<section class="page-hero"><div class="wrap"><h1>Privacy policy</h1><p class="lead">Last updated ${TODAY}. The short version: we collect what we need to run the service, and we never sell it.</p></div></section>
<section><div class="wrap prose">
  <p>Boomerang is a service of ${esc(C.company)} (“we”, “us”). This policy covers this website and the Boomerang service.</p>
  <h2>What we collect</h2>
  <p><b>From business owners who sign up:</b> your name, business name, contact details, business phone number, website, and the business information you give us to set up the service. Payments are processed by Stripe; we don’t store full card numbers.</p>
  <p><b>From your customers, on your behalf:</b> when someone calls or texts a business that uses Boomerang, we process their phone number, messages, voicemails, photos and the details they share (such as a service address) so the business can respond. The business decides how that information is used, and we process it only to provide the service to them.</p>
  <p><b>From website visitors:</b> basic technical information your browser sends, such as pages viewed and device type.</p>
  <h2>How we use it</h2>
  <p>To provide, support and improve Boomerang, to send service messages, and to bill for the service. We do not sell or rent personal information.</p>
  <h2>Text messaging</h2>
  <p>No mobile information is shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent are not shared with any third parties. Message frequency varies, and message and data rates may apply. Reply STOP to opt out at any time, or HELP for help.</p>
  <h2>Who we share it with</h2>
  <p>Only the service providers we need to run Boomerang (for example, cloud hosting, our phone and texting carrier, calendar and payment providers), under contracts that limit their use of the data, or when required by law.</p>
  <h2>Security and retention</h2>
  <p>Data is encrypted in transit and access is restricted to the business account it belongs to. We keep data while the account is active and delete or anonymize it when it’s no longer needed, unless the law requires us to keep it.</p>
  <h2>Your choices</h2>
  <p>You can ask us to access, correct or delete your information by emailing <a href="mailto:${C.contactEmail}">${C.contactEmail}</a>. If you texted a business that uses Boomerang, you can also contact that business directly.</p>
  <h2>Contact</h2>
  <p>${esc(C.company)} · <a href="mailto:${C.contactEmail}">${C.contactEmail}</a></p>
</div></section>`,
});

// ---------- 404, sitemap, robots, headers ----------
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, '404.html'), layout({ path: '/404', title: 'Page not found | Boomerang', description: 'Page not found.', body: `<section class="page-hero"><div class="wrap"><h1>That page went missing.</h1><p class="lead">Unlike your calls with Boomerang. Head back <a href="/" style="color:#fff">home</a>.</p></div></section>` }).replace('<link rel="canonical" href="https://useboomerang.ai/404">', '<meta name="robots" content="noindex">'));
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${C.siteUrl}${p}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${C.siteUrl}/sitemap.xml\n`);
writeFileSync(join(OUT, '_headers'), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n/assets/*\n  Cache-Control: public, max-age=86400\n`);
writeFileSync(join(OUT, '_redirects'), `/calculator /missed-call-calculator/ 301\n/stats /missed-call-statistics/ 301\n`);
cpSync('src/assets', join(OUT, 'assets'), { recursive: true });
cpSync('public', OUT, { recursive: true });
console.log(`Built ${pages.length} pages into ./${OUT}`);
