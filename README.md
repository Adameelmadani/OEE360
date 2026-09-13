# OEE360 - OEE Analytics Dashboard

**Project by:** Adam El Madani & Mohammed Amine Hssaine  
**Supervised by:** Tawfik Masrour

OEE360 is a Next.js dashboard for Overall Equipment Effectiveness analysis. The current codebase is React-first and uses local Next.js API routes for dataset, model, and analytics operations.

## What It Does

- Visualizes OEE, availability, performance, and quality trends over time
- Simulates live production data for interactive monitoring
- Lets you upload CSV and JSON datasets
- Includes built-in seasonal, smoothing, and momentum forecasting models
- Profiles uploaded time series and reports chronological holdout metrics (MAE, RMSE, sMAPE)
- Runs basic analytics through the `/api/analytics` route
- Provides an `/analyze` page for dataset/model selection and analysis results

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts
- Papa Parse for CSV parsing

## Project Layout

```text
app/
  page.tsx                # Main OEE dashboard
  analyze/page.tsx        # Dataset/model analysis page
  api/                    # Next.js API routes
components/               # Shared React components
lib/                      # API client and utilities
data/datasets/            # Uploaded datasets
data/models/              # Uploaded models
public/                   # Static assets
styles/                   # Global styles
```

## Getting Started

### Requirements

- Node.js 18+
- pnpm

### Install

```bash
pnpm install
```

### Run locally

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
pnpm build
pnpm start
pnpm lint
```

## Data Storage

Uploaded datasets and models are stored under `data/datasets` and `data/models`. The API routes create these folders automatically if they are missing.

If the folders are empty, the backend seeds simulated OEE datasets and built-in forecasting model definitions automatically so the dashboard and analysis page have data on first run.

The main dashboard also loads simulated OEE time-series data from the backend via `/api/simulation/oee`, with a local fallback only if the backend request fails.

## Notes

- The old Flask and Streamlit-era files have been removed.
- Python is no longer required for the current app flow.
```
