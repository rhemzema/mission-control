import { useState, useRef, useEffect, useCallback } from "react";
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
const WINDOW_CLOSE = "2026-04-02T00:24:00Z";

// ─── Countdown Timer ──────────────────────────────────────────────────────
function CountdownTimer({ targetOverride, onOverride }) {
  const [now, setNow] = useState(Date.now());
  const [showEdit, setShowEdit] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [holdActive, setHoldActive] = useState(false);
  const [holdFrozen, setHoldFrozen] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target   = targetOverride ? new Date(targetOverride).getTime() : new Date(WINDOW_OPEN).getTime();
  const diff     = holdActive && holdFrozen !== null ? holdFrozen : target - now;
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
            {holdActive ? "HOLD " : launched ? "T+ " : "T- "}
            {fmt(launched && !holdActive ? now - target : diff)}
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
const NASA_RSS_URL = "https://blogs.nasa.gov/artemis/feed/";
const REFRESH_MS = 5 * 60 * 1000;

async function fetchNASARSS() {
  // rss2json is a dedicated RSS proxy service — much more reliable than generic CORS proxies
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

  // Fallback: generic CORS proxies
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
      return text; // raw XML — handled below
    } catch (err) {
      console.warn("[RSS] proxy failed:", err?.message);
    }
  }
  return null;
}

