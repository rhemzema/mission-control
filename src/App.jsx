import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import "./App.css";

const CREW = [
  { name: "Reid Wiseman", role: "Commander" },
  { name: "Victor Glover", role: "Pilot" },
  { name: "Christina Koch", role: "Mission Specialist" },
  { name: "Jeremy Hansen", role: "Mission Specialist (CSA)" },
];

const LAYOUTS = {
  gallery: { label: "Gallery", icon: "grid_view" },
  speaker: { label: "Focused", icon: "video_label" },
  triple:  { label: "Triple",  icon: "view_column" },
  cinema:  { label: "Cinema",  icon: "desktop_windows" },
};

const DEFAULT_STREAMS = [
  { id: "nasa-1", label: "NASA Orion", type: "youtube", videoId: "6RwfNBtepa4", muted: true, color: "#E50914" },
  { id: "nasa-2", label: "NASA Live",  type: "youtube", videoId: "m3kR2KK8TEs", muted: true, color: "#003399" },
];
const DEFAULT_UPDATES = [];

function getYouTubeId(url) {
  if (!url) return null;
  for (const p of [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function getEmbedUrl(stream) {
  if (stream.type === "youtube" && stream.videoId)
    return `https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`;
  if (stream.type === "custom-embed") return stream.embedUrl;
  return null;
}

const WINDOW_OPEN  = "2026-04-01T22:35:00Z";

// ─── Hook: detect mobile ──────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 767);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ─── Hook: detect landscape phone ────────────────────────────────────────
function useIsLandscape() {
  const check = () =>
    window.innerWidth > window.innerHeight && window.innerHeight <= 500;
  const [isLandscape, setIsLandscape] = useState(check);
  useEffect(() => {
    const handler = () => setIsLandscape(check());
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);
  return isLandscape;
}

// ─── Countdown Timer ──────────────────────────────────────────────────────
function CountdownTimer({ targetOverride, onOverride }) {
  const [now, setNow] = useState(Date.now());
  const [showEdit, setShowEdit] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [holdActive, setHoldActive] = useState(false);
  const [holdFrozen, setHoldFrozen] = useState(null);

  useEffect(() => {
    // Stop ticking once mission is complete — no need to keep updating
    const splashMs = new Date(MILESTONES.find(m => m.id === "splashdown").t).getTime();
    if (Date.now() >= splashMs) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= splashMs) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const target      = targetOverride ? new Date(targetOverride).getTime() : new Date(WINDOW_OPEN).getTime();
  const splashdownMs = new Date(MILESTONES.find(m => m.id === "splashdown").t).getTime();
  const missionOver  = now >= splashdownMs && !holdActive;

  const diff     = holdActive && holdFrozen !== null ? holdFrozen
    : missionOver ? splashdownMs - target   // freeze at splashdown elapsed
    : target - now;
  const launched = diff <= 0 && !holdActive;

  const fmt = (ms) => {
    const t = Math.floor(Math.abs(ms) / 1000);
    return `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };

  const handleSetT0 = () => {
    if (!editValue.trim()) return;
    const offsetMatch = editValue.trim().match(/^\+(\d+)$/);
    if (offsetMatch) {
      onOverride(new Date(target + parseInt(offsetMatch[1]) * 60000).toISOString());
    } else if (editValue.includes(":") && !editValue.includes("T")) {
      const pmMatch = editValue.trim().toUpperCase().match(/(\d{1,2}):(\d{2})\s*(PM|AM)?/);
      if (pmMatch) {
        let h = parseInt(pmMatch[1]);
        if (pmMatch[3] === "PM" && h < 12) h += 12;
        if (pmMatch[3] === "AM" && h === 12) h = 0;
        const d = new Date("2026-04-01T00:00:00Z");
        d.setUTCHours(h + 4, parseInt(pmMatch[2]), 0, 0);
        onOverride(d.toISOString());
      }
    } else {
      try { const d = new Date(editValue.trim()); if (!isNaN(d.getTime())) onOverride(d.toISOString()); } catch {}
    }
    setEditValue("");
    setShowEdit(false);
  };

  const handleHold = () => {
    if (holdActive) { setHoldActive(false); setHoldFrozen(null); }
    else { setHoldActive(true); setHoldFrozen(target - now); }
  };

  const mode = holdActive ? "hold" : launched ? "launched" : "waiting";

  return (
    <div className="mc-countdown">
      <div className="mc-countdown-display" onClick={() => setShowEdit(!showEdit)} title="Click to adjust T-0">
        <span className={`mc-countdown-dot ${mode}`} />
        <div className="flex-col" style={{ alignItems: "flex-start" }}>
          <span className={`mc-countdown-time ${mode}`}>
            {holdActive ? "HOLD " : missionOver ? "SPLASHDOWN T+ " : launched ? "T+ " : "T- "}
            {fmt(missionOver ? splashdownMs - target : launched && !holdActive ? now - target : diff)}
          </span>
          {(targetOverride || holdActive) && (
            <span className="mc-countdown-note" style={{ color: holdActive ? "var(--color-red)" : "var(--color-text-muted)" }}>
              {holdActive ? "COUNTDOWN HELD" : "ADJUSTED T-0"}
            </span>
          )}
        </div>
      </div>

      {(() => {
        const originalLiftoffMs = new Date(MILESTONES.find(m => m.id === "liftoff").t).getTime();
        const adjustedLiftoffMs = targetOverride ? new Date(targetOverride).getTime() : originalLiftoffMs;
        const offset = adjustedLiftoffMs - originalLiftoffMs;
        const nextMilestone = MILESTONES.find(m => now < new Date(m.t).getTime() + offset);
        const prevMilestone = [...MILESTONES].reverse().find(m => now >= new Date(m.t).getTime() + offset);
        if (!nextMilestone) return null;
        const nextMs   = new Date(nextMilestone.t).getTime() + offset;
        const prevMs   = prevMilestone ? new Date(prevMilestone.t).getTime() + offset : nextMs - 3600000;
        const spanMs   = nextMs - prevMs;
        const elapsed  = now - prevMs;
        const pct      = Math.max(0, Math.min(100, (elapsed / spanMs) * 100));
        const timeToNext = nextMs - now;
        const absS  = Math.floor(Math.abs(timeToNext) / 1000);
        const absM  = Math.floor(absS / 60) % 60;
        const absH  = Math.floor(absS / 3600) % 24;
        const absD  = Math.floor(absS / 86400);
        const fmtCountdown = absD > 0 ? `${absD}d ${absH}h` : absH > 0 ? `${absH}h ${absM}m` : absM > 0 ? `${absM}m ${absS % 60}s` : `${absS}s`;
        return (
          <div className="mc-window-bar">
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="font-mono text-dim" style={{ fontSize: 8, letterSpacing: "0.8px", fontWeight: 600, textTransform: "uppercase" }}>
                NEXT MILESTONE
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="font-mono" style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500, letterSpacing: "0.3px" }}>
                  {nextMilestone.label}
                </span>
                <span className="font-mono" style={{ fontSize: 9, color: "var(--color-amber)", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                  T-{fmtCountdown}
                </span>
              </div>
            </div>
            <div className="mc-window-track">
              <div className="mc-window-fill" style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--color-text-ghost), var(--color-amber))",
              }} />
            </div>
          </div>
        );
      })()}

      {showEdit && (
        <div className="mc-t0-popover" onClick={(e) => e.stopPropagation()}>
          <div className="mc-section-title" style={{ marginBottom: 10 }}>Adjust T-0</div>
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="6:45 PM, +15, or ISO time"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSetT0()}
          />
          <div className="mc-t0-actions">
            <button className="mc-btn mc-btn-primary mc-btn-sm" style={{ flex: 1 }} onClick={handleSetT0}>Set T-0</button>
            <button
              className={`mc-btn mc-btn-sm ${holdActive ? "" : "mc-btn-outline"}`}
              style={holdActive ? { borderColor: "var(--color-red)", background: "rgba(240,71,71,0.1)", color: "var(--color-red)" } : {}}
              onClick={handleHold}
            >
              {holdActive ? "Resume" : "Hold"}
            </button>
            {targetOverride && (
              <button className="mc-btn mc-btn-outline mc-btn-sm" onClick={() => { onOverride(null); setShowEdit(false); }}>Reset</button>
            )}
          </div>
          <div className="font-mono text-faint" style={{ marginTop: 10, fontSize: 10, lineHeight: 1.6 }}>
            Ex: "7:15 PM" (ET) · "+15" (min)
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status Clock ─────────────────────────────────────────────────────────
function StatusClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mc-clock">
      <div className="mc-clock-unit">
        <span className="mc-clock-label">UTC</span>
        <span>{time.toUTCString().slice(17, 25)}</span>
      </div>
      <div className="mc-clock-unit">
        <span className="mc-clock-label">LOCAL (ET)</span>
        <span>{time.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false })}</span>
      </div>
    </div>
  );
}

// ─── Stream Card ──────────────────────────────────────────────────────────
function StreamCard({ stream, iframeKey, onToggleMute, onRemove, isDragging, isAnyDragging, onTapLabel }) {
  const iframeRef = useRef(null);
  const embedUrl  = useRef(getEmbedUrl(stream)).current;

  useEffect(() => {
    if (iframeRef.current?.contentWindow && stream.type === "youtube") {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: stream.muted ? "mute" : "unMute", args: [] }),
        "*"
      );
    }
  }, [stream.muted, stream.type]);

  return (
    <div className={`mc-stream-card ${isDragging ? "is-dragging" : ""}`}>
      <div className="mc-stream-accent" style={{ background: stream.color || "#1E2028" }} />
      <div className="mc-stream-video">
        {embedUrl ? (
          <>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={stream.label}
            />
            {isAnyDragging && <div style={{ position: "absolute", inset: 0, zIndex: 10 }} />}
          </>
        ) : (
          <div className="mc-stream-placeholder">No stream loaded</div>
        )}
      </div>
      <div className="mc-stream-bar" onClick={onTapLabel}>
        <div className="mc-stream-info">
          <span className={`mc-stream-dot ${embedUrl ? "live" : "off"}`} />
          <span className="mc-stream-label">{stream.label}</span>
        </div>
        <div className="mc-drag-handle-zone" title="Drag to reorder">
          <span className="mc-drag-dots" />
        </div>
        <div className="mc-stream-actions">
          <button className="mc-btn-icon" onClick={(e) => { e.stopPropagation(); onToggleMute(stream.id); }} title={stream.muted ? "Unmute" : "Mute"}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              {stream.muted ? "volume_off" : "volume_up"}
            </span>
          </button>
          <button className="mc-btn-icon danger" onClick={(e) => { e.stopPropagation(); onRemove(stream.id); }} title="Remove">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Stream Modal ─────────────────────────────────────────────────────
function AddStreamModal({ onClose, onAdd }) {
  const [label, setLabel] = useState("");
  const [url, setUrl]     = useState("");

  const handleAdd = () => {
    if (!url.trim()) return;
    const videoId = getYouTubeId(url.trim());
    if (videoId) {
      onAdd({ id: `custom-${Date.now()}`, label: label.trim() || "Custom Stream", type: "youtube", videoId, muted: true, color: "#6C5CE7" });
    } else {
      onAdd({ id: `embed-${Date.now()}`, label: label.trim() || "Embedded Stream", type: "custom-embed", embedUrl: url.trim(), muted: true, color: "#6C5CE7" });
    }
    onClose();
  };

  return (
    <div className="mc-modal-backdrop" onClick={onClose}>
      <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mc-modal-header">
          <div className="mc-modal-title">Add Stream</div>
        </div>
        <div className="mc-modal-body">
          <div style={{ marginBottom: 14 }}>
            <label className="mc-field-label">Label</label>
            <input className="mc-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. CNN Coverage" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="mc-field-label">YouTube URL or Embed Link</label>
            <input className="mc-input" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..." onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          </div>
          <button className={`mc-btn-submit ${url.trim() ? "enabled" : "disabled"}`} onClick={handleAdd} disabled={!url.trim()}>
            Add Stream
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NASA RSS Feed ────────────────────────────────────────────────────────
const REFRESH_MS = 5 * 60 * 1000;

async function fetchNASARSS() {
  const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent("https://www.nasa.gov/blogs/artemis/feed/")}&api_key=&count=10`;
  try {
    const res  = await fetch(rss2jsonUrl, { signal: AbortSignal.timeout(14000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok" || !data.items?.length) throw new Error("No items");
    return data.items;
  } catch (err) {
    console.warn("[RSS] rss2json failed:", err.message);
  }
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent("https://www.nasa.gov/blogs/artemis/feed/")}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent("https://www.nasa.gov/blogs/artemis/feed/")}`,
  ];
  for (const url of proxies) {
    try {
      const res  = await fetch(url, { signal: AbortSignal.timeout(14000), cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes("<item>")) continue;
      return text;
    } catch (err) {
      console.warn("[RSS] proxy failed:", err?.message);
    }
  }
  return null;
}

function parseNASARSS(data) {
  try {
    if (Array.isArray(data)) {
      return data.map((item) => ({
        time: item.pubDate
          ? (() => {
              const iso = item.pubDate.replace(" ", "T") + "Z";
              const d = new Date(iso);
              return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
            })()
          : "",
        headline: (item.title || "").substring(0, 100),
        detail:   (item.description || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().substring(0, 220),
      })).filter(u => u.headline);
    }
    const doc   = new DOMParser().parseFromString(data, "text/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 10);
    return items.map((item) => {
      const title   = item.querySelector("title")?.textContent?.trim() || "";
      const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
      const desc    = item.querySelector("description")?.textContent?.trim() || "";
      return {
        time:     pubDate ? new Date(pubDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : "",
        headline: title.substring(0, 100),
        detail:   desc.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().substring(0, 220),
      };
    }).filter(u => u.headline);
  } catch (e) {
    console.error("[RSS] parse error:", e);
    return [];
  }
}

function useNASALiveData() {
  const [updates,     setUpdates]     = useState(DEFAULT_UPDATES);
  const [lastFetch,   setLastFetch]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [isLive,      setIsLive]      = useState(false);
  const [fetchError,  setFetchError]  = useState(false);
  const prevHeadlineRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const xml = await fetchNASARSS();
      if (xml) {
        const parsed = parseNASARSS(xml);
        if (parsed.length > 0) {
          const topHeadline = parsed[0].headline;
          if (topHeadline !== prevHeadlineRef.current) {
            prevHeadlineRef.current = topHeadline;
            setUpdates(parsed);
            setLastUpdated(new Date());
          }
          setIsLive(true);
        }
        setLastFetch(new Date());
      } else {
        setFetchError(true);
      }
    } catch (err) {
      console.error("[RSS hook] error:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  return { updates, status: null, lastFetch, lastUpdated, loading, isLive, fetchError, refresh };
}

// ─── LL2 Launch Data Hook ─────────────────────────────────────────────────
function useLL2LaunchData() {
  const staticStatus = {
    launchStatus: { value: "Success",       state: "nominal" },
    vehicle:      { value: "SLS Block 1",   state: "nominal" },
    spacecraft:   { value: "Orion",         state: "nominal" },
    weather:      { value: "Favorable",     state: "go"      },
    range:        { value: "Clear",         state: "go"      },
    pad:          { value: "LC-39B",        state: "nominal" },
    orbit:        { value: "Translunar",    state: "nominal" },
    window:       { value: "Launched",      state: "go"      },
    holdReason:      "",
    weatherConcerns: null,
    lastUpdated:  new Date("2026-04-01T22:35:00Z"),
  };
  return {
    ll2Status:    staticStatus,
    ll2Loading:   false,
    ll2Error:     null,
    ll2LastFetch: new Date("2026-04-01T22:35:00Z"),
    refetch:      () => {},
  };
}

// ─── KSC Weather Hook ─────────────────────────────────────────────────────
const KSC_LAT = 28.5728;
const KSC_LNG = -80.6490;
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${KSC_LAT}&longitude=${KSC_LNG}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,cloud_cover,precipitation,weather_code&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=America%2FNew_York`;
const WEATHER_POLL_MS = 5 * 60 * 1000;

function useKSCWeather() {
  const [weather,   setWeather]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const c    = data.current;
      setWeather({
        tempF:    Math.round(c.temperature_2m),
        windMph:  Math.round(c.wind_speed_10m),
        gustMph:  Math.round(c.wind_gusts_10m),
        cloudPct: c.cloud_cover,
        precipIn: c.precipitation,
        code:     c.weather_code,
      });
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, WEATHER_POLL_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  return { weather, loading, error, lastFetch, refetch: fetch_ };
}

function weatherDesc(code) {
  if (code === 0)  return "Clear";
  if (code <= 3)   return "Partly Cloudy";
  if (code <= 49)  return "Fog";
  if (code <= 59)  return "Drizzle";
  if (code <= 69)  return "Rain";
  if (code <= 79)  return "Snow";
  if (code <= 82)  return "Showers";
  if (code <= 99)  return "Thunderstorm";
  return "Unknown";
}

function windConstraint(mph, gust) {
  if (gust > 34)              return "error";
  if (gust > 25 || mph > 20)  return "warning";
  return "go";
}

function cloudConstraint(pct) {
  if (pct > 80) return "error";
  if (pct > 50) return "warning";
  return "go";
}

// ─── KSC Weather Panel ────────────────────────────────────────────────────
function KSCWeatherPanel({ wx }) {
  const { weather: w, loading, error, lastFetch, refetch } = wx;
  const windState   = w ? windConstraint(w.windMph, w.gustMph) : "nominal";
  const cloudState  = w ? cloudConstraint(w.cloudPct) : "nominal";
  const precipState = w && w.precipIn > 0 ? "warning" : "go";
  const overallState = [windState, cloudState, precipState].includes("error") ? "error"
    : [windState, cloudState, precipState].includes("warning") ? "warning" : "go";
  const rows = w ? [
    { label: "Overall", value: overallState === "go" ? "Favorable" : overallState === "warning" ? "Marginal" : "Unfavorable", state: overallState },
    { label: "Sky",     value: `${weatherDesc(w.code)} · ${w.cloudPct}%`, state: cloudState },
    { label: "Wind",    value: `${w.windMph} mph`,  state: windState },
    { label: "Gusts",   value: `${w.gustMph} mph`,  state: windState },
    { label: "Precip",  value: `${w.precipIn}"`,    state: precipState },
    { label: "Temp",    value: `${w.tempF}°F`,       state: "nominal" },
  ] : [
    { label: "Overall", value: "—", state: "nominal" },
    { label: "Sky",     value: "—", state: "nominal" },
    { label: "Wind",    value: "—", state: "nominal" },
    { label: "Gusts",   value: "—", state: "nominal" },
    { label: "Precip",  value: "—", state: "nominal" },
    { label: "Temp",    value: "—", state: "nominal" },
  ];
  return (
    <div className="mc-sidebar-section">
      <div className="mc-section-header">
        <div className="mc-section-title">KSC Weather</div>
        {loading && <span className="mc-loading-dot">●</span>}
        {w && !error && <span className="mc-section-badge live">LIVE</span>}
        {error && <span className="mc-section-badge" style={{ color: "var(--color-red)" }}>ERR</span>}
        <div style={{ marginLeft: "auto" }}>
          <button className="mc-btn-icon" onClick={refetch} disabled={loading} title="Refresh weather">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
          </button>
        </div>
      </div>
      <div className="flex-col gap-12">
        {rows.map(item => (
          <div key={item.label} className="mc-status-row">
            <span className="mc-status-label">{item.label}</span>
            <div className="mc-status-value">
              <span className={`mc-status-dot ${item.state}`} />
              <span className="mc-status-text">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
      {lastFetch && (
        <div className="mc-sync-time">
          Updated {lastFetch.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · Pad 39B
        </div>
      )}
    </div>
  );
}

// ─── Mission Status Panel ─────────────────────────────────────────────────
function MissionStatusPanel({ ll2 }) {
  const { ll2Status: st, ll2Loading, ll2Error, ll2LastFetch, refetch } = ll2;
  const rows = st ? [
    { label: "Status",     ...st.launchStatus },
    { label: "Vehicle",    ...st.vehicle      },
    { label: "Spacecraft", ...st.spacecraft   },
    { label: "Weather",    ...st.weather      },
    { label: "Range",      ...st.range        },
    { label: "Pad",        ...st.pad          },
    { label: "Orbit",      ...st.orbit        },
    { label: "Window",     ...st.window       },
  ] : [
    { label: "Vehicle",    value: "SLS Block 1", state: "nominal" },
    { label: "Spacecraft", value: "Orion",       state: "nominal" },
    { label: "Weather",    value: "—",           state: "nominal" },
    { label: "Range",      value: "—",           state: "nominal" },
    { label: "Pad",        value: "LC-39B",      state: "nominal" },
    { label: "Orbit",      value: "Translunar",  state: "nominal" },
    { label: "Window",     value: "2 hr",        state: "nominal" },
  ];
  return (
    <div className="mc-sidebar-section">
      <div className="mc-section-header">
        <div className="mc-section-title">Mission Status</div>
        {ll2Loading && <span className="mc-loading-dot">●</span>}
        {st && !ll2Error && <span className="mc-section-badge live">LL2</span>}
        {ll2Error && <span className="mc-section-badge" style={{ color: "var(--color-red)" }}>ERR</span>}
        <div style={{ marginLeft: "auto" }}>
          <button className="mc-btn-icon" onClick={refetch} disabled={ll2Loading} title="Refresh from Launch Library 2">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
          </button>
        </div>
      </div>
      {st?.holdReason && (
        <div style={{ background: "rgba(240,71,71,0.08)", border: "1px solid rgba(240,71,71,0.2)", borderRadius: 4, padding: "6px 8px", marginBottom: 10, fontSize: 10, color: "var(--color-red)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
          HOLD: {st.holdReason}
        </div>
      )}
      {st?.weatherConcerns && (
        <div style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.15)", borderRadius: 4, padding: "5px 8px", marginBottom: 10, fontSize: 10, color: "var(--color-amber)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
          ⚠ {st.weatherConcerns}
        </div>
      )}
      <div className="flex-col gap-12">
        {rows.map((item) => (
          <div key={item.label} className="mc-status-row">
            <span className="mc-status-label">{item.label}</span>
            <div className="mc-status-value">
              <span className={`mc-status-dot ${item.state}`} />
              <span className="mc-status-text">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
      {ll2LastFetch && (
        <div className="mc-sync-time">
          LL2 synced {ll2LastFetch.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          {st?.lastUpdated && <> · updated {st.lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
        </div>
      )}
      {ll2Error && <div className="mc-sync-time" style={{ color: "var(--color-red)" }}>LL2 unavailable — retrying in 5m</div>}
    </div>
  );
}

// ─── Mission Milestones ───────────────────────────────────────────────────
// Sources:
//   Ascent MET: NASA Artemis II launch day blog + New Space Economy summary
//   Orbit/departure: NASA blog confirmed updates as of Apr 2, 2026
//   TLI: Planetary Society confirmed ~4:57 PM PT Apr 2 (00:12 UTC Apr 3)
//   Outbound TCMs: Planetary Society "Days 3–5 three corrections"; mid-day estimates
//   Lunar flyby: NASA coverage schedule (Apr 6); distance record 1:45 PM EDT Apr 6
//   Return TCMs: NASA daily agenda Days 7–9; Planetary Society structure
//   Splashdown: NASA public schedule 8:06 PM EDT Apr 10 = 00:06 UTC Apr 11
// confirmed:true  = executed, verified by NASA
// confirmed:false = planned/estimated, subject to change
const LIFTOFF_T = WINDOW_OPEN; // April 1, 2026 6:35:12 PM EDT = 22:35:12 UTC
const met = (h, m, s = 0) => {
  const base = new Date(LIFTOFF_T).getTime();
  return new Date(base + ((h * 3600) + (m * 60) + s) * 1000).toISOString();
};

const MILESTONES = [
  // ── Ascent ────────────────────────────────────────────────────────────
  { id: "liftoff",  label: "Liftoff",            t: LIFTOFF_T,         confirmed: true  },
  { id: "maxq",     label: "Max-Q",              t: met(0, 1, 12),     confirmed: true  },
  { id: "srbsep",   label: "Booster Sep",        t: met(0, 2, 9),      confirmed: true  },
  { id: "lasjett",  label: "LAS Jettison",       t: met(0, 3, 13),     confirmed: true  },
  { id: "meco",     label: "Core MECO",          t: met(0, 8, 2),      confirmed: true  },
  { id: "cssep",    label: "Core Stage Sep",     t: met(0, 8, 14),     confirmed: true  },
  { id: "sawdeploy",label: "Solar Arrays",       t: met(0, 18, 0),     confirmed: true  },
  // ── Earth orbit ───────────────────────────────────────────────────────
  { id: "icpsburn2",label: "ICPS Orbit Burn",    t: met(1, 48, 0),     confirmed: true  },
  { id: "icpssep",  label: "ICPS Separation",    t: met(3, 0, 0),      confirmed: true  },
  { id: "proxops",  label: "Prox Ops Begin",     t: met(3, 24, 15),    confirmed: true  },
  { id: "proxend",  label: "Prox Ops End",       t: met(4, 30, 0),     confirmed: true  },
  { id: "arb",      label: "Apogee Raise Burn",  t: met(5, 30, 0),     confirmed: true  },
  { id: "prm2",     label: "Perigee Raise Burn", t: "2026-04-02T11:09:00Z", confirmed: true },
  // ── Departure ─────────────────────────────────────────────────────────
  { id: "tli",      label: "Trans-Lunar Injection", t: "2026-04-03T00:12:00Z", confirmed: true },
  // ── Outbound coast — 3 trajectory corrections (Days 3–5) ─────────────
  { id: "tcm1",     label: "Outbound TCM-1",     t: "2026-04-04T14:00:00Z", confirmed: false },
  { id: "tcm2",     label: "Outbound TCM-2",     t: "2026-04-05T14:00:00Z", confirmed: false },
  { id: "tcm3",     label: "Outbound TCM-3",     t: "2026-04-06T00:00:00Z", confirmed: false },
  // ── Lunar encounter ───────────────────────────────────────────────────
  { id: "loientry", label: "Lunar SOI Entry",    t: "2026-04-06T06:00:00Z", confirmed: false },
  { id: "distrecord",label: "Distance Record",   t: "2026-04-06T17:45:00Z", confirmed: false },
  { id: "lunar",    label: "Lunar Flyby",        t: "2026-04-06T20:00:00Z", confirmed: false },
  { id: "commsout", label: "Comms Blackout",     t: "2026-04-06T19:30:00Z", confirmed: false },
  { id: "commback", label: "Comms Restored",     t: "2026-04-06T20:30:00Z", confirmed: false },
  // ── Return coast — 3 trajectory corrections (Days 7–9) ───────────────
  { id: "rtcm1",    label: "Return TCM-1",       t: "2026-04-07T18:00:00Z", confirmed: false },
  { id: "rtcm2",    label: "Return TCM-2",       t: "2026-04-08T18:00:00Z", confirmed: false },
  { id: "rtcm3",    label: "Return TCM-3",       t: "2026-04-09T18:00:00Z", confirmed: false },
  // ── Entry & recovery ──────────────────────────────────────────────────
  { id: "smsep",    label: "SM Separation",      t: "2026-04-11T00:00:00Z", confirmed: false },
  { id: "entry",    label: "Reentry",            t: "2026-04-11T00:02:00Z", confirmed: false },
  { id: "splashdown",label: "Splashdown",        t: "2026-04-11T00:06:00Z", confirmed: false },
];

function MilestonesTimeline({ targetOverride }) {
  const [now, setNow]                   = useState(Date.now());
  const [scrollOffset, setScrollOffset] = useState(0);
  const [animOffset, setAnimOffset]     = useState(0);   // smoothly-animated display offset
  const [svgWidth, setSvgWidth]         = useState(260);
  const containerRef = useRef(null);
  const drag         = useRef({ active: false, startX: 0, startOffset: 0, velX: 0, lastX: 0, lastT: 0 });
  const rafRef       = useRef(null);
  const animRaf      = useRef(null);   // separate rAF loop for display animation


  // Measure container width synchronously before paint, then keep watching
  const measureWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Walk up to the nearest element with a stable width (the section card)
    const section = el.closest('.mc-timeline-section') || el.parentElement || el;
    const rect = section.getBoundingClientRect();
    if (rect.width > 10) setSvgWidth(rect.width);
  }, []);

  // useLayoutEffect runs synchronously after DOM mutations — catches correct width
  useLayoutEffect(() => {
    measureWidth();
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const section = el.closest('.mc-timeline-section') || el.parentElement || el;
    const ro = new ResizeObserver(measureWidth);
    ro.observe(section);
    return () => ro.disconnect();
  }, [measureWidth]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Animate display offset — lerps toward scrollOffset every frame for smooth motion
  useEffect(() => {
    let animVal = scrollOffset;
    const loop = () => {
      setAnimOffset(prev => {
        const diff = scrollOffset - prev;
        if (Math.abs(diff) < 0.0008) {
          animVal = scrollOffset;
          return scrollOffset; // settled
        }
        animVal = prev + diff * 0.12; // ease factor: lower = smoother/slower
        return animVal;
      });
      animRaf.current = requestAnimationFrame(loop);
    };
    animRaf.current = requestAnimationFrame(loop);
    return () => { if (animRaf.current) cancelAnimationFrame(animRaf.current); };
  }, [scrollOffset]);

  const originalLiftoffMs = new Date(MILESTONES.find(m => m.id === "liftoff").t).getTime();
  const adjustedLiftoffMs = targetOverride ? new Date(targetOverride).getTime() : originalLiftoffMs;
  const offset            = adjustedLiftoffMs - originalLiftoffMs;
  const launched          = now >= adjustedLiftoffMs;

  const activeIdx = MILESTONES.reduce((acc, m, i) =>
    now >= new Date(m.t).getTime() + offset ? i : acc, -1);

  // Focus: next incomplete milestone, or last milestone if all done
  const focusIdx = activeIdx < MILESTONES.length - 1
    ? activeIdx + 1
    : activeIdx >= 0 ? activeIdx : 0;



  const fmtRel = (ms) => {
    const abs = Math.abs(ms);
    const s   = Math.floor(abs / 1000) % 60;
    const m_  = Math.floor(abs / 60000) % 60;
    const h   = Math.floor(abs / 3600000) % 24;
    const d   = Math.floor(abs / 86400000);
    if (d > 0)  return m_ > 0 ? `${d}d ${h}h ${m_}m` : `${d}d ${h}h`;
    if (h > 0)  return `${h}h ${m_}m`;
    if (m_ > 0) return `${m_}m ${s}s`;
    return `${s}s`;
  };

  // ── Arc geometry (recomputed when svgWidth changes) ────────────────────
  const W          = svgWidth;
  const H          = 163;
  const CX         = W / 2;
  const ARC_PEAK_Y = 72;    // y at arc peak (centre node)
  const ARC_BASE_Y = 110;   // y at arc base (far edges)
  const NODE_STEP  = 62;    // px per milestone in view-space
  const HALF_SPAN  = W / 2;

  const nodePos = (i) => {
    const vx   = (i - animOffset) * NODE_STEP;
    const svgX = CX + vx;
    const norm = Math.min(1, Math.abs(vx) / HALF_SPAN);
    const svgY = ARC_PEAK_Y + (ARC_BASE_Y - ARC_PEAK_Y) * norm * norm;
    return { svgX, svgY };
  };

  const buildArcPath = () => {
    const steps = 120;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const svgX = (s / steps) * W;
      const vx   = svgX - CX;
      const norm = Math.min(1, Math.abs(vx) / HALF_SPAN);
      const svgY = ARC_PEAK_Y + (ARC_BASE_Y - ARC_PEAK_Y) * norm * norm;
      d += s === 0 ? `M ${svgX.toFixed(1)} ${svgY.toFixed(1)}` : ` L ${svgX.toFixed(1)} ${svgY.toFixed(1)}`;
    }
    return d;
  };

  // ── Drag + inertia + snap ──────────────────────────────────────────────
  // Single unified physics ref: offset, velocity, snap target, phase
  const physics = useRef({ offset: 0, vel: 0, snapTarget: null, phase: 'idle' });

  const clamp = (v) => Math.max(0, Math.min(MILESTONES.length - 1, v));

  // Commit physics offset to React state (called every rAF tick)
  const commitOffset = useCallback((val) => {
    setScrollOffset(clamp(val));
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    physics.current.phase = 'idle';
  }, []);

  const runLoop = useCallback(() => {
    const p = physics.current;

    if (p.phase === 'inertia') {
      // Gradually decelerate — friction coefficient gives ~600ms half-life at 60fps
      p.vel *= 0.96;
      p.offset += p.vel;
      p.offset = clamp(p.offset);
      commitOffset(p.offset);

      // Switch to snap once velocity is low enough
      if (Math.abs(p.vel) < 0.012) {
        p.snapTarget = clamp(Math.round(p.offset));
        p.vel = 0;
        p.phase = 'snap';
      }
      rafRef.current = requestAnimationFrame(runLoop);

    } else if (p.phase === 'snap') {
      const diff = p.snapTarget - p.offset;
      if (Math.abs(diff) < 0.0015) {
        // Settled — lock exactly on target
        p.offset = p.snapTarget;
        commitOffset(p.offset);
        stopLoop();
        return;
      }
      // Exponential ease-out: approaches target asymptotically, feels natural
      p.offset += diff * 0.09;
      commitOffset(p.offset);
      rafRef.current = requestAnimationFrame(runLoop);
    }
  }, [commitOffset, stopLoop]);

  const launchInertia = useCallback((vel) => {
    const p = physics.current;
    stopLoop();
    p.vel    = vel;
    p.phase  = 'inertia';
    rafRef.current = requestAnimationFrame(runLoop);
  }, [runLoop, stopLoop]);

  const launchSnap = useCallback((target) => {
    const p = physics.current;
    stopLoop();
    p.snapTarget = clamp(Math.round(target));
    p.phase      = 'snap';
    rafRef.current = requestAnimationFrame(runLoop);
  }, [runLoop, stopLoop]);

  // Snap to focus milestone on mount and when active milestone changes
  useEffect(() => {
    physics.current.offset = focusIdx;
    launchSnap(focusIdx);
  }, [focusIdx]); // eslint-disable-line

  const onPointerDown = useCallback((e) => {
    stopLoop();
    // Sample offset from physics ref so it's current even mid-animation
    drag.current = {
      active:      true,
      startX:      e.clientX,
      startOffset: physics.current.offset,
      // Rolling velocity samples (last 3 frames)
      samples:     [],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [stopLoop]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current.active) return;
    const d       = drag.current;
    const now_    = performance.now();
    const newOff  = clamp(d.startOffset - (e.clientX - d.startX) / NODE_STEP);

    // Rolling velocity: px/ms → offset/frame (at 60fps = 16.7ms)
    d.samples.push({ x: e.clientX, t: now_ });
    if (d.samples.length > 4) d.samples.shift();

    physics.current.offset = newOff;
    commitOffset(newOff);
  }, [commitOffset]);

  const onPointerUp = useCallback((e) => {
    if (!drag.current.active) return;
    drag.current.active = false;

    const d       = drag.current;
    const samples = d.samples;
    let vel       = 0;

    // Compute velocity from last two samples, scaled to offset units per frame
    if (samples.length >= 2) {
      const s1 = samples[samples.length - 2];
      const s2 = samples[samples.length - 1];
      const dt = Math.max(1, s2.t - s1.t);
      const dx = s2.x - s1.x;
      // px/ms → offset/frame: divide by NODE_STEP, multiply by 16.7ms/frame
      vel = -(dx / dt) * (16.7 / NODE_STEP);
    }

    if (Math.abs(vel) < 0.04) {
      // Barely moved — snap directly to nearest
      launchSnap(physics.current.offset);
    } else {
      launchInertia(vel);
    }
  }, [launchInertia, launchSnap]);


  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Non-passive native wheel listener so we can preventDefault and stop sidebar scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      const dx = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      e.stopPropagation();

      stopLoop();
      const newOffset = clamp(physics.current.offset + dx / NODE_STEP);
      physics.current.offset = newOffset;
      setScrollOffset(newOffset);

      clearTimeout(handler._t);
      handler._t = setTimeout(() => launchSnap(physics.current.offset), 180);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [clamp, stopLoop, launchSnap]);

  // Label zones — fixed y positions in SVG space
  const ABOVE_NAME_Y = 22;
  const ABOVE_TIME_Y = 35;
  const BELOW_NAME_Y = 140;
  const BELOW_TIME_Y = 153;
  const TICK_GAP     = 5;

  const arcPath = buildArcPath();

  return (
    <div className="mc-sidebar-section mc-timeline-section">
      <div className="mc-section-header">
        <div className="mc-section-title">Mission Timeline</div>
        {launched && <span className="mc-section-badge live" style={{ animation: "pulse 1.2s infinite" }}>LIVE</span>}
      </div>

      <div
        ref={containerRef}
        className="mc-timeline-viewport"
        style={{ height: H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", userSelect: "none" }}
        >
          <g>
            {/* Arc track */}
            <path
              d={arcPath}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Nodes + labels */}
            {MILESTONES.map((m, i) => {
              const { svgX, svgY } = nodePos(i);
              if (svgX < -60 || svgX > W + 60) return null;

              const ms       = new Date(m.t).getTime() + offset;
              const passed   = now >= ms;
              const isActive = i === activeIdx;
              const isNext   = i === activeIdx + 1;
              const diff     = ms - now;

              const above     = i % 2 === 0;
              const dotR      = isActive ? 7 : isNext ? 5.5 : 4.5;
              const tickStart = above ? svgY - dotR - TICK_GAP : svgY + dotR + TICK_GAP;
              const tickEnd   = above ? ABOVE_NAME_Y + 16 : BELOW_NAME_Y - 14;
              const nameY     = above ? ABOVE_NAME_Y : BELOW_NAME_Y;
              const timeY     = above ? ABOVE_TIME_Y : BELOW_TIME_Y;

              const confirmed = m.confirmed !== false; // true = confirmed event
              const dotFill   = isActive ? "var(--color-green)"
                : isNext      ? "var(--color-amber)"
                : passed      ? "rgba(255,255,255,0.25)"
                : confirmed   ? "rgba(255,255,255,0.15)"
                :                "transparent";

              const dotStroke = isActive ? "none"
                : isNext      ? "none"
                : !confirmed  ? "rgba(255,255,255,0.35)"
                :                "rgba(255,255,255,0.3)";

              const labelCol  = isActive ? "var(--color-green)"
                : isNext      ? "#fff"
                : passed      ? "var(--color-text-dim)"
                :                "var(--color-text-muted)";

              const timeCol   = isActive ? "var(--color-green)"
                : isNext      ? "var(--color-amber)"
                :                "var(--color-text-ghost)";

              const timeLabel = passed
                ? `T+${fmtRel(now - ms)}`
                : confirmed
                  ? `T-${fmtRel(Math.abs(diff))}`
                  : `~T-${fmtRel(Math.abs(diff))}`;

              // Fade by distance from centre
              const dist    = Math.abs(svgX - CX);
              const distOp  = Math.max(0.12, 1 - (dist / (HALF_SPAN * 0.85)) * 0.78);
              const opacity = (passed && !isActive ? 0.55 : 1) * distOp;

              return (
                <g key={m.id} style={{ opacity, transition: "opacity 0.15s" }}>
                  {/* Tick */}
                  <line
                    x1={svgX} y1={tickStart} x2={svgX} y2={tickEnd}
                    stroke={isActive ? "var(--color-green)" : "rgba(255,255,255,0.2)"}
                    strokeWidth={isActive ? 2 : 1.5}
                  />

                  {/* Active outer ring */}
                  {isActive && (
                    <circle cx={svgX} cy={svgY} r={dotR + 7}
                      fill="none" stroke="var(--color-green)" strokeWidth="1.5" opacity="0.4" />
                  )}

                  {/* Dot */}
                  <circle cx={svgX} cy={svgY} r={dotR}
                    fill={dotFill} stroke={dotStroke} strokeWidth="1.5" />

                  {/* Name */}
                  <text x={svgX} y={nameY} textAnchor="middle"
                    fill={labelCol} fontSize="9.5" fontFamily="var(--font-sans)"
                    fontWeight={isActive || isNext ? "700" : "500"}>
                    {m.label}
                  </text>

                  {/* Time */}
                  <text x={svgX} y={timeY} textAnchor="middle"
                    fill={timeCol} fontSize="8" fontFamily="var(--font-mono)">
                    {timeLabel}
                  </text>
                </g>
              );
            })}
          </g>


        </svg>
      </div>
    </div>
  );
}

// ─── Live Updates Feed ────────────────────────────────────────────────────
function LiveUpdatesFeed({ updates, loading, isLive, fetchError, lastUpdated, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const dotColor = fetchError ? "var(--color-red)" : isLive ? "var(--color-green)" : "var(--color-amber)";
  return (
    <div className="mc-sidebar-section">
      <div className="mc-section-header">
        <div className="mc-section-title">Launch Updates</div>
        <span className="mc-section-badge pulse" style={{ color: dotColor }}>●</span>
        {loading && <span className="font-mono text-faint" style={{ fontSize: 9 }}>syncing…</span>}
        {fetchError && !loading && <span className="font-mono" style={{ fontSize: 9, color: "var(--color-red)" }}>no feed</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button className="mc-btn-icon" onClick={onRefresh} disabled={loading} title="Refresh now">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>refresh</span>
          </button>
          <button className="mc-btn-icon" onClick={() => setExpanded(!expanded)} title={expanded ? "Collapse" : "Expand"}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {expanded ? "expand_more" : "chevron_right"}
            </span>
          </button>
        </div>
      </div>
      {lastUpdated && (
        <div className="mc-sync-time" style={{ marginTop: -8, marginBottom: 10, textAlign: "left", width: "100%" }}>
          Content changed {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      )}
      {expanded && (
        <div className="flex-col gap-20" style={{ width: "100%", alignItems: "flex-start" }}>
          {updates.map((u, i) => (
            <div key={i} className="mc-update-item" style={{ alignItems: "flex-start", width: "100%" }}>
              <div className="mc-update-meta" style={{ alignItems: "flex-start", width: "100%", justifyContent: "flex-start" }}>
                <span className="mc-update-time">{u.time}</span>
                {i === 0 && <span className={`mc-update-badge ${isLive ? "ai" : "default"}`}>LATEST</span>}
              </div>
              <div className="mc-update-headline">{u.headline}</div>
              {u.detail && <div className="mc-update-detail">{u.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Draggable Stream Grid ────────────────────────────────────────────────
function DraggableStreamGrid({ streams, setStreams, layout, iframeKey, onToggleMute, onRemove, featuredId, onFeature, isMobile, isLandscape }) {
  const [previewStreams, setPreviewStreams] = useState(streams);
  const [draggingId,    setDraggingId]     = useState(null);
  const stableIdsRef  = useRef(streams.map((s) => s.id));
  const touchDragRef  = useRef({ active: false, id: null, startX: 0, startY: 0 });
  const containerRef  = useRef(null);

  const currentIds = streams.map((s) => s.id);
  stableIdsRef.current = stableIdsRef.current.filter((id) => currentIds.includes(id));
  currentIds.forEach((id) => { if (!stableIdsRef.current.includes(id)) stableIdsRef.current.push(id); });

  useEffect(() => {
    if (!draggingId) setPreviewStreams(streams);
  }, [streams, draggingId]);

  const getGridStyle = () => {
    // Portrait mobile: CSS handles layout entirely
    if (isMobile && !isLandscape) return {};

    const c = previewStreams.length;

    // ── Landscape phone: layout-aware, height:auto, aspect-ratio drives cell height ──
    if (isLandscape) {
      const gap = 5;
      if (layout === "gallery") {
        // 2 columns, equal width
        const cols = c <= 1 ? 1 : 2;
        return { display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap, height: "auto" };
      }
      if (layout === "triple") {
        // Up to 3 columns
        const cols = Math.min(3, Math.max(1, c));
        return { display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap, height: "auto" };
      }
      if (layout === "speaker" && c > 1) {
        // Main (left, 2/3) + sidebar column (right, 1/3)
        // Sidebar stacks remaining streams vertically
        return {
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gridTemplateRows: `repeat(${c - 1}, auto)`,
          gap,
          height: "auto",
          alignItems: "start",
        };
      }
      if (layout === "cinema" && c > 1) {
        // Main stream on top (full width), thumbnails row below
        const thumbCols = c - 1;
        return {
          display: "grid",
          gridTemplateColumns: `repeat(${thumbCols}, minmax(0,1fr))`,
          gridTemplateRows: "auto auto",
          gap,
          height: "auto",
        };
      }
      // Fallback / single stream
      return { display: "grid", gridTemplateColumns: "1fr", gap, height: "auto" };
    }

    // ── Desktop ────────────────────────────────────────────────────────────
    if (layout === "speaker") return {
      display: "grid",
      gridTemplateColumns: c > 1 ? "minmax(0,1fr) 280px" : "minmax(0,1fr)",
      gridTemplateRows: c > 1 ? `repeat(${c-1},minmax(0,1fr))` : "100%",
      gap: 8, height: "100%",
    };
    if (layout === "cinema") return {
      display: "grid",
      gridTemplateColumns: c > 1 ? `repeat(${c-1},minmax(0,1fr))` : "1fr",
      gridTemplateRows: c > 1 ? "minmax(0,3fr) minmax(0,1fr)" : "100%",
      gap: 8, height: "100%",
    };
    const cols = layout === "triple" ? Math.min(3, c) : c <= 1 ? 1 : 2;
    const rows = Math.ceil(c / cols) || 1;
    return {
      display: "grid",
      gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
      gridTemplateRows: `repeat(${rows},minmax(0,1fr))`,
      gap: 8, height: "100%",
    };
  };

  const getItemStyle = (visualIdx, cnt) => {
    // Portrait mobile: CSS handles it
    if (isMobile && !isLandscape) return {};

    // ── Landscape: each wrapper uses aspect-ratio 16/9 except where overridden ──
    if (isLandscape) {
      const base = { width: "100%", height: "auto", aspectRatio: "16/9", minHeight: 0, minWidth: 0 };

      if (layout === "speaker" && cnt > 1) {
        if (visualIdx === 0) {
          // Main: left column, spans all sidebar rows
          return { ...base, gridColumn: "1 / 2", gridRow: `1 / span ${cnt - 1}` };
        }
        // Sidebar thumbnails: right column, each in its own row
        return { ...base, gridColumn: "2 / 3", gridRow: `${visualIdx} / span 1` };
      }

      if (layout === "cinema" && cnt > 1) {
        if (visualIdx === 0) {
          // Main: full width top row
          return { ...base, gridColumn: "1 / -1", gridRow: "1 / 2" };
        }
        // Thumbnails: bottom row, share columns
        return { ...base, gridRow: "2 / 3" };
      }

      return base;
    }

    // ── Desktop ────────────────────────────────────────────────────────────
    let s = { minHeight: 0, minWidth: 0, height: "100%", width: "100%" };
    if (layout === "speaker" && cnt > 1) {
      if (visualIdx === 0) s = { ...s, gridColumn: "1/2", gridRow: `1/span ${cnt-1}` };
      else s = { ...s, gridColumn: "2/3" };
    } else if (layout === "cinema" && cnt > 1) {
      if (visualIdx === 0) s = { ...s, gridColumn: "1/-1", gridRow: "1/2" };
      else s = { ...s, gridRow: "2/3" };
    }
    return s;
  };

  const handleDragStart = useCallback((e, s) => {
    setDraggingId(s.id);
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }, []);

  const handleDragOver = useCallback((e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggingId || draggingId === targetId) return;
    setPreviewStreams((prev) => {
      const fromIdx = prev.findIndex((x) => x.id === draggingId);
      const toIdx   = prev.findIndex((x) => x.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, [draggingId]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setStreams(previewStreams);
    setDraggingId(null);
  }, [previewStreams, setStreams]);

  const getElementIdAtPoint = useCallback((x, y, excludeId) => {
    const draggingEl = containerRef.current?.querySelector(`[data-stream-id="${excludeId}"]`);
    if (draggingEl) draggingEl.style.pointerEvents = "none";
    const el = document.elementFromPoint(x, y);
    if (draggingEl) draggingEl.style.pointerEvents = "";
    if (!el) return null;
    const wrapper = el.closest("[data-stream-id]");
    return wrapper ? wrapper.getAttribute("data-stream-id") : null;
  }, []);

  const handleTouchStart = useCallback((e, streamId) => {
    const touch = e.touches[0];
    touchDragRef.current = { active: false, id: streamId, startX: touch.clientX, startY: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e) => {
    const ref = touchDragRef.current;
    if (!ref.id) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - ref.startX);
    const dy = Math.abs(touch.clientY - ref.startY);
    if (!ref.active && (dx > 8 || dy > 8)) { ref.active = true; setDraggingId(ref.id); }
    if (!ref.active) return;
    e.preventDefault();
    const targetId = getElementIdAtPoint(touch.clientX, touch.clientY, ref.id);
    if (targetId && targetId !== ref.id) {
      setPreviewStreams((prev) => {
        const fromIdx = prev.findIndex((x) => x.id === ref.id);
        const toIdx   = prev.findIndex((x) => x.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
    }
  }, [getElementIdAtPoint]);

  const handleTouchEnd = useCallback(() => {
    if (touchDragRef.current.active) setStreams(previewStreams);
    touchDragRef.current = { active: false, id: null, startX: 0, startY: 0 };
    setDraggingId(null);
  }, [previewStreams, setStreams]);

  if (previewStreams.length === 0) return (
    <div className="mc-empty-state">
      <span className="material-symbols-outlined">satellite_alt</span>
      <span style={{ fontSize: 13 }}>No streams active</span>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={getGridStyle()}
      onDragOver={!isMobile ? (e) => e.preventDefault() : undefined}
      onDrop={!isMobile ? handleDrop : undefined}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {stableIdsRef.current.map((id) => {
        const streamData  = streams.find((s) => s.id === id);
        if (!streamData) return null;
        const visualIndex = previewStreams.findIndex((p) => p.id === id);
        if (visualIndex === -1) return null;

        const mobileClass = isMobile
          ? featuredId === id ? "is-featured" : featuredId ? "is-collapsed" : ""
          : "";

        return (
          <div
            key={id}
            data-stream-id={id}
            data-main={isLandscape && visualIndex === 0 && (layout === "speaker" || layout === "cinema") && previewStreams.length > 1 ? "true" : undefined}
            style={(isMobile && !isLandscape) ? {} : { ...getItemStyle(visualIndex, previewStreams.length), order: isLandscape ? undefined : visualIndex }}
            className={`mc-stream-wrapper ${draggingId === id ? "is-active-drag" : ""} ${mobileClass}`}
            draggable={!isMobile && !isLandscape}
            onDragStart={!isMobile ? (e) => handleDragStart(e, streamData) : undefined}
            onDragOver={!isMobile ? (e) => handleDragOver(e, id) : undefined}
            onDrop={!isMobile ? handleDrop : undefined}
            onDragEnd={!isMobile ? () => setDraggingId(null) : undefined}
            onTouchStart={(e) => handleTouchStart(e, id)}
          >
            <StreamCard
              stream={streamData}
              iframeKey={iframeKey}
              onToggleMute={onToggleMute}
              onRemove={onRemove}
              isDragging={draggingId === id}
              isAnyDragging={!!draggingId}
              onTapLabel={() => onFeature(featuredId === id ? null : id)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Mobile Bottom Sheet Sidebar ─────────────────────────────────────────
function MobileSidebar({ open, onClose, children }) {
  return (
    <>
      {open && <div className="mc-mobile-backdrop" onClick={onClose} />}
      <div className={`mc-mobile-sheet ${open ? "is-open" : ""}`}>
        <div className="mc-mobile-sheet-handle" onClick={onClose}>
          <div className="mc-mobile-sheet-pill" />
        </div>
        <div className="mc-mobile-sheet-content">
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Mobile Bottom Nav Bar — iOS HIG style ────────────────────────────────
function MobileNavBar({ onAddStream, onRefresh, streamCount, onInfo }) {
  // Each tab: 49px content + safe-area. Icon 24px, label 10px, gap 3px.
  const btnStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    // 49px matches Apple's HIG tab bar content height
    height: 49,
    padding: "6px 0 4px",
    WebkitTapHighlightColor: "transparent",
    minWidth: 0,
    flexShrink: 0,
  };
  const labelStyle = {
    fontSize: 10,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    letterSpacing: "0.2px",
    lineHeight: 1,
    color: "var(--color-text-muted)",
  };

  return (
    <nav className="mc-mobile-nav-bar">
      <button style={btnStyle} onClick={onRefresh}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>refresh</span>
        <span style={labelStyle}>Reload</span>
      </button>

      <button style={btnStyle} onClick={onAddStream}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add_circle</span>
        <span style={labelStyle}>Add Feed</span>
      </button>

      {/* Center: live feed count */}
      <div style={{ ...btnStyle, cursor: "default" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          lineHeight: 1,
        }}>
          {streamCount}
        </span>
        <span style={{ ...labelStyle, fontSize: 10 }}>
          {streamCount === 1 ? "Feed" : "Feeds"}
        </span>
      </div>

      <button style={btnStyle} onClick={onInfo}>
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>info</span>
        <span style={labelStyle}>Details</span>
      </button>
    </nav>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function MissionControl() {
  const [streams, setStreams] = useState(() => {
    try {
      const saved = localStorage.getItem("mc-saved-streams");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load saved streams", e);
    }
    return DEFAULT_STREAMS;
  });

  const [layout,          setLayout]          = useState("gallery");
  const [showAdd,         setShowAdd]         = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [sidebarOpening, setSidebarOpening] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [targetOverride,  setTargetOverride]  = useState(null);
  const [iframeKey,       setIframeKey]       = useState(0);
  const [featuredId,      setFeaturedId]      = useState(null);

  const isMobile    = useIsMobile();
  const isLandscape = useIsLandscape();

  const nasaData = useNASALiveData();
  const ll2      = useLL2LaunchData();
  const wx       = useKSCWeather();

  useEffect(() => {
    localStorage.setItem("mc-saved-streams", JSON.stringify(streams));
  }, [streams]);

  const toggleMute   = useCallback((id) => { setStreams((p) => p.map((s) => s.id === id ? { ...s, muted: !s.muted } : s)); }, []);
  const removeStream = useCallback((id) => { setStreams((p) => p.filter((s) => s.id !== id)); }, []);
  const addStream    = useCallback((s)  => { setStreams((p) => [...p, s]); }, []);
  const resetStreams  = useCallback(() => {
    setStreams(DEFAULT_STREAMS);
    localStorage.removeItem("mc-saved-streams");
  }, []);

  const handleSidebarToggle = () => {
    if (sidebarOpen) {
      setSidebarClosing(true);
      setTimeout(() => { setSidebarOpen(false); setSidebarClosing(false); }, 300);
    } else {
      setSidebarOpen(true);
      setSidebarOpening(true);
      setTimeout(() => setSidebarOpening(false), 20);
    }
  };

  const sidebarContent = (
    <>
      <KSCWeatherPanel wx={wx} />
      <MilestonesTimeline targetOverride={targetOverride} />

      <div className="mc-sidebar-section" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div className="mc-section-title" style={{ marginBottom: 14 }}>Crew</div>
        <div className="mc-crew-list">
          {CREW.map((c) => (
            <div key={c.name} className="flex-col" style={{ gap: 2, alignItems: "flex-start", width: "100%" }}>
              <span className="mc-crew-name">{c.name}</span>
              <span className="mc-crew-role">{c.role}</span>
            </div>
          ))}
        </div>
      </div>

      <LiveUpdatesFeed
        updates={nasaData.updates}
        loading={nasaData.loading}
        isLive={nasaData.isLive}
        fetchError={nasaData.fetchError}
        lastUpdated={nasaData.lastUpdated}
        onRefresh={nasaData.refresh}
      />

      <div className="mc-sidebar-section" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div className="mc-section-title" style={{ marginBottom: 14 }}>Quick Links</div>
        <div className="flex-col" style={{ gap: 9, alignItems: "flex-start", width: "100%" }}>
          {[
            { label: "NASA Live Blog",      url: "https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/" },
            { label: "NASA YouTube",        url: "https://www.youtube.com/@NASA" },
            { label: "Artemis II Overview", url: "https://www.nasa.gov/artemis-ii/" },
          ].map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="mc-link">
              {l.label}
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            </a>
          ))}
        </div>
      </div>

      <div className="mc-sidebar-footer">
        {nasaData.fetchError
          ? "All proxies failed. Retrying in 90s. Try manual refresh."
          : nasaData.isLive
            ? "Live data from NASA."
            : "Connecting to NASA blog…"}
      </div>
    </>
  );

  return (
    <div className="mc-app">
      <header className="mc-header">
        <div className="mc-scanline-overlay"><div className="mc-scanline-bar" /></div>

        {/* Desktop: left branding */}
        <div className="mc-header-left">
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="mc-title">ARTEMIS II</span>
              <span className="mc-subtitle">MISSION CONTROL</span>
            </div>
            <span className="mc-location">KENNEDY SPACE CENTER · PAD 39B</span>
          </div>
        </div>

        {/* Center: desktop has countdown+clock; mobile splits into 3 zones */}
        <div className="mc-header-center">
          {/* Desktop: countdown left, divider, clock right — all in center column */}
          <CountdownTimer targetOverride={targetOverride} onOverride={setTargetOverride} />
          <div className="mc-divider-v mc-hide-mobile" />
          <div className="mc-hide-mobile">
            <StatusClock />
          </div>
        </div>

        {/* Mobile clock: sits centered between countdown and info btn via CSS */}
        <div className="mc-mobile-clock-center">
          <StatusClock />
        </div>

        {/* Right: desktop sidebar toggle + landscape-mobile info btn */}
        <div className="mc-header-right">
          {/* Desktop only */}
          <button
            className={`mc-btn mc-btn-ghost mc-btn-sm mc-hide-mobile ${sidebarOpen ? "active" : ""}`}
            onClick={handleSidebarToggle}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {sidebarOpen ? "right_panel_close" : "right_panel_open"}
            </span>
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
          {/* Landscape mobile — shown via CSS landscape query only */}
          <button
            className="mc-landscape-info-btn"
            onClick={() => setMobilePanelOpen(true)}
            title="Mission details"
          >
            <span className="material-symbols-outlined">info</span>
          </button>
        </div>
      </header>

      <div className="mc-main">
        <div className="mc-streams-area">
          {/* Controls bar: shown on desktop + landscape mobile (hidden portrait via CSS) */}
          <div className="mc-controls-bar">
            <div className="mc-layout-group">
              {Object.entries(LAYOUTS).map(([key, val]) => (
                <button
                  key={key}
                  className={`mc-btn mc-btn-ghost mc-btn-sm ${layout === key ? "active" : ""}`}
                  onClick={() => setLayout(key)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{val.icon}</span>
                  <span className="mc-btn-label">{val.label}</span>
                </button>
              ))}
            </div>
            <div className="mc-action-group">
              <button className="mc-btn mc-btn-outline mc-btn-sm mc-hide-mobile" onClick={resetStreams} title="Reset to default streams">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span>
                Reset Feeds
              </button>
              <button className="mc-btn mc-btn-outline mc-btn-sm" onClick={() => setIframeKey((k) => k + 1)}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                <span className="mc-btn-label">Refresh</span>
              </button>
              <button className="mc-btn mc-btn-primary mc-btn-sm" onClick={() => setShowAdd(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                <span className="mc-btn-label">Add Stream</span>
              </button>
            </div>
          </div>

          <div className="mc-grid-container">
            <DraggableStreamGrid
              streams={streams}
              setStreams={setStreams}
              layout={layout}
              iframeKey={iframeKey}
              onToggleMute={toggleMute}
              onRemove={removeStream}
              featuredId={featuredId}
              onFeature={setFeaturedId}
              isMobile={isMobile}
              isLandscape={isLandscape}
            />
          </div>
        </div>

        {/* Desktop sidebar */}
        {(sidebarOpen || sidebarClosing) && (
          <aside className={`mc-sidebar mc-hide-mobile${sidebarClosing ? " is-closing" : ""}${sidebarOpening ? " is-opening" : ""}`}>
            <div className="mc-sidebar-inner">
              {sidebarContent}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <MobileNavBar
          onAddStream={() => setShowAdd(true)}
          onRefresh={() => setIframeKey((k) => k + 1)}
          onInfo={() => setMobilePanelOpen(true)}
          streamCount={streams.length}
        />
      )}

      {/* Mobile info sheet */}
      <MobileSidebar open={mobilePanelOpen} onClose={() => setMobilePanelOpen(false)}>
        {sidebarContent}
      </MobileSidebar>

      {showAdd && (
        <AddStreamModal onClose={() => setShowAdd(false)} onAdd={addStream} />
      )}
    </div>
  );
}