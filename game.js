(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const lightCanvas = document.createElement("canvas");
  const lightCtx = lightCanvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  lightCanvas.width = W;
  lightCanvas.height = H;

  const ui = {
    frame: document.getElementById("gameFrame"),
    clock: document.getElementById("clock"),
    objective: document.getElementById("objective"),
    notice: document.getElementById("notice"),
    danger: document.querySelector(".danger-block"),
    dangerText: document.getElementById("dangerText"),
    stamina: document.getElementById("staminaFill"),
    breath: document.getElementById("breathFill"),
    breathRow: document.getElementById("breathRow"),
    interaction: document.getElementById("interaction"),
    overlay: document.getElementById("overlay"),
    overlayEyebrow: document.getElementById("overlayEyebrow"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayText: document.getElementById("overlayText"),
    rules: document.getElementById("rules"),
    primary: document.getElementById("primaryButton"),
    menuHint: document.getElementById("menuHint"),
    pause: document.getElementById("pauseButton"),
    sound: document.getElementById("soundButton")
  };

  const ROOM = { left: 72, top: 82, right: 1028, bottom: 630 };
  const NIGHT_DURATION = 150;
  const furniture = [
    { id: "bed", x: 125, y: 145, w: 265, h: 142 },
    { id: "desk", x: 470, y: 130, w: 220, h: 82 },
    { id: "wardrobe", x: 830, y: 125, w: 145, h: 225 },
    { id: "table", x: 480, y: 465, w: 190, h: 92 },
    { id: "boxes", x: 135, y: 475, w: 95, h: 85 }
  ];
  const hideSpots = [
    { id: "bed", name: "под кроватью", x: 258, y: 222, exitX: 258, exitY: 326 },
    { id: "wardrobe", name: "в шкафу", x: 901, y: 237, exitX: 786, exitY: 267 }
  ];
  const patrolPoints = [
    { x: 920, y: 430 }, { x: 750, y: 390 }, { x: 570, y: 350 },
    { x: 370, y: 350 }, { x: 340, y: 565 }, { x: 730, y: 565 },
    { x: 930, y: 555 }, { x: 550, y: 275 }, { x: 760, y: 255 },
    { x: 350, y: 400 }, { x: 770, y: 440 }
  ];

  const keys = new Set();
  let mode = "menu";
  let primaryAction = null;
  let elapsed = 0;
  let lastTime = performance.now();
  let noticeTimer = 0;
  let noticeIsDanger = false;
  let stepTimer = 0;
  let player;
  let monster;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  class SoundEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.muted = false;
      this.beatTimer = 0;
    }

    init() {
      if (this.context) {
        this.context.resume();
        return;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.context.destination);

      const hum = this.context.createOscillator();
      const humGain = this.context.createGain();
      hum.type = "sine";
      hum.frequency.value = 46;
      humGain.gain.value = 0.025;
      hum.connect(humGain);
      humGain.connect(this.master);
      hum.start();
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(muted ? 0 : 0.32, this.context.currentTime, 0.02);
      }
    }

    tone(frequency, duration, type = "sine", volume = 0.12, endFrequency = frequency, delay = 0) {
      if (!this.context || !this.master) return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    noise(duration = 0.08, volume = 0.05) {
      if (!this.context || !this.master) return;
      const length = Math.ceil(this.context.sampleRate * duration);
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      filter.type = "lowpass";
      filter.frequency.value = 650;
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start();
    }

    knock() {
      this.tone(82, 0.18, "sine", 0.32, 43);
      this.noise(0.1, 0.12);
      this.tone(72, 0.2, "sine", 0.25, 38, 0.42);
    }

    step(sprinting) {
      this.noise(0.055, sprinting ? 0.065 : 0.025);
      this.tone(sprinting ? 90 : 72, 0.05, "sine", sprinting ? 0.04 : 0.018, 50);
    }

    alert() {
      this.tone(115, 0.7, "sawtooth", 0.09, 48);
    }

    caught() {
      this.noise(0.65, 0.35);
      this.tone(180, 0.8, "sawtooth", 0.22, 32);
    }

    dawn() {
      [261.6, 329.6, 392, 523.2].forEach((note, index) => {
        this.tone(note, 0.65, "sine", 0.08, note, index * 0.16);
      });
    }

    update(dt, danger) {
      if (danger < 0.2) {
        this.beatTimer = 0;
        return;
      }
      this.beatTimer -= dt;
      if (this.beatTimer <= 0) {
        this.tone(54, 0.12, "sine", 0.11 + danger * 0.07, 38);
        this.tone(48, 0.1, "sine", 0.07, 34, 0.16);
        this.beatTimer = 1.25 - danger * 0.72;
      }
    }
  }

  const sound = new SoundEngine();

  function resetGame() {
    elapsed = 0;
    noticeTimer = 0;
    stepTimer = 0;
    keys.clear();
    player = {
      x: 385,
      y: 365,
      radius: 14,
      facing: -Math.PI / 2,
      stamina: 100,
      breath: 100,
      noise: 0,
      moving: false,
      sprinting: false,
      hidden: null,
      flashlight: true,
      holdingBreath: false,
      gasped: false
    };
    monster = {
      x: 1000,
      y: 460,
      radius: 20,
      facing: Math.PI,
      state: "away",
      timer: 9,
      awareness: 0,
      exposure: 0,
      target: null,
      lastSeen: null,
      lostTimer: 0,
      alertedHide: false,
      stuck: 0,
      anim: 0
    };
    updateHUD();
  }

  function startGame() {
    sound.init();
    resetGame();
    mode = "playing";
    ui.overlay.classList.add("is-hidden");
    ui.frame.classList.add("playing");
    ui.pause.textContent = "Пауза";
    ui.primary.blur();
    notify("Доживи до шести. Слушай дверь.", 3.5);
    lastTime = performance.now();
  }

  function showOverlay({ eyebrow, title, text, button, hint, rules = false, action }) {
    ui.overlayEyebrow.textContent = eyebrow;
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.primary.textContent = button;
    ui.menuHint.textContent = hint;
    ui.rules.style.display = rules ? "grid" : "none";
    ui.overlay.classList.remove("is-hidden");
    ui.frame.classList.remove("playing");
    primaryAction = action;
  }

  function pauseGame() {
    if (mode !== "playing") return;
    mode = "paused";
    keys.clear();
    showOverlay({
      eyebrow: "НОЧЬ ОСТАНОВЛЕНА",
      title: "ПАУЗА",
      text: "В комнате тихо. По крайней мере, пока ты здесь.",
      button: "Продолжить",
      hint: "P или Esc — продолжить",
      action: resumeGame
    });
    ui.pause.textContent = "Продолжить";
  }

  function resumeGame() {
    if (mode !== "paused") return;
    sound.init();
    mode = "playing";
    ui.overlay.classList.add("is-hidden");
    ui.frame.classList.add("playing");
    ui.pause.textContent = "Пауза";
    ui.primary.blur();
    lastTime = performance.now();
  }

  function endGame(won, reason = "") {
    if (mode !== "playing") return;
    mode = "ended";
    keys.clear();
    if (won) {
      sound.dawn();
      showOverlay({
        eyebrow: "06:00 · РАССВЕТ",
        title: "ТЫ ВЫЖИЛ",
        text: "Первый свет вошёл в комнату, и шаги исчезли. Но следующей ночью оно может вернуться.",
        button: "Ещё одна ночь",
        hint: "Слушай дверь и не трать силы зря",
        action: startGame
      });
    } else {
      sound.caught();
      showOverlay({
        eyebrow: `${formatTime()} · НОЧЬ ОКОНЧЕНА`,
        title: "ОНО НАШЛО ТЕБЯ",
        text: reason || "Тьма оказалась быстрее. В следующий раз спрячься до того, как услышишь его в комнате.",
        button: "Попробовать снова",
        hint: "Бег шумный. В укрытии задерживай дыхание",
        action: startGame
      });
    }
    ui.pause.textContent = "Пауза";
  }

  function notify(text, duration = 2.5, danger = false) {
    ui.notice.textContent = text;
    noticeTimer = duration;
    noticeIsDanger = danger;
  }

  function formatTime() {
    const progress = clamp(elapsed / NIGHT_DURATION, 0, 1);
    const hourIndex = Math.floor(progress * 6);
    const hour = hourIndex === 0 ? 12 : hourIndex;
    const minutes = Math.floor((progress * 360) % 60);
    return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function circleHitsRect(x, y, radius, rect) {
    const closestX = clamp(x, rect.x, rect.x + rect.w);
    const closestY = clamp(y, rect.y, rect.y + rect.h);
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function collides(x, y, radius) {
    if (x - radius < ROOM.left || x + radius > ROOM.right || y - radius < ROOM.top || y + radius > ROOM.bottom) {
      return true;
    }
    return furniture.some((rect) => circleHitsRect(x, y, radius, rect));
  }

  function moveWithCollisions(entity, dx, dy) {
    const oldX = entity.x;
    const oldY = entity.y;
    if (!collides(entity.x + dx, entity.y, entity.radius)) entity.x += dx;
    if (!collides(entity.x, entity.y + dy, entity.radius)) entity.y += dy;
    return Math.hypot(entity.x - oldX, entity.y - oldY);
  }

  function hasLineOfSight(from, to) {
    const dist = distance(from, to);
    const steps = Math.ceil(dist / 16);
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      if (furniture.some((rect) => x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h)) {
        return false;
      }
    }
    return true;
  }

  function nearestHideSpot() {
    let nearest = null;
    let nearestDistance = 67;
    for (const spot of hideSpots) {
      const dist = Math.hypot(player.x - spot.exitX, player.y - spot.exitY);
      if (dist < nearestDistance) {
        nearest = spot;
        nearestDistance = dist;
      }
    }
    return nearest;
  }

  function interact() {
    if (mode !== "playing") return;
    if (player.hidden) {
      const spot = hideSpots.find((item) => item.id === player.hidden);
      player.hidden = null;
      player.x = spot.exitX;
      player.y = spot.exitY;
      player.holdingBreath = false;
      monster.exposure = Math.max(0, monster.exposure - 0.2);
      sound.noise(0.12, 0.055);
      notify("Ты выбрался из укрытия.", 1.5);
      return;
    }
    const spot = nearestHideSpot();
    if (!spot) {
      notify("Здесь негде спрятаться.", 1.4);
      return;
    }
    player.hidden = spot.id;
    player.x = spot.x;
    player.y = spot.y;
    player.noise = 10;
    player.breath = Math.max(player.breath, 55);
    if (monster.state === "chase" && distance(monster, player) < 440 && hasLineOfSight(monster, { x: spot.exitX, y: spot.exitY })) {
      monster.alertedHide = true;
      notify("Оно видело, куда ты спрятался!", 3, true);
    } else {
      notify("Не двигайся. Слушай.", 2);
    }
    sound.noise(0.13, 0.04);
  }

  function toggleFlashlight() {
    if (mode !== "playing" || player.hidden) return;
    player.flashlight = !player.flashlight;
    sound.tone(320, 0.035, "square", 0.025, 220);
    notify(player.flashlight ? "Фонарик включён. Свет заметен издалека." : "Фонарик выключен. Тебя сложнее заметить.", 2);
  }

  function updatePlayer(dt) {
    if (player.hidden) {
      player.moving = false;
      player.sprinting = false;
      player.holdingBreath = keys.has("Space") && player.breath > 0;
      if (player.holdingBreath) {
        player.breath = Math.max(0, player.breath - 24 * dt);
      } else {
        player.breath = Math.min(100, player.breath + 17 * dt);
      }
      if (player.breath <= 0 && !player.gasped) {
        player.gasped = true;
        player.noise = 100;
        sound.noise(0.3, 0.16);
        notify("Ты не можешь больше задерживать дыхание!", 2.5, true);
      }
      if (player.breath > 30) player.gasped = false;
      const targetNoise = player.holdingBreath ? 0 : 12;
      player.noise += (targetNoise - player.noise) * Math.min(1, dt * 5);
      return;
    }

    let dx = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    let dy = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
    const length = Math.hypot(dx, dy);
    player.moving = length > 0;
    if (length > 0) {
      dx /= length;
      dy /= length;
      player.facing = Math.atan2(dy, dx);
    }
    player.sprinting = player.moving && (keys.has("ShiftLeft") || keys.has("ShiftRight")) && player.stamina > 0.5;
    const speed = player.sprinting ? 235 : 150;
    moveWithCollisions(player, dx * speed * dt, dy * speed * dt);
    if (player.sprinting) {
      player.stamina = Math.max(0, player.stamina - 25 * dt);
    } else {
      player.stamina = Math.min(100, player.stamina + (player.moving ? 13 : 19) * dt);
    }
    player.breath = Math.min(100, player.breath + 22 * dt);
    const targetNoise = player.moving ? (player.sprinting ? 85 : 30) : 2;
    player.noise += (targetNoise - player.noise) * Math.min(1, dt * 7);

    if (player.moving) {
      stepTimer -= dt;
      if (stepTimer <= 0) {
        sound.step(player.sprinting);
        stepTimer = player.sprinting ? 0.26 : 0.43;
      }
    } else {
      stepTimer = 0;
    }
  }

  function choosePatrolTarget() {
    let choices = patrolPoints.filter((point) => distance(monster, point) > 130);
    if (!choices.length) choices = patrolPoints;
    monster.target = choices[Math.floor(Math.random() * choices.length)];
    monster.stuck = 0;
  }

  function beginHunt() {
    monster.state = "hunting";
    monster.timer = random(12, 18) - (elapsed / NIGHT_DURATION) * 3;
    monster.awareness = 0;
    choosePatrolTarget();
  }

  function beginLeaving() {
    monster.state = "leaving";
    monster.target = { x: 1000, y: 460 };
    monster.awareness = 0;
    monster.exposure = 0;
    monster.alertedHide = false;
    notify("Шаги удаляются.", 2.2);
  }

  function moveMonster(target, speed, dt) {
    if (!target) return 0;
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return 0;
    monster.facing = Math.atan2(dy, dx);
    const moved = moveWithCollisions(monster, (dx / dist) * speed * dt, (dy / dist) * speed * dt);
    if (moved < 0.05) {
      monster.stuck += dt;
      if (monster.stuck > 0.3 && monster.state !== "chase") choosePatrolTarget();
    } else {
      monster.stuck = 0;
    }
    return dist;
  }

  function canSeePlayer() {
    if (player.hidden) return false;
    const dist = distance(monster, player);
    const range = player.flashlight ? 405 : 315;
    if (dist > range || !hasLineOfSight(monster, player)) return false;
    if (dist < 95) return true;
    const angle = Math.atan2(player.y - monster.y, player.x - monster.x);
    const difference = Math.atan2(Math.sin(angle - monster.facing), Math.cos(angle - monster.facing));
    return Math.abs(difference) < 1.12;
  }

  function updateExposure(dt) {
    if (!player.hidden || !["entering", "hunting", "chase"].includes(monster.state)) {
      monster.exposure = Math.max(0, monster.exposure - dt);
      return;
    }
    const spot = hideSpots.find((item) => item.id === player.hidden);
    const dist = Math.hypot(monster.x - spot.exitX, monster.y - spot.exitY);
    if (dist < 125) {
      if (monster.alertedHide && dist < 75) {
        monster.exposure += dt / 1.05;
      } else if (!player.holdingBreath && !monster.alertedHide) {
        monster.exposure += dt / 1.7;
      } else {
        monster.exposure -= dt * 0.7;
      }
    } else {
      monster.exposure -= dt * 0.65;
    }
    monster.exposure = clamp(monster.exposure, 0, 1);
    if (monster.exposure >= 1) {
      endGame(false, monster.alertedHide
        ? "Оно видело, как ты спрятался. Укрытие помогает только если войти в него незаметно."
        : "В тишине оно услышало твоё дыхание. Когда оно рядом, удерживай пробел.");
    }
  }

  function updateMonster(dt) {
    const m = monster;
    m.anim += dt;
    const progress = elapsed / NIGHT_DURATION;

    if (m.state === "away") {
      m.timer -= dt;
      if (m.timer <= 0) {
        m.state = "warning";
        m.timer = 3.4;
        m.x = 1000;
        m.y = 460;
        notify("Шаги остановились у двери.", 3, true);
        sound.knock();
      }
    } else if (m.state === "warning") {
      m.timer -= dt;
      if (m.timer <= 0) {
        m.state = "entering";
        m.target = { x: 915, y: 445 };
        m.x = 1000;
        m.y = 460;
        m.alertedHide = false;
        notify("Оно вошло в комнату.", 2.4, true);
        sound.alert();
      }
    } else if (m.state === "entering") {
      if (moveMonster(m.target, 82, dt) < 20) beginHunt();
    } else if (m.state === "hunting") {
      m.timer -= dt;
      if (m.timer <= 0) {
        beginLeaving();
      } else {
        if (!player.hidden) {
          const visible = canSeePlayer();
          if (visible) {
            const rate = (player.flashlight ? 1.05 : 0.8) * (player.sprinting ? 1.4 : 1);
            m.awareness = Math.min(1, m.awareness + rate * dt);
            m.lastSeen = { x: player.x, y: player.y };
          } else {
            m.awareness = Math.max(0, m.awareness - 0.32 * dt);
            if (player.sprinting && distance(m, player) < 480) {
              m.awareness = Math.min(1, m.awareness + 0.42 * dt);
              m.target = { x: player.x, y: player.y };
            }
          }
          if (m.awareness >= 1) {
            m.state = "chase";
            m.lostTimer = 2.7;
            m.lastSeen = { x: player.x, y: player.y };
            notify("Оно тебя увидело. Беги!", 2.5, true);
            sound.alert();
          }
        } else {
          m.awareness = Math.max(0, m.awareness - dt);
        }
        if (m.state === "hunting") {
          if (!m.target || distance(m, m.target) < 24) choosePatrolTarget();
          moveMonster(m.target, 72 + progress * 22, dt);
        }
      }
    } else if (m.state === "chase") {
      if (player.hidden) {
        if (m.alertedHide) {
          const spot = hideSpots.find((item) => item.id === player.hidden);
          moveMonster({ x: spot.exitX, y: spot.exitY }, 132, dt);
        } else {
          m.state = "hunting";
          m.awareness = 0.2;
          choosePatrolTarget();
        }
      } else {
        const sees = distance(m, player) < 540 && hasLineOfSight(m, player);
        if (sees) {
          m.lastSeen = { x: player.x, y: player.y };
          m.lostTimer = 2.7;
        } else {
          m.lostTimer -= dt;
        }
        moveMonster(m.lastSeen || player, 145 + progress * 28, dt);
        if (distance(m, player) < m.radius + player.radius + 4) {
          endGame(false, "Оно догнало тебя. Выключай свет, не беги без нужды и прячься до погони.");
        } else if (m.lostTimer <= 0) {
          m.state = "hunting";
          m.awareness = 0.25;
          choosePatrolTarget();
          notify("Оно потеряло тебя из виду.", 2);
        }
      }
    } else if (m.state === "leaving") {
      if (moveMonster(m.target, 96, dt) < 18) {
        m.state = "away";
        m.timer = random(8, 13) - progress * 3;
        m.awareness = 0;
        m.exposure = 0;
        m.alertedHide = false;
      }
    }

    if (mode === "playing") updateExposure(dt);
  }

  function updateHUD() {
    if (!player || !monster) return;
    ui.clock.textContent = formatTime();
    ui.stamina.style.width = `${player.stamina}%`;
    ui.breath.style.width = `${player.breath}%`;
    ui.breathRow.classList.toggle("visible", Boolean(player.hidden));
    ui.objective.textContent = player.hidden ? "В укрытии · оставайся тихим" : "Доживи до 6:00";

    const closeToHidden = player.hidden && distance(monster, player) < 140 && ["entering", "hunting", "chase"].includes(monster.state);
    let dangerText = "Пока тихо";
    let alert = false;
    if (monster.state === "warning") {
      dangerText = "Оно у двери";
      alert = true;
    } else if (monster.state === "entering") {
      dangerText = "Оно вошло";
      alert = true;
    } else if (monster.state === "chase") {
      dangerText = player.hidden ? "Оно ищет тебя" : "Оно видит тебя";
      alert = true;
    } else if (closeToHidden) {
      dangerText = "Оно совсем рядом";
      alert = true;
    } else if (monster.state === "hunting") {
      dangerText = "Оно в комнате";
      alert = true;
    } else if (monster.state === "leaving") {
      dangerText = "Оно уходит";
    }
    ui.dangerText.textContent = dangerText;
    ui.danger.classList.toggle("alert", alert);

    let prompt = "";
    if (mode === "playing") {
      if (player.hidden) {
        prompt = closeToHidden ? "Удерживай ПРОБЕЛ — не дыши" : "E — выйти из укрытия";
      } else if (nearestHideSpot()) {
        prompt = `E — спрятаться ${nearestHideSpot().name}`;
      } else if (monster.state === "chase") {
        prompt = "Беги или незаметно спрячься";
      }
    }
    ui.interaction.textContent = prompt;
    ui.interaction.classList.toggle("visible", Boolean(prompt));

    if (noticeTimer <= 0) ui.notice.textContent = "";
    ui.notice.classList.toggle("danger", noticeIsDanger && noticeTimer > 0);
  }

  function update(dt) {
    elapsed += dt;
    if (elapsed >= NIGHT_DURATION) {
      elapsed = NIGHT_DURATION;
      updateHUD();
      endGame(true);
      return;
    }
    if (noticeTimer > 0) noticeTimer -= dt;
    updatePlayer(dt);
    updateMonster(dt);
    if (mode !== "playing") return;
    const proximity = monster.state === "away" ? 0 : clamp(1 - distance(monster, player) / 420, 0, 1);
    const danger = Math.max(proximity, monster.awareness, monster.exposure);
    sound.update(dt, danger);
    updateHUD();
  }

  function drawFloor() {
    ctx.fillStyle = "#080b0c";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#242927";
    ctx.fillRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, ROOM.bottom - ROOM.top);

    for (let y = ROOM.top; y < ROOM.bottom; y += 34) {
      ctx.fillStyle = y % 68 === 0 ? "#252a27" : "#222724";
      ctx.fillRect(ROOM.left, y, ROOM.right - ROOM.left, 33);
      ctx.strokeStyle = "#151a18";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ROOM.left, y);
      ctx.lineTo(ROOM.right, y);
      ctx.stroke();
      const offset = ((y - ROOM.top) / 34) % 2 ? 110 : 310;
      for (let x = ROOM.left + offset; x < ROOM.right; x += 420) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 34);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#30332e";
    ctx.fillRect(365, 305, 350, 128);
    ctx.strokeStyle = "#45483f";
    ctx.strokeRect(374, 314, 332, 110);
    ctx.setLineDash([5, 7]);
    ctx.strokeRect(385, 325, 310, 88);
    ctx.setLineDash([]);

    ctx.fillStyle = "#343a36";
    ctx.fillRect(ROOM.left - 17, ROOM.top - 18, ROOM.right - ROOM.left + 34, 18);
    ctx.fillRect(ROOM.left - 17, ROOM.bottom, ROOM.right - ROOM.left + 34, 18);
    ctx.fillRect(ROOM.left - 18, ROOM.top - 18, 18, ROOM.bottom - ROOM.top + 36);
    ctx.fillRect(ROOM.right, ROOM.top - 18, 18, 323);
    ctx.fillRect(ROOM.right, 520, 18, ROOM.bottom - 520 + 18);
    ctx.fillStyle = "#171c1a";
    ctx.fillRect(ROOM.left - 5, ROOM.top, 5, ROOM.bottom - ROOM.top);
    ctx.fillRect(ROOM.left, ROOM.top, ROOM.right - ROOM.left, 5);

    ctx.fillStyle = "#080a0b";
    ctx.fillRect(ROOM.right - 5, 405, 34, 115);
    const doorOpen = monster && ["entering", "hunting", "chase", "leaving"].includes(monster.state);
    ctx.save();
    ctx.translate(ROOM.right, 405);
    ctx.rotate(doorOpen ? -0.82 : 0);
    ctx.fillStyle = doorOpen ? "#252b28" : "#343a35";
    ctx.fillRect(-8, 0, 18, 114);
    ctx.strokeStyle = "#515851";
    ctx.strokeRect(-8, 0, 18, 114);
    ctx.restore();
    if (monster && monster.state === "warning") {
      const glow = 0.25 + Math.sin(performance.now() / 130) * 0.15;
      ctx.fillStyle = `rgba(175, 70, 55, ${glow})`;
      ctx.fillRect(ROOM.right - 8, 515, 38, 5);
    }
  }

  function drawFurniture() {
    const bed = furniture[0];
    ctx.fillStyle = "#11161488";
    ctx.fillRect(bed.x + 9, bed.y + 12, bed.w, bed.h);
    ctx.fillStyle = "#514d43";
    ctx.fillRect(bed.x, bed.y, bed.w, bed.h);
    ctx.fillStyle = "#747267";
    ctx.fillRect(bed.x + 8, bed.y + 8, bed.w - 16, bed.h - 16);
    ctx.fillStyle = "#4e5a53";
    ctx.fillRect(bed.x + 85, bed.y + 8, bed.w - 93, bed.h - 16);
    ctx.fillStyle = "#a3a296";
    ctx.fillRect(bed.x + 18, bed.y + 22, 57, 88);
    ctx.strokeStyle = "#3e4741";
    ctx.beginPath();
    ctx.moveTo(bed.x + 110, bed.y + 52);
    ctx.lineTo(bed.x + bed.w - 15, bed.y + 52);
    ctx.stroke();
    ctx.fillStyle = "#101412";
    ctx.fillRect(bed.x + 10, bed.y + bed.h - 2, 10, 10);
    ctx.fillRect(bed.x + bed.w - 20, bed.y + bed.h - 2, 10, 10);

    const desk = furniture[1];
    ctx.fillStyle = "#15191788";
    ctx.fillRect(desk.x + 8, desk.y + 9, desk.w, desk.h);
    ctx.fillStyle = "#49483f";
    ctx.fillRect(desk.x, desk.y, desk.w, desk.h);
    ctx.fillStyle = "#5b594d";
    ctx.fillRect(desk.x, desk.y, desk.w, 12);
    ctx.fillStyle = "#bab7a2";
    ctx.save();
    ctx.translate(desk.x + 65, desk.y + 30);
    ctx.rotate(-0.1);
    ctx.fillRect(0, 0, 54, 36);
    ctx.restore();
    ctx.strokeStyle = "#76766a";
    ctx.beginPath();
    ctx.moveTo(desk.x + 78, desk.y + 42);
    ctx.lineTo(desk.x + 108, desk.y + 40);
    ctx.stroke();
    ctx.fillStyle = "#252c28";
    ctx.fillRect(desk.x + 167, desk.y + 20, 30, 40);
    ctx.fillStyle = "#78816d";
    ctx.beginPath();
    ctx.arc(desk.x + 182, desk.y + 18, 15, Math.PI, 0);
    ctx.fill();

    const wardrobe = furniture[2];
    ctx.fillStyle = "#10141299";
    ctx.fillRect(wardrobe.x + 10, wardrobe.y + 10, wardrobe.w, wardrobe.h);
    ctx.fillStyle = "#403f36";
    ctx.fillRect(wardrobe.x, wardrobe.y, wardrobe.w, wardrobe.h);
    ctx.fillStyle = "#504e43";
    ctx.fillRect(wardrobe.x + 7, wardrobe.y + 7, wardrobe.w - 14, wardrobe.h - 14);
    ctx.strokeStyle = "#2a2c26";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wardrobe.x + wardrobe.w / 2, wardrobe.y + 7);
    ctx.lineTo(wardrobe.x + wardrobe.w / 2, wardrobe.y + wardrobe.h - 7);
    ctx.stroke();
    ctx.fillStyle = "#93917b";
    ctx.fillRect(wardrobe.x + wardrobe.w / 2 - 12, wardrobe.y + 165, 4, 22);
    ctx.fillRect(wardrobe.x + wardrobe.w / 2 + 8, wardrobe.y + 165, 4, 22);
    ctx.lineWidth = 1;

    const table = furniture[3];
    ctx.fillStyle = "#11151499";
    ctx.fillRect(table.x + 10, table.y + 10, table.w, table.h);
    ctx.fillStyle = "#45443a";
    ctx.fillRect(table.x, table.y, table.w, table.h);
    ctx.fillStyle = "#535147";
    ctx.fillRect(table.x + 6, table.y + 6, table.w - 12, table.h - 12);
    ctx.strokeStyle = "#33362f";
    ctx.beginPath();
    ctx.moveTo(table.x + 15, table.y + 45);
    ctx.lineTo(table.x + table.w - 15, table.y + 45);
    ctx.stroke();
    ctx.fillStyle = "#898877";
    ctx.beginPath();
    ctx.arc(table.x + 125, table.y + 40, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#42483f";
    ctx.beginPath();
    ctx.arc(table.x + 125, table.y + 40, 12, 0, Math.PI * 2);
    ctx.fill();

    const boxes = furniture[4];
    ctx.fillStyle = "#4a4638";
    ctx.fillRect(boxes.x, boxes.y + 25, boxes.w, boxes.h - 25);
    ctx.fillStyle = "#55503f";
    ctx.fillRect(boxes.x + 17, boxes.y, boxes.w - 17, 52);
    ctx.strokeStyle = "#77705a";
    ctx.strokeRect(boxes.x + 17, boxes.y, boxes.w - 17, 52);
    ctx.beginPath();
    ctx.moveTo(boxes.x + 52, boxes.y);
    ctx.lineTo(boxes.x + 52, boxes.y + 52);
    ctx.stroke();
  }

  function drawHideHints() {
    if (!player || player.hidden || mode !== "playing") return;
    for (const spot of hideSpots) {
      const dist = Math.hypot(player.x - spot.exitX, player.y - spot.exitY);
      if (dist < 105) {
        const alpha = clamp(1 - dist / 105, 0.15, 0.8);
        ctx.strokeStyle = `rgba(190, 215, 198, ${alpha})`;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(spot.exitX, spot.exitY, 25 + Math.sin(performance.now() / 350) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawPlayer() {
    if (!player || player.hidden) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facing);
    ctx.fillStyle = "#05080777";
    ctx.beginPath();
    ctx.ellipse(-3, 7, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.sprinting ? "#a9b7ae" : "#87988e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c6c3b4";
    ctx.beginPath();
    ctx.arc(7, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#252b28";
    ctx.fillRect(8, -6, 14, 12);
    if (player.flashlight) {
      ctx.fillStyle = "#d9dbc0";
      ctx.fillRect(19, -3, 7, 6);
    }
    ctx.restore();
  }

  function drawMonster() {
    if (!monster || ["away", "warning"].includes(monster.state)) return;
    const m = monster;
    const stride = Math.sin(m.anim * 8) * 5;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.facing);
    ctx.fillStyle = "#00000066";
    ctx.beginPath();
    ctx.ellipse(-8, 10, 34, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#101312";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(-9, -25 - stride);
    ctx.moveTo(-5, 10);
    ctx.lineTo(-9, 25 + stride);
    ctx.stroke();
    ctx.fillStyle = "#111513";
    ctx.beginPath();
    ctx.ellipse(0, 0, 29, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#181c19";
    ctx.beginPath();
    ctx.arc(18, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#050606";
    ctx.beginPath();
    ctx.arc(23, -6, 4, 0, Math.PI * 2);
    ctx.arc(23, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLighting() {
    if (!player) return;
    lightCtx.clearRect(0, 0, W, H);
    lightCtx.globalCompositeOperation = "source-over";
    lightCtx.fillStyle = player.hidden ? "rgba(2, 4, 5, 0.88)" : "rgba(2, 4, 5, 0.76)";
    lightCtx.fillRect(0, 0, W, H);
    lightCtx.globalCompositeOperation = "destination-out";

    const radius = player.hidden ? 100 : (player.flashlight ? 150 : 90);
    const glow = lightCtx.createRadialGradient(player.x, player.y, 15, player.x, player.y, radius);
    glow.addColorStop(0, "rgba(0,0,0,0.92)");
    glow.addColorStop(0.55, "rgba(0,0,0,0.62)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    lightCtx.fillStyle = glow;
    lightCtx.fillRect(player.x - radius, player.y - radius, radius * 2, radius * 2);

    if (player.flashlight && !player.hidden) {
      const beamLength = 360;
      const beam = lightCtx.createRadialGradient(player.x, player.y, 30, player.x, player.y, beamLength);
      beam.addColorStop(0, "rgba(0,0,0,0.85)");
      beam.addColorStop(0.65, "rgba(0,0,0,0.55)");
      beam.addColorStop(1, "rgba(0,0,0,0)");
      lightCtx.fillStyle = beam;
      lightCtx.beginPath();
      lightCtx.moveTo(player.x, player.y);
      lightCtx.arc(player.x, player.y, beamLength, player.facing - 0.42, player.facing + 0.42);
      lightCtx.closePath();
      lightCtx.fill();
    }
    lightCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(lightCanvas, 0, 0);

    if (monster && !["away", "warning"].includes(monster.state)) {
      const dist = distance(monster, player);
      const alpha = clamp(1 - dist / 600, 0.15, 0.85);
      const eyeX = monster.x + Math.cos(monster.facing) * 25;
      const eyeY = monster.y + Math.sin(monster.facing) * 25;
      ctx.fillStyle = `rgba(207, 75, 57, ${alpha})`;
      ctx.shadowColor = "#d43d2f";
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(eyeX + Math.sin(monster.facing) * 5, eyeY - Math.cos(monster.facing) * 5, 1.7, 0, Math.PI * 2);
      ctx.arc(eyeX - Math.sin(monster.facing) * 5, eyeY + Math.cos(monster.facing) * 5, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawHiddenOverlay() {
    if (!player || !player.hidden) return;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, W, H);
    if (player.hidden === "wardrobe") {
      for (let x = 0; x < W; x += 94) {
        ctx.fillStyle = "rgba(2, 3, 3, 0.78)";
        ctx.fillRect(x, 0, 58, H);
      }
    } else {
      ctx.fillStyle = "rgba(1, 2, 2, 0.8)";
      ctx.fillRect(0, 0, W, 210);
      ctx.fillRect(0, 268, W, 62);
      ctx.fillRect(0, 388, W, 70);
      ctx.fillRect(0, 515, W, H - 515);
    }
    const vignette = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 570);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function render() {
    drawFloor();
    drawFurniture();
    drawHideHints();
    drawMonster();
    drawPlayer();
    drawLighting();
    drawHiddenOverlay();
  }

  function frame(now) {
    const dt = Math.min(0.034, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (mode === "playing") update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (mode === "playing") pauseGame();
    else if (mode === "paused") resumeGame();
  }

  const controlledKeys = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "ShiftLeft", "ShiftRight", "Space", "KeyE", "KeyF"
  ]);

  document.addEventListener("keydown", (event) => {
    if (controlledKeys.has(event.code) && mode === "playing") event.preventDefault();
    if ((event.code === "Escape" || event.code === "KeyP") && !event.repeat) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (mode !== "playing") return;
    if (event.code === "KeyE" && !event.repeat) interact();
    if (event.code === "KeyF" && !event.repeat) toggleFlashlight();
    keys.add(event.code);
  });

  document.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "playing") pauseGame();
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (code === "KeyE") interact();
      else if (code === "KeyF") toggleFlashlight();
      else keys.add(code);
    });
    const release = () => keys.delete(code);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  ui.primary.addEventListener("click", () => {
    if (primaryAction) primaryAction();
  });
  ui.pause.addEventListener("click", () => {
    togglePause();
    ui.pause.blur();
  });
  ui.sound.addEventListener("click", () => {
    sound.init();
    sound.setMuted(!sound.muted);
    ui.sound.textContent = sound.muted ? "Звук: выкл" : "Звук: вкл";
    ui.sound.setAttribute("aria-label", sound.muted ? "Включить звук" : "Выключить звук");
    ui.sound.blur();
  });

  resetGame();
  showOverlay({
    eyebrow: "КОМНАТА 07 · 00:00",
    title: "ДО ШЕСТИ",
    text: "Ты слышишь шаги за дверью. Оно войдёт. Не дай ему найти тебя и продержись до утра.",
    button: "Начать ночь",
    hint: "F — фонарик · P или Esc — пауза",
    rules: true,
    action: startGame
  });
  requestAnimationFrame(frame);
})();
