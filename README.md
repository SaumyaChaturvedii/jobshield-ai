# JobShield AI

JobShield AI screens job documents, recruiter messages, and public job-listing links for common scam signals. The browser sends scans to a FastAPI service; Gemini analysis and document extraction run on that server.

## Run locally

1. Install Python 3.11 or later. Install the Tesseract OCR application if you want to scan images. On Windows, the backend detects the standard Tesseract installation path; set `TESSERACT_CMD` if it is installed elsewhere.
2. Install the Python dependencies from the project root:

   ```powershell
   python -m pip install -r Backend/requirements.txt
   ```

3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` in `.env`. Never commit or share that file.
4. Start the API and website with `Start Backend.bat`, or run:

   ```powershell
   python -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000
   ```

5. Open `http://127.0.0.1:8000`. The health endpoint is `/health` and API documentation is at `/docs`. If using Live Server on port 5500, the frontend automatically sends API requests to `http://127.0.0.1:8000`.

The API accepts PDF, PNG, and JPEG files up to 10 MB. PDFs are limited to 100 pages and extracted text is capped at 20,000 characters per scan. Image scans use Tesseract. Text and public-link scans use the `/analyze` and `/scan-link` endpoints.

## Deploy the API on Render

GitHub Pages serves only static files and cannot run FastAPI. This repository includes a `render.yaml` Blueprint for the separate API service.

1. In Render, choose **New > Blueprint** and select this repository on the `main` branch.
2. Review the `jobshield-ai-api` web service. It builds from the root `Dockerfile`, uses `/health` as its health check, and selects Render's free plan.
3. Enter the real `GEMINI_API_KEY` in Render's private prompt. The Blueprint uses `sync: false`; the key is never stored in GitHub.
4. Wait for the initial deployment. Open the service's `/health` URL. It reports whether the API process is up, whether a Gemini key is configured, and whether Tesseract OCR is available. This does not verify that Gemini accepts the key; a successful scan does.
5. Copy the service's public HTTPS origin (for example, `https://your-service.onrender.com`, with no path) into `config.js` and commit that value to `main`. GitHub Pages then redeploys with the actual API address.

Until a real API origin is set in `config.js`, the website shows that backend configuration is required and does not send scans to GitHub Pages. Keep the Gemini key in Render only.

The Dockerfile installs Tesseract and the Python requirements, then starts Uvicorn on `0.0.0.0` using Render's `PORT`. If deploying with Render's native Python runtime instead, use:

- Build command: `pip install -r Backend/requirements.txt`
- Start command: `uvicorn Backend.main:app --host 0.0.0.0 --port $PORT`

The native runtime needs Tesseract installed separately for image OCR.

## Connect GitHub Pages

The published Pages origin is allowed by the backend's restrictive CORS configuration, as are `http://127.0.0.1:5500` and `http://localhost:5500`. The backend base URL has one configuration location: `config.js`. Do not put the Gemini key in any frontend file.

The Pages site can be published from the repository root. Its asset, stylesheet, and script references are relative so they work under the `/jobshield-ai/` project path.

The analysis is a screening aid, not a definitive fraud determination. Verify offers through the employer's official channels.
