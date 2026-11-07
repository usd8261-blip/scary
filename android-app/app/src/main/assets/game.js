import * as THREE from "./three.module.js";
import { GLTFLoader } from "./vendor/three/examples/jsm/loaders/GLTFLoader.js";

(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
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
    hiddenMask: document.getElementById("hiddenMask"),
    crosshair: document.getElementById("crosshair"),
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

  const NIGHT_DURATION = 150;
  const ROOM = { minX: -5.65, maxX: 5.65, minZ: -3.65, maxZ: 3.65 };
  const keys = new Set();
  const touchMode = window.matchMedia("(pointer: coarse)").matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (error) {
    ui.overlayTitle.textContent = "WEBGL НЕДОСТУПЕН";
    ui.overlayText.textContent = "Браузер не смог создать 3D-сцену. Включи аппаратное ускорение или открой игру в современном браузере.";
    ui.primary.style.display = "none";
    ui.rules.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050708);
  scene.fog = new THREE.FogExp2(0x050708, 0.045);
  const camera = new THREE.PerspectiveCamera(72, 11 / 7, 0.05, 45);
  camera.rotation.order = "YXZ";

  const ambient = new THREE.AmbientLight(0x91a49a, 0.16);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0x8aa8bb, 0.52);
  moon.position.set(2, 5, -4);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -7;
  moon.shadow.camera.right = 7;
  moon.shadow.camera.top = 6;
  moon.shadow.camera.bottom = -6;
  scene.add(moon);

  const flashlight = new THREE.SpotLight(0xf5f0d5, 58, 13, Math.PI / 7, 0.48, 1.35);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.bias = -0.0004;
  scene.add(flashlight);
  scene.add(flashlight.target);
  const nearLight = new THREE.PointLight(0x9eb7a7, 1.25, 3.2, 1.7);
  scene.add(nearLight);
  const monitorLight = new THREE.PointLight(0x729b82, 1.5, 3.2, 2);
  monitorLight.position.set(-0.15, 1.25, -2.85);
  scene.add(monitorLight);
  const warningLight = new THREE.PointLight(0xb52e24, 0, 3.5, 2);
  warningLight.position.set(5.45, 0.2, 1.5);
  scene.add(warningLight);

  const materials = {
    floor: new THREE.MeshStandardMaterial({ color: 0x292d29, roughness: 0.96 }),
    floorAlt: new THREE.MeshStandardMaterial({ color: 0x242824, roughness: 0.98 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x454b45, roughness: 0.94 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x242a26, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.86 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x302e28, roughness: 0.92 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x71756c, roughness: 0.55, metalness: 0.4 }),
    mattress: new THREE.MeshStandardMaterial({ color: 0x77786e, roughness: 1 }),
    blanket: new THREE.MeshStandardMaterial({ color: 0x3e5148, roughness: 1 }),
    pillow: new THREE.MeshStandardMaterial({ color: 0xb0ac99, roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xb7b29c, roughness: 1 }),
    rug: new THREE.MeshStandardMaterial({ color: 0x303a34, roughness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0c100e, roughness: 0.9 }),
    monster: new THREE.MeshStandardMaterial({ color: 0x101512, roughness: 0.88 }),
    eyes: new THREE.MeshStandardMaterial({ color: 0x9d1e16, emissive: 0xe23525, emissiveIntensity: 3 }),
    window: new THREE.MeshStandardMaterial({ color: 0x304654, emissive: 0x1e3445, emissiveIntensity: 1.1 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x385847, emissive: 0x416f55, emissiveIntensity: 0.65 })
  };

  function box(width, height, depth, x, y, z, material, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const colliders = [
    { id: "bed", minX: -5.15, maxX: -2.05, minZ: -3.35, maxZ: -1.25 },
    { id: "desk", minX: -1.45, maxX: 1.05, minZ: -3.65, maxZ: -2.72 },
    { id: "wardrobe", minX: 3.85, maxX: 5.45, minZ: -3.5, maxZ: -2.0 },
    { id: "table", minX: 0.05, maxX: 2.15, minZ: 0.55, maxZ: 1.85 },
    { id: "boxes", minX: -5.25, maxX: -4.15, minZ: 2.15, maxZ: 3.25 }
  ];
  const hideSpots = [
    { id: "bed", name: "под кроватью", x: -3.55, z: -2.15, y: 0.34, exitX: -3.55, exitZ: -0.82, yaw: Math.PI, pitch: 0 },
    { id: "wardrobe", name: "в шкафу", x: 4.65, z: -2.65, y: 1.42, exitX: 4.65, exitZ: -1.55, yaw: Math.PI, pitch: 0 }
  ];
  const patrolPoints = [
    { x: 4.6, z: 1.5 }, { x: 2.8, z: -0.8 }, { x: 0, z: -1.25 },
    { x: -2.2, z: -0.4 }, { x: -3.1, z: 1.35 }, { x: 0, z: 2.8 },
    { x: 4.2, z: 2.8 }, { x: 2.75, z: -2.05 }, { x: -3.2, z: 3.1 }
  ];

  function buildRoom() {
    box(12, 0.14, 8, 0, -0.08, 0, materials.floor);
    for (let x = -5.5; x < 5.8; x += 0.5) {
      const strip = box(0.48, 0.012, 7.85, x, 0.003, 0, Math.round(x * 2) % 2 ? materials.floor : materials.floorAlt);
      strip.castShadow = false;
    }
    box(12, 3.5, 0.16, 0, 1.75, -4, materials.wall);
    box(12, 3.5, 0.16, 0, 1.75, 4, materials.wall);
    box(0.16, 3.5, 8, -6, 1.75, 0, materials.wall);
    box(0.16, 3.5, 4.75, 6, 1.75, -1.625, materials.wall);
    box(0.16, 3.5, 1.75, 6, 1.75, 3.125, materials.wall);
    box(0.16, 1.1, 1.5, 6, 2.95, 1.5, materials.wall);
    box(11.8, 0.16, 0.08, 0, 0.12, -3.88, materials.trim);
    box(11.8, 0.16, 0.08, 0, 0.12, 3.88, materials.trim);
    box(0.08, 0.16, 7.8, -5.88, 0.12, 0, materials.trim);
    box(3.4, 0.025, 2.1, -0.5, 0.02, 0.45, materials.rug);

    box(2.15, 1.5, 0.04, 1.75, 2.05, -3.9, materials.window);
    box(2.35, 0.09, 0.1, 1.75, 2.82, -3.84, materials.trim);
    box(2.35, 0.09, 0.1, 1.75, 1.28, -3.84, materials.trim);
    box(0.09, 1.6, 0.1, 0.62, 2.05, -3.84, materials.trim);
    box(0.09, 1.6, 0.1, 2.88, 2.05, -3.84, materials.trim);
    box(0.06, 1.5, 0.08, 1.75, 2.05, -3.81, materials.trim);
    box(2.15, 0.06, 0.08, 1.75, 2.05, -3.81, materials.trim);

    box(3.1, 0.22, 2.05, -3.6, 0.42, -2.3, materials.woodDark);
    box(2.95, 0.3, 1.9, -3.6, 0.66, -2.3, materials.mattress);
    box(1.75, 0.06, 1.92, -3.05, 0.84, -2.3, materials.blanket);
    box(0.72, 0.16, 1.1, -4.55, 0.87, -2.3, materials.pillow);
    box(0.14, 1.55, 2.12, -5.14, 0.95, -2.3, materials.wood);
    [-4.85, -2.35].forEach((x) => {
      [-3.1, -1.5].forEach((z) => box(0.12, 0.42, 0.12, x, 0.21, z, materials.woodDark));
    });

    box(2.5, 0.13, 0.92, -0.2, 0.87, -3.2, materials.wood);
    [-1.28, 0.88].forEach((x) => {
      [-3.53, -2.87].forEach((z) => box(0.1, 0.85, 0.1, x, 0.43, z, materials.woodDark));
    });
    box(0.85, 0.55, 0.08, -0.15, 1.28, -3.42, materials.black);
    box(0.74, 0.44, 0.02, -0.15, 1.28, -3.37, materials.screen);
    box(0.08, 0.35, 0.08, -0.15, 0.99, -3.4, materials.metal);
    const paper = box(0.55, 0.015, 0.4, -0.9, 0.95, -3.05, materials.paper);
    paper.rotation.y = -0.16;

    const wardrobe = new THREE.Group();
    scene.add(wardrobe);
    box(0.12, 2.75, 1.45, 3.9, 1.38, -2.75, materials.woodDark, wardrobe);
    box(0.12, 2.75, 1.45, 5.4, 1.38, -2.75, materials.woodDark, wardrobe);
    box(1.5, 2.75, 0.1, 4.65, 1.38, -3.45, materials.woodDark, wardrobe);
    box(1.5, 0.12, 1.45, 4.65, 2.7, -2.75, materials.wood, wardrobe);
    box(1.5, 0.12, 1.45, 4.65, 0.08, -2.75, materials.wood, wardrobe);
    box(1.4, 0.07, 1.3, 4.65, 1.55, -2.75, materials.woodDark, wardrobe);

    box(2.05, 0.13, 1.3, 1.1, 0.8, 1.2, materials.wood);
    [0.25, 1.95].forEach((x) => {
      [0.7, 1.7].forEach((z) => box(0.12, 0.78, 0.12, x, 0.39, z, materials.woodDark));
    });
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.18, 0.06, 24), materials.metal);
    dish.position.set(1.5, 0.9, 1.2);
    dish.castShadow = true;
    scene.add(dish);

    box(1.05, 0.62, 0.95, -4.7, 0.31, 2.75, materials.wood);
    box(0.78, 0.55, 0.75, -4.82, 0.89, 2.82, materials.woodDark);
    box(0.07, 0.63, 0.97, -4.7, 0.32, 2.75, materials.paper);
  }

  buildRoom();

  const wardrobeDoors = new THREE.Group();
  scene.add(wardrobeDoors);
  box(0.71, 2.52, 0.08, 4.27, 1.39, -2.0, materials.wood, wardrobeDoors);
  box(0.71, 2.52, 0.08, 5.03, 1.39, -2.0, materials.wood, wardrobeDoors);
  box(0.035, 0.28, 0.06, 4.55, 1.42, -1.94, materials.metal, wardrobeDoors);
  box(0.035, 0.28, 0.06, 4.75, 1.42, -1.94, materials.metal, wardrobeDoors);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(5.92, 0, 0.75);
  scene.add(doorPivot);
  box(0.13, 2.4, 1.5, 0, 1.2, 0.75, materials.woodDark, doorPivot);
  box(0.08, 0.08, 0.08, -0.11, 1.15, 1.3, materials.metal, doorPivot);

  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i += 1) {
    dustPositions[i * 3] = random(-5.5, 5.5);
    dustPositions[i * 3 + 1] = random(0.15, 3.2);
    dustPositions[i * 3 + 2] = random(-3.6, 3.6);
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xaab5a9, size: 0.015, transparent: true, opacity: 0.24 }));
  scene.add(dust);

  function buildMonster() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.05, 10), materials.monster);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.39, 12, 8), materials.monster);
    shoulders.scale.set(1.25, 0.55, 0.7);
    shoulders.position.y = 1.42;
    shoulders.castShadow = true;
    group.add(shoulders);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), materials.monster);
    head.scale.set(0.82, 1.18, 0.86);
    head.position.set(0, 1.78, 0.04);
    head.castShadow = true;
    group.add(head);
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 1.15, 8), materials.monster);
      arm.position.set(side * 0.4, 0.98, 0.02);
      arm.rotation.z = side * -0.12;
      arm.castShadow = true;
      group.add(arm);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), materials.eyes);
      eye.position.set(side * 0.085, 1.83, 0.235);
      group.add(eye);
    });
    scene.add(group);
    return group;
  }

  function prepareMonsterModel(root) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material && object.material.color && object.material.color.getHex() === 0x000000) {
        object.material.color.setHex(0x111511);
      }
    });
    root.rotation.y = Math.PI;
    const wrapper = new THREE.Group();
    wrapper.add(root);
    wrapper.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(wrapper);
    let size = bounds.getSize(new THREE.Vector3());
    const scale = 1.9 / Math.max(size.y, size.x, size.z, 0.001);
    root.scale.setScalar(scale);
    wrapper.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(wrapper);
    size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.y -= bounds.min.y;
    root.position.z -= center.z;
    return wrapper;
  }

  function replaceMonsterModel(root, animations) {
    scene.remove(monsterGroup);
    monsterMixer = null;
    monsterGroup = prepareMonsterModel(root);
    scene.add(monsterGroup);
    if (animations && animations.length) {
      monsterMixer = new THREE.AnimationMixer(monsterGroup);
      monsterMixer.clipAction(animations[0]).play();
    }
    monsterGroup.visible = monster ? !["away", "warning"].includes(monster.state) : false;
  }

  let monsterGroup = buildMonster();
  let monsterMixer = null;
  new GLTFLoader().load(
    "Теневой_монстр.glb",
    (gltf) => replaceMonsterModel(gltf.scene, gltf.animations),
    undefined,
    () => {}
  );
  let mode = "menu";
  let primaryAction = null;
  let elapsed = 0;
  let lastTime = performance.now();
  let noticeTimer = 0;
  let noticeIsDanger = false;
  let stepTimer = 0;
  let player;
  let monster;
  let lookPointer = null;
  let lookX = 0;
  let lookY = 0;
  const cameraDirection = new THREE.Vector3();

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
      if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : 0.32, this.context.currentTime, 0.02);
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
      [261.6, 329.6, 392, 523.2].forEach((note, index) => this.tone(note, 0.65, "sine", 0.08, note, index * 0.16));
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
      x: 0,
      z: 2.2,
      yaw: 0,
      pitch: 0,
      radius: 0.28,
      stamina: 100,
      breath: 100,
      noise: 0,
      moving: false,
      sprinting: false,
      hidden: null,
      flashlight: true,
      holdingBreath: false,
      gasped: false,
      bob: 0
    };
    monster = {
      x: 5.18,
      z: 1.5,
      radius: 0.34,
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
    scene.background.set(0x050708);
    ambient.intensity = 0.16;
    wardrobeDoors.visible = true;
    monsterGroup.visible = false;
    doorPivot.rotation.y = 0;
    updateCamera(0);
    updateScene(0);
    updateHUD();
  }

  function lockMouse() {
    if (touchMode || mode !== "playing" || !canvas.requestPointerLock) return;
    try {
      const request = canvas.requestPointerLock();
      if (request && request.catch) request.catch(() => {});
    } catch (error) {
      return;
    }
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
    lockMouse();
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
    if (document.pointerLockElement) document.exitPointerLock();
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
    lockMouse();
  }

  function endGame(won, reason = "") {
    if (mode !== "playing") return;
    mode = "ended";
    keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    if (won) {
      sound.dawn();
      scene.background.set(0x26322f);
      ambient.intensity = 0.8;
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

  function circleHitsRect(x, z, radius, rect) {
    const closestX = clamp(x, rect.minX, rect.maxX);
    const closestZ = clamp(z, rect.minZ, rect.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  function collides(x, z, radius) {
    if (x - radius < ROOM.minX || x + radius > ROOM.maxX || z - radius < ROOM.minZ || z + radius > ROOM.maxZ) return true;
    return colliders.some((rect) => circleHitsRect(x, z, radius, rect));
  }

  function moveWithCollisions(entity, dx, dz) {
    const oldX = entity.x;
    const oldZ = entity.z;
    if (!collides(entity.x + dx, entity.z, entity.radius)) entity.x += dx;
    if (!collides(entity.x, entity.z + dz, entity.radius)) entity.z += dz;
    return Math.hypot(entity.x - oldX, entity.z - oldZ);
  }

  function hasLineOfSight(from, to) {
    const dist = distance(from, to);
    const steps = Math.ceil(dist / 0.14);
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
      if (colliders.some((rect) => x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ)) return false;
    }
    return true;
  }

  function nearestHideSpot() {
    let nearest = null;
    let nearestDistance = 1.3;
    for (const spot of hideSpots) {
      const dist = Math.hypot(player.x - spot.exitX, player.z - spot.exitZ);
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
      player.z = spot.exitZ;
      player.yaw = spot.yaw;
      player.pitch = 0;
      player.holdingBreath = false;
      monster.exposure = Math.max(0, monster.exposure - 0.2);
      wardrobeDoors.visible = true;
      sound.noise(0.12, 0.055);
      notify("Ты выбрался из укрытия.", 1.5);
      return;
    }
    const spot = nearestHideSpot();
    if (!spot) {
      notify("Здесь негде спрятаться.", 1.4);
      return;
    }
    const visibleAtEntrance = monster.state === "chase" && distance(monster, { x: spot.exitX, z: spot.exitZ }) < 6 && hasLineOfSight(monster, { x: spot.exitX, z: spot.exitZ });
    player.hidden = spot.id;
    player.x = spot.x;
    player.z = spot.z;
    player.yaw = spot.yaw;
    player.pitch = spot.pitch;
    player.noise = 10;
    player.breath = Math.max(player.breath, 55);
    wardrobeDoors.visible = spot.id !== "wardrobe";
    if (visibleAtEntrance) {
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
      if (player.holdingBreath) player.breath = Math.max(0, player.breath - 24 * dt);
      else player.breath = Math.min(100, player.breath + 17 * dt);
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

    const forwardInput = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
    const sideInput = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    const length = Math.hypot(forwardInput, sideInput);
    player.moving = length > 0;
    let dx = 0;
    let dz = 0;
    if (length > 0) {
      const forward = forwardInput / length;
      const side = sideInput / length;
      dx = -Math.sin(player.yaw) * forward + Math.cos(player.yaw) * side;
      dz = -Math.cos(player.yaw) * forward - Math.sin(player.yaw) * side;
    }
    player.sprinting = player.moving && (keys.has("ShiftLeft") || keys.has("ShiftRight")) && player.stamina > 0.5;
    const speed = player.sprinting ? 3.6 : 2.15;
    moveWithCollisions(player, dx * speed * dt, dz * speed * dt);
    if (player.sprinting) player.stamina = Math.max(0, player.stamina - 25 * dt);
    else player.stamina = Math.min(100, player.stamina + (player.moving ? 13 : 19) * dt);
    player.breath = Math.min(100, player.breath + 22 * dt);
    const targetNoise = player.moving ? (player.sprinting ? 85 : 30) : 2;
    player.noise += (targetNoise - player.noise) * Math.min(1, dt * 7);
    if (player.moving) {
      player.bob += dt * (player.sprinting ? 13 : 8);
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
    let choices = patrolPoints.filter((point) => distance(monster, point) > 0.9);
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
    monster.target = { x: 5.18, z: 1.5 };
    monster.awareness = 0;
    monster.exposure = 0;
    monster.alertedHide = false;
    notify("Шаги удаляются.", 2.2);
  }

  function moveMonster(target, speed, dt) {
    if (!target) return 0;
    const dx = target.x - monster.x;
    const dz = target.z - monster.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.02) return 0;
    monster.facing = Math.atan2(dz, dx);
    const moved = moveWithCollisions(monster, (dx / dist) * speed * dt, (dz / dist) * speed * dt);
    if (moved < 0.001) {
      monster.stuck += dt;
      if (monster.state === "hunting" && monster.stuck > 0.3) choosePatrolTarget();
      if (monster.state === "entering" && monster.stuck > 1.2) beginHunt();
    } else {
      monster.stuck = 0;
    }
    return dist;
  }

  function canSeePlayer() {
    if (player.hidden) return false;
    const dist = distance(monster, player);
    const range = player.flashlight ? 6.4 : 4.8;
    if (dist > range || !hasLineOfSight(monster, player)) return false;
    if (dist < 1.35) return true;
    const angle = Math.atan2(player.z - monster.z, player.x - monster.x);
    const difference = Math.atan2(Math.sin(angle - monster.facing), Math.cos(angle - monster.facing));
    return Math.abs(difference) < 1.12;
  }

  function updateExposure(dt) {
    if (!player.hidden || !["entering", "hunting", "chase"].includes(monster.state)) {
      monster.exposure = Math.max(0, monster.exposure - dt);
      return;
    }
    const spot = hideSpots.find((item) => item.id === player.hidden);
    const dist = Math.hypot(monster.x - spot.exitX, monster.z - spot.exitZ);
    if (dist < 1.65) {
      if (monster.alertedHide && dist < 0.95) monster.exposure += dt / 1.05;
      else if (!player.holdingBreath && !monster.alertedHide) monster.exposure += dt / 1.7;
      else monster.exposure -= dt * 0.7;
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
        m.x = 5.18;
        m.z = 1.5;
        notify("Шаги остановились у двери.", 3, true);
        sound.knock();
      }
    } else if (m.state === "warning") {
      m.timer -= dt;
      if (m.timer <= 0) {
        m.state = "entering";
        m.target = { x: 4.35, z: 1.45 };
        m.x = 5.18;
        m.z = 1.5;
        m.alertedHide = false;
        notify("Оно вошло в комнату.", 2.4, true);
        sound.alert();
      }
    } else if (m.state === "entering") {
      if (moveMonster(m.target, 0.85, dt) < 0.2) beginHunt();
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
            m.lastSeen = { x: player.x, z: player.z };
          } else {
            m.awareness = Math.max(0, m.awareness - 0.32 * dt);
            if (player.sprinting && distance(m, player) < 6.5) {
              m.awareness = Math.min(1, m.awareness + 0.42 * dt);
              m.target = { x: player.x, z: player.z };
            }
          }
          if (m.awareness >= 1) {
            m.state = "chase";
            m.lostTimer = 2.7;
            m.lastSeen = { x: player.x, z: player.z };
            notify("Оно тебя увидело. Беги!", 2.5, true);
            sound.alert();
          }
        } else {
          m.awareness = Math.max(0, m.awareness - dt);
        }
        if (m.state === "hunting") {
          if (!m.target || distance(m, m.target) < 0.25) choosePatrolTarget();
          moveMonster(m.target, 0.78 + progress * 0.22, dt);
        }
      }
    } else if (m.state === "chase") {
      if (player.hidden) {
        if (m.alertedHide) {
          const spot = hideSpots.find((item) => item.id === player.hidden);
          moveMonster({ x: spot.exitX, z: spot.exitZ }, 1.35, dt);
        } else {
          m.state = "hunting";
          m.awareness = 0.2;
          choosePatrolTarget();
        }
      } else {
        const sees = distance(m, player) < 7.2 && hasLineOfSight(m, player);
        if (sees) {
          m.lastSeen = { x: player.x, z: player.z };
          m.lostTimer = 2.7;
        } else {
          m.lostTimer -= dt;
        }
        moveMonster(m.lastSeen || player, 1.55 + progress * 0.3, dt);
        if (distance(m, player) < m.radius + player.radius + 0.12) {
          endGame(false, "Оно догнало тебя. Выключай свет, не беги без нужды и прячься до погони.");
        } else if (m.lostTimer <= 0) {
          m.state = "hunting";
          m.awareness = 0.25;
          choosePatrolTarget();
          notify("Оно потеряло тебя из виду.", 2);
        }
      }
    } else if (m.state === "leaving") {
      if (moveMonster(m.target, 1.0, dt) < 0.18) {
        m.state = "away";
        m.timer = random(8, 13) - progress * 3;
        m.awareness = 0;
        m.exposure = 0;
        m.alertedHide = false;
      }
    }
    if (mode === "playing") updateExposure(dt);
  }

  function updateCamera(dt) {
    if (!player) return;
    if (player.hidden) {
      const spot = hideSpots.find((item) => item.id === player.hidden);
      camera.position.set(spot.x, spot.y, spot.z);
      camera.rotation.set(spot.pitch, spot.yaw, 0);
    } else {
      const bob = player.moving ? Math.sin(player.bob) * (player.sprinting ? 0.045 : 0.025) : 0;
      camera.position.set(player.x, 1.55 + bob, player.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
    }
    camera.getWorldDirection(cameraDirection);
    flashlight.position.copy(camera.position);
    flashlight.target.position.copy(camera.position).addScaledVector(cameraDirection, 5);
    flashlight.visible = player.flashlight && !player.hidden;
    nearLight.position.copy(camera.position);
    nearLight.intensity = player.hidden ? 0.18 : 1.25;
  }

  function updateScene(dt) {
    if (!monster) return;
    const visible = !["away", "warning"].includes(monster.state);
    monsterGroup.visible = visible;
    monsterGroup.position.set(monster.x, Math.sin(monster.anim * 8) * 0.025, monster.z);
    monsterGroup.rotation.y = Math.PI / 2 - monster.facing;
    if (monsterMixer && visible) monsterMixer.update(dt);
    const doorOpen = ["entering", "hunting", "chase", "leaving"].includes(monster.state);
    doorPivot.rotation.y += ((doorOpen ? -1.18 : 0) - doorPivot.rotation.y) * Math.min(1, dt * 5);
    warningLight.intensity = monster.state === "warning" ? 3.5 + Math.sin(performance.now() / 130) * 1.5 : 0;
    monitorLight.intensity = 1.35 + Math.sin(performance.now() / 900) * 0.15;
    dust.rotation.y += dt * 0.008;
  }

  function updateHUD() {
    if (!player || !monster) return;
    ui.clock.textContent = formatTime();
    ui.stamina.style.width = `${player.stamina}%`;
    ui.breath.style.width = `${player.breath}%`;
    ui.breathRow.classList.toggle("visible", Boolean(player.hidden));
    ui.objective.textContent = player.hidden ? "В укрытии · оставайся тихим" : "Доживи до 6:00";
    ui.hiddenMask.className = `hidden-mask${player.hidden ? ` ${player.hidden}` : ""}`;
    ui.crosshair.classList.toggle("visible", mode === "playing" && !player.hidden);

    const closeToHidden = player.hidden && distance(monster, player) < 2.2 && ["entering", "hunting", "chase"].includes(monster.state);
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
      if (player.hidden) prompt = closeToHidden ? "Удерживай ПРОБЕЛ — не дыши" : "E — выйти из укрытия";
      else if (nearestHideSpot()) prompt = `E — спрятаться ${nearestHideSpot().name}`;
      else if (monster.state === "chase") prompt = "Беги или незаметно спрячься";
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
    const proximity = monster.state === "away" ? 0 : clamp(1 - distance(monster, player) / 5.5, 0, 1);
    sound.update(dt, Math.max(proximity, monster.awareness, monster.exposure));
    updateHUD();
  }

  function resize() {
    const width = Math.max(1, ui.frame.clientWidth);
    const height = Math.max(1, ui.frame.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    const dt = Math.min(0.034, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (mode === "playing") update(dt);
    updateCamera(dt);
    updateScene(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (mode === "playing") pauseGame();
    else if (mode === "paused") resumeGame();
  }

  function updateLook(dx, dy, sensitivity) {
    if (mode !== "playing" || player.hidden) return;
    player.yaw -= dx * sensitivity;
    player.pitch = clamp(player.pitch - dy * sensitivity, -1.35, 1.35);
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
  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas) updateLook(event.movementX, event.movementY, 0.0022);
  });
  document.addEventListener("pointerlockchange", () => {
    if (!touchMode && mode === "playing" && document.pointerLockElement !== canvas) pauseGame();
  });
  canvas.addEventListener("click", () => {
    if (!touchMode && mode === "playing" && document.pointerLockElement !== canvas) lockMouse();
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "playing" || (event.pointerType === "mouse" && document.pointerLockElement === canvas)) return;
    event.preventDefault();
    lookPointer = event.pointerId;
    lookX = event.clientX;
    lookY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" && document.pointerLockElement === canvas) {
      updateLook(event.movementX, event.movementY, 0.0022);
      return;
    }
    if (event.pointerId !== lookPointer) return;
    const sensitivity = event.pointerType === "mouse" ? 0.004 : 0.006;
    updateLook(event.clientX - lookX, event.clientY - lookY, sensitivity);
    lookX = event.clientX;
    lookY = event.clientY;
  });
  const stopLook = (event) => {
    if (event.pointerId === lookPointer) lookPointer = null;
  };
  canvas.addEventListener("pointerup", stopLook);
  canvas.addEventListener("pointercancel", stopLook);

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

  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(ui.frame);
  resize();
  resetGame();
  showOverlay({
    eyebrow: "КОМНАТА 07 · 00:00",
    title: "ДО ШЕСТИ",
    text: "Ты слышишь шаги за дверью. Оно войдёт. Не дай ему найти тебя и продержись до утра.",
    button: "Начать ночь",
    hint: "Мышь — обзор · F — фонарик · P или Esc — пауза",
    rules: true,
    action: startGame
  });
  requestAnimationFrame(frame);
})();
