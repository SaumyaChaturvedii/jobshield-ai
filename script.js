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
  const isLocalLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    && window.location.port === '5500';
  const defaultApiOrigin = isLocalLiveServer ? 'http://127.0.0.1:8000' : window.location.origin;
  const apiOrigin = String(window.JOBSHIELD_API_BASE_URL || defaultApiOrigin).replace(/\/$/, '');
  const apiUrl = (path) => `${apiOrigin}${path}`;
  let scanInProgress = false;

  async function refreshServiceStatus() {
    if (!servicePill || !serviceText) return;
    try {
      const response = await fetch(apiUrl('/health'), { cache: 'no-store' });
      if (!response.ok) throw new Error('Health check failed');
      const health = await response.json();
      servicePill.classList.remove('is-offline', 'is-warning');
      if (!health.gemini_configured) {
        serviceText.textContent = 'AI setup required';
        servicePill.classList.add('is-warning');
      } else if (!health.ocr_available) {
        serviceText.textContent = 'Image OCR unavailable';
        servicePill.classList.add('is-warning');
      } else {
        serviceText.textContent = 'Backend online';
      }
    } catch (error) {
      serviceText.textContent = 'Service offline';
      servicePill.classList.remove('is-warning');
      servicePill.classList.add('is-offline');
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

  function errorFromResponse(xhr) {
    try {
      const body = JSON.parse(xhr.responseText);
      if (typeof body?.detail === 'string') return body.detail;
      if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
    } catch (error) {
      // A non-JSON response gets the generic status message below.
    }
    return `The scan could not be completed (server returned ${xhr.status}). Please try again.`;
  }

  function riskTone(level) {
    const normalized = String(level || '').toUpperCase();
    if (normalized === 'LOW') return 'safe';
    if (normalized === 'MEDIUM') return 'warning';
    if (normalized === 'HIGH') return 'danger';
    return 'neutral';
  }

  function renderSummary(data, file) {
    const analysis = data.analysis;
    const filename = data.filename || file?.name || 'Scan result';
    const score = Number(analysis.risk_score);
    const level = String(analysis.risk_level || 'Unknown').toUpperCase();
    const tone = riskTone(level);
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
    }
    if (riskGauge) {
      riskGauge.style.setProperty('--risk-angle', `${boundedScore * 3.6}deg`);
      riskGauge.setAttribute('aria-label', `Risk score ${scoreText} out of 100. ${level} risk.`);
    }
    if (riskScoreValue) riskScoreValue.textContent = scoreText;
    if (resultTitle) {
      const titles = { LOW: 'Low risk detected', MEDIUM: 'Proceed with care', HIGH: 'High risk detected' };
      resultTitle.textContent = titles[level] || 'Review this result';
    }
    if (riskBadge) {
      riskBadge.className = `score-badge ${tone}`;
      riskBadge.replaceChildren();
      const dot = document.createElement('span');
      dot.className = 'score-dot';
      dot.setAttribute('aria-hidden', 'true');
      riskBadge.append(dot, document.createTextNode(level === 'UNKNOWN' ? 'RISK LEVEL UNKNOWN' : `${level} RISK`));
    }

    if (summaryGrid) {
      summaryGrid.replaceChildren();
      const visibleReasons = reasons.length ? reasons : ['No specific findings were included in this analysis.'];
      summaryGrid.classList.toggle('has-three', visibleReasons.length === 3);
      visibleReasons.forEach((reason, index) => {
        const card = document.createElement('article');
        card.className = 'summary-item';

        const number = document.createElement('span');
        number.className = 'item-icon finding-number';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = String(index + 1).padStart(2, '0');

        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `Finding ${String(index + 1).padStart(2, '0')}`;
        const description = document.createElement('small');
        description.textContent = reason;
        copy.append(title, description);
        card.append(number, copy);
        summaryGrid.append(card);
      });
      summaryGrid.hidden = false;
    }
    if (findingsHeading) findingsHeading.hidden = false;
    if (summaryEmpty) summaryEmpty.hidden = true;
    if (recommendation) recommendation.textContent = analysis.recommendation;
    if (recommendationPanel) recommendationPanel.hidden = false;

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
    scorePill.textContent = `Risk ${score}/100 · ${level}`;
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
        reject(new Error('Scan service unavailable. Make sure FastAPI is running, then retry.'));
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
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error(`The scan service returned an unreadable response (${response.status}). Please try again.`);
      }
      if (!response.ok) {
        const message = typeof data?.detail === 'string' ? data.detail : `The scan could not be completed (server returned ${response.status}). Please try again.`;
        throw new Error(message);
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
        throw new Error('Scan service unavailable. Check your connection and retry.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function handleTextScan(endpoint, payload) {
    if (scanInProgress) return;
    clearFeedback();
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
