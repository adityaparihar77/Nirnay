# 🏥 Nirnay — Offline-First AI Triage System for Rural India
### Hackathon Presentation Guide

---

## ⏱️ 3-MINUTE PITCH SCRIPT

```
[0:00 — Hook]
"850 million Indians live in rural areas. Most have no hospital within
30 kilometres. Every day, preventable deaths happen — not because
medicine doesn't exist, but because trained diagnosis doesn't reach
the patient in time. Nirnay changes that."

[0:20 — Problem]
"Rural health workers — ASHA workers, ANMs, community nurses — they
are on the ground. They see the patient. But they have two problems:
they lack clinical decision support, and they often have no internet.
A patient with a BP of 175 might get sent home because no one knew
that was critical."

[0:45 — Solution]
"Nirnay is an offline-first triage system. The health worker enters
two vitals: blood pressure and temperature. In under one second, on
the phone, with zero internet, our algorithm classifies the patient
as RED, YELLOW, or GREEN.

RED means: call an ambulance now.
YELLOW means: prioritise, monitor closely.
GREEN means: routine care.

The device speaks the result out loud — 'Risk Level is RED' — so even
a partially literate worker can act on it immediately."

[1:15 — Architecture]
"Every record is saved locally first. When connectivity returns —
even 2G is enough — it auto-syncs to AWS DynamoDB via API Gateway
and Lambda. No data is ever lost.

The doctor at the primary health centre opens the web dashboard —
they see all patients, colour-coded by risk, in real time. They can
add clinical advice directly, mark patients as reviewed, and track
outcome patterns over time."

[1:50 — Impact]
"India has 1 million ASHA workers. If each worker triages just 5
patients per day using Nirnay, that's 5 million faster, more accurate
triage decisions every single day.

And because it's serverless — AWS Lambda and DynamoDB — the entire
system costs less than ₹500 per month for 100,000 patients. That is
the cost of one cup of tea per thousand lives."

[2:20 — Technical depth]
"We built this with production-grade thinking:
- Offline-first architecture using AsyncStorage queuing
- Automatic sync on network restoration via NetInfo
- Idempotent DynamoDB writes — no duplicate records
- CORS-enabled API with structured error responses
- Doctor review loop with audit trail
- Zero dependency on cloud for core triage decision"

[2:45 — Close]
"Nirnay means 'decision' in Sanskrit. Our mission is simple: put the
power of clinical decision-making into the hands of every health
worker in India — online or offline, mountain or village, with a
smartphone worth ₹5,000.

We are not just demonstrating technology. We are demonstrating that
the right architecture can save lives at scale."
```

---

## 🏗️ ARCHITECTURE EXPLANATION (Simple Language)

```
┌─────────────────────────────────────────────────────────┐
│                    HEALTH WORKER (Mobile)                │
│                                                         │
│  [PatientForm] → [Risk Calculator] → [AsyncStorage]     │
│       ↓                ↓                   ↓            │
│  Enter Vitals    Local Decision        Save Offline      │
│  (BP, Temp)      (0 internet)          (never lost)     │
│                                             ↓            │
│                                    [SyncService]         │
│                                    When online →         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS POST (JSON)
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    AWS CLOUD                            │
│                                                         │
│  [API Gateway HTTP API]                                 │
│       ↓ Routes                                          │
│  [Lambda Function (Node.js 20)]                         │
│       ├── GET  /patients  → Read all records            │
│       ├── POST /patients  → Save + timestamp + status   │
│       └── PUT  /patients/{id} → Doctor review           │
│             ↓                                           │
│       [DynamoDB — nirnay-patients table]                │
│       (Pay-per-request, auto-scaling, 99.999% uptime)  │
│             ↓                                           │
│       [SNS — Optional SMS alerts for RED cases]         │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket / REST poll
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    DOCTOR DASHBOARD (Web)               │
│                                                         │
│  Real-time patient list (auto-refresh every 10s)        │
│  Colour-coded by risk: RED | YELLOW | GREEN             │
│  Click patient → Modal → Add advice → Mark Reviewed     │
│  Summary cards with animated counters                   │
│  Risk distribution chart                                │
│  New critical case toast notifications                  │
└─────────────────────────────────────────────────────────┘
```

**In plain English:**
1. Mobile app works fully without internet (like a pocket doctor)
2. When internet arrives, it uploads everything automatically
3. AWS stores data safely and serves it to the doctor's web browser
4. Doctor reviews cases and writes advice from anywhere

---

## 📈 SCALABILITY EXPLANATION

| Metric | Current | With Nirnay at Scale |
|--------|---------|---------------------|
| Users | Demo | 1M ASHA workers |
| Daily patients | Test | 5M decisions/day |
| DB writes | Manual | Auto-scaling DynamoDB |
| API throughput | Low | API Gateway: 1M req/s |
| Downtime | N/A | Lambda: 99.95% SLA |
| Data loss | Risk | Zero (offline queue) |

**Why it scales effortlessly:**
- **Lambda** auto-scales from 0 → 10,000 concurrent executions in milliseconds
- **DynamoDB** handles millions of reads/writes with single-digit millisecond latency
- **No servers to manage** — no capacity planning, no patching
- **Stateless architecture** — every Lambda invocation is independent
- **CDN-ready** — the web dashboard can be served via CloudFront globally

---

## 💰 COST EXPLANATION (Serverless Pay-Per-Use)

