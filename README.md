# RUB → PKR Remittance Optimizer

> **An AI-powered financial agent that helps Pakistani students in Russia send money home safely, transparently, and cheaply.**

![Status](https://img.shields.io/badge/status-working-brightgreen)
![Python](https://img.shields.io/badge/python-3.14-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)

---

## 🎯 The Problem

I am a Pakistani student in Moscow. Every month, I need to send money home. And every month, I face the same problem:

- **Sanctions have blocked SWIFT** between Russia and Pakistan. Banks refuse, freeze amounts, or charge arbitrary fees.
- **Hidden costs everywhere.** The exchange rate is opaque. Fees are split between sending and receiving sides. A transfer can sit for days.
- **No comparison tool exists.** Students rely on word-of-mouth, informal networks, and crypto workarounds.
- **Rate volatility.** The RUB/PKR rate has moved from 3.18 to 3.63 over the last 90 days — a 14% swing. Sending at the wrong moment costs real money.

**We built the tool we needed ourselves.**

---

## 💡 The Solution

An intelligent agent that aggregates quotes from multiple remittance providers and crypto routes, compares total cost transparently, and securely executes transfers — all with a compliance-first architecture.

### Core Features

| Feature | Description |
|---------|-------------|
| **Multi-Provider Comparison** | Real-time quotes from Novacrust, Paysend, Bank Transfer, and USDT→PKR crypto routes, ranked by total PKR received |
| **AI Rate Alerts** | Set target rates; the system monitors and triggers when conditions are met |
| **24-Hour Rate Lock-In** | Lock in a favorable rate and execute at that rate — even if the market moves |
| **Recipient Management** | Save verified recipients with 4-layer sanctions screening |
| **Verified Bank Dropdown** | 14 pre-validated Pakistani banks with live account format validation |
| **Consent Gate** | Multi-layer confirmation before any money moves — client-side and server-side |
| **Full Audit Trail** | Every screening decision, rate lock, and transfer logged with timestamps |

---

## 🔐 Security & Compliance

Security is not an afterthought — it's built into every layer.

### Recipient Screening (4 Layers)

1. **Sanctions Blacklist** — Check against restricted entities
2. **Country Corridor Validation** — Only PK, RU, AE, TR supported
3. **Suspicious-Name Detection** — Regex/heuristic flags for gibberish input
4. **Bank Whitelist** — Only 14 verified banks accepted

Every screening returns a `risk_level` (LOW/MEDIUM/HIGH) and a human-readable reason.

### Consent Gate

Transfers require **explicit user confirmation**. The backend rejects any request where `user_confirmed != True` with a `403 Forbidden`. This is enforced server-side — even if the frontend is compromised, no transfer happens without consent.

### Account Format Validation

Each bank has a strict regex pattern. `PK36HABB0000001123456702` is valid for HBL. `12345` is rejected with a specific error message telling the user exactly what format is expected.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.14, FastAPI, Pydantic, Uvicorn |
| **Frontend** | React 18, Vite, Axios |
| **Styling** | Custom CSS (no frameworks) |
| **Data** | In-memory + JSON persistence |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone the repository

```bash
git clone https://github.com/shehryar2git/fin.git
cd fin
