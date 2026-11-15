/**
 * TEAM NEVADA (IUH) // SPACE APPS 2026 — FLAME IN FREEFALL (PSI SCADA & AIoT EDGE SI)
 * Module: Vivid 60-FPS CIR/MSG Chamber Canvas & 60s Predictive Horizon SVG
 * S.I. Compliance Metadata: Visual simulations, canvas rendering, and code in this module
 * are SI-generated/assisted (Synthetic Intelligence). Includes visible SI-generated watermarks.
 * No NASA logos, flags, or official branding elements are used or modified.
 * Path: public/visualizer.js
 */

export function startChamberDigitalTwinLoop(canvas, getStateFn) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let tick = 0;

  const dustParticles = Array.from({ length: 34 }, (_, i) => ({
    x: 25 + ((i * 23) % 470),
    y: 12 + ((i * 31) % 140),
    vx: 0.45 + (i % 3) * 0.25,
    vy: (i % 2 === 0 ? 1 : -1) * 0.28,
    r: 1.5 + (i % 2) * 0.8
  }));

  const mistDrops = Array.from({ length: 42 }, (_, i) => ({
    x: 20 + ((i * 19) % 480),
    y: 8 + ((i * 29) % 145),
    vx: -0.3 + (i % 3) * 0.3,
    vy: 1.1 + (i % 4) * 0.35,
    r: 1.3 + (i % 2) * 0.6
  }));

  function render() {
    tick += 1;
    const st = getStateFn();
    const g = st.gravity ?? 0.16;
    const o2 = st.oxygen ?? 34;
    const efield = st.efieldKV ?? 0;
    const phase = st.combustionPhase ?? 'HOT_FLAME';
    const radiusPct = st.flameRadiusPct ?? 85;
    const uvOn = Boolean(st.uvSensorOn);
    const mistOn = Boolean(st.mistRelayOn);
    const dustMg = st.regolithDustMg ?? 0;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.52;

    // 1. Deep space chamber background (#0F141C)
    ctx.fillStyle = '#0F141C';
    ctx.fillRect(0, 0, w, h);

    // Subtle telemetry grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 35; y < h; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. ACME E-FIELD High-Voltage Mesh Electrodes (when efield > 0)
    if (efield > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(41, 182, 246, 0.55)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(95, 16);
      ctx.lineTo(95, h - 28);
      ctx.moveTo(w - 95, 16);
      ctx.lineTo(w - 95, h - 28);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#4FC3F7';
      ctx.font = 'bold 9.5px Consolas, monospace';
      ctx.fillText(`+${efield} kV ANODE`, 18, 24);
      ctx.fillText(`CATHODE (ION WIND)`, w - 122, 24);
      ctx.restore();
    }

    // 3. Regolith Dust Particles (when dustMg > 0)
    if (dustMg > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 152, 0, 0.78)';
      for (const p of dustParticles) {
        p.x = (p.x + p.vx) % (w - 20);
        p.y = 10 + ((p.y + p.vy + 135) % 135);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Fine Water Mist Droplets (when mistOn)
    if (mistOn) {
      ctx.save();
      ctx.fillStyle = 'rgba(41, 182, 246, 0.85)';
      for (const m of mistDrops) {
        m.x = (m.x + m.vx + w) % w;
        m.y = 8 + ((m.y + m.vy) % (h - 32));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Flame / Cool Flame / Extinguished Visualization (matching index.tsx)
    if (phase !== 'EXTINGUISHED') {
      const pulse = Math.sin(tick * 0.14) * 2.5;
      const outerRx = Math.max(22, (39 + (radiusPct / 100) * 19 - g * 9) + pulse * 0.5);
      const outerRy = Math.max(22, (39 + (radiusPct / 100) * 19 + g * 21) + pulse);
      const skewRad = Math.min(0.42, (efield * 2.2 * Math.PI) / 180);

      ctx.save();
      ctx.translate(cx, cy - g * 8);
      ctx.transform(1, 0, Math.tan(skewRad), 1, 0, 0);

      // Outer dashed reaction zone
      ctx.beginPath();
      ctx.ellipse(0, 0, outerRx, outerRy, 0, 0, Math.PI * 2);
      if (phase === 'COOL_FLAME') {
        ctx.fillStyle = uvOn ? 'rgba(171, 71, 188, 0.30)' : 'rgba(171, 71, 188, 0.05)';
        ctx.strokeStyle = uvOn ? '#AB47BC' : 'rgba(255, 255, 255, 0.16)';
      } else {
        ctx.fillStyle = 'rgba(255, 167, 38, 0.22)';
        ctx.strokeStyle = '#FFA726';
      }
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (phase === 'HOT_FLAME') {
        // Core color based on index.tsx logic:
        // O2 >= 50 -> #EC407A, O2 >= 30 -> #FF5722, g === 0 -> #29B6F6, else -> #FFCA28
        const coreColor =
          o2 >= 50
            ? '#EC407A'
            : o2 >= 30
            ? '#FF5722'
            : g === 0
            ? '#29B6F6'
            : '#FFCA28';

        const coreRx = Math.max(14, 24 - g * 4 + pulse * 0.4);
        const coreRy = Math.max(14, 24 + g * 14 + pulse * 0.8);

        // Soft glow around core
        const grad = ctx.createRadialGradient(0, 0, 3, 0, 0, Math.max(coreRx, coreRy) * 1.35);
        grad.addColorStop(0, '#FFF59D');
        grad.addColorStop(0.55, coreColor);
        grad.addColorStop(1, 'rgba(255, 87, 34, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, coreRx * 1.25, coreRy * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main Core Body
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, coreRx, coreRy, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright kernel (#FFF59D)
        ctx.fillStyle = '#FFF59D';
        ctx.beginPath();
        ctx.arc(0, 2, 10 + Math.sin(tick * 0.2) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // COOL FLAME (620K) text inside zone
        ctx.restore();
        ctx.save();
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = uvOn ? '#E1BEE7' : '#B0BEC5';
        ctx.fillText(
          uvOn ? '🟣 OH* / CH2O* COOL FLAME (620K)' : '👻 INVISIBLE (ENABLE UV LED!)',
          cx,
          cy
        );
      }
      ctx.restore();
    } else {
      // EXTINGUISHED safe message
      ctx.save();
      ctx.fillStyle = '#81C784';
      ctx.font = 'bold 12.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ CHAMBER SAFE (BELOW MOC / SUPPRESSED)', cx, cy);
      ctx.restore();
    }

    // 6. Visible S.I. Watermark (Space Apps S.I. Policy Compliance)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(w - 208, 4, 204, 15);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w - 208, 4, 204, 15);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 8.5px Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('WATERMARK: SI-GENERATED VISUAL', w - 8, 14.5);
    ctx.restore();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/**
 * Renders the 60-Second Predictive Horizon SVG in Column 3
 */
export function renderPredictiveHorizonSvg(svgEl, horizonPoints, confMargin) {
  if (!svgEl || !Array.isArray(horizonPoints) || horizonPoints.length === 0) return;

  const w = 380;
  const h = 92;
  const padL = 26;
  const padR = 14;
  const padT = 12;
  const padB = 18;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xOf = (tSec) => padL + ((isNaN(tSec) ? 0 : tSec) / 60) * plotW;
  const yOfScri = (s) => {
    const val = typeof s === 'number' && !isNaN(s) ? s : 0;
    return padT + (1 - Math.min(100, Math.max(0, val)) / 100) * plotH;
  };
  const yOfTemp = (tk) => {
    const val = typeof tk === 'number' && !isNaN(tk) ? tk : 298;
    return padT + (1 - Math.min(2200, Math.max(250, val) - 250) / 1950) * plotH;
  };

  const margin = typeof confMargin === 'number' && !isNaN(confMargin) ? confMargin : 2.5;
  const upperBand = horizonPoints
    .map((p) => `${xOf(p.tSec).toFixed(1)},${yOfScri(p.scri + margin).toFixed(1)}`)
    .join(' ');
  const lowerBand = [...horizonPoints]
    .reverse()
    .map((p) => `${xOf(p.tSec).toFixed(1)},${yOfScri(p.scri - margin).toFixed(1)}`)
    .join(' ');

  const scriPoints = horizonPoints
    .map((p) => `${xOf(p.tSec).toFixed(1)},${yOfScri(p.scri).toFixed(1)}`)
    .join(' ');

  const tempPoints = horizonPoints
    .map((p) => `${xOf(p.tSec).toFixed(1)},${yOfTemp(p.flameTempK).toFixed(1)}`)
    .join(' ');

  const lastPt = horizonPoints[horizonPoints.length - 1];
  const lastScri = Number(typeof lastPt.scri === 'number' && !isNaN(lastPt.scri) ? lastPt.scri : 0).toFixed(1);
  const lastTemp = Math.round(typeof lastPt.flameTempK === 'number' && !isNaN(lastPt.flameTempK) ? lastPt.flameTempK : 298);

  svgEl.innerHTML = `
    <line x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}" stroke="#E0E0E0" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + plotH * 0.5}" x2="${w - padR}" y2="${padT + plotH * 0.5}" stroke="#E0E0E0" stroke-dasharray="3,3" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#BDBDBD" stroke-width="1"/>

    <polygon points="${upperBand} ${lowerBand}" fill="rgba(211, 47, 47, 0.14)" />
    <polyline fill="none" stroke="#1976D2" stroke-width="2" stroke-dasharray="4,2" points="${tempPoints}" />
    <polyline fill="none" stroke="#D32F2F" stroke-width="2.4" points="${scriPoints}" />

    <circle cx="${xOf(lastPt.tSec).toFixed(1)}" cy="${yOfScri(lastPt.scri).toFixed(1)}" r="3.5" fill="#D32F2F" />
    <text x="${padL + 4}" y="${padT + 9}" fill="#D32F2F" font-size="9.5" font-weight="700">SCRI(t+60s): ${lastScri}%</text>
    <text x="${w - 135}" y="${padT + 9}" fill="#1976D2" font-size="9.5" font-weight="700">T(t+60s): ${lastTemp}K</text>

    <text x="${padL}" y="${h - 4}" fill="#616161" font-size="8.5">t=0s</text>
    <text x="${padL + plotW * 0.5 - 12}" y="${h - 4}" fill="#616161" font-size="8.5">+30s</text>
    <text x="${w - padR - 22}" y="${h - 4}" fill="#616161" font-size="8.5">+60s</text>
    <text x="${padL + plotW * 0.5}" y="${padT + plotH - 4}" text-anchor="middle" fill="rgba(100,116,139,0.75)" font-size="7.5" font-weight="700">[SI-GENERATED FORECAST WATERMARK]</text>
  `;
}
