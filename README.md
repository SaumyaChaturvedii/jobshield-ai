# JobShield AI

JobShield AI screens job documents, recruiter messages, and public job-listing links for common scam signals. The FastAPI server also serves the website, so the browser and API use the same origin when deployed.

## Run locally

1. Install Python 3.11 or later. Image scans also require the Tesseract OCR application. On Windows, the server detects the default `C:\Program Files\Tesseract-OCR\tesseract.exe` location; set `TESSERACT_CMD` if it is installed elsewhere.
2. Install the Python packages from the project folder:

   ```powershell
   python -m pip install -r Backend/requirements.txt
   ```

3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` with a key from Google AI Studio. Keep `.env` private; it is excluded from Git.
4. Start the combined website and API with `Start Backend.bat`, or run:

   ```powershell
   python -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000
   ```

5. Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The health endpoint is [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health); API documentation is at `/docs`.

The API accepts PDF, PNG, and JPEG uploads up to 10 MB. It limits PDFs to 100 pages and caps extracted text at 20,000 characters per scan. Email text is also capped at 20,000 characters. The `/scan-link` endpoint asks Gemini to review the supplied publicly accessible page with URL context; pages that require a login may not be readable.

## Hosting

Deploy the FastAPI application on a Python host that supports environment variables and can install Tesseract for image OCR. Use `Backend.main:app` as the ASGI application and bind Uvicorn to the host-provided port. Configure `GEMINI_API_KEY` in the host settings and set `TESSERACT_CMD` if the executable is outside `PATH`. The FastAPI app serves the HTML, CSS, JavaScript, and logo from the same origin as the API. If you host the frontend separately, set `JOBSHIELD_API_BASE_URL` in `config.js` to the API origin and configure that frontend origin in the backend's comma-separated `CORS_ORIGINS` setting.

The analysis is a screening aid, not a definitive fraud determination. Users should verify offers through the employer's official channels before sharing money or sensitive information.
