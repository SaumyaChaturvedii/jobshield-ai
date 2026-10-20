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

The API accepts PDF, PNG, and JPEG files up to 10 MB. PDFs are limited to 100 pages and extracted text is capped at 20,000 characters per scan. Image scans use Tesseract. Text and public-link scans use the existing `/analyze` and `/scan-link` endpoints.

## Deploy the API on Render

GitHub Pages serves only static files and cannot run FastAPI. Create a separate Render **Web Service** from this repository with these settings:

- Runtime: **Docker**
- Root directory: repository root (leave the field blank)
- Dockerfile path: `Backend/Dockerfile`
- Environment variable: `GEMINI_API_KEY` with the value entered privately in Render

The Docker image installs Tesseract and the Python requirements. Its start command binds Uvicorn to `0.0.0.0` and Render's `PORT`. After deployment, verify that the service's `/health` endpoint returns `{"status":"ok"}`. This confirms the process is available; it does not test Gemini credentials or perform a scan.

If deploying with Render's native Python runtime instead of Docker, use:

- Build command: `pip install -r Backend/requirements.txt`
- Start command: `uvicorn Backend.main:app --host 0.0.0.0 --port $PORT`

The native runtime needs Tesseract installed separately for image OCR.

## Connect GitHub Pages

The published Pages origin is already allowed by the backend's restrictive CORS configuration, as are `http://127.0.0.1:5500` and `http://localhost:5500`. The frontend base URL is configured only in `config.js`. After Render creates the service, set `window.JOBSHIELD_API_BASE_URL` in that file to the actual HTTPS origin shown in Render, without a path. Leave it blank until then; the frontend will show a setup message instead of sending scans to GitHub Pages. Do not put the Gemini key in any frontend file.

The Pages site can be published from the repository root. Its asset, stylesheet, and script references are relative so they work under the `/jobshield-ai/` project path.

The analysis is a screening aid, not a definitive fraud determination. Verify offers through an employer's official channels before sharing money or sensitive information.

