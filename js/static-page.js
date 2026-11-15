(function () {
  const canvas = document.getElementById("static-canvas");
  const tube = document.getElementById("static-tube");
  if (!canvas || !tube) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX_RIPPLES = 6;
  const MAX_PIXELS = 720000;

  let w = 0;
  let h = 0;
  let mx = 0;
  let my = 0;
  const ripples = [];
  let startMs = performance.now();

  let audioCtx = null;
  let noiseGain = null;
  let audioStarted = false;
  let audioMuted = false;

  let gl = null;
  let glProg = null;
  let uRes = null;
  let uTime = null;
  let uMouse = null;
  let uNRipples = null;
  let uRipples = null;
  let rafId = 0;
  let running = true;

  const VERT = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision mediump float;
    #define MAX_R 6
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform int u_nRipples;
    uniform vec4 u_ripple[MAX_R];

    float hash21(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float tvAt(vec2 cell, float frame) {
      float a = fract(sin(dot(cell, vec2(12.9898, 78.233)) + frame) * 43758.5453);
      float b = fract(sin(dot(cell, vec2(39.3468, 11.1355)) + frame * 1.071) * 22578.1459);
      return mix(a, b, 0.36);
    }

    vec2 rippleDisp(vec2 pos) {
      vec2 disp = vec2(0.0);
      for (int i = 0; i < MAX_R; i++) {
        if (i >= u_nRipples) continue;
        vec4 r = u_ripple[i];
        float age = u_time - r.z;
        if (age < 0.0 || age > r.w) continue;
        vec2 d = pos - r.xy;
        float dist = length(d);
        if (dist < 1.0) continue;
        float strong = step(0.6, r.w);
        float maxR = mix(48.0, 78.0, strong);
        if (dist > maxR) continue;
        float amp = mix(4.0, 14.0, strong);
        float speed = mix(55.0, 95.0, strong);
        float life = 1.0 - age / r.w;
        float ring = dist - age * speed * 0.016;
        float env = life * exp(-dist * 0.055) * exp(-age * 4.0);
        float wave = sin(ring * 0.18) * amp * env;
        disp += (d / dist) * wave;
      }

      vec2 pd = pos - u_mouse;
      float pdist = length(pd);
      if (pdist < 52.0) {
        float t = pow(1.0 - pdist / 52.0, 2.0);
        float wave = sin(pdist * 0.22 - u_time * 8.0) * 3.5 * t;
        disp += (pd / max(pdist, 0.001)) * wave;
      }
      return disp;
    }

    void main() {
      vec2 pos = gl_FragCoord.xy;
      vec2 disp = rippleDisp(pos);
      float frame = floor(u_time * 24.0);
      vec2 cell = floor((pos + disp) * 0.95);
      float v = tvAt(cell, frame);
      float pdist = length(pos - u_mouse);
      if (pdist < 70.0) {
        float t = 1.0 - pdist / 70.0;
        v += t * t * 0.12;
      }
      v = clamp(v * 1.05 - 0.02, 0.0, 1.0);
      gl_FragColor = vec4(vec3(v), 1.0);
    }
  `;

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function initWebGL() {
    gl =
      canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        desynchronized: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) return false;

    const vs = compileShader(gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    glProg = gl.createProgram();
    gl.attachShader(glProg, vs);
    gl.attachShader(glProg, fs);
    gl.linkProgram(glProg);
    if (!gl.getProgramParameter(glProg, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(glProg));
      return false;
    }

    gl.useProgram(glProg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(glProg, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    uRes = gl.getUniformLocation(glProg, "u_res");
    uTime = gl.getUniformLocation(glProg, "u_time");
    uMouse = gl.getUniformLocation(glProg, "u_mouse");
    uNRipples = gl.getUniformLocation(glProg, "u_nRipples");
    uRipples = gl.getUniformLocation(glProg, "u_ripple");
    return true;
  }

  function pointerGl(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * w;
    const sy = h - ((e.clientY - rect.top) / rect.height) * h;
    return { sx, sy };
  }

  function resize() {
    const rect = tube.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let cw = Math.floor(rect.width * dpr);
    let ch = Math.floor(rect.height * dpr);
    const area = cw * ch;
    if (area > MAX_PIXELS) {
      const s = Math.sqrt(MAX_PIXELS / area);
      cw = Math.max(320, Math.floor(cw * s));
      ch = Math.max(240, Math.floor(ch * s));
    }
    w = cw;
    h = ch;
    canvas.width = w;
    canvas.height = h;
    if (gl) gl.viewport(0, 0, w, h);
  }

  function addRipple(x, y, strong = false) {
    const t = (performance.now() - startMs) / 1000;
    ripples.push({
      x,
      y,
      born: t,
      ttl: strong ? 0.75 : 0.45,
      strong,
    });
    if (strong) {
      ripples.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        born: t + 0.03,
        ttl: 0.65,
        strong: true,
      });
    }
    while (ripples.length > MAX_RIPPLES) ripples.shift();
  }

  function pruneRipples(nowSec) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (nowSec - ripples[i].born > ripples[i].ttl) ripples.splice(i, 1);
    }
  }

  function drawWebGL(nowSec) {
    pruneRipples(nowSec);
    const rippleData = new Float32Array(MAX_RIPPLES * 4);
    const n = Math.min(ripples.length, MAX_RIPPLES);
    for (let i = 0; i < n; i++) {
      const r = ripples[i];
      rippleData[i * 4] = r.x;
      rippleData[i * 4 + 1] = r.y;
      rippleData[i * 4 + 2] = r.born;
      rippleData[i * 4 + 3] = r.ttl;
    }

    gl.useProgram(glProg);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uTime, nowSec);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1i(uNRipples, reduceMotion ? 0 : n);
    if (!reduceMotion) gl.uniform4fv(uRipples, rippleData);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function initCanvas2DFallback() {
    const ctx = canvas.getContext("2d", { alpha: false });
    let img = null;
    let last = 0;
    const fps = 24;

    function draw(now) {
      if (!running) return;
      if (now - last < 1000 / fps) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      last = now;
      if (!img || img.width !== w) img = ctx.createImageData(w, h);
      const u32 = new Uint32Array(img.data.buffer);
      for (let i = 0; i < u32.length; i++) {
        const v = (Math.random() * 256) | 0;
        u32[i] = 0xff000000 | (v << 16) | (v << 8) | v;
      }
      ctx.putImageData(img, 0, 0);
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);
  }

  function startNoiseAudio() {
    if (audioStarted || audioMuted) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    const len = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3000;
    noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.04;
    src.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    src.start();
    audioStarted = true;
  }

  function onPointerMove(e) {
    const p = pointerGl(e);
    mx = p.sx;
    my = p.sy;
    startNoiseAudio();
    if (audioCtx?.state === "suspended") audioCtx.resume();
  }

  function loop(now) {
    if (!running) return;
    const nowSec = (now - startMs) / 1000;
    if (gl) drawWebGL(nowSec);
    rafId = requestAnimationFrame(loop);
  }

  const usingGl = initWebGL();
  resize();
  if (usingGl) {
    rafId = requestAnimationFrame(loop);
  } else {
    initCanvas2DFallback();
  }

  window.addEventListener("resize", resize);
  tube.addEventListener("pointermove", onPointerMove, { passive: true });
  tube.addEventListener(
    "pointerdown",
    (e) => {
      if (reduceMotion) return;
      const p = pointerGl(e);
      mx = p.sx;
      my = p.sy;
      addRipple(p.sx, p.sy, true);
      onPointerMove(e);
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) {
      cancelAnimationFrame(rafId);
      if (usingGl) rafId = requestAnimationFrame(loop);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.location.href = new URL("../", window.location.href).href;
    }
    if (e.key === "m" || e.key === "M") {
      audioMuted = !audioMuted;
      if (!audioCtx || !noiseGain) return;
      noiseGain.gain.setTargetAtTime(audioMuted ? 0 : 0.04, audioCtx.currentTime, 0.05);
    }
  });
})();