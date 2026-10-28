// The North Star page (2026-10-27): Anas's goal, the four tracks, time blocks, milestones and
// sources, served as one self contained HTML page in the locked brand look. Edit the HTML here.
export const NORTH_STAR_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anas North Star</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,700&family=Inter+Tight:wght@800;900&family=Inter:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
/* Brand: Animations/AINative3Steps_BrandColors. Paper ground, ink type, green objects, orange emphasis. */
:root{
  --paper:#EEE9D6; --card:#FFFEFA; --ink:#1A1205; --muted:#6B6150; --line:#DCD5BB;
  --green:#2D7A4F; --green2:#44B977; --greenSoft:rgba(45,122,79,.10);
  --orange:#D94F00; --orangeSoft:rgba(217,79,0,.09);
  --shadow:0 14px 40px rgba(26,18,5,.08);
  --display:"Inter Tight","Inter",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,Consolas,monospace; --grey:#8C8475; --dark:#211A10; --serif:"Newsreader",Georgia,serif; --ui:"Inter",system-ui,"Segoe UI",sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);font-family:var(--ui);font-size:15px;line-height:1.55;
  background:radial-gradient(1200px 700px at 50% -10%,#F7F3E4 0%,var(--paper) 60%),var(--paper);}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background-image:radial-gradient(rgba(26,18,5,.075) .7px,transparent .9px),radial-gradient(rgba(26,18,5,.075) .7px,transparent .9px);background-size:9px 9px;background-position:0 0,4.5px 4.5px}
.wrap{position:relative;max-width:1040px;margin:0 auto;padding:40px 20px 80px;display:flex;flex-direction:column;gap:44px}
.eyebrow{font-family:var(--mono);font-size:12px;font-weight:500;text-transform:lowercase;color:var(--grey)}.eyebrow::before{content:"// "}
h1{font-family:var(--display);font-weight:900;font-size:clamp(30px,5.4vw,54px);line-height:1.04;letter-spacing:-.015em;margin:8px 0 0;text-wrap:balance}
h1 em{font-family:var(--serif);font-style:italic;font-weight:700;color:var(--orange);letter-spacing:0}
h2{font-family:var(--display);font-weight:800;font-size:clamp(22px,3vw,30px);margin:0;letter-spacing:-.01em}
h3{font-family:var(--serif);font-weight:600;font-size:21px;margin:0}
p{margin:0}
.lead{font-family:var(--serif);font-size:19px;max-width:64ch;color:#3A3020}
.card{background:var(--card);border-radius:16px;box-shadow:var(--shadow);padding:22px}
.glass{background:var(--card);border-radius:18px;padding:24px;box-shadow:var(--shadow);border-left:4px solid var(--orange)}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:900px){.g4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.g4{grid-template-columns:1fr}}
.goal{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;align-items:stretch}
@media(max-width:780px){.goal{grid-template-columns:1fr}}
.goal .big{font-family:var(--serif);font-size:clamp(22px,2.8vw,29px);line-height:1.3}
.goal .big b{font-family:var(--display);font-weight:900;color:var(--ink)}
.goal .big i{color:var(--orange);font-weight:700}
.count{display:flex;flex-direction:column;justify-content:space-between;gap:14px}
.count .n{font-family:var(--display);font-weight:900;font-size:72px;line-height:1;color:var(--orange);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.bar{height:10px;border-radius:6px;background:var(--line);overflow:hidden}
.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--green),var(--green2));border-radius:6px;transition:width 1.4s cubic-bezier(.2,.8,.2,1)}
.small{font-size:13px;color:var(--muted)}
.quote{border-left:3px solid var(--orange);padding:4px 0 4px 18px}
.quote q{font-family:var(--serif);font-style:italic;font-size:22px;quotes:"\\201C" "\\201D"}
.stat .num{font-family:var(--display);font-weight:900;letter-spacing:-.02em;font-size:38px;line-height:1;font-variant-numeric:tabular-nums}
.stat .num.o{color:var(--orange)} .stat .num.g{color:var(--green)}
.stat p{margin-top:8px}
.track{display:flex;flex-direction:column;gap:12px}
.track .tag{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:500;text-transform:lowercase;padding:4px 11px;border-radius:999px;background:var(--ink);color:var(--card);align-self:flex-start}
.track .tag.o{background:transparent;color:var(--orange);border:2px solid var(--orange);border-radius:6px;font-family:var(--display);font-weight:900;text-transform:uppercase;transform:rotate(-3deg)}
ol.tasks{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px}
ol.tasks li::marker{font-weight:700;color:var(--green)}
.why{font-size:13px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px}
.tablebox{overflow-x:auto;border-radius:16px;box-shadow:0 14px 34px rgba(52,38,20,.18);background:var(--dark);color:#FFFEFA}.tablebox .bar3{display:flex;gap:6px;padding:12px 14px;align-items:center}.tablebox .bar3 i{width:10px;height:10px;border-radius:50%;display:inline-block}.tablebox .bar3 i:nth-child(1){background:#FF5F57}.tablebox .bar3 i:nth-child(2){background:#FEBC2E}.tablebox .bar3 i:nth-child(3){background:#28C840}.tablebox .bar3 span{font-family:var(--mono);font-size:12px;color:rgba(255,254,250,.6);margin-left:10px}.tablebox th{color:rgba(255,254,250,.5);font-family:var(--mono);text-transform:lowercase;letter-spacing:0}.tablebox th,.tablebox td{border-bottom-color:rgba(255,254,250,.1)}.tablebox tr.now td{background:rgba(217,79,0,.22)}.tablebox a{color:#F07030}
table{border-collapse:collapse;width:100%;min-width:640px}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top;font-size:14px}
th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
tr:last-child td{border-bottom:none}
td.when{white-space:nowrap;font-weight:700;font-variant-numeric:tabular-nums}
tr.now td{background:var(--greenSoft)}
.timeline{display:flex;flex-direction:column;gap:0}
.ms{display:grid;grid-template-columns:120px 22px 1fr;gap:14px;align-items:start}
.ms .d{font-weight:700;font-variant-numeric:tabular-nums;padding-top:2px}
.ms .dot{width:14px;height:14px;border-radius:50%;background:var(--card);border:3px solid var(--green);margin-top:5px;position:relative}
.ms .dot::after{content:"";position:absolute;left:3px;top:14px;width:2px;height:58px;background:var(--line)}
.ms:last-child .dot::after{display:none}
.ms .t{padding-bottom:26px}
.ms.end .dot{background:var(--orange);border-color:var(--orange)}
@media(max-width:520px){.ms{grid-template-columns:86px 18px 1fr;gap:10px}}
.no{display:flex;flex-wrap:wrap;gap:8px}
.no span{padding:7px 12px;border-radius:999px;background:var(--card);box-shadow:0 4px 14px rgba(26,18,5,.06);font-size:13px;text-decoration:line-through;text-decoration-color:var(--orange);color:var(--muted)}
.test{font-family:var(--serif);font-size:20px}
.test b{color:var(--orange)}
.src{font-size:13px;color:var(--muted);columns:2 320px;column-gap:28px}
.src li{margin-bottom:6px;break-inside:avoid}
a{color:var(--green);font-weight:600}
.reveal{opacity:1;transform:none}
@media (prefers-reduced-motion:no-preference){
  .reveal{animation:rise .9s cubic-bezier(.2,.8,.2,1) both}
  .reveal:nth-child(2){animation-delay:.08s}.reveal:nth-child(3){animation-delay:.16s}.reveal:nth-child(4){animation-delay:.24s}
  @keyframes rise{from{opacity:0;transform:translateY(14px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
}
@media (prefers-reduced-motion:reduce){.bar i{transition:none}}
.top{display:flex;flex-wrap:wrap;gap:8px}.top a{font-family:var(--mono);font-size:12px;font-weight:500;text-transform:lowercase;padding:7px 13px;border-radius:999px;background:var(--card);box-shadow:0 4px 14px rgba(26,18,5,.06);color:var(--ink);text-decoration:none}.top a.on{background:var(--ink);color:var(--card)}
</style>
</head>
<body>
<div class="wrap">
  <nav class="top"><a href="/admin/north-star" class="on">North Star</a><a href="/admin/jobs/plan">1. Gulf jobs plan</a><a href="/admin/jobs">Applications board</a><a href="/admin/jobs/startups">2. Startup roles</a><a href="/admin/freelance">3. Freelance</a></nav>

  <header class="reveal">
    <div class="eyebrow">Anas Qureshi · North Star · written 27 October 2026</div>
    <h1>I want <em>a much bigger salary</em>, and a job gets me there first.</h1>
  </header>

  <section class="goal reveal">
    <div class="glass">
      <div class="eyebrow" style="margin-bottom:10px">What I want</div>
      <p class="big">By <b>31 January 2027</b>, a signed offer as a <b>Forward Deployed or AI Integration Engineer in Saudi Arabia</b>, paying <b>SAR 12,000 a month or more</b>. That is about <i>PKR 890,000</i>, roughly <i>5.5 times</i> the PKR 160,000 I earn today.</p>
      <p class="small" style="margin-top:14px">Stretch: SAR 15,000 or more. The pay range comes from salary aggregators (entry level about SAR 10,000 to 15,000, mid level about 15,000 to 25,000), so treat it as a guide. My resume lists experience from 2024, which fits the skilled visa tier (SAR 7,000 to 14,999); the high skilled tier asks for about 5 years and SAR 15,000+. Rate used: about 74 PKR per SAR (July 2026).</p>
    </div>
    <div class="card count">
      <div>
        <div class="eyebrow">Days left to the goal date</div>
        <div class="n" id="days">96</div>
      </div>
      <div>
        <div class="bar"><i id="prog"></i></div>
        <p class="small" style="margin-top:8px" id="progLabel">From 27 October 2026 to 31 January 2027.</p>
      </div>
      <p class="small">Checkpoint on day 60 of the lock, <b>10 December 2026</b>: at least 5 interviews held.</p>
    </div>
  </section>

  <section class="reveal">
    <div class="quote">
      <q>The hardest thing is not doing what you want, it's knowing what you want.</q>
      <p class="small" style="margin-top:8px">Naval Ravikant, from <i>The Almanack of Naval Ravikant</i> (Eric Jorgenson), as shown in reader highlights; punctuation simplified. The line "successful people are those who achieve what they want and know what they want" is not one I could find from Naval. The idea is the same, so the page starts by stating the want.</p>
    </div>
  </section>

  <section class="grid" style="gap:18px">
    <div class="reveal"><div class="eyebrow">Where I stand today</div><h2>Where I start from</h2></div>
    <div class="grid g3 reveal">
      <div class="card stat"><div class="num o">0</div><p>interviews from 61 logged applications (2 Sept to 11 Oct 2026). Only 5 had a named contact.</p></div>
      <div class="card stat"><div class="num">160k</div><p>PKR a month, my current salary.</p></div>
      <div class="card stat"><div class="num o">0 to 166</div><p>views per video across Your Strange Brain's first 15 videos (channel log, 21 Oct 2026).</p></div>
    </div>
  </section>

  <section class="grid" style="gap:18px">
    <div class="reveal"><div class="eyebrow">Why this path</div><h2>What the data says</h2></div>
    <div class="grid g4 reveal">
      <div class="card stat"><div class="num g">40% vs 3%</div><p>Referred candidates who reached an interview, against plain applicants. Ashby, 38 million applications, 2021 to 2024. So referrals come first.</p></div>
      <div class="card stat"><div class="num g">+12.45%</div><p>Average pay gain for tech job seekers who countered their offer; about 85% of those who countered got at least some of what they asked. Cullen, Pakzad-Hurson and Perez-Truglia (NBER), 3,858 job seekers.</p></div>
      <div class="card stat"><div class="num g">37%</div><p>Higher InMail response rate from candidates marked Open to Work. LinkedIn, tens of millions of recruiter InMails, May 2021 to April 2022.</p></div>
      <div class="card stat"><div class="num">40 to 70</div><p>Days from application to offer for software roles, from secondary benchmarks that vary. This is why the goal date is 31 January and not 10 December.</p></div>
    </div>
  </section>

  <section class="grid" style="gap:18px">
    <div class="reveal"><div class="eyebrow">How I get there</div><h2>Four tracks, one goal</h2></div>
    <div class="grid g2">
      <article class="card track reveal">
        <span class="tag">1 · Get hired</span>
        <h3>Referrals first, applications second</h3>
        <ol class="tasks">
          <li>Message 3 new people a weekday at the 38 target companies on <a href="/admin/jobs/plan">/admin/jobs/plan</a>. Ask for a 15 minute chat, not a job.</li>
          <li>Follow up once after 3 working days.</li>
          <li>After a good chat, ask for a referral to one posted role.</li>
          <li>Send 5 well matched applications a weekday.</li>
          <li>Weekly targets: 15 contacts, 3 calls, 2 referrals, 25 applications.</li>
        </ol>
        <p class="why">Locked 2026-10-27. Plan and sources: Jobs/PLAN_2026-10-27.md.</p>
      </article>
      <article class="card track reveal">
        <span class="tag">2 · Get better</span>
        <h3>The 100xFDE course, capstone as proof</h3>
        <ol class="tasks">
          <li>Follow the 100xEngineers FDE Roadmap at its standard pace: 12 weeks, 6 milestones, starting Week 0.</li>
          <li>Make the capstone a real build: deploy something that automates a real person's process, measure it against a baseline, hand it over with a runbook.</li>
          <li>That same capstone is the proof piece for referral chats and the topic of the weekly LinkedIn post. One project does all three jobs.</li>
          <li>Interview practice twice a week: AI integration questions and a walkthrough of the build.</li>
        </ol>
        <p class="why">The course home page does not state weekly hours, so the time blocks below give it weekends plus two evenings.</p>
      </article>
      <article class="card track reveal">
        <span class="tag">3 · Get found</span>
        <h3>Inbound that rests on data</h3>
        <ol class="tasks">
          <li>Turn on Open to Work, visible to recruiters only, with Riyadh, Jeddah and Dammam as locations. LinkedIn says listed locations help a profile show in recruiter searches, and Open to Work profiles answer InMails 37% more often.</li>
          <li>Headline with the exact role names from the postings: Forward Deployed Engineer, AI Integration Engineer.</li>
          <li>One post a week showing the capstone being built. Recruiters bring in about 16% of hires (Ashby), and the people I message for referrals will open my profile.</li>
        </ol>
        <p class="why">I found no study proving that posting on LinkedIn gets people hired. So posting stays at one a week and serves the referral chats.</p>
      </article>
      <article class="card track reveal">
        <span class="tag">4 · Get paid more</span>
        <h3>Never accept the first number</h3>
        <ol class="tasks">
          <li>Keep several interview processes going at once, so offers can arrive close together.</li>
          <li>Counter every offer, politely and with a number at the top of the role's range, not above it.</li>
          <li>Use the salary range for the role and city, not my current PKR salary, as the reference point.</li>
        </ol>
        <p class="why">Countering added 12.45% on average in the NBER study, and managers withdraw offers after counters far less often than candidates fear.</p>
      </article>
    </div>
    <article class="card track reveal">
      <span class="tag o">Content · weekends only</span>
      <h3>Your Strange Brain: read one book, film what I learn</h3>
      <ol class="tasks">
        <li>Read <i>Psycho-Cybernetics</i> (Maxwell Maltz, 1960) for 15 minutes a day and write down the one idea that hit.</li>
        <li>On Saturday, Claude turns the week's notes into one video plus Shorts, in my own words and drawings, with only short quotes from the book. I approve and upload.</li>
        <li>No other content. Interior Spaces stops.</li>
      </ol>
      <p class="why">I found no data showing this format makes money, and from 1 February 2027 YouTube's entry bar for new channels doubles to 1,000 subscribers plus 8,000 watch hours (from 4,000). It stays for reading and practice and never takes weekday time.</p>
    </article>
  </section>

  <section class="grid" style="gap:18px">
    <div class="reveal"><div class="eyebrow">Time blocks</div><h2>Every week, the same shape</h2><p class="small" style="margin-top:6px">Office 9 to 6. Earning blocks come first every evening; the home workout comes after them. The row for right now lights up.</p></div>
    <div class="tablebox reveal">
      <div class="bar3"><i></i><i></i><i></i><span>week.schedule</span></div>
      <table id="blocks">
        <thead><tr><th>When</th><th>Block</th><th>What</th></tr></thead>
        <tbody>
          <tr data-days="1,2,3,4,5" data-from="19:00" data-to="20:00"><td class="when">Mon to Fri, 7:00 to 8:00 pm</td><td>Get hired: referrals</td><td>3 new people, follow ups, referral asks. Log them on <a href="/admin/jobs/plan">/admin/jobs/plan</a>.</td></tr>
          <tr data-days="1,2,3,4,5" data-from="20:00" data-to="20:30"><td class="when">Mon to Fri, 8:00 to 8:30 pm</td><td>Get hired: applications</td><td>5 matched applications on <a href="/admin/jobs">/admin/jobs</a>, then startup founder applications.</td></tr>
          <tr data-days="1,3" data-from="20:30" data-to="21:30"><td class="when">Mon and Wed, 8:30 to 9:30 pm</td><td>Get better: course</td><td>100xFDE lessons for the current week.</td></tr>
          <tr data-days="2,4" data-from="20:30" data-to="21:30"><td class="when">Tue and Thu, 8:30 to 9:30 pm</td><td>Get better: interviews</td><td>30 minutes of questions, 30 minutes on the capstone walkthrough.</td></tr>
          <tr data-days="5" data-from="20:30" data-to="21:30"><td class="when">Fri, 8:30 to 9:30 pm</td><td>Weekly review</td><td>Scoreboard, Friday rules, 10 minute check in with my accountability partner, freelance replies to warm leads only.</td></tr>
          <tr data-days="1,3,5" data-from="22:00" data-to="22:50"><td class="when">Mon, Wed, Fri, 10:00 to 10:50 pm</td><td>Body: calisthenics</td><td>The routine in the Body section below, at home. Done at least an hour before sleep.</td></tr>
          <tr data-days="0,1,2,3,4,5,6" data-from="23:00" data-to="23:15"><td class="when">Every day, before sleep</td><td>Reading</td><td>15 minutes of Psycho-Cybernetics, one note.</td></tr>
          <tr data-days="6" data-from="09:00" data-to="12:00"><td class="when">Sat, 9:00 am to 12:00 pm</td><td>Get better: capstone</td><td>Build the capstone for the course.</td></tr>
          <tr data-days="6" data-from="12:00" data-to="13:00"><td class="when">Sat, 12:00 to 1:00 pm</td><td>Your Strange Brain</td><td>Approve and upload the video Claude made from the week's notes.</td></tr>
          <tr data-days="0" data-from="09:00" data-to="11:00"><td class="when">Sun, 9:00 to 11:00 am</td><td>Get better: course</td><td>Catch up on the week's lessons.</td></tr>
          <tr data-days="0" data-from="11:00" data-to="11:30"><td class="when">Sun, 11:00 to 11:30 am</td><td>Get found</td><td>Publish the week's capstone post. Sunday is the first working day in Saudi Arabia.</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="grid" style="gap:18px">
    <div class="reveal"><div class="eyebrow">Milestones</div><h2>The road to the offer</h2></div>
    <div class="card reveal">
      <div class="timeline">
        <div class="ms"><div class="d">2 Nov</div><div class="dot"></div><div class="t"><b>Setup done.</b> Open to Work on (recruiters only), headline updated, Want and Reach set on all 38 companies, course Week 0 finished.</div></div>
        <div class="ms"><div class="d">9 Nov</div><div class="dot"></div><div class="t"><b>First full week.</b> 15 people contacted, first capstone post published.</div></div>
        <div class="ms"><div class="d">23 Nov</div><div class="dot"></div><div class="t"><b>Referrals flowing.</b> At least 2 referrals in hand, 3 calls a week.</div></div>
        <div class="ms"><div class="d">10 Dec</div><div class="dot"></div><div class="t"><b>Day 60 checkpoint.</b> At least 5 interviews held, about halfway through the course. If not, apply the Friday rules to the weakest stage.</div></div>
        <div class="ms"><div class="d">19 Jan</div><div class="dot"></div><div class="t"><b>Capstone finished.</b> Course finished at standard pace (12 weeks from 27 October), with a real deployment and its numbers.</div></div>
        <div class="ms end"><div class="d">31 Jan</div><div class="dot"></div><div class="t"><b>Signed offer, SAR 12,000+.</b> Countered, not accepted as first offered.</div></div>
      </div>
    </div>
  </section>

  <section class="grid" style="gap:18px">
    <div class="reveal"><div class="eyebrow">Body · calisthenics at home</div><h2>Get strong without touching earning time</h2>
      <p class="small" style="margin-top:6px">Earning always comes first. The workout sits after the evening blocks, three nights a week, about 50 minutes.</p></div>
    <div class="grid g2">
      <article class="card track reveal">
        <span class="tag">When and why</span>
        <ol class="tasks">
          <li>Monday, Wednesday and Friday, 10:00 to 10:50 pm, after the earning blocks.</li>
          <li>Three days, because WHO asks adults for muscle strengthening on 2 or more days a week, and this routine is built for 3.</li>
          <li>Finish at least an hour before sleep. A review of 23 studies found evening exercise did not harm sleep; the only warning, from a single study, was vigorous training in the last hour before bed.</li>
          <li>Equipment: a pull-up bar now. Parallel bars or rings later, for dips.</li>
        </ol>
        <p class="why">This is strength only. WHO also asks for 150 to 300 minutes of moderate aerobic activity a week, which this routine does not cover.</p>
      </article>
      <article class="card track reveal">
        <span class="tag">Every session</span>
        <ol class="tasks">
          <li>Warm up: dynamic stretches, then 5 bodyline drills.</li>
          <li>Skill work: support hold and wall handstand.</li>
          <li>Strength: three pairs of exercises, 3 sets each. Pick the step you can do for 5 reps but not more than 8.</li>
          <li>Move to the next step once all 3 sets reach 8 clean reps. The routine says 5 to 8; moving up at 8 is the common reading of that rule.</li>
        </ol>
        <p class="why">The r/bodyweightfitness Recommended Routine, in the version published on antranik.org.</p>
      </article>
    </div>
    <div class="tablebox reveal">
      <div class="bar3"><i></i><i></i><i></i><span>calisthenics.path</span></div>
      <table>
        <thead><tr><th>Pair</th><th>Exercise</th><th>Steps, easiest first</th></tr></thead>
        <tbody>
          <tr><td class="when">1</td><td>Pull up</td><td>Scapular pulls, arching active hang, pull-up negatives, pull-ups. Start only after 3 sets of 8 horizontal rows.</td></tr>
          <tr><td class="when">1</td><td>Dip</td><td>Negative dips, parallel bar dips, ring dips. Start only after 3 sets of 8 diamond push-ups.</td></tr>
          <tr><td class="when">2</td><td>L-sit</td><td>Foot supported, one foot supported, tucked L-sit, full L-sit.</td></tr>
          <tr><td class="when">2</td><td>Squat</td><td>Bodyweight squat, step-ups.</td></tr>
          <tr><td class="when">3</td><td>Push-up</td><td>Wall push-up, incline push-up, floor push-up, diamond push-up, rings push-up.</td></tr>
          <tr><td class="when">3</td><td>Row</td><td>Incline rows, horizontal rows.</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="grid g2" style="gap:18px">
    <div class="card reveal">
      <div class="eyebrow" style="margin-bottom:10px">Not doing until 31 January 2027</div>
      <div class="no">
        <span>New business ideas</span><span>Interior Spaces</span><span>New channels</span><span>Mizan</span><span>AI Pundit</span><span>Consultancy outreach</span><span>Founder pack</span><span>Animation studio</span><span>Upwork</span><span>Site redesigns</span>
      </div>
      <p class="small" style="margin-top:12px">New ideas go to Income Plan/parking-lot.md and stay there.</p>
    </div>
    <div class="glass reveal">
      <div class="eyebrow" style="margin-bottom:10px">When something new looks exciting</div>
      <p class="test">Ask one question: <b>does this get me an interview or a higher offer this week?</b> If not, it goes in the parking lot.</p>
    </div>
  </section>

  <section class="reveal">
    <div class="eyebrow" style="margin-bottom:10px">Sources</div>
    <ol class="src">
      <li><a href="https://www.ashbyhq.com/talent-trends-report/reports/referrals" target="_blank" rel="noopener">Ashby, referrals report</a> (40% vs 3%)</li>
      <li><a href="https://www.ashbyhq.com/talent-trends-report/reports/inbound" target="_blank" rel="noopener">Ashby, share of hires by source</a> (sourced about 16%)</li>
      <li><a href="https://anderson-review.ucla.edu/most-job-seekers-skip-negotiation-and-pay-a-high-price/" target="_blank" rel="noopener">UCLA Anderson Review on Cullen, Pakzad-Hurson, Perez-Truglia</a> (+12.45%)</li>
      <li><a href="https://www.linkedin.com/business/talent/blog/talent-strategy/these-inmails-get-best-response-rates" target="_blank" rel="noopener">LinkedIn, InMail response rates</a> (Open to Work +37%)</li>
      <li><a href="https://www.linkedin.com/help/linkedin/answer/a507508/let-recruiters-know-you-re-open-to-work?lang=en" target="_blank" rel="noopener">LinkedIn Help, Open to Work settings</a></li>
      <li><a href="https://www.edoxi.com/studyhub-detail/average-ai-engineer-salary-riyadh" target="_blank" rel="noopener">Edoxi, AI engineer salary Riyadh</a> (aggregator)</li>
      <li><a href="https://www.visaverge.com/immigration/saudi-skilled-worker-visa-2025-eligibility-categories-and-salaries-explained/" target="_blank" rel="noopener">VisaVerge, Saudi visa skill tiers</a> (secondary)</li>
      <li><a href="https://www.valutafx.com/history/sar-pkr-2026-07-31" target="_blank" rel="noopener">SAR to PKR, 31 July 2026</a></li>
      <li><a href="https://support.google.com/youtube/answer/12843009?hl=en" target="_blank" rel="noopener">YouTube, YPP threshold changes from 1 Feb 2027</a></li>
      <li><a href="https://www.goodreads.com/quotes/10515534-the-hardest-thing-is-not-doing-what-you-want-it-s-knowing" target="_blank" rel="noopener">Goodreads, the Naval quote</a></li>
      <li><a href="https://100xfde.com/" target="_blank" rel="noopener">100xEngineers FDE Roadmap</a></li>
      <li><a href="https://antranik.org/rr/" target="_blank" rel="noopener">antranik.org, the Recommended Routine</a> (calisthenics path)</li>
      <li><a href="https://iris.who.int/server/api/core/bitstreams/faa83413-d89e-4be9-bb01-b24671aef7ca/content" target="_blank" rel="noopener">WHO 2020 physical activity guidelines</a> (strength 2+ days, aerobic 150 to 300 min)</li>
      <li><a href="https://www.psychologytoday.com/gb/blog/the-athletes-way/201812/easy-to-moderate-exercise-before-bedtime-promotes-deep-sleep" target="_blank" rel="noopener">Stutz, Eiholzer and Spengler 2019, evening exercise and sleep</a> (summary)</li>
      <li><a href="https://pin.com/blog/recruit-software-engineers/" target="_blank" rel="noopener">Pin, software engineer hiring time</a> (secondary)</li>
    </ol>
  </section>
</div>

<script>
// Days left and progress from the start date to the goal date, plus the time block for right now.
(function(){
  var start=new Date(2026,9,27), goal=new Date(2027,0,31,23,59), now=new Date();
  var left=Math.max(0,Math.ceil((goal-now)/86400000));
  var pct=Math.min(100,Math.max(0,(now-start)/(goal-start)*100));
  var el=document.getElementById('days'), target=left, from=Math.min(96,left+20), t0=null;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){el.textContent=target}else{
    (function step(ts){if(!t0)t0=ts;var k=Math.min(1,(ts-t0)/900);el.textContent=Math.round(from+(target-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step)})(performance.now());
  }
  setTimeout(function(){document.getElementById('prog').style.width=pct.toFixed(1)+'%'},150);
  document.getElementById('progLabel').textContent=Math.round(pct)+'% of the way from 27 October 2026 to 31 January 2027.';
  var day=now.getDay(), hm=('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
  document.querySelectorAll('#blocks tbody tr').forEach(function(tr){
    if(tr.dataset.days.split(',').indexOf(String(day))>-1&&hm>=tr.dataset.from&&hm<tr.dataset.to)tr.classList.add('now');
  });
})();
</script>
</body>
</html>
`;
