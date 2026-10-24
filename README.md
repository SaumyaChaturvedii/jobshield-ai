# JobShield AI

JobShield AI screens job offers, recruiter messages, and public job listings for common recruitment-scam signals. It combines a static GitHub Pages frontend with a FastAPI backend that extracts document text and sends scans to Google Gemini for analysis.

## Live app

- **Website:** [saumyachaturvedii.github.io/jobshield-ai](https://saumyachaturvedii.github.io/jobshield-ai/)
- **API health:** [jobshield-ai-ysp4.onrender.com/health](https://jobshield-ai-ysp4.onrender.com/health)
- **API documentation:** [jobshield-ai-ysp4.onrender.com/docs](https://jobshield-ai-ysp4.onrender.com/docs)

## Current features

- **Four scan modes:** upload a PDF/image, scan a public job-listing URL, paste a recruiter email/message, or upload an offer letter.
- **Result-based appearance:** after a scan, the page accent and surfaces shift to green for LOW risk, amber for MEDIUM risk, red for HIGH risk, or a calm neutral palette when the material is not applicable. The manual light/dark control remains available.
- **Job-scope check:** unrelated documents, such as academic reports or marksheets, can return `NOT_APPLICABLE` with score `0`. That means no job-risk score applies; it does **not** mean a job offer was verified as safe.
- **Readable results:** findings and a tailored recommendation appear with the score. Four findings use a balanced two-column layout on larger screens and one column on small screens.
- **Recent scans:** completed results are available from the Recent scans section during the current browser session.

## Use the scanner

1. Open the live website and choose a scan mode.
2. Upload a relevant document or enter a public URL or recruiter message.
3. Select the scan button and review the risk level, findings, and recommendation.
4. Verify any offer through the employer's official website and independently confirmed contact details.

For a safe high-risk smoke test, use fictional content that mentions an upfront fee, a request for identity or bank details, a rushed deadline, or hiring without an interview. For example: “Northstar Vertex Labs offers Taylor Example a remote analyst role. Pay a refundable onboarding fee today and send your ID and bank details by chat to activate the offer.” This is synthetic test text; the exact score and wording can vary between AI scans.

## What the score means

For job-related material, the API returns a risk level and a score from 0 to 100, along with evidence-based findings and a recommended next step. The page uses the returned risk level to set its result theme.

If the material is not about a job or recruitment opportunity, the API returns `is_job_related: false`, `risk_level: "NOT_APPLICABLE"`, and `risk_score: 0`. The interface labels this result “Not a job-related document” and explains that zero is not a safety rating.

AI output is a screening aid, not a definitive fraud determination. It can miss signals or make mistakes; do not rely on a score alone to make decisions.

## Supported inputs and limits

- **Files:** PDF, PNG, and JPEG; maximum 10 MB.
- **PDFs:** up to 100 pages. Text extraction is capped at 20,000 characters per scan.
- **Images:** OCR uses Tesseract and requires the Tesseract executable on the API server.
- **Recruiter messages:** up to 20,000 characters.
- **Job links:** public HTTP or HTTPS pages only. A page behind a login may not be available.

## Run locally

Requirements: Python 3.11 or later. Install Tesseract OCR if you want to scan image files.

1. From the repository root, install the backend dependencies:

   ```powershell
   python -m pip install -r Backend/requirements.txt
   ```

2. Copy `.env.example` to `.env` and set your Gemini key:

   ```text
   GEMINI_API_KEY=your-key
   ```

   Keep `.env` private and out of Git. You can optionally set `GEMINI_MODEL`, `CORS_ORIGINS`, or `TESSERACT_CMD`.

3. Start the app with `Start Backend.bat`, or run this from the repository root:

   ```powershell
   python -m uvicorn Backend.main:app --reload --host 127.0.0.1 --port 8000
   ```

4. Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The API health endpoint is `/health`; interactive API documentation is at `/docs`.

When serving the frontend separately with Live Server on port 5500, the app uses `http://127.0.0.1:8000` for its local API. If Tesseract is installed outside the standard Windows path, set `TESSERACT_CMD` to its executable path.

## Deployment

### Frontend: GitHub Pages

The site is published from the repository root at [https://saumyachaturvedii.github.io/jobshield-ai/](https://saumyachaturvedii.github.io/jobshield-ai/). Relative asset paths support the `/jobshield-ai/` project URL.

The production API origin is configured in `config.js`:

```js
window.JOBSHIELD_API_BASE_URL = 'https://jobshield-ai-ysp4.onrender.com';
```

Use the API origin only; do not append `/health`, `/scan`, or another path. The frontend never needs the Gemini key.

### Backend: Render

The repository includes a Render Blueprint in `render.yaml` and a root `Dockerfile`.

1. In Render, create a Blueprint from this repository's `main` branch.
2. Set `GEMINI_API_KEY` as a private environment variable when prompted. Do not put it in `config.js` or commit it to GitHub.
3. The service uses `/health` for its health check and installs Tesseract for image OCR.
4. If the API hostname changes, update `config.js` with the new HTTPS origin and commit the change so GitHub Pages can redeploy.

The backend allows the published GitHub Pages origin and local development origins. For a different frontend host, set `CORS_ORIGINS` on the API to a comma-separated list of exact origins.

The `/health` response reports whether the API process is available, a Gemini key is configured, and Tesseract is installed. It does not verify that Gemini will accept the key; a successful scan is needed to confirm that.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API, Gemini-key configuration, and OCR status |
| `POST` | `/scan` | Analyze an uploaded PDF, PNG, or JPEG file |
| `POST` | `/analyze` | Analyze pasted recruiter-message text |
| `POST` | `/scan-link` | Review a public job-listing URL |

## Security and privacy

### How scan data is handled

Files and pasted messages are sent to the JobShield API and Google Gemini for analysis. This repository has no database-backed storage for scan contents, but the API and AI provider do receive the submitted material. Their handling and retention are governed by their respective policies. Do not submit passwords, one-time passcodes, government ID numbers, or real bank/payment details; use fictional content for testing.

### Protections in the app

- The Gemini API key stays in the backend environment and is never included in frontend code.
- CORS allows the published frontend and local development origins without credentialed requests.
- The API limits upload sizes, PDF pages, image dimensions, and text length, and applies timeouts to OCR and AI calls.
- The API rejects local/private job-link targets.
- The frontend uses a Content Security Policy and a strict referrer policy. The API adds security response headers, disables caching for scan responses, and sets anti-framing and permissions policies.
- Scan results are risk signals only; verify offers independently through the employer's official channels.

### Deployment limits

The scanner API is public and does not currently require user authentication or enforce an application-level rate limit. CORS helps control browser access but is not authentication and does not block direct API clients. For broader production use, configure Gemini usage limits and add managed rate limiting or abuse controls at the hosting or API-gateway layer. No website can promise protection from every threat.
