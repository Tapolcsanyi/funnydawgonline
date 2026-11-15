(function () {
  const treeEl = document.getElementById("pack-tree");
  const scopeCanvas = document.getElementById("term-scope");
  const scopeState = document.getElementById("scope-state");
  const promptEl = document.getElementById("term-prompt");
  const samplesEl = document.getElementById("term-samples");
  const stopBtn = document.getElementById("term-stop");
  const loopEl = document.getElementById("term-loop");
  const bpmWrap = document.getElementById("bpm-wrap");
  const sliderBpm = document.getElementById("slider-bpm");
  const outBpm = document.getElementById("out-bpm");
  const statusEl = document.getElementById("term-status");
  const downloadEl = document.getElementById("term-download");

  const sliderScopeGain = document.getElementById("slider-scope-gain");
  const sliderSmooth = document.getElementById("slider-smooth");
  const sliderGrid = document.getElementById("slider-grid");
  const sliderTrace = document.getElementById("slider-trace");
  const outScopeGain = document.getElementById("out-scope-gain");
  const outSmooth = document.getElementById("out-smooth");
  const outGrid = document.getElementById("out-grid");
  const outTrace = document.getElementById("out-trace");
  const sliderHue = document.getElementById("slider-hue");
  const outHue = document.getElementById("out-hue");
  const scopeModeSelect = document.getElementById("scope-mode");
  const scopeModeLabel = document.getElementById("scope-mode-label");
  const scopePanel = document.getElementById("scope-panel");
  const scopeFreezeEl = document.getElementById("scope-freeze");
  const synthWave = document.getElementById("synth-wave");
  const synthKey = document.getElementById("synth-key");
  const synthVoice = document.getElementById("synth-voice");
  const synthDegreesEl = document.getElementById("synth-degrees");
  const synthChordLabel = document.getElementById("synth-chord-label");
  const synthGateBtn = document.getElementById("synth-gate");
  const sliderSynthCutoff = document.getElementById("slider-synth-cutoff");
  const sliderSynthRes = document.getElementById("slider-synth-res");
  const sliderSynthAttack = document.getElementById("slider-synth-attack");
  const sliderSynthRelease = document.getElementById("slider-synth-release");
  const sliderSynthLevel = document.getElementById("slider-synth-level");
  const sliderSynthDetune = document.getElementById("slider-synth-detune");
  const outSynthCutoff = document.getElementById("out-synth-cutoff");
  const outSynthRes = document.getElementById("out-synth-res");
  const outSynthAttack = document.getElementById("out-synth-attack");
  const outSynthRelease = document.getElementById("out-synth-release");
  const outSynthLevel = document.getElementById("out-synth-level");
  const outSynthDetune = document.getElementById("out-synth-detune");

  const sliderAudioGain = document.getElementById("slider-audio-gain");
  const sliderChorus = document.getElementById("slider-chorus");
  const sliderChorusRate = document.getElementById("slider-chorus-rate");
  const sliderReverb = document.getElementById("slider-reverb");
  const sliderFilter = document.getElementById("slider-filter");
  const outAudioGain = document.getElementById("out-audio-gain");
  const outChorus = document.getElementById("out-chorus");
  const outChorusRate = document.getElementById("out-chorus-rate");
  const outReverb = document.getElementById("out-reverb");
  const outFilter = document.getElementById("out-filter");
  const resetFxBtn = document.getElementById("btn-reset-fx");

  if (!treeEl || !scopeCanvas || !samplesEl) return;

  const root = document.body.dataset.siteRoot ? `${document.body.dataset.siteRoot}/` : "";
  const ctx = scopeCanvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let packs = [];
  let selectedPackId = null;
  let playingFile = null;
  let activeSampleFile = null;
  let audioCtx = null;
  let analyser = null;
  let audioEl = null;
  let sourceNode = null;
  let rafId = 0;
  let trailCanvas = null;
  let trailCtx = null;
  let waterfallCanvas = null;
  let waterfallCtx = null;
  let loopTimer = null;

  const SCOPE_MODES = {
    waveform: "OSC — waveform",
    spectrum: "OSC — spectrum",
    mirror: "OSC — mirror",
    bars: "OSC — bars",
    waterfall: "OSC — waterfall",
    ascii: "OSC — ascii",
  };
  const ASCII_CHARS = " .:-=+*#%@";
  let fxNodes = null;
  let synthInitialized = false;
  let synthVoices = [];
  let synthMaster = null;
  let synthFilterNode = null;
  let synthGateHeld = false;
  let synthPointerGate = false;
  let synthKeyboardDegrees = new Set();
  let synthKeyboardLastDegree = 0;
  let synthKeyDownAt = new Map();
  let synthKeyReleaseTimers = new Map();
  let synthGateSyncGen = 0;
  const SYNTH_MIN_NOTE_MS = 110;
  let synthDegree = 1;

  const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const DEGREE_ROMAN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
  const DIATONIC_QUAL = ["maj", "min", "min", "maj", "maj", "min", "dim"];
  const CHORD_INTERVALS = {
    maj: [0, 4, 7],
    min: [0, 3, 7],
    dim: [0, 3, 6],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
  };
  const SYNTH_VOICE_COUNT = 6;
  let frozenTime = null;
  let frozenFreq = null;
  let scopeTriggerHold = 0;
  let scopeAlignedBuf = null;
  let scopeFloatScratch = null;
  let scopeFloatAligned = null;
  let scopeAlignRef = null;
  let scopePeriodHold = 220;
  let scopePhaseLocked = false;
  let scopeDisplayCount = 0;
  let frozenDisplayCount = 0;
  const SCOPE_ALIGN_RADIUS = 72;
  const SCOPE_ALIGN_MAX_STEP = 5;
  const SCOPE_DISPLAY_CYCLES = 2;

  const FX_DEFAULTS = {
    audioGain: 1,
    scopeGain: 1.2,
    chorus: 0,
    chorusRate: 1.5,
    reverb: 0,
    filter: 100,
  };

  const vis = {
    gain: FX_DEFAULTS.scopeGain,
    smooth: 0.75,
    grid: true,
    trace: 0.35,
    hue: 130,
    scopeMode: "waveform",
  };

  function applyPageHue() {
    document.body.style.setProperty("--term-h", String(Math.round(vis.hue)));
  }

  function scopePalette() {
    const h = vis.hue;
    return {
      stroke: `hsl(${h} 100% 62%)`,
      strokeDim: `hsla(${h} 90% 58% / 0.22)`,
      grid: `hsla(${h} 90% 58% / 0.07)`,
      gridMid: `hsla(${h} 90% 58% / 0.18)`,
      trail: `hsla(${h} 100% 62% / 0.55)`,
      barOff: `hsla(${h} 50% 40% / 0.25)`,
    };
  }

  function setScopeMode(mode) {
    vis.scopeMode = SCOPE_MODES[mode] ? mode : "waveform";
    if (scopeModeSelect) scopeModeSelect.value = vis.scopeMode;
    if (scopeModeLabel) scopeModeLabel.textContent = SCOPE_MODES[vis.scopeMode];
    if (vis.scopeMode !== "waterfall" && waterfallCtx) {
      waterfallCtx.clearRect(0, 0, waterfallCanvas.width, waterfallCanvas.height);
    }
  }

  function makeReverbImpulse(ctx, seconds = 2.2, decay = 2.4) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
      }
    }
    return impulse;
  }

  function cutoffFromSlider(percent) {
    const min = 120;
    const max = audioCtx ? audioCtx.sampleRate * 0.49 : 20000;
    if (percent >= 100) return max;
    const t = Math.max(0, Math.min(1, percent / 100));
    return min * (max / min) ** t;
  }

  function formatCutoffLabel(hz) {
    if (hz >= 18000) return "open";
    if (hz >= 1000) return `${Math.round(hz / 100) / 10}k`;
    return `${Math.round(hz)}Hz`;
  }

  function buildFxGraph(ctx, source) {
    const inputGain = ctx.createGain();
    inputGain.gain.value = FX_DEFAULTS.audioGain;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.85;
    filter.frequency.value = ctx.sampleRate * 0.49;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    const chorusDelay = ctx.createDelay(0.05);
    chorusDelay.delayTime.value = 0.022;

    const chorusWet = ctx.createGain();
    chorusWet.gain.value = 0;

    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = "sine";
    chorusLfo.frequency.value = FX_DEFAULTS.chorusRate;
    const chorusLfoDepth = ctx.createGain();
    chorusLfoDepth.gain.value = 0;
    chorusLfo.connect(chorusLfoDepth);
    chorusLfoDepth.connect(chorusDelay.delayTime);

    const convolver = ctx.createConvolver();
    convolver.buffer = makeReverbImpulse(ctx);
    convolver.normalize = true;

    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;

    const summer = ctx.createGain();
    summer.gain.value = 1;

    source.connect(inputGain);
    inputGain.connect(filter);

    filter.connect(dryGain);
    dryGain.connect(summer);

    filter.connect(chorusDelay);
    chorusDelay.connect(chorusWet);
    chorusWet.connect(summer);

    filter.connect(convolver);
    convolver.connect(reverbWet);
    reverbWet.connect(summer);

    return {
      inputGain,
      filter,
      dryGain,
      chorusDelay,
      chorusWet,
      chorusLfo,
      chorusLfoDepth,
      summer,
      reverbWet,
      convolver,
      lfoStarted: false,
    };
  }

  function ensureChorusLfo() {
    if (!fxNodes?.chorusLfo || fxNodes.lfoStarted) return;
    try {
      fxNodes.chorusLfo.start();
      fxNodes.lfoStarted = true;
    } catch {
      /* already started */
      fxNodes.lfoStarted = true;
    }
  }

  function rampParam(param, value, smooth = true) {
    if (!param) return;
    if (!audioCtx || !smooth) {
      param.value = value;
      return;
    }
    const t = audioCtx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + 0.03);
  }

  function readFxUi() {
    return {
      audioGain: Number(sliderAudioGain?.value ?? FX_DEFAULTS.audioGain),
      chorus: Number(sliderChorus?.value ?? 0) / 100,
      chorusRate: Number(sliderChorusRate?.value ?? FX_DEFAULTS.chorusRate),
      reverb: Number(sliderReverb?.value ?? 0) / 100,
      filter: Number(sliderFilter?.value ?? 100),
    };
  }

  function applyFxFromUi({ smooth = true } = {}) {
    const fx = readFxUi();
    if (outAudioGain) outAudioGain.textContent = fx.audioGain.toFixed(2);
    if (outChorus) outChorus.textContent = `${Math.round(fx.chorus * 100)}%`;
    if (outChorusRate) outChorusRate.textContent = `${fx.chorusRate.toFixed(1)}Hz`;
    if (outReverb) outReverb.textContent = `${Math.round(fx.reverb * 100)}%`;
    const hz = cutoffFromSlider(fx.filter);
    if (outFilter) outFilter.textContent = formatCutoffLabel(hz);

    if (!fxNodes) return;

    rampParam(fxNodes.inputGain.gain, fx.audioGain, smooth);
    rampParam(fxNodes.chorusWet.gain, fx.chorus * 0.55, smooth);
    rampParam(fxNodes.reverbWet.gain, fx.reverb * 0.5, smooth);
    rampParam(fxNodes.filter.frequency, hz, smooth);
    fxNodes.chorusLfo.frequency.value = fx.chorusRate;
    const depth = fx.chorus > 0.001 ? 0.0035 : 0;
    rampParam(fxNodes.chorusLfoDepth.gain, depth, smooth);
  }

  function resetFxUi() {
    if (sliderAudioGain) sliderAudioGain.value = String(FX_DEFAULTS.audioGain);
    if (sliderChorus) sliderChorus.value = String(FX_DEFAULTS.chorus);
    if (sliderChorusRate) sliderChorusRate.value = String(FX_DEFAULTS.chorusRate);
    if (sliderReverb) sliderReverb.value = String(FX_DEFAULTS.reverb);
    if (sliderFilter) sliderFilter.value = String(FX_DEFAULTS.filter);
    applyFxFromUi({ smooth: true });
  }

  function packById(id) {
    return packs.find((p) => p.id === id) ?? null;
  }

  function sampleSrc(pack, file) {
    const folder = pack.folder.replace(/\\/g, "/").replace(/^\//, "");
    const parts = folder.split("/").map(encodeURIComponent);
    const rel = `${parts.join("/")}/${encodeURIComponent(file)}`;
    try {
      return new URL(rel, window.location.href).href;
    } catch {
      return rel;
    }
  }

  function getBpm() {
    return Number(sliderBpm?.value ?? 120) || 120;
  }

  function loopEnabled() {
    return Boolean(loopEl?.checked);
  }

  function clearLoopTimer() {
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
  }

  function syncBpmUi() {
    if (outBpm) outBpm.textContent = String(getBpm());
  }

  function rescheduleBpmLoop() {
    if (!loopEnabled() || !loopTimer) return;
    clearLoopTimer();
    const intervalMs = 60000 / getBpm();
    loopTimer = setInterval(retriggerSample, intervalMs);
  }

  function midiToFreq(midi) {
    return 440 * 2 ** ((midi - 69) / 12);
  }

  function synthCutoffHz(percent) {
    const min = 90;
    const max = audioCtx ? audioCtx.sampleRate * 0.45 : 14000;
    if (percent >= 100) return max;
    const t = Math.max(0, Math.min(1, percent / 100));
    return min * (max / min) ** t;
  }

  function formatSynthCutoff(hz) {
    if (hz >= 12000) return "open";
    if (hz >= 1000) return `${Math.round(hz / 100) / 10}k`;
    return `${Math.round(hz)}Hz`;
  }

  function chordQualityLabel(qual) {
    const map = {
      maj: "",
      min: "m",
      dim: "°",
      maj7: "maj7",
      min7: "m7",
      dom7: "7",
      sus2: "sus2",
      sus4: "sus4",
    };
    return map[qual] ?? qual;
  }

  function getChordMidis() {
    const key = Number(synthKey?.value ?? 0);
    const deg = synthDegree;
    const voicePick = synthVoice?.value ?? "diatonic";
    const rootMidi = 48 + key + MAJOR_SCALE[deg - 1];
    const rootName = NOTE_NAMES[(key + MAJOR_SCALE[deg - 1]) % 12];
    let qual = voicePick;
    if (voicePick === "diatonic") qual = DIATONIC_QUAL[deg - 1];
    const intervals = CHORD_INTERVALS[qual] || CHORD_INTERVALS.maj;
    return { midis: intervals.map((s) => rootMidi + s), rootName, qual, roman: DEGREE_ROMAN[deg - 1] };
  }

  function initSynth() {
    if (!audioCtx || !fxNodes?.filter || synthInitialized) return;
    synthMaster = audioCtx.createGain();
    synthMaster.gain.value = 0;
    synthFilterNode = audioCtx.createBiquadFilter();
    synthFilterNode.type = "lowpass";
    synthFilterNode.Q.value = 0.9;
    synthFilterNode.frequency.value = synthCutoffHz(72);
    synthMaster.connect(synthFilterNode);
    synthFilterNode.connect(fxNodes.filter);

    const wave = synthWave?.value || "sawtooth";
    for (let i = 0; i < SYNTH_VOICE_COUNT; i++) {
      const voiceGain = audioCtx.createGain();
      voiceGain.gain.value = 0;
      const osc = audioCtx.createOscillator();
      osc.type = wave;
      osc.frequency.value = 220;
      osc.connect(voiceGain);
      voiceGain.connect(synthMaster);
      osc.start();
      synthVoices.push({ osc, gain: voiceGain });
    }
    synthInitialized = true;
    applySynthEngineFromUi({ smooth: false });
    tuneSynthChord({ audiblyActive: false });
  }

  function updateChordLabel() {
    const { rootName, qual, roman } = getChordMidis();
    const suffix = chordQualityLabel(qual);
    const chord = suffix ? `${rootName}${suffix}` : rootName;
    if (synthChordLabel) synthChordLabel.textContent = `${chord} · ${roman}`;
  }

  function tuneSynthChord({ audiblyActive = synthGateHeld } = {}) {
    if (!synthVoices.length) return;
    const { midis } = getChordMidis();
    const wave = synthWave?.value || "sawtooth";
    const detune = Number(sliderSynthDetune?.value ?? 0);
    const n = midis.length;
    const perVoice = audiblyActive && n > 0 ? 1 / n : 0;

    midis.forEach((midi, i) => {
      const v = synthVoices[i];
      if (!v) return;
      v.osc.type = wave;
      v.osc.frequency.setValueAtTime(midiToFreq(midi), audioCtx?.currentTime ?? 0);
      const spread = n > 1 ? (i - (n - 1) / 2) * detune : 0;
      v.osc.detune.setValueAtTime(spread, audioCtx?.currentTime ?? 0);
      v.gain.gain.setValueAtTime(perVoice, audioCtx?.currentTime ?? 0);
    });
    for (let i = midis.length; i < synthVoices.length; i++) {
      synthVoices[i].gain.gain.setValueAtTime(0, audioCtx?.currentTime ?? 0);
    }
    updateChordLabel();
  }

  function applySynthEngineFromUi({ smooth = true } = {}) {
    const cutoffPct = Number(sliderSynthCutoff?.value ?? 72);
    const resPct = Number(sliderSynthRes?.value ?? 22);
    const atk = Number(sliderSynthAttack?.value ?? 0.03);
    const rel = Number(sliderSynthRelease?.value ?? 0.14);
    const level = Number(sliderSynthLevel?.value ?? 0.2);
    const detune = Number(sliderSynthDetune?.value ?? 6);
    const hz = synthCutoffHz(cutoffPct);
    const q = 0.15 + (resPct / 100) * 14;

    if (outSynthCutoff) outSynthCutoff.textContent = formatSynthCutoff(hz);
    if (outSynthRes) outSynthRes.textContent = q.toFixed(1);
    if (outSynthAttack) outSynthAttack.textContent = atk.toFixed(2);
    if (outSynthRelease) outSynthRelease.textContent = rel.toFixed(2);
    if (outSynthLevel) outSynthLevel.textContent = level.toFixed(2);
    if (outSynthDetune) outSynthDetune.textContent = `${detune}¢`;

    if (!synthFilterNode) return;
    rampParam(synthFilterNode.frequency, hz, smooth);
    rampParam(synthFilterNode.Q, q, smooth);
    if (synthGateHeld) tuneSynthChord({ audiblyActive: true });
  }

  function refreshScopeState() {
    const sampleOn = Boolean(audioEl && !audioEl.paused);
    if (sampleOn || synthGateHeld) setScopeState("run");
    else setScopeState("idle");
  }

  function setSynthGate(on) {
    synthGateHeld = on;
    synthGateBtn?.classList.toggle("is-held", on);
    if (!synthMaster || !audioCtx) {
      refreshScopeState();
      return;
    }
    const now = audioCtx.currentTime;
    const level = Number(sliderSynthLevel?.value ?? 0.2);
    const atk = Number(sliderSynthAttack?.value ?? 0.03);
    const rel = Number(sliderSynthRelease?.value ?? 0.14);
    synthMaster.gain.cancelScheduledValues(now);
    if (on) {
      tuneSynthChord({ audiblyActive: true });
      const cur = synthMaster.gain.value;
      if (cur < level * 0.08) {
        synthMaster.gain.setValueAtTime(0, now);
        synthMaster.gain.linearRampToValueAtTime(level, now + atk);
      } else {
        synthMaster.gain.setValueAtTime(cur, now);
        synthMaster.gain.linearRampToValueAtTime(level, now + Math.min(atk, 0.02));
      }
    } else {
      const cur = synthMaster.gain.value;
      synthMaster.gain.setValueAtTime(cur, now);
      synthMaster.gain.linearRampToValueAtTime(0, now + rel);
      window.setTimeout(
        () => tuneSynthChord({ audiblyActive: false }),
        Math.ceil(rel * 1000) + 20
      );
    }
    refreshScopeState();
  }

  function selectSynthDegree(deg) {
    synthDegree = Math.max(1, Math.min(7, deg));
    synthDegreesEl?.querySelectorAll(".term-degree-btn").forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.degree) === synthDegree);
    });
    tuneSynthChord({ audiblyActive: synthGateHeld });
  }

  function buildDegreeStrip() {
    if (!synthDegreesEl) return;
    synthDegreesEl.replaceChildren();
    DEGREE_ROMAN.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "term-degree-btn";
      btn.dataset.degree = String(i + 1);
      btn.textContent = label;
      btn.title = `degree ${i + 1}`;
      btn.addEventListener("click", () => {
        clearKeyboardDegreeSelection();
        selectSynthDegree(i + 1);
        syncSynthGate();
      });
      synthDegreesEl.appendChild(btn);
    });
    selectSynthDegree(1);
  }

  function clearSynthKeyReleaseTimers() {
    for (const timer of synthKeyReleaseTimers.values()) window.clearTimeout(timer);
    synthKeyReleaseTimers.clear();
    synthKeyDownAt.clear();
  }

  function stopSynth() {
    synthPointerGate = false;
    synthKeyboardDegrees.clear();
    synthGateSyncGen += 1;
    clearSynthKeyReleaseTimers();
    setSynthGate(false);
  }

  function pulseBeat() {
    if (!scopePanel || reduceMotion) return;
    scopePanel.classList.add("term-scope-block--pulse");
    window.clearTimeout(pulseBeat._t);
    pulseBeat._t = window.setTimeout(
      () => scopePanel.classList.remove("term-scope-block--pulse"),
      90
    );
  }

  function ensureAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = vis.smooth;
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.loop = false;
    sourceNode = audioCtx.createMediaElementSource(audioEl);
    fxNodes = buildFxGraph(audioCtx, sourceNode);
    fxNodes.summer.connect(analyser);
    analyser.connect(audioCtx.destination);
    applyFxFromUi({ smooth: false });
    initSynth();

    audioEl.addEventListener("error", () => {
      const code = audioEl.error?.code;
      setStatus(`audio load failed${code ? ` (code ${code})` : ""} — check file path`);
    });
    audioEl.addEventListener("ended", () => {
      if (loopEnabled() && loopTimer) return;
      setScopeState("idle");
      setPlayingUi(null);
    });
    audioEl.addEventListener("play", () => setScopeState("run"));
    audioEl.addEventListener("pause", () => {
      if (!loopTimer && (audioEl.currentTime === 0 || audioEl.ended)) {
        setScopeState("idle");
      }
    });
  }

  async function resumeAudio() {
    ensureAudio();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    ensureChorusLfo();
    applyFxFromUi({ smooth: false });
  }

  function waitForCanPlay(el) {
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const done = () => {
        el.removeEventListener("canplay", onReady);
        el.removeEventListener("error", onErr);
      };
      const onReady = () => {
        done();
        resolve();
      };
      const onErr = () => {
        done();
        reject(new Error("could not load audio file"));
      };
      el.addEventListener("canplay", onReady, { once: true });
      el.addEventListener("error", onErr, { once: true });
    });
  }

  async function startElementPlayback() {
    if (!audioEl) return;
    try {
      await waitForCanPlay(audioEl);
      await audioEl.play();
    } catch (err) {
      setStatus(err.message || "could not play audio");
      throw err;
    }
  }

  function setScopeState(state) {
    if (scopeState) scopeState.textContent = state;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  function setPlayingUi(file) {
    playingFile = file;
    samplesEl.querySelectorAll(".term-sample-btn").forEach((btn) => {
      btn.classList.toggle("is-playing", Boolean(file && btn.dataset.file === file));
    });
  }

  function updatePrompt(pack) {
    if (!promptEl) return;
    if (!pack) {
      promptEl.textContent = "sounds@funnydawg:~$";
      return;
    }
    promptEl.textContent = `sounds@funnydawg:~/packs/${pack.id}/samples$ ls`;
  }

  function renderDownload(pack) {
    if (!downloadEl) return;
    downloadEl.replaceChildren();
    if (!pack) {
      downloadEl.innerHTML = '<span class="term-dl-soon">— select a pack</span>';
      return;
    }
    const hasZip = Boolean(pack.zipPath?.trim());
    if (hasZip) {
      const href = pack.zipPath.startsWith("http")
        ? pack.zipPath
        : `${root}${pack.zipPath.replace(/^\//, "")}`;
      const a = document.createElement("a");
      a.href = href;
      a.textContent = `wget ${pack.id}.zip`;
      a.download = "";
      downloadEl.appendChild(a);
      if (pack.sizeLabel) {
        const meta = document.createElement("span");
        meta.className = "term-dl-soon";
        meta.textContent = `  (${pack.sizeLabel})`;
        downloadEl.appendChild(meta);
      }
    } else {
      downloadEl.innerHTML = `<span class="term-dl-soon">wget ${pack.id}.zip — pending</span>`;
    }
  }

  function renderTree() {
    treeEl.replaceChildren();
    for (const pack of packs) {
      const li = document.createElement("li");
      li.className = "term-tree-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "term-tree-btn";
      btn.textContent = pack.title ? `${pack.title}` : pack.id;
      btn.title = pack.id;
      btn.classList.toggle("is-active", pack.id === selectedPackId);
      btn.addEventListener("click", () => selectPack(pack.id));
      li.appendChild(btn);
      treeEl.appendChild(li);
    }
  }

  function retriggerSample() {
    if (!audioEl) return;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    refreshScopeState();
    pulseBeat();
  }

  function startBpmRetrigger({ immediate = false } = {}) {
    clearLoopTimer();
    if (!loopEnabled() || !audioEl) return;
    const intervalMs = 60000 / getBpm();
    if (immediate) retriggerSample();
    loopTimer = setInterval(retriggerSample, intervalMs);
  }

  async function beginLoopForFile(file) {
    const pack = packById(selectedPackId);
    if (!pack || !file) return false;
    await resumeAudio();
    activeSampleFile = file;
    if (!audioEl.src || playingFile !== file) {
      audioEl.src = sampleSrc(pack, file);
    }
    setPlayingUi(file);
    try {
      await startElementPlayback();
    } catch {
      return false;
    }
    startBpmRetrigger({ immediate: true });
    setStatus(`> ${file} · loop @ ${getBpm()} bpm`);
    return true;
  }

  function renderSamples(pack) {
    samplesEl.replaceChildren();
    playingFile = null;
    if (!pack?.files?.length) {
      const empty = document.createElement("p");
      empty.className = "term-dl-soon";
      empty.textContent = "(empty directory)";
      samplesEl.appendChild(empty);
      return;
    }
    for (const file of pack.files) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "term-sample-btn";
      btn.dataset.file = file;
      btn.setAttribute("role", "listitem");
      btn.textContent = file;
      btn.addEventListener("click", () => playFile(file));
      samplesEl.appendChild(btn);
    }
  }

  function selectPack(packId) {
    const pack = packById(packId);
    if (!pack) return;
    selectedPackId = packId;
    activeSampleFile = null;
    stopPlayback();
    renderTree();
    updatePrompt(pack);
    renderSamples(pack);
    renderDownload(pack);
    setStatus(`cwd: ~/packs/${pack.id}/samples — click a file to play`);
  }

  function stopPlayback() {
    clearLoopTimer();
    stopSynth();
    if (!audioEl) return;
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.loop = false;
    audioEl.playbackRate = 1;
    refreshScopeState();
    setPlayingUi(null);
  }

  async function playFile(file) {
    const pack = packById(selectedPackId);
    if (!pack || !file) return;
    await resumeAudio();
    clearLoopTimer();
    activeSampleFile = file;

    if (loopEnabled()) {
      await beginLoopForFile(file);
      return;
    }

    const sameFile = playingFile === file && audioEl && !audioEl.paused;
    if (sameFile) {
      audioEl.currentTime = 0;
      await audioEl.play().catch(() => {});
      return;
    }

    stopPlayback();
    activeSampleFile = file;
    audioEl.src = sampleSrc(pack, file);
    setPlayingUi(file);
    audioEl.loop = false;
    audioEl.playbackRate = 1;

    try {
      await startElementPlayback();
      setStatus(`> ${file}`);
    } catch {
      setPlayingUi(null);
    }
  }

  function bindSliders() {
    const syncScope = () => {
      vis.gain = Number(sliderScopeGain?.value ?? FX_DEFAULTS.scopeGain);
      vis.smooth = Number(sliderSmooth?.value ?? 0.75);
      vis.grid = Number(sliderGrid?.value ?? 1) > 0;
      vis.trace = Number(sliderTrace?.value ?? 0);
      vis.hue = Number(sliderHue?.value ?? 130);
      if (outScopeGain) outScopeGain.textContent = vis.gain.toFixed(2);
      if (outSmooth) outSmooth.textContent = vis.smooth.toFixed(2);
      if (outGrid) outGrid.textContent = vis.grid ? "on" : "off";
      if (outTrace) outTrace.textContent = vis.trace.toFixed(2);
      if (outHue) outHue.textContent = `${Math.round(vis.hue)}°`;
      if (analyser) analyser.smoothingTimeConstant = vis.smooth;
      applyPageHue();
    };
    [sliderScopeGain, sliderSmooth, sliderGrid, sliderTrace, sliderHue].forEach((el) => {
      el?.addEventListener("input", syncScope);
    });
    scopeModeSelect?.addEventListener("change", () => {
      setScopeMode(scopeModeSelect.value);
    });
    scopeFreezeEl?.addEventListener("change", () => {
      if (!scopeFreezeEl.checked) {
        frozenTime = null;
        frozenFreq = null;
        frozenDisplayCount = 0;
      }
    });
    syncScope();
    setScopeMode(scopeModeSelect?.value || "waveform");

    const fxInputs = [sliderAudioGain, sliderChorus, sliderChorusRate, sliderReverb, sliderFilter];
    fxInputs.forEach((el) => {
      el?.addEventListener("input", () => applyFxFromUi({ smooth: true }));
    });
    applyFxFromUi({ smooth: false });

    resetFxBtn?.addEventListener("click", () => {
      resetFxUi();
      setStatus("fx bus reset");
    });
  }

  function isTypingTarget(el) {
    if (!el || el === document.body) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return true;
    if (tag === "INPUT") {
      const type = (el.type || "text").toLowerCase();
      return type !== "range" && type !== "button" && type !== "checkbox";
    }
    return false;
  }

  function degreeFromKeyboardEvent(e) {
    if (e.key >= "1" && e.key <= "7") return Number(e.key);
    const codes = {
      Digit1: 1,
      Digit2: 2,
      Digit3: 3,
      Digit4: 4,
      Digit5: 5,
      Digit6: 6,
      Digit7: 7,
      Numpad1: 1,
      Numpad2: 2,
      Numpad3: 3,
      Numpad4: 4,
      Numpad5: 5,
      Numpad6: 6,
      Numpad7: 7,
    };
    return codes[e.code] ?? 0;
  }

  function synthGateRequested() {
    return synthPointerGate || synthKeyboardDegrees.size > 0;
  }

  async function syncSynthGate() {
    const gen = (synthGateSyncGen += 1);
    const wantOn = synthGateRequested();
    if (wantOn && !synthGateHeld) {
      await resumeAudio();
      if (gen !== synthGateSyncGen || !synthGateRequested()) return;
      initSynth();
      tuneSynthChord({ audiblyActive: false });
      if (gen !== synthGateSyncGen || !synthGateRequested()) return;
      setSynthGate(true);
      return;
    }
    if (gen !== synthGateSyncGen) return;
    if (!wantOn && synthGateHeld) setSynthGate(false);
    else if (wantOn && synthGateHeld) tuneSynthChord({ audiblyActive: true });
  }

  function pickKeyboardDegree() {
    if (synthKeyboardDegrees.has(synthKeyboardLastDegree)) return synthKeyboardLastDegree;
    let max = 0;
    for (const d of synthKeyboardDegrees) if (d > max) max = d;
    return max || synthDegree;
  }

  function cancelKeyReleaseTimer(deg) {
    const timer = synthKeyReleaseTimers.get(deg);
    if (timer) {
      window.clearTimeout(timer);
      synthKeyReleaseTimers.delete(deg);
    }
  }

  function clearOtherKeyboardDegrees(keepDeg) {
    for (const d of [...synthKeyboardDegrees]) {
      if (d === keepDeg) continue;
      cancelKeyReleaseTimer(d);
      synthKeyDownAt.delete(d);
      synthKeyboardDegrees.delete(d);
    }
    for (const d of [...synthKeyReleaseTimers.keys()]) {
      if (d !== keepDeg) cancelKeyReleaseTimer(d);
    }
  }

  function clearKeyboardDegreeSelection() {
    clearSynthKeyReleaseTimers();
    synthKeyboardDegrees.clear();
    synthKeyDownAt.clear();
    synthKeyboardLastDegree = 0;
  }

  function releaseKeyboardDegree(deg) {
    cancelKeyReleaseTimer(deg);
    synthKeyDownAt.delete(deg);
    if (!synthKeyboardDegrees.has(deg)) return;
    synthKeyboardDegrees.delete(deg);
    if (synthKeyboardDegrees.size > 0) {
      selectSynthDegree(pickKeyboardDegree());
      syncSynthGate();
      return;
    }
    syncSynthGate();
  }

  function bindSynthKeyboard() {
    document.addEventListener("keydown", (e) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(document.activeElement)) return;
      const deg = degreeFromKeyboardEvent(e);
      if (!deg) return;
      e.preventDefault();
      clearOtherKeyboardDegrees(deg);
      cancelKeyReleaseTimer(deg);
      synthKeyDownAt.set(deg, Date.now());
      synthKeyboardDegrees.add(deg);
      synthKeyboardLastDegree = deg;
      selectSynthDegree(deg);
      syncSynthGate();
    });
    document.addEventListener("keyup", (e) => {
      const deg = degreeFromKeyboardEvent(e);
      if (!deg) return;
      if (!synthKeyboardDegrees.has(deg) && !synthKeyReleaseTimers.has(deg)) return;
      e.preventDefault();
      cancelKeyReleaseTimer(deg);
      if (!synthKeyboardDegrees.has(deg)) return;
      const downAt = synthKeyDownAt.get(deg) ?? Date.now();
      const held = Date.now() - downAt;
      const wait = Math.max(0, SYNTH_MIN_NOTE_MS - held);
      if (wait > 0) {
        const timer = window.setTimeout(() => releaseKeyboardDegree(deg), wait);
        synthKeyReleaseTimers.set(deg, timer);
        return;
      }
      releaseKeyboardDegree(deg);
    });
    window.addEventListener("blur", () => {
      if (!synthKeyboardDegrees.size && !synthKeyReleaseTimers.size) return;
      synthKeyboardDegrees.clear();
      clearSynthKeyReleaseTimers();
      synthGateSyncGen += 1;
      syncSynthGate();
    });
  }

  function bindSynth() {
    buildDegreeStrip();
    bindSynthKeyboard();

    synthGateBtn?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      synthGateBtn.setPointerCapture(e.pointerId);
      synthPointerGate = true;
      syncSynthGate();
    });
    const closePointerGate = () => {
      synthPointerGate = false;
      syncSynthGate();
    };
    synthGateBtn?.addEventListener("pointerup", closePointerGate);
    synthGateBtn?.addEventListener("pointercancel", closePointerGate);
    synthGateBtn?.addEventListener("lostpointercapture", closePointerGate);

    const onChordChange = () => tuneSynthChord({ audiblyActive: synthGateHeld });
    synthWave?.addEventListener("change", onChordChange);
    synthKey?.addEventListener("change", onChordChange);
    synthVoice?.addEventListener("change", onChordChange);

    const engineSliders = [
      sliderSynthCutoff,
      sliderSynthRes,
      sliderSynthAttack,
      sliderSynthRelease,
      sliderSynthLevel,
      sliderSynthDetune,
    ];
    engineSliders.forEach((el) => {
      el?.addEventListener("input", () => applySynthEngineFromUi({ smooth: true }));
    });
    applySynthEngineFromUi({ smooth: false });
  }

  function bindTransport() {
    sliderBpm?.addEventListener("input", () => {
      if (outBpm) outBpm.textContent = String(getBpm());
      rescheduleBpmLoop();
    });
    loopEl?.addEventListener("change", async () => {
      syncBpmUi();
      if (loopEnabled()) {
        const file = playingFile || activeSampleFile;
        if (!file) {
          loopEl.checked = false;
          syncBpmUi();
          setStatus("click a sample first, then enable loop");
          return;
        }
        await beginLoopForFile(file);
        return;
      }
      clearLoopTimer();
      if (playingFile) setStatus(`> ${playingFile}`);
    });
    syncBpmUi();
  }

  function resizeScope() {
    const rect = scopeCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    scopeCanvas.width = Math.floor(rect.width * dpr);
    scopeCanvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!trailCanvas) {
      trailCanvas = document.createElement("canvas");
      trailCtx = trailCanvas.getContext("2d");
    }
    trailCanvas.width = scopeCanvas.width;
    trailCanvas.height = scopeCanvas.height;
    if (!waterfallCanvas) {
      waterfallCanvas = document.createElement("canvas");
      waterfallCtx = waterfallCanvas.getContext("2d");
    }
    waterfallCanvas.width = scopeCanvas.width;
    waterfallCanvas.height = scopeCanvas.height;
  }

  function drawGrid(w, h, pal) {
    if (!vis.grid) return;
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = pal.gridMid;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }

  function drawIdleLine(w, h, pal) {
    if (reduceMotion) return;
    const mid = h / 2;
    ctx.strokeStyle = pal.strokeDim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }

  function scopeUsesTimeTrigger() {
    return vis.scopeMode === "waveform" || vis.scopeMode === "mirror" || vis.scopeMode === "ascii";
  }

  function resetScopePhaseLock() {
    scopeTriggerHold = 0;
    scopePeriodHold = 220;
    scopePhaseLocked = false;
    scopeDisplayCount = 0;
    if (scopeAlignRef) scopeAlignRef.fill(0);
  }

  function findRisingZeroCrossFloat(buf, anchor) {
    const len = buf.length;
    const crossings = [];
    for (let i = 0; i < len - 1; i++) {
      if (buf[i] < -0.035 && buf[i + 1] >= -0.01) crossings.push(i);
    }
    if (!crossings.length) return anchor;
    let pick = crossings[0];
    let best = Infinity;
    for (const c of crossings) {
      let d = Math.abs(c - anchor);
      if (d > len / 2) d = len - d;
      if (d < best) {
        best = d;
        pick = c;
      }
    }
    return pick;
  }

  function shiftWaveError(buf, shift, ref) {
    const len = buf.length;
    let err = 0;
    for (let i = 0; i < len; i += 4) {
      const d = buf[(shift + i) % len] - ref[i];
      err += d * d;
    }
    return err;
  }

  function synthFundamentalPeriodSamples() {
    if (!audioCtx || !synthGateHeld) return 0;
    const { midis } = getChordMidis();
    if (!midis.length) return 0;
    const hz = midiToFreq(Math.min(...midis));
    if (hz < 45) return 0;
    return Math.round(audioCtx.sampleRate / hz);
  }

  function estimatePeriodFloat(buf) {
    const len = buf.length;
    if (!audioCtx) return 0;
    const sr = audioCtx.sampleRate;
    const minLag = Math.max(10, Math.floor(sr / 2000));
    const maxLag = Math.min(len - 8, Math.floor(sr / 50));
    let bestLag = 0;
    let best = -1;
    let energy = 0;
    for (let i = 0; i < len; i += 2) energy += buf[i] * buf[i];
    if (energy < 0.0005) return 0;

    for (let lag = minLag; lag < maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < len - lag; i += 2) sum += buf[i] * buf[i + lag];
      if (sum > best) {
        best = sum;
        bestLag = lag;
      }
    }
    if (best < energy * 0.12) return 0;
    return bestLag;
  }

  function nudgeTrigger(target, len) {
    let delta = target - scopeTriggerHold;
    if (delta > len / 2) delta -= len;
    if (delta < -len / 2) delta += len;
    delta = Math.max(-SCOPE_ALIGN_MAX_STEP, Math.min(SCOPE_ALIGN_MAX_STEP, delta));
    return (scopeTriggerHold + delta + len) % len;
  }

  function stabilizeTimeDomain(analyser) {
    const len = analyser.fftSize;
    if (!scopeFloatScratch || scopeFloatScratch.length !== len) {
      scopeFloatScratch = new Float32Array(len);
      scopeFloatAligned = new Float32Array(len);
      scopeAlignRef = new Float32Array(len);
    }
    if (!scopeAlignedBuf || scopeAlignedBuf.length !== len) scopeAlignedBuf = new Uint8Array(len);

    analyser.getFloatTimeDomainData(scopeFloatScratch);

    let targetShift = scopeTriggerHold;
    if (scopePhaseLocked) {
      let best = targetShift;
      let bestErr = Infinity;
      for (let delta = -SCOPE_ALIGN_RADIUS; delta <= SCOPE_ALIGN_RADIUS; delta++) {
        const s = (scopeTriggerHold + delta + len) % len;
        const err = shiftWaveError(scopeFloatScratch, s, scopeAlignRef);
        if (err < bestErr) {
          bestErr = err;
          best = s;
        }
      }
      targetShift = best;
    } else {
      targetShift = findRisingZeroCrossFloat(scopeFloatScratch, scopeTriggerHold);
    }

    scopeTriggerHold = nudgeTrigger(targetShift, len);

    const shift = scopeTriggerHold;
    for (let i = 0; i < len; i++) scopeFloatAligned[i] = scopeFloatScratch[(shift + i) % len];

    const sampleOn = Boolean(audioEl && !audioEl.paused);
    const synthPeriod = !sampleOn && synthGateHeld ? synthFundamentalPeriodSamples() : 0;
    const period = estimatePeriodFloat(scopeFloatAligned);
    if (synthPeriod > 0) {
      scopePeriodHold = scopePeriodHold * 0.55 + synthPeriod * 0.45;
    } else if (period > 0) {
      scopePeriodHold = scopePeriodHold * 0.9 + period * 0.1;
    }
    const cycleSpan = period > 0 ? Math.round(scopePeriodHold * SCOPE_DISPLAY_CYCLES) : len;
    scopeDisplayCount = Math.max(96, Math.min(len, cycleSpan));

    for (let i = 0; i < len; i++) {
      scopeAlignRef[i] = scopeAlignRef[i] * 0.86 + scopeFloatAligned[i] * 0.14;
    }
    scopePhaseLocked = true;

    const count = scopeDisplayCount;
    for (let i = 0; i < count; i++) {
      scopeAlignedBuf[i] = 128 + Math.max(-127, Math.min(127, Math.round(scopeFloatAligned[i] * 127)));
    }
    return scopeAlignedBuf;
  }

  function drawWaveformLine(buf, w, h, pal, { mirror = false, sampleCount = 0 } = {}) {
    const count = sampleCount > 0 ? Math.min(sampleCount, buf.length) : buf.length;
    const mid = h / 2;
    const amp = (h * 0.42 * vis.gain) / 128;
    const slice = w / count;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const v = (buf[i] - 128) * amp;
      const x = i * slice;
      const y = mid + v;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (mirror) {
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const v = (buf[i] - 128) * amp;
        const x = i * slice;
        const y = mid - v;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawSpectrumBars(freq, w, h, pal) {
    const bars = 56;
    const step = Math.floor(freq.length / bars);
    const gap = 2;
    const barW = (w - gap * (bars - 1)) / bars;
    const maxH = h * 0.88;
    const baseY = h - 4;
    for (let i = 0; i < bars; i++) {
      const val = freq[i * step] / 255;
      const bh = Math.max(2, val * maxH * vis.gain);
      const x = i * (barW + gap);
      ctx.fillStyle = val > 0.04 ? pal.stroke : pal.barOff;
      ctx.globalAlpha = 0.35 + val * 0.65;
      ctx.fillRect(x, baseY - bh, barW, bh);
    }
    ctx.globalAlpha = 1;
  }

  function drawCenterBars(freq, w, h, pal) {
    const bars = 40;
    const step = Math.floor(freq.length / bars);
    const gap = 3;
    const barW = (w - gap * (bars - 1)) / bars;
    const mid = h / 2;
    for (let i = 0; i < bars; i++) {
      const val = freq[i * step] / 255;
      const bh = Math.max(1, val * (h * 0.45) * vis.gain);
      const x = i * (barW + gap);
      ctx.fillStyle = val > 0.04 ? pal.stroke : pal.barOff;
      ctx.fillRect(x, mid - bh, barW, bh * 2);
    }
  }

  function drawAsciiWave(timeBuf, w, h, pal, sampleCount = 0) {
    const count = sampleCount > 0 ? Math.min(sampleCount, timeBuf.length) : timeBuf.length;
    const cols = Math.min(80, Math.floor(w / 7));
    const rows = Math.min(12, Math.floor(h / 10));
    if (cols < 8 || rows < 3) {
      drawWaveformLine(timeBuf, w, h, pal, { sampleCount: count });
      return;
    }
    const cellW = w / cols;
    const cellH = h / rows;
    const step = Math.max(1, Math.floor(count / cols));
    ctx.font = `${Math.max(8, Math.floor(cellH * 0.85))}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = pal.stroke;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let c = 0; c < cols; c++) {
      const v = (timeBuf[c * step] - 128) / 128;
      const idx = Math.min(
        ASCII_CHARS.length - 1,
        Math.floor(Math.abs(v) * vis.gain * (ASCII_CHARS.length - 1))
      );
      const ch = ASCII_CHARS[idx];
      const x = c * cellW + cellW / 2;
      const y = h / 2 + v * (h * 0.38 * vis.gain);
      ctx.globalAlpha = 0.35 + idx / (ASCII_CHARS.length - 1) * 0.65;
      ctx.fillText(ch, x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawWaterfall(freq, w, h, pal) {
    if (!waterfallCtx || reduceMotion) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    waterfallCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    waterfallCtx.drawImage(waterfallCanvas, 0, 2, w, h - 2, 0, 0, w, h - 2);
    const bars = Math.min(128, Math.floor(w));
    const step = Math.max(1, Math.floor(freq.length / bars));
    const rowH = 2;
    for (let i = 0; i < bars; i++) {
      const val = freq[i * step] / 255;
      const light = 28 + val * 42;
      waterfallCtx.fillStyle = `hsl(${vis.hue} 90% ${light}%)`;
      waterfallCtx.fillRect(i, 0, 1.2, rowH);
    }
    ctx.drawImage(waterfallCanvas, 0, 0, w, h);
  }

  function drawScope() {
    const rect = scopeCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pal = scopePalette();
    const usesTrace =
      !reduceMotion && vis.trace > 0 && (vis.scopeMode === "waveform" || vis.scopeMode === "mirror");

    if (trailCtx && usesTrace) {
      trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      trailCtx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.08, 1 - vis.trace)})`;
      trailCtx.fillRect(0, 0, w, h);
    } else if (trailCtx) {
      trailCtx.setTransform(1, 0, 0, 1, 0, 0);
      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    }

    ctx.fillStyle = "#020302";
    ctx.fillRect(0, 0, w, h);
    if (trailCtx && usesTrace) {
      ctx.drawImage(trailCanvas, 0, 0, w, h);
    }
    drawGrid(w, h, pal);

    const samplePlaying = Boolean(audioEl && !audioEl.paused);
    const synthPlaying = synthGateHeld;
    const playing = samplePlaying || synthPlaying;
    const scopeFrozen = Boolean(scopeFreezeEl?.checked);

    if (playing && analyser) {
      let timeBuf;
      let freqBuf;
      let waveSamples = 0;
      if (scopeFrozen && frozenTime && frozenFreq) {
        timeBuf = frozenTime;
        freqBuf = frozenFreq;
        waveSamples = frozenDisplayCount || timeBuf.length;
      } else {
        freqBuf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqBuf);
        if (scopeUsesTimeTrigger()) {
          timeBuf = stabilizeTimeDomain(analyser);
          waveSamples = scopeDisplayCount || timeBuf.length;
        } else {
          timeBuf = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(timeBuf);
          waveSamples = timeBuf.length;
        }
        if (scopeFrozen) {
          frozenTime = new Uint8Array(timeBuf);
          frozenFreq = new Uint8Array(freqBuf);
          frozenDisplayCount = waveSamples;
        }
      }

      const waveOpts = { sampleCount: waveSamples };

      if (vis.scopeMode === "spectrum") {
        drawSpectrumBars(freqBuf, w, h, pal);
      } else if (vis.scopeMode === "mirror") {
        drawWaveformLine(timeBuf, w, h, pal, { mirror: true, ...waveOpts });
      } else if (vis.scopeMode === "bars") {
        drawCenterBars(freqBuf, w, h, pal);
      } else if (vis.scopeMode === "waterfall") {
        drawWaterfall(freqBuf, w, h, pal);
      } else if (vis.scopeMode === "ascii") {
        drawAsciiWave(timeBuf, w, h, pal, waveSamples);
      } else {
        drawWaveformLine(timeBuf, w, h, pal, waveOpts);
      }

      if (trailCtx && usesTrace) {
        trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        trailCtx.strokeStyle = pal.trail;
        trailCtx.lineWidth = 1.5;
        trailCtx.beginPath();
        const mid = h / 2;
        const amp = (h * 0.42 * vis.gain) / 128;
        const count = waveSamples || timeBuf.length;
        const slice = w / count;
        for (let i = 0; i < count; i++) {
          const y = mid + (timeBuf[i] - 128) * amp;
          const x = i * slice;
          if (i === 0) trailCtx.moveTo(x, y);
          else trailCtx.lineTo(x, y);
        }
        trailCtx.stroke();
      }
    } else {
      resetScopePhaseLock();
      drawIdleLine(w, h, pal);
    }

    rafId = requestAnimationFrame(drawScope);
  }

  async function load() {
    try {
      const res = await fetch(`${root}data/soundpacks.json`);
      if (!res.ok) throw new Error("Could not load soundpacks.json");
      const data = await res.json();
      packs = Array.isArray(data.packs) ? data.packs : [];
    } catch (err) {
      treeEl.innerHTML = `<li class="term-tree-item">${err.message}</li>`;
      return;
    }
    renderTree();
    if (packs[0]) selectPack(packs[0].id);
    bindSliders();
    bindSynth();
    bindTransport();
    resizeScope();
    window.addEventListener("resize", resizeScope);
    cancelAnimationFrame(rafId);
    drawScope();
  }

  stopBtn?.addEventListener("click", () => {
    stopPlayback();
    setStatus("stopped");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPlayback();
  });

  load();
})();