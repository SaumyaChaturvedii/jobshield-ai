/**
 * JobShield AI — scanner, navigation, and theme controls.
 */

document.addEventListener('DOMContentLoaded', () => {
  const scanTabs = [...document.querySelectorAll('.scan-tab')];
  const viewFile = document.querySelector('#view-file');
  const viewLink = document.querySelector('#view-link');
  const viewEmail = document.querySelector('#view-email');
  const uploadBox = document.querySelector('.upload-box');
  const fileInput = document.querySelector('#job-file');
  const scannerCard = document.querySelector('.scanner-card');
  const mainContent = document.querySelector('.main-content');
  const scanLoader = document.querySelector('#scan-loader');
  const scanStatus = document.querySelector('#scan-status');
  const scanProgress = document.querySelector('#scan-progress');
  const scanFeedback = document.querySelector('#scan-feedback');
  const uploadTitle = document.querySelector('#upload-title');
  const uploadCopy = document.querySelector('#upload-copy');
  const uploadFormats = document.querySelector('#upload-formats');
  const summaryFilename = document.querySelector('#summary-filename');
  const summaryEmpty = document.querySelector('#summary-empty');
  const analysisDisclaimer = document.querySelector('#analysis-disclaimer');
  const resultHero = document.querySelector('#result-hero');
  const riskGauge = document.querySelector('#risk-gauge');
  const riskScoreValue = document.querySelector('#risk-score');
  const resultTitle = document.querySelector('#result-title');
  const findingsHeading = document.querySelector('#findings-heading');
  const summaryGrid = document.querySelector('#summary-grid');
  const riskBadge = document.querySelector('#risk-badge');
  const recommendation = document.querySelector('#ai-recommendation');
  const recommendationPanel = document.querySelector('#recommendation-panel');
  const recentList = document.querySelector('#recent-list');
  const recentEmpty = document.querySelector('#recent-empty');
  const recentCount = document.querySelector('#recent-count');
  const btnScanLink = document.querySelector('#btn-scan-link');
  const btnScanEmail = document.querySelector('#btn-scan-email');
  const servicePill = document.querySelector('.status-pill');
  const serviceText = document.querySelector('.status-text');
  const maxFileSize = 10 * 1024 * 1024;
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const configuredApiOrigin = String(window.JOBSHIELD_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const missingApiMessage = 'Scanning is not configured for this site. Set JOBSHIELD_API_BASE_URL in config.js to the deployed FastAPI origin, then retry.';
  let apiConfigurationError = '';
  let validatedConfiguredApiOrigin = '';
  if (configuredApiOrigin) {
    try {
      const configuredUrl = new URL(configuredApiOrigin);
      const isPlaceholder = /(?:your|placeholder|replace|example\.com|render-url)/i.test(configuredUrl.hostname);
      const isValidOrigin = ['https:', 'http:'].includes(configuredUrl.protocol)
        && !configuredUrl.username
        && !configuredUrl.password
        && configuredUrl.pathname === '/'
        && !configuredUrl.search
        && !configuredUrl.hash
        && (isLocalHost || configuredUrl.protocol === 'https:')
        && configuredUrl.hostname !== 'saumyachaturvedii.github.io'
        && !isPlaceholder;
      if (isValidOrigin) {
        validatedConfiguredApiOrigin = configuredUrl.origin;
      } else {
        apiConfigurationError = 'The backend URL in config.js must be a real HTTPS API origin, not a placeholder or a GitHub Pages URL.';
      }
    } catch (error) {
      apiConfigurationError = 'The backend URL in config.js is invalid. Enter the HTTPS origin of the deployed FastAPI service.';
    }
  }
  const localApiOrigin = isLocalHost
    ? (window.location.port === '8000' ? window.location.origin : 'http://127.0.0.1:8000')
    : '';
  const apiOrigin = validatedConfiguredApiOrigin || (!configuredApiOrigin ? localApiOrigin : '');
  const apiUrl = (path) => {
    if (!apiOrigin) {
      throw new Error(apiConfigurationError || missingApiMessage);
    }
    return `${apiOrigin}${path}`;
  };
  let scanInProgress = false;

  function setServiceStatus(message, stateClass = '', details = '') {
    if (!servicePill || !serviceText) return;
    serviceText.textContent = message;
    servicePill.title = details;
    servicePill.classList.remove('is-offline', 'is-warning');
    if (stateClass) servicePill.classList.add(stateClass);
  }

  async function refreshServiceStatus() {
    if (!servicePill || !serviceText) return;
    if (!apiOrigin) {
      setServiceStatus(apiConfigurationError ? 'Backend URL invalid' : 'Backend URL required', 'is-warning');
      return;
    }
    try {
      const response = await fetch(apiUrl('/health'), { cache: 'no-store' });
      if (!response.ok) {
        setServiceStatus(`Backend unavailable (${response.status})`, 'is-offline');
        return;
      }
      let health;
      try {
        health = await response.json();
      } catch (error) {
        setServiceStatus(`Invalid backend response (${response.status})`, 'is-warning');
        return;
      }
      if (health?.status !== 'ok'
        || typeof health.gemini_configured !== 'boolean'
        || typeof health.ocr_available !== 'boolean') {
        setServiceStatus(`Invalid backend response (${response.status})`, 'is-warning');
      } else if (!health.gemini_configured && !health.ocr_available) {
        setServiceStatus(
          'Backend online · Gemini/OCR missing',
          'is-warning',
          'The backend responds, but no Gemini API key is configured and the Tesseract OCR executable is unavailable.',
        );
      } else if (!health.gemini_configured) {
        setServiceStatus(
          'Backend online · Gemini missing',
          'is-warning',
          'The backend responds, but no Gemini API key is configured. A configured key does not confirm Gemini API access; only a successful scan can verify that.',
        );
      } else if (!health.ocr_available) {
        setServiceStatus(
          'Backend online · OCR unavailable',
          'is-warning',
          'The backend responds and a Gemini API key is configured, but the Tesseract OCR executable is unavailable. Gemini API access is verified only by a successful scan.',
        );
      } else {
        setServiceStatus(
          'Backend online · Gemini configured · OCR ready',
          '',
          'The backend responds, a Gemini API key is configured, and Tesseract is available. This health check does not test Gemini API access; a successful scan does.',
        );
      }
    } catch (error) {
      setServiceStatus('Backend unavailable', 'is-offline', 'The health endpoint could not be reached. Check the backend URL, service state, network, and CORS settings.');
    }
  }

  refreshServiceStatus();

  function showFeedback(message) {
    if (!scanFeedback) return;
    scanFeedback.textContent = message;
    scanFeedback.hidden = false;
  }

  function clearFeedback() {
    if (!scanFeedback) return;
    scanFeedback.textContent = '';
    scanFeedback.hidden = true;
  }

  function clearCurrentResult() {
    if (mainContent) mainContent.classList.remove('has-results');
    delete document.documentElement.dataset.resultTheme;
    if (summaryFilename) summaryFilename.textContent = 'No scan yet';
    if (resultHero) resultHero.hidden = true;
    if (findingsHeading) findingsHeading.hidden = true;
    if (summaryGrid) {
      summaryGrid.replaceChildren();
      summaryGrid.classList.remove('has-three');
      summaryGrid.classList.remove('has-four');
      summaryGrid.hidden = true;
    }
    if (recommendationPanel) recommendationPanel.hidden = true;
    if (summaryEmpty) summaryEmpty.hidden = false;
  }

  function setBusy(isBusy) {
    scanInProgress = isBusy;
    if (scannerCard) {
      scannerCard.setAttribute('aria-busy', String(isBusy));
      scannerCard.classList.toggle('is-scanning', isBusy);
    }
    if (scanLoader) scanLoader.hidden = !isBusy;

    [
      ...scanTabs,
      fileInput,
      document.querySelector('#link-input'),
      document.querySelector('#email-input'),
      btnScanLink,
      btnScanEmail,
    ].filter(Boolean).forEach((control) => {
      control.disabled = isBusy;
    });

    if (uploadBox) uploadBox.setAttribute('aria-disabled', String(isBusy));
  }

  function resetProgress() {
    if (scanProgress) {
      scanProgress.removeAttribute('value');
      scanProgress.setAttribute('aria-label', 'File upload progress');
    }
  }

  function detailFromBody(body) {
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      const firstMessage = body.detail.find((item) => typeof item?.msg === 'string')?.msg;
      if (firstMessage) return firstMessage;
    }
    return '';
  }

  function httpErrorMessage(status, detail = '') {
    if (detail) return detail;
    if (status === 405) {
      return 'This host does not support scans. GitHub Pages only serves static files; set the deployed FastAPI URL in config.js.';
    }
    if ([502, 503, 504].includes(status)) {
      return `The backend or its AI service is temporarily unavailable (HTTP ${status}). Please retry shortly.`;
    }
    return `The backend returned HTTP ${status}. Please check the service and retry.`;
  }

  function errorFromResponse(xhr) {
    try {
      const body = JSON.parse(xhr.responseText);
      return httpErrorMessage(xhr.status, detailFromBody(body));
    } catch (error) {
      return httpErrorMessage(xhr.status);
    }
  }

  const networkErrorMessage = 'No response reached the browser. Check the backend URL, network, and CORS allowlist, then retry.';

  function riskTone(level) {
    const normalized = String(level || '').toUpperCase();
    if (normalized === 'LOW') return 'safe';
    if (normalized === 'MEDIUM') return 'warning';
    if (normalized === 'HIGH') return 'danger';
    return 'neutral';
  }

  function applyResultTheme(tone) {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.dataset.resultTheme = tone;
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 350);
  }

  function renderSummary(data, file) {
    const analysis = data.analysis;
    const filename = data.filename || file?.name || 'Scan result';
    const reportedLevel = String(analysis.risk_level || 'UNKNOWN').toUpperCase();
    const isJobRelated = analysis.is_job_related !== false && reportedLevel !== 'NOT_APPLICABLE';
    const score = isJobRelated ? Number(analysis.risk_score) : 0;
    const level = isJobRelated ? reportedLevel : 'NOT_APPLICABLE';
    const tone = riskTone(level);
    applyResultTheme(tone);
    const reasons = Array.isArray(analysis.reasons) ? analysis.reasons : [];

    if (!Number.isFinite(score) || !analysis.recommendation) {
      throw new Error('The scan finished, but its analysis response was incomplete. Please try again.');
    }

    if (summaryFilename) summaryFilename.textContent = filename;
    if (mainContent) mainContent.classList.add('has-results');
    const boundedScore = Math.max(0, Math.min(100, score));
    const scoreText = Number.isInteger(score) ? String(score) : score.toFixed(1);
    if (resultHero) {
      resultHero.className = `result-hero ${tone}`;
      resultHero.hidden = false;
      const description = resultHero.querySelector('.result-description');
      if (description) {
        description.textContent = isJobRelated
          ? 'Reviewed for common recruitment scam signals.'
          : 'No job-scam score applies here. 0 means not applicable, not safe.';
      }
    }
    if (riskGauge) {
      riskGauge.style.setProperty('--risk-angle', `${boundedScore * 3.6}deg`);
      riskGauge.setAttribute(
        'aria-label',
        isJobRelated
          ? `Risk score ${scoreText} out of 100. ${level} risk.`
          : 'Job risk score not applicable. This material is not about a job or recruitment opportunity.',
      );
      const gaugeLabel = riskGauge.querySelector('.gauge-label');
      if (gaugeLabel) gaugeLabel.textContent = isJobRelated ? 'JOB RISK SCORE' : 'NOT APPLICABLE';
    }
    if (riskScoreValue) riskScoreValue.textContent = scoreText;
    if (resultTitle) {
      const titles = {
        LOW: 'Low risk indicators found',
        MEDIUM: 'Proceed with care',
        HIGH: 'High risk indicators found',
        NOT_APPLICABLE: 'Not a job-related document',
      };
      resultTitle.textContent = titles[level] || 'Review this result';
    }
    if (riskBadge) {
      riskBadge.className = `score-badge ${tone}`;
      riskBadge.replaceChildren();
      const dot = document.createElement('span');
      dot.className = 'score-dot';
      dot.setAttribute('aria-hidden', 'true');
      const badgeText = level === 'NOT_APPLICABLE'
        ? 'NOT APPLICABLE'
        : level === 'UNKNOWN' ? 'RISK LEVEL UNKNOWN' : `${level} RISK`;
      riskBadge.append(dot, document.createTextNode(badgeText));
    }

    if (findingsHeading) {
      findingsHeading.hidden = false;
      const heading = findingsHeading.querySelector('h3');
      const subtitle = findingsHeading.querySelector('span');
      if (heading) heading.textContent = isJobRelated ? 'Key findings' : 'Scope check';
      if (subtitle) subtitle.textContent = isJobRelated
        ? 'Signals identified in this document'
        : 'Why no score applies';
    }
    if (summaryGrid) {
      summaryGrid.replaceChildren();
      const visibleReasons = reasons.length
        ? reasons
        : [isJobRelated ? 'No specific findings were included in this analysis.' : 'No job-related content was identified.'];
      summaryGrid.classList.toggle('has-three', visibleReasons.length === 3);
      summaryGrid.classList.toggle('has-four', visibleReasons.length === 4);
      visibleReasons.forEach((reason, index) => {
        const card = document.createElement('article');
        card.className = 'summary-item';

        const number = document.createElement('span');
        number.className = 'item-icon finding-number';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = String(index + 1).padStart(2, '0');

        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = isJobRelated
          ? `Finding ${String(index + 1).padStart(2, '0')}`
          : 'Scope check';
        const description = document.createElement('small');
        description.textContent = reason;
        copy.append(title, description);
        card.append(number, copy);
        summaryGrid.append(card);
      });
      summaryGrid.hidden = false;
    }
    if (summaryEmpty) summaryEmpty.hidden = true;
    if (analysisDisclaimer) {
      analysisDisclaimer.hidden = !isJobRelated;
    }
    if (recommendation) recommendation.textContent = analysis.recommendation;
    if (recommendationPanel) {
      recommendationPanel.hidden = false;
      const heading = recommendationPanel.querySelector('.recommendation-heading strong');
      const tag = recommendationPanel.querySelector('.recommendation-tag');
      if (heading) heading.textContent = isJobRelated ? 'AI recommendation' : 'Next step';
      if (tag) tag.textContent = isJobRelated ? 'NEXT STEP' : 'ACTION';
    }

    addRecentScan(filename, score, level, tone);
  }

  function addRecentScan(filename, score, level, tone) {
    if (!recentList) return;
    const item = document.createElement('article');
    item.className = 'recent-item';

    const info = document.createElement('div');
    info.className = 'item-info';
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'item-title';
    title.textContent = filename;
    const meta = document.createElement('span');
    meta.className = 'item-meta';
    const scanTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
    meta.textContent = `Scanned ${scanTime}`;
    copy.append(title, meta);
    info.append(copy);

    const scoreWrap = document.createElement('div');
    scoreWrap.className = 'item-score';
    const scorePill = document.createElement('span');
    scorePill.className = `score-pill ${tone}`;
    scorePill.textContent = level === 'NOT_APPLICABLE'
      ? 'Not applicable · 0 shown'
      : `Risk ${score}/100 · ${level}`;
    scoreWrap.append(scorePill);

    item.append(info, scoreWrap);
    recentList.prepend(item);
    if (recentEmpty) recentEmpty.hidden = true;
    while (recentList.children.length > 8) recentList.lastElementChild.remove();
    if (recentCount) {
      const count = recentList.children.length;
      recentCount.textContent = `${count} ${count === 1 ? 'scan' : 'scans'}`;
    }
  }

  function scanFileToBackend(file) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable || !scanProgress) return;
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        scanProgress.value = percent;
        scanProgress.setAttribute('aria-label', `File upload progress: ${percent}%`);
        if (scanStatus) scanStatus.textContent = `Uploading document… ${percent}%`;
      });

      xhr.upload.addEventListener('load', () => {
        if (scanProgress) {
          scanProgress.removeAttribute('value');
          scanProgress.setAttribute('aria-label', 'Analysis progress');
        }
        if (scanStatus) scanStatus.textContent = 'Analyzing document…';
      });

      xhr.addEventListener('load', () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(errorFromResponse(xhr)));
          return;
        }

        try {
          const data = JSON.parse(xhr.responseText);
          if (!data || !data.analysis) {
            throw new Error('The scan completed without analysis results. Please try again.');
          }
          if (scanStatus) scanStatus.textContent = 'Analysis complete. Displaying your findings…';
          renderSummary(data, file);
          if (uploadCopy) uploadCopy.textContent = 'Analysis complete · Your findings are shown below.';
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error('The scan response could not be read. Please try again.'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error(networkErrorMessage));
      });
      xhr.addEventListener('timeout', () => {
        reject(new Error('The scan is taking longer than expected. Please try again in a moment.'));
      });
      xhr.addEventListener('abort', () => {
        reject(new Error('The scan was cancelled before it finished.'));
      });

      xhr.timeout = 50000;
      xhr.open('POST', apiUrl('/scan'));
      xhr.send(formData);
    });
  }

  async function scanTextToBackend(endpoint, payload) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let data = null;
      const responseText = await response.text();
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (error) {
        if (response.ok) throw new Error(`The backend returned an unreadable response (HTTP ${response.status}). Please retry.`);
      }
      if (!response.ok) {
        throw new Error(httpErrorMessage(response.status, detailFromBody(data)));
      }
      if (!data?.analysis) throw new Error('The scan completed without analysis results. Please try again.');
      if (scanStatus) scanStatus.textContent = 'Analysis complete. Displaying your findings…';
      renderSummary(data, { name: data.filename });
      if (uploadCopy) uploadCopy.textContent = 'Analysis complete · Your findings are shown below.';
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('The scan took too long. Please try again in a moment.');
      }
      if (error instanceof TypeError) {
        throw new Error(networkErrorMessage);
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function handleTextScan(endpoint, payload) {
    if (scanInProgress) return;
    clearFeedback();
    clearCurrentResult();
    resetProgress();
    if (scanStatus) scanStatus.textContent = 'Analyzing content…';
    setBusy(true);
    try {
      await scanTextToBackend(endpoint, payload);
      const analysisSection = document.querySelector('#analysis');
      if (analysisSection) analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('JobShield scan failed:', error);
      showFeedback(error.message || 'The scan could not be completed. Please try again.');
    } finally {
      setBusy(false);
      resetProgress();
    }
  }

  async function handleFileSelected(file) {
    if (scanInProgress || !file) return;
    clearFeedback();

    if (file.size > maxFileSize) {
      showFeedback('Files must be 10 MB or smaller. Choose a smaller PDF or image.');
      if (fileInput) fileInput.value = '';
      return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(fileExtension)) {
      showFeedback('Unsupported file type. Choose a PDF, PNG, or JPEG file.');
      if (fileInput) fileInput.value = '';
      return;
    }

    clearCurrentResult();
    if (uploadTitle) uploadTitle.textContent = file.name;
    if (uploadCopy) uploadCopy.textContent = `File ready for analysis (${(file.size / 1024).toFixed(1)} KB).`;
    if (uploadFormats) uploadFormats.textContent = 'File loaded · Click to replace';
    if (scanStatus) scanStatus.textContent = 'Uploading document…';

    resetProgress();
    setBusy(true);
    try {
      await scanFileToBackend(file);
      const analysisSection = document.querySelector('#analysis');
      if (analysisSection) analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('JobShield scan failed:', error);
      showFeedback(error.message || 'The scan could not be completed. Please try again.');
    } finally {
      setBusy(false);
      resetProgress();
      if (fileInput) fileInput.value = '';
    }
  }

  /* Scan type tabs */
  scanTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (scanInProgress) return;
      scanTabs.forEach((item) => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const mode = tab.dataset.mode;
      [viewFile, viewLink, viewEmail].filter(Boolean).forEach((view) => view.classList.add('is-hidden'));
      if (mode === 'file' || mode === 'offer') {
        if (viewFile) viewFile.classList.remove('is-hidden');
        if (uploadTitle && tab.dataset.title) uploadTitle.textContent = tab.dataset.title;
        if (uploadFormats && tab.dataset.types) uploadFormats.textContent = tab.dataset.types;
        if (uploadCopy) {
          uploadCopy.textContent = mode === 'offer'
            ? 'Inspect stamp authenticity, signatures, and contract terms.'
            : 'Drag & drop your file or click to browse from your device.';
        }
      } else if (mode === 'link') {
        if (viewLink) viewLink.classList.remove('is-hidden');
        document.querySelector('#link-input')?.focus();
      } else if (mode === 'email') {
        if (viewEmail) viewEmail.classList.remove('is-hidden');
        document.querySelector('#email-input')?.focus();
      }
      clearFeedback();
    });
  });

  /* File picker and accessible drag-and-drop upload */
  if (uploadBox && fileInput) {
    uploadBox.addEventListener('keydown', (event) => {
      if (scanInProgress || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      fileInput.click();
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      uploadBox.addEventListener(eventName, (event) => {
        event.preventDefault();
        if (!scanInProgress) uploadBox.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      uploadBox.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadBox.classList.remove('is-dragging');
      });
    });
    uploadBox.addEventListener('drop', (event) => {
      if (scanInProgress) return;
      const file = event.dataTransfer?.files?.[0];
      if (file) handleFileSelected(file);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.[0]) handleFileSelected(fileInput.files[0]);
    });
  }

  btnScanLink?.addEventListener('click', () => {
    if (scanInProgress) return;
    const input = document.querySelector('#link-input');
    const value = input?.value.trim() || '';
    let parsedUrl;
    try {
      parsedUrl = new URL(value);
    } catch (error) {
      showFeedback('Enter a complete job listing URL beginning with https://.');
      input?.focus();
      return;
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      showFeedback('Only public HTTP or HTTPS links can be scanned.');
      input?.focus();
      return;
    }
    handleTextScan('/scan-link', { url: value });
  });

  btnScanEmail?.addEventListener('click', () => {
    if (scanInProgress) return;
    const input = document.querySelector('#email-input');
    const content = input?.value.trim() || '';
    if (!content) {
      showFeedback('Paste the recruiter message before scanning.');
      input?.focus();
      return;
    }
    handleTextScan('/analyze', { content });
  });

  /* Existing in-page navigation behavior */
  document.querySelectorAll('.dock-item').forEach((item) => {
    item.addEventListener('click', (event) => {
      const href = item.getAttribute('href');
      document.querySelectorAll('.dock-item').forEach((button) => button.classList.remove('active'));
      item.classList.add('active');
      if (href && href.startsWith('#') && href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (href === '#') {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  /* Dark and light theme toggle */
  const themeToggle = document.querySelector('#theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, animate = false) {
    if (animate) document.documentElement.classList.add('theme-transitioning');
    document.documentElement.dataset.theme = theme;
    if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#0a0f18' : '#f4f6f8');
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
      themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
      const icon = themeToggle.querySelector('.theme-icon');
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    }
    if (animate) {
      window.setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 350);
    }
  }

  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('jobshield-theme') || 'light';
  } catch (error) {
    // The scanner still works when browser storage is unavailable.
  }
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('jobshield-theme', nextTheme);
    } catch (error) {
      // Apply the selected theme for this session even if it cannot be saved.
    }
    applyTheme(nextTheme, true);
  });
});

