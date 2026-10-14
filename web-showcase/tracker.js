/**
 * Oza Motorsports - Advanced Visitor & Engagement Tracker
 * Logs real-time analytics to Google Sheets:
 * Existing 13 columns + 19 new visitor intelligence columns (Total 32 Data Points)
 */

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx55d-WCQnidp1h7ek2fcNjlqW_mtGTY3am1EogP6bzeB-910q3v11FnOi2JCBfz165/exec';

const pageStartTime = Date.now();
let hasSentExitPing = false;

// Interaction & Behavioral Tracking Counters
let totalClicks = 0;
let lastKeyClicked = 'None yet';
let lastTouchedElement = 'None';
let rageClicksCount = 0;
let lastClickTime = 0;
let lastClickPos = { x: 0, y: 0 };
let rapidClicksCounter = 0;

// Video & Audio Playback Counters
let videoWatchedSeconds = 0;
let videoLoopsCount = 0;
let videoMuteUnmuteCount = 0;
let audioListenSeconds = 0;
let videoTrackingInitialized = false;

// Cached Async Diagnostics
let cachedSurfingMode = 'Normal';
let cachedAudioDevice = 'Standard Audio / Speaker';

// 1. Session ID (persists across pages in the same browsing session)
function getSessionId() {
  let sid = sessionStorage.getItem('oza_session_id');
  if (!sid) {
    sid = 'SES-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Date.now().toString(36).slice(-3).toUpperCase();
    sessionStorage.setItem('oza_session_id', sid);
  }
  return sid;
}

// 2. Visitor Type (New Visitor vs Returning Visit #N)
function getVisitorType() {
  try {
    let count = parseInt(localStorage.getItem('oza_visit_count') || '0', 10);
    const sessionActive = sessionStorage.getItem('oza_session_counted');
    if (!sessionActive) {
      count += 1;
      localStorage.setItem('oza_visit_count', count.toString());
      sessionStorage.setItem('oza_session_counted', 'true');
    }
    if (count <= 1) return 'New Visitor (1st)';
    return `Returning (Visit #${count})`;
  } catch (e) {
    return 'Visitor';
  }
}

// 3. Device & Operating System
function getDeviceInfo() {
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'Apple iPhone (iOS)';
  if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'Apple iPad (iPadOS)';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'MacBook / macOS';
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 10 / 11 PC';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Linux/i.test(ua)) return 'Linux PC';
  return 'Desktop / Other';
}

// 4. Browser Detection
function getBrowserInfo() {
  const ua = navigator.userAgent || '';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Google Chrome';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Apple Safari';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  return 'Modern Browser';
}

// 5. Screen Size & Input Mode
function getScreenSize() {
  const w = window.screen.width || window.innerWidth;
  const h = window.screen.height || window.innerHeight;
  const type = (window.innerWidth <= 768) ? 'Mobile' : (window.innerWidth <= 1024) ? 'Tablet' : 'Desktop';
  const touch = (navigator.maxTouchPoints > 0) ? ', Touch' : '';
  return `${w}x${h} (${type}${touch})`;
}

// 6. Referrer & Campaign
function getReferrerSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmCampaign = params.get('utm_campaign');
    if (utmSource) {
      return utmCampaign ? `${utmSource} (${utmCampaign})` : utmSource;
    }
    if (!document.referrer) return 'Direct Visit';
    const url = new URL(document.referrer);
    if (url.hostname === window.location.hostname) return 'Internal Site Navigation';
    return url.hostname.replace('www.', '');
  } catch (e) {
    return 'Direct Visit';
  }
}

// 7. Google Analytics Cookie ID
function getGaClientId() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {}
  return 'Pending / None';
}

// 8. Horse Video Audio State
function getAudioState() {
  const bgVideo = document.querySelector('.bg-video');
  if (bgVideo) {
    return bgVideo.muted ? 'Muted' : 'Unmuted';
  }
  const saved = sessionStorage.getItem('homeVideoAudioMuted');
  if (saved === 'false') return 'Unmuted';
  if (saved === 'true') return 'Muted';
  return 'Default';
}