```
Scenario: 10,000 patients/month

AWS Lambda:
  • 10,000 POST requests + 30,000 GET requests = 40,000 invocations
  • Each runs ~100ms, 128MB memory
  • Cost: FREE (within 1M free tier requests/month)

DynamoDB:
  • 10,000 writes × $1.25/million = $0.0125
  • 30,000 reads  × $0.25/million = $0.0075
  • Cost: ~$0.02/month

API Gateway HTTP API:
  • 40,000 requests × $1.00/million = $0.04
  • Cost: ~$0.04/month

Total for 10,000 patients: ~$0.07/month (₹6/month)
Total for 1,000,000 patients: ~$7/month (₹580/month)
```

**The serverless advantage:**
- You pay ZERO when there are zero patients (nights, weekends)
- You pay proportionally as usage grows
- No upfront infrastructure investment
- No idle server costs

---

## 🌾 WHY OFFLINE-FIRST MATTERS IN RURAL INDIA

**The connectivity reality:**
- 65% of India's landmass has poor/no mobile data coverage
- Rural health workers often operate in hilly terrain, tribal areas, flood zones
- 2G connectivity with frequent drops is the norm, not the exception
- Power outages affect mobile tower uptime

**Traditional app failure modes:**
- "Cannot submit — no internet connection"
- Worker notes vitals on paper, delays diagnosis
- Paper records get lost, damaged, or never transferred
- Critical patients sent home without correct triage

**Nirnay's offline-first design:**
- Works completely without internet (SQLite-level reliability via AsyncStorage)
- Triage decision is LOCAL — computed on-device using deterministic algorithm
- Voice feedback works offline
- Data queues safely until connectivity returns
- Auto-sync is transparent to the worker — they never manually "send data"

**Real-world impact:**
```
Before Nirnay:
  Worker sees patient → guesses risk → might refer, might not
  
After Nirnay:
  Worker enters BP + Temp → Instant "RED" on screen → Voice alert
  → Worker calls ambulance immediately → Patient survives
  → Later (when 2G returns) → Record synced → Doctor reviews
  → Follow-up ensured
```

---

## 🎯 JUDGES Q&A PREPARATION

**Q: What if the algorithm is wrong?**
A: "Nirnay is a decision SUPPORT tool, not a replacement for doctors.
It uses conservative thresholds from WHO and ICMR guidelines — BP >160
as critical, Temp >102°F as critical. In ambiguous cases, it errs on
caution (YELLOW). A false positive (over-triaging) is always safer than
a false negative in emergency medicine. The doctor reviews every case."

**Q: What about data privacy and HIPAA/patient consent?**
A: "Patient data is minimal — name, age, vitals, risk level. No
personally identifiable diagnostic history. We can add AES-256
encryption at rest in DynamoDB with a KMS key in a production version.
API Gateway can be secured with Cognito JWT auth. The architecture
supports full HIPAA compliance as a next step."

**Q: Why not just use an existing EHR system?**
A: "Existing EHR systems require trained staff, powered workstations,
and reliable internet. ASHA workers use ₹5,000 Android phones in
the field. Nirnay takes 20 seconds to use, works offline, and requires
zero training beyond knowing how to measure BP and temperature."

**Q: How do you handle duplicate writes when offline queue syncs?**
A: "We use a deterministic UUID generated at time-of-capture as the
DynamoDB partition key. DynamoDB PutItem is idempotent when the key
exists — a duplicate sync attempt simply overwrites with identical
data. No duplicate patient records are created."

**Q: Can this scale to multiple states/languages?**
A: "Yes. The Lambda and DynamoDB architecture is region-agnostic.
We can deploy in ap-south-1 (Mumbai) and add ap-southeast-1 for
other regions. Multi-language support is a UI change — we'd use
i18n for Hindi, Tamil, Telugu, Bengali. The core algorithm is
language-independent."

**Q: What's your go-to-market strategy?**
A: "Partner with state NHM (National Health Mission) programs.
ASHA workers are already trained and deployed — we integrate into
their existing workflow. Pilot in 1 district → validate outcomes →
state rollout. The technology cost is near-zero; the change 
management is the real challenge and opportunity."

**Q: What's next for Nirnay?**
A: "Phase 2: Additional vitals (SpO2, glucose, weight). ML model
trained on Indian patient data to improve accuracy beyond rule-based
thresholds. Telemedicine integration — doctor can video-call the
worker directly from the dashboard. SMS alerts via SNS for RED cases
even when the dashboard is closed."

---

## 📊 DEMO FLOW (for judges)

1. **Open Mobile Tab** → Show PatientForm → Enter: Name: "Ravi Kumar", Age: 58, BP: 175, Temp: 103
2. **Submit** → See animated RED risk result, hear voice: "Risk Level is RED — Immediate medical attention required"
3. **See** "Saved Offline" toast, then "Synced to Cloud" when internet present
4. **Switch to Dashboard Tab** → Show patient appears in RED section
5. **Click patient row** → Open PatientModal → Enter doctor advice → Click "Mark as Reviewed"
6. **Show** toast notification "Marked as Reviewed ✓"
7. **Point to** summary cards with animated counters, risk chart, auto-refresh toggle
8. **Zoom out** → "All of this runs on AWS Lambda and costs ₹6 per month for 10,000 patients."

---

*Built with ❤️ for 850 million rural Indians — Nirnay Hackathon 2025*