function parseNASARSS(data) {
  try {
    // rss2json returns an array of item objects directly
    if (Array.isArray(data)) {
      return data.map((item) => ({
        time: item.pubDate
          ? new Date(item.pubDate + " UTC").toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET"
          : "",
        headline: (item.title || "").substring(0, 100),
        detail:   (item.description || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().substring(0, 220),
      })).filter(u => u.headline);
    }

    // Fallback: raw XML string
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
  // Artemis II launched April 1, 2026 at 6:35 PM ET
  // LL2 upcoming endpoint no longer returns it post-launch
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
const MILESTONES = [
  { id: "tanking",    label: "Propellant Loading",      t: "2026-04-01T16:30:00-04:00" },
  { id: "t-4hold",    label: "T-4 Min Hold",            t: "2026-04-01T18:20:00-04:00" },
  { id: "terminal",   label: "Terminal Count",          t: "2026-04-01T18:23:00-04:00" },
  { id: "liftoff",    label: "Liftoff",                 t: "2026-04-01T18:35:00-04:00" },
  { id: "maxq",       label: "Max-Q",                   t: "2026-04-01T18:37:00-04:00" },
  { id: "beco",       label: "Booster Cut-Off",         t: "2026-04-01T18:39:00-04:00" },
  { id: "seco1",      label: "Core SECO",               t: "2026-04-01T18:47:00-04:00" },
  { id: "icps",       label: "ICPS Ignition",           t: "2026-04-01T18:48:00-04:00" },
  { id: "prm",        label: "Perigee Raise Burn",      t: "2026-04-01T20:00:00-04:00" },
  { id: "arb",        label: "Apogee Raise Burn",       t: "2026-04-01T21:30:00-04:00" },
  { id: "prox",       label: "Proximity Operations",    t: "2026-04-02T01:00:00-04:00" },
  { id: "prm2",       label: "Perigee Raise Burn 2",    t: "2026-04-02T08:19:00-04:00" },
  { id: "tli",        label: "Trans-Lunar Injection",   t: "2026-04-02T21:00:00-04:00" },
  { id: "lunar",      label: "Lunar Flyby",             t: "2026-04-07T00:00:00-04:00" },
  { id: "return",     label: "Return Burn",             t: "2026-04-09T00:00:00-04:00" },
  { id: "splashdown", label: "Splashdown",              t: "2026-04-11T12:00:00-04:00" },
];

function MilestonesTimeline({ targetOverride }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const originalLiftoffMs = new Date(MILESTONES.find(m => m.id === "liftoff").t).getTime();
  const adjustedLiftoffMs = targetOverride ? new Date(targetOverride).getTime() : originalLiftoffMs;
  const offset            = adjustedLiftoffMs - originalLiftoffMs;
  const launched          = now >= adjustedLiftoffMs;

  const activeIdx = MILESTONES.reduce((acc, m, i) =>
    now >= new Date(m.t).getTime() + offset ? i : acc, -1);

  const fmtRel = (ms) => {
    const abs = Math.abs(ms);
    const s   = Math.floor(abs / 1000) % 60;
    const m   = Math.floor(abs / 60000) % 60;
    const h   = Math.floor(abs / 3600000);
    if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0)  return `${h}h ${m}m`;
    if (m > 0)  return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="mc-sidebar-section" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="mc-section-header" style={{ width: "100%" }}>
        <div className="mc-section-title">Mission Timeline</div>
        {launched && <span className="mc-section-badge live" style={{ animation: "pulse 1.2s infinite" }}>LIVE</span>}
      </div>
      <div style={{ position: "relative", marginBottom: 16, width: "100%" }}>
        <div style={{ height: 3, background: "var(--color-border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, var(--color-amber), var(--color-green))",
            width: activeIdx < 0 ? "0%" : `${Math.min(100, ((activeIdx + 1) / MILESTONES.length) * 100)}%`,
            transition: "width 1s linear",
          }} />
        </div>
      </div>
      <div className="flex-col" style={{ gap: 0, width: "100%", alignSelf: "stretch" }}>
        {MILESTONES.map((m, i) => {
          const ms       = new Date(m.t).getTime() + offset;
          const passed   = now >= ms;
          const isActive = i === activeIdx;
          const diff     = ms - now;
          const isNext   = i === activeIdx + 1;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0", opacity: passed && !isActive ? 0.4 : 1, transition: "opacity 0.4s" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                <div style={{
                  width: isActive ? 10 : 7, height: isActive ? 10 : 7, borderRadius: "50%", flexShrink: 0,
                  background: isActive ? "var(--color-green)" : passed ? "var(--color-text-ghost)" : isNext ? "var(--color-amber)" : "var(--color-border-hover)",
                  boxShadow: isActive ? "0 0 8px rgba(67,181,129,0.8)" : "none",
                  animation: isActive ? "pulse 1.2s infinite" : "none",
                  transition: "all 0.3s",
                }} />
                {i < MILESTONES.length - 1 && (
                  <div style={{ width: 1, height: 18, background: passed ? "var(--color-text-ghost)" : "var(--color-border)", marginTop: 3 }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: isActive || isNext ? 600 : 500,
                  color: isActive ? "var(--color-green)" : isNext ? "var(--color-text)" : passed ? "var(--color-text-dim)" : "var(--color-text-muted)",
                  transition: "color 0.3s",
                }}>
                  {m.label}
                </div>
                <div style={{
                  fontSize: 9, fontFamily: "var(--font-mono)", marginTop: 1,
                  color: isActive ? "var(--color-green)" : isNext ? "var(--color-amber)" : "var(--color-text-ghost)",
                }}>
                  {passed
                    ? `T+${fmtRel(now - ms)} ago`
                    : isNext
                      ? `T-${fmtRel(diff)}`
                      : new Date(new Date(m.t).getTime() + offset).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET"
                  }
                </div>
              </div>
            </div>
          );
        })}
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
function DraggableStreamGrid({ streams, setStreams, layout, iframeKey, onToggleMute, onRemove, featuredId, onFeature }) {
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
    const c = previewStreams.length;
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

  // ── Mouse drag handlers ──────────────────────────────────────────────
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

  // ── Touch drag handlers ──────────────────────────────────────────────
  const getElementIdAtPoint = useCallback((x, y, excludeId) => {
    // Temporarily hide the dragging element so elementFromPoint finds the target beneath
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
    touchDragRef.current = {
      active: false, // becomes true after sufficient movement
      id: streamId,
      startX: touch.clientX,
      startY: touch.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    const ref = touchDragRef.current;
    if (!ref.id) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - ref.startX);
    const dy = Math.abs(touch.clientY - ref.startY);

    // Activate drag after 8px movement
    if (!ref.active && (dx > 8 || dy > 8)) {
      ref.active = true;
      setDraggingId(ref.id);
    }

    if (!ref.active) return;
    e.preventDefault(); // prevent scroll while dragging

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
    if (touchDragRef.current.active) {
      setStreams(previewStreams);
    }
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
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {stableIdsRef.current.map((id) => {
        const streamData  = streams.find((s) => s.id === id);
        if (!streamData) return null;
        const visualIndex = previewStreams.findIndex((p) => p.id === id);
        if (visualIndex === -1) return null;
        return (
          <div
            key={id}
            data-stream-id={id}
            style={{ ...getItemStyle(visualIndex, previewStreams.length), order: visualIndex }}
            className={`mc-stream-wrapper ${draggingId === id ? "is-active-drag" : ""} ${
              window.innerWidth <= 767
                ? featuredId === id
                  ? "is-featured"
                  : featuredId
                    ? "is-collapsed"
                    : ""
                : ""
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, streamData)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDrop={handleDrop}
            onDragEnd={() => setDraggingId(null)}
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

  const [layout,         setLayout]         = useState("gallery");
  const [showAdd,        setShowAdd]        = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [sidebarOpening, setSidebarOpening] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [targetOverride, setTargetOverride] = useState(null);
  const [iframeKey,      setIframeKey]      = useState(0);
  const [featuredId,     setFeaturedId]     = useState(null);

  const nasaData = useNASALiveData();
  const ll2      = useLL2LaunchData();
  const wx       = useKSCWeather();

  useEffect(() => {
    localStorage.setItem("mc-saved-streams", JSON.stringify(streams));
  }, [streams]);

  const toggleMute   = useCallback((id) => { setStreams((p) => p.map((s) => s.id === id ? { ...s, muted: !s.muted } : s)); }, []);
  const removeStream = useCallback((id) => { setStreams((p) => p.filter((s) => s.id !== id)); }, []);
  const addStream    = useCallback((s)  => { setStreams((p) => [...p, s]); }, []);
  const resetStreams = useCallback(() => {
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
      <MissionStatusPanel ll2={ll2} />
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

        <div className="mc-header-left">
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="mc-title">ARTEMIS II</span>
              <span className="mc-subtitle">MISSION CONTROL</span>
            </div>
            <span className="mc-location">KENNEDY SPACE CENTER · PAD 39B</span>
          </div>
        </div>

        <div className="mc-header-center">
          {/* Mobile: compact mission label + countdown in one row */}
          <div className="mc-mobile-header-brand mc-show-mobile">
            <span className="mc-mobile-mission-label">ARTEMIS II</span>
          </div>
          <CountdownTimer targetOverride={targetOverride} onOverride={setTargetOverride} />
          <div className="mc-divider-v mc-hide-mobile" />
          <StatusClock className="mc-hide-mobile" />
        </div>

        <div className="mc-header-right">
          {/* Desktop: show/hide panel button */}
          <button
            className={`mc-btn mc-btn-ghost mc-btn-sm mc-hide-mobile ${sidebarOpen ? "active" : ""}`}
            onClick={handleSidebarToggle}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {sidebarOpen ? "right_panel_close" : "right_panel_open"}
            </span>
            {sidebarOpen ? "Hide Panel" : "Show Panel"}
          </button>
          {/* Mobile: info button opens bottom sheet */}
          <button
            className="mc-btn mc-btn-ghost mc-btn-sm mc-show-mobile"
            onClick={() => setMobilePanelOpen(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
          </button>
        </div>
      </header>

      <div className="mc-main">
        <div className="mc-streams-area">
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

      {/* Mobile bottom sheet */}
      <MobileSidebar open={mobilePanelOpen} onClose={() => setMobilePanelOpen(false)}>
        {sidebarContent}
      </MobileSidebar>

      {showAdd && (
        <AddStreamModal onClose={() => setShowAdd(false)} onAdd={addStream} />
      )}
    </div>
  );
}