// 9. Format duration
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}m ${rem}s`;
}

// 10. Location, Network, Exact IP & PIN Code (Cached per session)
function getCachedNetworkAndLocation() {
  try {
    const cached = sessionStorage.getItem('oza_visitor_network_cache');
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  return {
    location: 'Location via IP',
    network: 'Internet Network',
    exactIp: 'IP Pending',
    pinCode: 'N/A'
  };
}

async function getNetworkAndLocation() {
  const cached = getCachedNetworkAndLocation();
  if (cached && cached.location !== 'Location via IP') {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const locParts = [data.city, data.region, data.country_name || data.country].filter(Boolean);
      const locStr = locParts.join(', ') || 'India';
      const netStr = (data.org || data.asn || 'Broadband / Cellular').replace(/^AS\d+\s*/i, '');
      const result = {
        location: locStr,
        network: netStr,
        exactIp: data.ip || 'Direct IP',
        pinCode: data.postal || data.zip || 'N/A'
      };
      sessionStorage.setItem('oza_visitor_network_cache', JSON.stringify(result));
      return result;
    }
  } catch (err) {}

  return cached;
}

// 11. Navigation Path & Pages Count
function getSessionNavigation(currentPage) {
  try {
    let pages = JSON.parse(sessionStorage.getItem('oza_nav_pages') || '[]');
    if (pages.length === 0 || pages[pages.length - 1] !== currentPage) {
      pages.push(currentPage);
      sessionStorage.setItem('oza_nav_pages', JSON.stringify(pages));
    }
    return {
      path: pages.join(' → '),
      count: `${pages.length} Page${pages.length > 1 ? 's' : ''}`
    };
  } catch (e) {
    return { path: currentPage, count: '1 Page' };
  }
}

// 12. Connection Speed & Latency
function getConnectionMetrics() {
  const conn = (typeof navigator !== 'undefined') && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
  if (conn) {
    const effType = (conn.effectiveType || '4G').toUpperCase();
    const down = typeof conn.downlink === 'number' ? `${conn.downlink} Mbps` : '10+ Mbps';
    const rtt = typeof conn.rtt === 'number' ? `${conn.rtt} ms` : 'Low Latency';
    return {
      speed: `${effType} (${down})`,
      latency: rtt
    };
  }
  return { speed: 'High Speed (WiFi/4G)', latency: '40 ms (Est.)' };
}

// 13. Device Capability & CPU Processor
function getDeviceCapabilities() {
  const mem = (typeof navigator !== 'undefined' && navigator.deviceMemory) ? `${navigator.deviceMemory} GB RAM, ` : '';
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? `${window.devicePixelRatio.toFixed(1)}x DPR` : '1.0x DPR';
  const touch = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ? ', Touch' : ', Mouse';
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? `${navigator.hardwareConcurrency} Cores` : 'Multi-Core';
  return {
    capability: `${mem}${dpr}${touch}`,
    cpu: `${cores} Processor`
  };
}

// 14. Page Load Time
function getPageLoadTime() {
  try {
    const perf = window.performance;
    if (perf) {
      const entries = perf.getEntriesByType && perf.getEntriesByType('navigation');
      if (entries && entries.length > 0) {
        const load = entries[0].loadEventEnd || entries[0].domContentLoadedEventEnd;
        if (load > 0) return `${(load / 1000).toFixed(2)}s`;
      }
      if (perf.timing && perf.timing.loadEventEnd > 0) {
        const diff = perf.timing.loadEventEnd - perf.timing.navigationStart;
        if (diff > 0) return `${(diff / 1000).toFixed(2)}s`;
      }
    }
  } catch (e) {}
  return `${((Date.now() - pageStartTime) / 1000).toFixed(2)}s`;
}

// 15. Surfing Mode (Incognito / Private detection)
async function detectSurfingMode() {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const est = await navigator.storage.estimate();
      if (est.quota && est.quota < 4294967296) {
        cachedSurfingMode = 'Incognito / Private';
        return cachedSurfingMode;
      }
    }
  } catch (e) {}
  cachedSurfingMode = 'Normal';
  return cachedSurfingMode;
}

// 16. Audio Device Connected Check
async function detectAudioDevices() {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter(d => d.kind === 'audiooutput' || d.kind === 'audioinput');
      const hasHeadphones = outputs.some(d => /head|phone|ear|bluetooth|airpod|buds|usb/i.test(d.label || ''));
      if (hasHeadphones || outputs.length > 2) {
        cachedAudioDevice = 'Headphones / External Audio Detected';
        return cachedAudioDevice;
      }
    }
  } catch (e) {}
  cachedAudioDevice = 'Standard Built-in Audio';
  return cachedAudioDevice;
}

// Core Post Function (Silent, Non-Blocking, & Handles Google Apps Script 302 Redirects)
function sendPayload(payload) {
  try {
    const jsonStr = JSON.stringify(payload);

    fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: jsonStr,
      redirect: 'follow',
      keepalive: true
    }).catch(() => {
      try {
        fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: jsonStr
        }).catch(() => {});
      } catch (e) {}
    });
  } catch (err) {}
}

// Build 32 Data Points (13 Existing + 19 New)
function buildFullPayload(isExit, netLoc) {
  const currentPage = document.title ? document.title.split('|')[0].trim() : window.location.pathname;
  const durationSeconds = Math.round((Date.now() - pageStartTime) / 1000);
  const nav = getSessionNavigation(currentPage);
  const conn = getConnectionMetrics();
  const dev = getDeviceCapabilities();

  return {
    // === ORIGINAL 13 COLUMNS (PRESERVED IN EXACT ORDER) ===
    timestamp: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    page: currentPage,
    timeSpent: isExit ? formatDuration(durationSeconds) : 'Landing / Active',
    visitorType: `${getVisitorType()}${sessionStorage.getItem('oza_visitor_intent') ? ' [' + sessionStorage.getItem('oza_visitor_intent') + ']' : ''}`,
    device: getDeviceInfo(),
    browser: getBrowserInfo(),
    resolution: getScreenSize(),
    location: netLoc ? netLoc.location : 'Location via IP',
    network: netLoc ? netLoc.network : 'Internet Network',
    referrer: getReferrerSource(),
    audioState: `${getAudioState()}${sessionStorage.getItem('oza_experience_mode') ? ' (' + sessionStorage.getItem('oza_experience_mode') + ')' : ''}`,
    sessionId: getSessionId(),
    gaClientId: getGaClientId(),

    // === 19 NEW COLUMNS (REQUESTED LIST) ===
    navigationPath: nav.path,
    pagesCount: nav.count,
    keyClicked: lastKeyClicked,
    videoWatchedTime: `${Math.round(videoWatchedSeconds)}s`,
    connectionSpeed: conn.speed,
    deviceCapability: dev.capability,
    cpuProcessor: dev.cpu,
    exactIp: `${netLoc ? netLoc.exactIp : 'Direct IP'}${sessionStorage.getItem('oza_exact_gps') ? ' | GPS: ' + sessionStorage.getItem('oza_exact_gps') : ''}`,
    pinCode: netLoc ? netLoc.pinCode : 'N/A',
    totalClicks: `${totalClicks} Clicks`,
    rageClicks: rageClicksCount > 0 ? `${rageClicksCount} Rage Clicks` : '0 (None)',
    lastTouchedElement: lastTouchedElement,
    internetLatency: conn.latency,
    pageLoadTime: getPageLoadTime(),
    surfingMode: cachedSurfingMode,
    videoMuteUnmuteCount: `${videoMuteUnmuteCount} Toggles`,
    audioListeningDuration: `${Math.round(audioListenSeconds)}s`,
    videoLoopCompleted: `${videoLoopsCount} Loops`,
    audioDeviceConnected: cachedAudioDevice,

    // === CONSENT GATE & GOOGLE VERIFIED FIELDS ===
    visitorName: sessionStorage.getItem('oza_user_name') || localStorage.getItem('oza_user_name') || 'Website Visitor',
    visitorEmail: sessionStorage.getItem('oza_user_email') || localStorage.getItem('oza_user_email') || 'Direct Access',
    visitorIntent: sessionStorage.getItem('oza_visitor_intent') || 'Direct Visitor',
    experienceMode: sessionStorage.getItem('oza_experience_mode') || 'Default',
    exactGps: sessionStorage.getItem('oza_exact_gps') || 'IP Location'
  };
}

// Send visit log
async function logVisit(isExit = false) {
  try {
    if (isExit) {
      const netLoc = getCachedNetworkAndLocation();
      const payload = buildFullPayload(true, netLoc);
      sendPayload(payload);
    } else {
      const netLoc = await getNetworkAndLocation();
      const payload = buildFullPayload(false, netLoc);
      sendPayload(payload);
    }
  } catch (err) {}
}

// Global Event Listeners & Heartbeats
if (typeof window !== 'undefined') {
  // 1. Click & Rage-click Listeners
  document.addEventListener('click', (e) => {
    totalClicks++;
    const now = Date.now();
    const target = e.target;
    
    // Detailed target identification
    let desc = target.tagName ? target.tagName.toUpperCase() : 'ELEMENT';
    const text = (target.innerText || target.getAttribute('aria-label') || target.title || '').trim().slice(0, 30);
    if (text) desc += `: "${text}"`;
    else if (target.id) desc += `#${target.id}`;
    else if (target.className && typeof target.className === 'string') desc += `.${target.className.split(' ')[0]}`;
    lastTouchedElement = desc;

    // CTA / Key Button identification
    const cta = target.closest('a, button, input[type="submit"], .drop-btn, .action-btn, .consent-btn');
    if (cta) {
      const ctaText = (cta.innerText || cta.getAttribute('aria-label') || cta.title || cta.className || 'Button').trim().slice(0, 35);
      lastKeyClicked = `${cta.tagName}: "${ctaText}"`;
    }

    // Rage click detection (3+ clicks within 650ms inside 45px radius)
    const dist = Math.hypot((e.clientX || 0) - lastClickPos.x, (e.clientY || 0) - lastClickPos.y);
    if (now - lastClickTime < 650 && dist < 45) {
      rapidClicksCounter++;
      if (rapidClicksCounter >= 3) {
        rageClicksCount++;
      }
    } else {
      rapidClicksCounter = 1;
    }
    lastClickTime = now;
    lastClickPos = { x: e.clientX || 0, y: e.clientY || 0 };
  }, true);

  // 2. Video & Audio Tracking Initialization
  const setupVideoTracker = () => {
    if (videoTrackingInitialized) return;
    const bgVideo = document.querySelector('.bg-video, video');
    if (!bgVideo) return;
    videoTrackingInitialized = true;

    let lastTime = bgVideo.currentTime;
    let lastTick = Date.now();

    bgVideo.addEventListener('volumechange', () => {
      videoMuteUnmuteCount++;
    });

    bgVideo.addEventListener('ended', () => {
      videoLoopsCount++;
    });

    setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastTick) / 1000;
      lastTick = now;

      if (!bgVideo.paused && bgVideo.readyState >= 2) {
        videoWatchedSeconds += deltaSec;
        if (!bgVideo.muted && bgVideo.volume > 0) {
          audioListenSeconds += deltaSec;
        }
        if (bgVideo.currentTime < lastTime - 1.5) {
          videoLoopsCount++;
        }
        lastTime = bgVideo.currentTime;
      }
    }, 1000);
  };

  // 3. Initial Page Load Execution
  const onReady = () => {
    setupVideoTracker();
    detectSurfingMode();
    detectAudioDevices();
    setTimeout(() => logVisit(false), 300);
  };

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady);
  }

  // 4. Exit / Unload Handling (Time spent & total interaction updates)
  const onPageExit = () => {
    if (hasSentExitPing) return;
    const spentSec = Math.round((Date.now() - pageStartTime) / 1000);
    if (spentSec >= 2) {
      hasSentExitPing = true;
      logVisit(true);
    }
  };

  window.addEventListener('pagehide', onPageExit);
  window.addEventListener('beforeunload', onPageExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      onPageExit();
    }
  });

  // 5. Consent & Immersion Handler
  window.__ozaRecordConsent = (experienceMode, visitorIntent, userName, userEmail) => {
    try {
      if (userName) sessionStorage.setItem('oza_user_name', userName);
      if (userEmail) sessionStorage.setItem('oza_user_email', userEmail);
      sessionStorage.setItem('oza_visitor_intent', visitorIntent || 'Google Verified Visitor');
      sessionStorage.setItem('oza_experience_mode', experienceMode || 'Google 1-Tap Entry');

      if (experienceMode !== 'Silent' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(5);
            const lng = pos.coords.longitude.toFixed(5);
            const acc = Math.round(pos.coords.accuracy);
            const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            sessionStorage.setItem('oza_exact_gps', `${lat}, ${lng} (±${acc}m) [${mapUrl}]`);
            logVisit(false);
          },
          () => {
            sessionStorage.setItem('oza_exact_gps', 'Declined / IP Only');
            logVisit(false);
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        sessionStorage.setItem('oza_exact_gps', 'Silent / IP Only');
        logVisit(false);
      }
    } catch(e) {}
  };

  // Manual test trigger in console
  window.__ozaSendTestPing = () => logVisit(false);
}
