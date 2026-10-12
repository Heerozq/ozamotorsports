/**
 * Oza Motorsports - Advanced Visitor & Engagement Tracker
 * Logs real-time analytics to Google Sheets:
 * Time spent, Visitor Type, Device, Location, ISP/Network, Audio state, Session ID, GA Cookie ID
 */

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx55d-WCQnidp1h7ek2fcNjlqW_mtGTY3am1EogP6bzeB-910q3v11FnOi2JCBfz165/exec';

const pageStartTime = Date.now();
let hasSentExitPing = false;

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

// 10. Location & Network / ISP (Cached per session)
async function getNetworkAndLocation() {
  const cached = sessionStorage.getItem('oza_visitor_network_cache');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200); // 2.2s fast timeout
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const locParts = [data.city, data.region, data.country_name || data.country].filter(Boolean);
      const locStr = locParts.join(', ') || 'India';
      const netStr = (data.org || data.asn || 'Broadband / Cellular').replace(/^AS\d+\s*/i, '');
      const result = { location: locStr, network: netStr };
      sessionStorage.setItem('oza_visitor_network_cache', JSON.stringify(result));
      return result;
    }
  } catch (err) {}

  return { location: 'Location via IP', network: 'Internet Network' };
}

// Core Post Function (Silent & Non-Blocking)
function sendPayload(payload) {
  const jsonStr = JSON.stringify(payload);
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([jsonStr], { type: 'text/plain;charset=utf-8' });
    const success = navigator.sendBeacon(WEB_APP_URL, blob);
    if (success) return;
  }
  fetch(WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: jsonStr,
    keepalive: true
  }).catch(() => {});
}

// Send visit log
async function logVisit(isExit = false) {
  try {
    const currentPage = document.title ? document.title.split('|')[0].trim() : window.location.pathname;
    const netLoc = await getNetworkAndLocation();
    const durationSeconds = Math.round((Date.now() - pageStartTime) / 1000);

    const payload = {
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
      visitorType: getVisitorType(),
      device: getDeviceInfo(),
      browser: getBrowserInfo(),
      resolution: getScreenSize(),
      location: netLoc.location,
      network: netLoc.network,
      referrer: getReferrerSource(),
      audioState: getAudioState(),
      sessionId: getSessionId(),
      gaClientId: getGaClientId()
    };

    sendPayload(payload);
  } catch (err) {}
}

// Trigger initial landing log after page loads quietly
if (typeof window !== 'undefined') {
  const onReady = () => {
    setTimeout(() => logVisit(false), 500);
  };
  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady);
  }

  // Handle page exit / time spent update
  const onPageExit = () => {
    if (hasSentExitPing) return;
    const spentSec = Math.round((Date.now() - pageStartTime) / 1000);
    // Only send time spent update if user spent at least 2 seconds on the page
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
}
