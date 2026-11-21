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

  const NIGHT_DURATION = 210;
  const MONSTER_RADIUS = 0.34;
  const ROOM = { minX: -6.5, maxX: 20.5, minZ: -10.5, maxZ: 10.5 };
  // Задания разложены по всем комнатам дома: спальня, коридор, кухня, рабочая комната.
  const taskSpots = [
    { name: "починить окно", hint: "подойди к окну", x: 1.75, z: -2.85, lookX: 1.75, lookY: 2.05, lookZ: -3.84, hold: 3, bonus: 12 },
    { name: "проверить розетку", hint: "подойди к столу", x: 1.1, z: 2.3, lookX: 1.1, lookY: 0.95, lookZ: 1.2, hold: 2.5, bonus: 10 },
    { name: "настроить радио", hint: "подойди к тумбочке у кровати", x: -1.75, z: -2.35, lookX: -1.8, lookY: 0.85, lookZ: -3.2, hold: 2.5, bonus: 10 },
    { name: "проверить входную дверь", hint: "подойди к входной двери", x: 8, z: 9.1, lookX: 8, lookY: 1.3, lookZ: 10, hold: 2.5, bonus: 12 },
    { name: "помыть посуду", hint: "подойди к мойке", x: 12.4, z: -8.5, lookX: 12.4, lookY: 1, lookZ: -9.45, hold: 4, bonus: 14 },
    { name: "закрыть холодильник", hint: "подойди к холодильнику", x: 18.3, z: -7.2, lookX: 19.4, lookY: 1.3, lookZ: -7.2, hold: 2, bonus: 10 },
    { name: "вытереть стол", hint: "подойди к обеденному столу", x: 14.2, z: -3, lookX: 14.2, lookY: 0.85, lookZ: -4, hold: 3, bonus: 12 },
    { name: "выключить компьютер", hint: "подойди к рабочему столу", x: 17, z: 5, lookX: 19.6, lookY: 1.35, lookZ: 5, hold: 3, bonus: 14 },
    { name: "запереть сейф", hint: "подойди к сейфу", x: 18.4, z: 9, lookX: 19.5, lookY: 0.75, lookZ: 9.35, hold: 2.5, bonus: 10 },
    { name: "собрать бумаги", hint: "подойди к полкам", x: 14.4, z: 9, lookX: 14.4, lookY: 1, lookZ: 9.6, hold: 3.5, bonus: 12 }
  ];
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
  moon.shadow.camera.left = -15;
  moon.shadow.camera.right = 15;
  moon.shadow.camera.top = 10;
  moon.shadow.camera.bottom = -10;
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
  warningLight.position.set(8, 0.2, 10);
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

  const colliders = [];
  const nav = { cell: 0.35, minX: 0, minZ: 0, cols: 0, rows: 0, walkable: null };
  const roomLights = {};
  // Укрытие: id совпадает с CSS-классом маски; y — высота камеры внутри.
  const hideSpots = [
    { id: "bed", name: "под кроватью", x: -3.55, z: -2.15, y: 0.34, exitX: -3.55, exitZ: -0.82, yaw: Math.PI, pitch: 0 },
    { id: "wardrobe", name: "в шкафу", x: 4.65, z: -2.65, y: 1.42, exitX: 4.65, exitZ: -1.55, yaw: Math.PI, pitch: 0 },
    { id: "closet", name: "в шкафу коридора", x: 6.75, z: 6.8, y: 1.45, exitX: 7.6, exitZ: 6.8, yaw: -Math.PI / 2, pitch: 0 },
    { id: "counter", name: "под стойкой", x: 13.1, z: -9.05, y: 0.7, exitX: 13.1, exitZ: -8.4, yaw: Math.PI, pitch: 0 },
    { id: "pantry", name: "в кладовке", x: 19, z: -2.2, y: 1.4, exitX: 18.4, exitZ: -2.2, yaw: Math.PI / 2, pitch: 0 },
    { id: "cabinet", name: "в шкафу кабинета", x: 10.78, z: 8.2, y: 1.4, exitX: 11.7, exitZ: 8.2, yaw: -Math.PI / 2, pitch: 0 }
  ];
  // Маршруты обхода по комнатам: за одну вылазку монстр обыскивает одну комнату,
  // а иногда идёт проверять конкретное укрытие.
  const patrolRooms = {
    bedroom: [{ x: -3, z: 2.6 }, { x: 2.6, z: 3 }, { x: 3, z: 0.2 }],
    corridor: [{ x: 8, z: 0.5 }, { x: 8, z: 8.2 }, { x: 8, z: -8.6 }],
    kitchen: [{ x: 12.6, z: -8.2 }, { x: 15.2, z: -5.6 }, { x: 17.5, z: -2 }],
    workroom: [{ x: 12.6, z: 8.6 }, { x: 17, z: 7.6 }, { x: 17.6, z: 2.4 }]
  };
  const patrolPoints = Object.values(patrolRooms).flat();

  function buildRoom() {
    function wall(x, z, w, d, id = "wall") {
      box(w, 3.5, d, x, 1.75, z, materials.wall);
      colliders.push({ id, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }

    function spawnWindow(x, y, z, width, height, facing) {
      if (facing === "north") {
        box(width, height, 0.02, x, y, z + 0.01, materials.window);
        box(width + 0.16, 0.08, 0.08, x, y + height * 0.5 + 0.04, z + 0.04, materials.trim);
        box(width + 0.22, 0.09, 0.16, x, y - height * 0.5 - 0.045, z + 0.08, materials.trim);
        box(0.08, height, 0.08, x - width * 0.5 - 0.04, y, z + 0.04, materials.trim);
        box(0.08, height, 0.08, x + width * 0.5 + 0.04, y, z + 0.04, materials.trim);
        box(0.05, height, 0.05, x, y, z + 0.025, materials.trim);
        box(width, 0.05, 0.05, x, y, z + 0.025, materials.trim);
      } else if (facing === "south") {
        box(width, height, 0.02, x, y, z - 0.01, materials.window);
        box(width + 0.16, 0.08, 0.08, x, y + height * 0.5 + 0.04, z - 0.04, materials.trim);
        box(width + 0.22, 0.09, 0.16, x, y - height * 0.5 - 0.045, z - 0.08, materials.trim);
        box(0.08, height, 0.08, x - width * 0.5 - 0.04, y, z - 0.04, materials.trim);
        box(0.08, height, 0.08, x + width * 0.5 + 0.04, y, z - 0.04, materials.trim);
        box(0.05, height, 0.05, x, y, z - 0.025, materials.trim);
        box(width, 0.05, 0.05, x, y, z - 0.025, materials.trim);
      } else if (facing === "west") {
        box(0.02, height, width, x + 0.01, y, z, materials.window);
        box(0.08, 0.08, width + 0.16, x + 0.04, y + height * 0.5 + 0.04, z, materials.trim);
        box(0.16, 0.09, width + 0.22, x + 0.08, y - height * 0.5 - 0.045, z, materials.trim);
        box(0.08, height, 0.08, x + 0.04, y, z - width * 0.5 - 0.04, materials.trim);
        box(0.08, height, 0.08, x + 0.04, y, z + width * 0.5 + 0.04, materials.trim);
        box(0.05, height, 0.05, x + 0.025, y, z, materials.trim);
        box(0.05, 0.05, width, x + 0.025, y, z, materials.trim);
      } else if (facing === "east") {
        box(0.02, height, width, x - 0.01, y, z, materials.window);
        box(0.08, 0.08, width + 0.16, x - 0.04, y + height * 0.5 + 0.04, z, materials.trim);
        box(0.16, 0.09, width + 0.22, x - 0.08, y - height * 0.5 - 0.045, z, materials.trim);
        box(0.08, height, 0.08, x - 0.04, y, z - width * 0.5 - 0.04, materials.trim);
        box(0.08, height, 0.08, x - 0.04, y, z + width * 0.5 + 0.04, materials.trim);
        box(0.05, height, 0.05, x - 0.025, y, z, materials.trim);
        box(0.05, 0.05, width, x - 0.025, y, z, materials.trim);
      }
    }

    // Bedroom 1 (Room 07)
    box(12, 0.14, 8, 0, -0.08, 0, materials.floor);
    for (let x = -5.5; x < 5.8; x += 0.5) {
      const strip = box(0.48, 0.012, 7.85, x, 0.003, 0, Math.round(x * 2) % 2 ? materials.floor : materials.floorAlt);
      strip.castShadow = false;
    }
    wall(-6.08, 0, 0.16, 8, "b1w1");
    wall(0, -4.08, 12, 0.16, "b1w2");
    wall(0, 4.08, 12, 0.16, "b1w3");
    // Wall with door to corridor
    box(0.16, 3.5, 3.25, 6.08, 1.75, -2.375, materials.wall);
    colliders.push({ id: "b1w4a", minX: 6, maxX: 6.16, minZ: -4, maxZ: -0.75 });
    box(0.16, 3.5, 3.25, 6.08, 1.75, 2.375, materials.wall);
    colliders.push({ id: "b1w4b", minX: 6, maxX: 6.16, minZ: 0.75, maxZ: 4 });
    box(0.16, 1.1, 1.5, 6.08, 2.95, 0, materials.wall);
    // Bedroom door frame
    box(0.26, 2.5, 0.16, 6.08, 1.25, -0.83, materials.trim);
    box(0.26, 2.5, 0.16, 6.08, 1.25, 0.83, materials.trim);
    box(0.28, 0.16, 1.82, 6.08, 2.48, 0.0, materials.trim);

    box(11.8, 0.16, 0.08, 0, 0.12, -3.88, materials.trim);
    box(11.8, 0.16, 0.08, 0, 0.12, 3.88, materials.trim);
    box(0.08, 0.16, 7.8, -5.88, 0.12, 0, materials.trim);
    box(3.4, 0.025, 2.1, -0.5, 0.02, 0.45, materials.rug);

    // ── Corridor: connects the bedroom, the kitchen and the work room ───────
    box(3.92, 0.14, 20.16, 8.08, -0.08, 0, materials.floor);
    const runner = box(1.5, 0.02, 14, 8, 0.015, 0.6, materials.rug);
    runner.castShadow = false;
    wall(8.08, -10.16, 4.16, 0.16, "cw1");
    // South wall with the front door opening (x 7.1..8.9)
    wall(6.55, 10.16, 1.1, 0.16, "cw2a");
    wall(9.53, 10.16, 1.26, 0.16, "cw2b");
    box(1.8, 0.85, 0.16, 8, 3.08, 10.16, materials.wall);
    // East wall with doorways to the kitchen (z -6..-4.4) and work room (z 4.4..6)
    wall(10.08, -8.04, 0.16, 4.08, "cw3a");
    wall(10.08, 0, 0.16, 8.8, "cw3b");
    wall(10.08, 8.04, 0.16, 4.08, "cw3c");
    box(0.16, 0.85, 1.6, 10.08, 3.08, -5.2, materials.wall);
    box(0.16, 0.85, 1.6, 10.08, 3.08, 5.2, materials.wall);
    [-6, -4.4, 4.4, 6].forEach((z) => box(0.24, 2.7, 0.12, 10.08, 1.35, z, materials.trim));
    // West walls of corridor north and south of bedroom doorway
    wall(6.08, -7.12, 0.16, 6.08, "cw4a");
    wall(6.08, 7.12, 0.16, 6.08, "cw4b");
    // Corridor closet — hiding place
    const closet = new THREE.Group();
    scene.add(closet);
    box(0.55, 2.3, 1.25, 6.45, 1.15, 6.8, materials.woodDark, closet);
    colliders.push({ id: "closet", minX: 6.17, maxX: 6.73, minZ: 6.17, maxZ: 7.43 });
    box(0.05, 2.1, 0.6, 6.74, 1.12, 6.49, materials.wood, closet);
    box(0.05, 2.1, 0.6, 6.74, 1.12, 7.11, materials.wood, closet);
    box(0.04, 0.3, 0.04, 6.77, 1.15, 6.72, materials.metal, closet);
    // Coat hooks and a bench by the front door
    box(0.06, 0.08, 1.4, 6.18, 1.85, 8.9, materials.woodDark);
    box(0.5, 0.1, 1.2, 6.45, 0.45, 8.9, materials.wood);
    box(0.08, 0.45, 0.08, 6.25, 0.23, 8.45, materials.woodDark);
    box(0.08, 0.45, 0.08, 6.25, 0.23, 9.35, materials.woodDark);

    // ── Kitchen: north-east wing ────────────────────────────────────────────
    box(10, 0.14, 10.2, 15.08, -0.08, -5, materials.floor);
    for (let x = 10.6; x < 20; x += 0.6) {
      const tile = box(0.56, 0.012, 9.9, x, 0.004, -5, Math.round(x * 5) % 2 ? materials.floor : materials.floorAlt);
      tile.castShadow = false;
    }
    wall(15.08, -10.16, 10.16, 0.16, "kw1");
    wall(20.08, -5.04, 0.16, 10.4, "kw2");
    wall(15.08, 0.08, 10.16, 0.16, "kw3");
    // Counter run with the sink along the north wall
    box(5.4, 0.86, 0.72, 13.1, 0.43, -9.48, materials.wood);
    colliders.push({ id: "counter", minX: 10.4, maxX: 15.8, minZ: -9.84, maxZ: -9.12 });
    box(5.6, 0.08, 0.82, 13.1, 0.9, -9.48, materials.woodDark);
    box(0.9, 0.04, 0.48, 12.3, 0.93, -9.48, materials.metal);
    box(0.06, 0.34, 0.06, 12.3, 1.08, -9.72, materials.metal);
    box(5.2, 0.72, 0.34, 13.1, 2.2, -9.82, materials.wood);
    // Kitchen north window
    spawnWindow(12.3, 2.08, -10.08, 1.7, 1.1, "north");
    // Fridge
    box(1, 1.9, 0.9, 19.5, 0.95, -7.2, materials.metal);
    colliders.push({ id: "fridge", minX: 19, maxX: 20, minZ: -7.65, maxZ: -6.75 });
    box(0.04, 0.9, 0.04, 18.98, 1.2, -7.2, materials.metal);
    // Dining table and chairs
    box(2.2, 0.1, 1.2, 14.2, 0.78, -4, materials.wood);
    colliders.push({ id: "kitchenTable", minX: 13.1, maxX: 15.3, minZ: -4.6, maxZ: -3.4 });
    [[13.3, -4.42], [15.1, -4.42], [13.3, -3.58], [15.1, -3.58]].forEach(([x, z]) => box(0.12, 0.76, 0.12, x, 0.39, z, materials.woodDark));
    [[13.5, -2.98, 1], [15, -2.98, 1], [13.5, -4.98, -1], [15, -4.98, -1]].forEach(([x, z, fz]) => {
      box(0.44, 0.05, 0.44, x, 0.45, z, materials.woodDark);
      [[x - 0.17, z - 0.17], [x + 0.17, z - 0.17], [x - 0.17, z + 0.17], [x + 0.17, z + 0.17]].forEach(([lx, lz]) => {
        box(0.045, 0.43, 0.045, lx, 0.225, lz, materials.woodDark);
      });
      [[x - 0.17, z - 0.18 * fz], [x + 0.17, z - 0.18 * fz]].forEach(([bx, bz]) => {
        box(0.045, 0.5, 0.045, bx, 0.7, bz, materials.woodDark);
      });
      box(0.42, 0.07, 0.045, x, 0.92, z - 0.18 * fz, materials.woodDark);
      box(0.36, 0.05, 0.035, x, 0.73, z - 0.18 * fz, materials.woodDark);
    });
    const plate = box(0.5, 0.04, 0.5, 15.1, 0.85, -4, materials.paper);
    plate.rotation.y = 0.2;
    // Pantry — hiding place
    const pantry = new THREE.Group();
    scene.add(pantry);
    box(0.85, 2.2, 1.5, 19.55, 1.1, -2.2, materials.woodDark, pantry);
    colliders.push({ id: "pantry", minX: 19.12, maxX: 19.98, minZ: -2.95, maxZ: -1.45 });
    box(0.05, 2, 0.68, 19.1, 1.06, -2.56, materials.wood, pantry);
    box(0.05, 2, 0.68, 19.1, 1.06, -1.84, materials.wood, pantry);
    // Low pendant light over the table
    box(0.04, 0.5, 0.04, 14.2, 2.9, -4, materials.trim);

    // ── Work room (кабинет): south-east wing ────────────────────────────────
    box(10, 0.14, 10, 15.08, -0.08, 5, materials.floor);
    for (let z = 0.7; z < 9.9; z += 0.7) {
      const board = box(9.8, 0.012, 0.66, 15.08, 0.004, z, Math.round(z * 10) % 2 ? materials.floor : materials.floorAlt);
      board.castShadow = false;
    }
    wall(15.08, 10.16, 10.16, 0.16, "ww1");
    wall(20.08, 5.04, 0.16, 10.4, "ww2");
    // Desk against the east wall with the computer
    box(2.6, 0.12, 0.95, 18.7, 0.79, 5, materials.wood);
    colliders.push({ id: "desk2", minX: 17.4, maxX: 20, minZ: 4.5, maxZ: 5.5 });
    [[17.5, 4.62], [19.9, 4.62], [17.5, 5.38], [19.9, 5.38]].forEach(([x, z]) => box(0.1, 0.76, 0.1, x, 0.38, z, materials.woodDark));
    box(0.06, 0.62, 0.98, 19.82, 1.4, 5, materials.black);
    box(0.02, 0.52, 0.86, 19.78, 1.4, 5, materials.screen);
    box(0.16, 0.24, 0.26, 19.86, 0.98, 5, materials.metal);
    box(0.5, 0.1, 0.5, 18.2, 0.5, 5, materials.woodDark);
    box(0.5, 0.55, 0.08, 18.2, 0.8, 5.24, materials.woodDark);
    box(0.5, 0.55, 0.08, 18.2, 0.8, 4.76, materials.woodDark);
    // Desk lamp
    box(0.22, 0.04, 0.22, 17.75, 0.87, 4.72, materials.metal);
    box(0.05, 0.4, 0.05, 17.75, 1.07, 4.72, materials.metal);
    box(0.2, 0.14, 0.2, 17.75, 1.3, 4.72, materials.metal);
    // Shelves and papers
    for (let i = 0; i < 3; i += 1) box(3.2, 0.08, 0.42, 14.6, 1 + i * 0.62, 9.72, materials.wood);
    box(0.08, 2.4, 0.42, 13, 1.2, 9.72, materials.woodDark);
    box(0.08, 2.4, 0.42, 16.2, 1.2, 9.72, materials.woodDark);
    box(0.5, 0.16, 0.3, 13.9, 1.12, 9.7, materials.paper);
    box(0.42, 0.12, 0.28, 15.2, 1.74, 9.7, materials.paper);
    box(0.5, 0.2, 0.3, 14.6, 2.36, 9.7, materials.paper);
    // Safe
    box(0.7, 0.7, 0.65, 19.5, 0.35, 9.35, materials.metal);
    colliders.push({ id: "safe", minX: 19.15, maxX: 19.85, minZ: 9.03, maxZ: 9.67 });
    box(0.06, 0.2, 0.06, 19.14, 0.42, 9.35, materials.metal);
    // Cabinet — hiding place
    const cabinet = new THREE.Group();
    scene.add(cabinet);
    box(0.55, 2.3, 1.5, 10.45, 1.15, 8.2, materials.woodDark, cabinet);
    colliders.push({ id: "cabinet", minX: 10.17, maxX: 10.72, minZ: 7.45, maxZ: 8.95 });
    box(0.05, 2.1, 0.68, 10.74, 1.12, 7.86, materials.wood, cabinet);
    box(0.05, 2.1, 0.68, 10.74, 1.12, 8.54, materials.wood, cabinet);
    // Whiteboard and a reading chair
    box(2.4, 1.2, 0.05, 14.4, 1.9, 0.2, materials.paper);
    box(2.52, 0.06, 0.08, 14.4, 2.53, 0.2, materials.metal);
    box(0.9, 0.12, 0.85, 12.6, 0.42, 2.6, materials.blanket);
    box(0.12, 0.9, 0.85, 12.1, 0.72, 2.6, materials.blanket);
    colliders.push({ id: "armchair", minX: 12.05, maxX: 13.1, minZ: 2.15, maxZ: 3.05 });
    box(1.6, 0.02, 1.2, 14.5, 0.02, 4.6, materials.rug);
    // Workroom east window
    spawnWindow(20.0, 2.0, 7.2, 1.8, 1.3, "east");

    // Room lights
    const kitchenLight = new THREE.PointLight(0xd9c39a, 0.85, 9, 2);
    kitchenLight.position.set(14.2, 2.7, -4.6);
    scene.add(kitchenLight);
    const fridgeGlow = new THREE.PointLight(0x7fd1a8, 0.7, 3.2, 2);
    fridgeGlow.position.set(19.2, 1.1, -7.2);
    scene.add(fridgeGlow);
    const deskLight = new THREE.PointLight(0xf0c98a, 0.75, 4.5, 2);
    deskLight.position.set(17.75, 1.25, 4.72);
    scene.add(deskLight);
    const workLight = new THREE.PointLight(0x9fb7a6, 0.6, 9, 2);
    workLight.position.set(15.4, 2.7, 6.4);
    scene.add(workLight);
    roomLights.kitchen = kitchenLight;
    roomLights.desk = deskLight;
    roomLights.work = workLight;

    // Bedroom north window
    spawnWindow(1.75, 2.05, -4.0, 2.15, 1.5, "north");

    // Additional perimeter windows
    // Bedroom west window
    spawnWindow(-6.0, 2.0, 1.5, 1.8, 1.5, "west");
    // Corridor north window
    spawnWindow(8.08, 2.05, -10.08, 1.8, 1.5, "north");
    // Kitchen east window
    spawnWindow(20.0, 2.0, -4.5, 1.8, 1.4, "east");
    // Workroom south window (placed away from bookshelves at x: 13..16.2)
    spawnWindow(17.65, 2.0, 10.08, 1.6, 1.4, "south");

    box(3.1, 0.22, 2.05, -3.6, 0.42, -2.3, materials.woodDark);
    colliders.push({ id: "bed", minX: -5.15, maxX: -2.05, minZ: -3.35, maxZ: -1.25 });
    box(2.95, 0.3, 1.9, -3.6, 0.66, -2.3, materials.mattress);
    box(1.75, 0.06, 1.92, -3.05, 0.84, -2.3, materials.blanket);
    box(0.72, 0.16, 1.1, -4.55, 0.87, -2.3, materials.pillow);
    box(0.14, 1.55, 2.12, -5.14, 0.95, -2.3, materials.wood);
    [-4.85, -2.35].forEach((x) => {
      [-3.1, -1.5].forEach((z) => box(0.12, 0.42, 0.12, x, 0.21, z, materials.woodDark));
    });

    // Bedside nightstand & vintage radio receiver
    box(0.65, 0.6, 0.65, -1.8, 0.3, -3.2, materials.woodDark);
    colliders.push({ id: "nightstand", minX: -2.15, maxX: -1.45, minZ: -3.55, maxZ: -2.85 });
    box(0.42, 0.24, 0.2, -1.8, 0.72, -3.2, materials.woodDark);
    box(0.38, 0.2, 0.02, -1.8, 0.72, -3.09, materials.paper);
    box(0.18, 0.16, 0.025, -1.89, 0.72, -3.085, materials.black);
    box(0.14, 0.07, 0.025, -1.7, 0.76, -3.085, materials.screen);
    box(0.04, 0.04, 0.03, -1.74, 0.66, -3.08, materials.metal);
    box(0.04, 0.04, 0.03, -1.66, 0.66, -3.08, materials.metal);
    box(0.015, 0.35, 0.015, -1.96, 0.98, -3.22, materials.metal);

    box(2.5, 0.13, 0.92, -0.2, 0.87, -3.2, materials.wood);
    colliders.push({ id: "desk", minX: -1.45, maxX: 1.05, minZ: -3.65, maxZ: -2.72 });
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
    colliders.push({ id: "wardrobe", minX: 3.85, maxX: 5.45, minZ: -3.5, maxZ: -2.0 });
    box(0.12, 2.75, 1.45, 3.9, 1.38, -2.75, materials.woodDark, wardrobe);
    box(0.12, 2.75, 1.45, 5.4, 1.38, -2.75, materials.woodDark, wardrobe);
    box(1.5, 2.75, 0.1, 4.65, 1.38, -3.45, materials.woodDark, wardrobe);
    box(1.5, 0.12, 1.45, 4.65, 2.7, -2.75, materials.wood, wardrobe);
    box(1.5, 0.12, 1.45, 4.65, 0.08, -2.75, materials.wood, wardrobe);
    box(1.4, 0.07, 1.3, 4.65, 1.55, -2.75, materials.woodDark, wardrobe);

    box(2.05, 0.13, 1.3, 1.1, 0.8, 1.2, materials.wood);
    colliders.push({ id: "table", minX: 0.05, maxX: 2.15, minZ: 0.55, maxZ: 1.85 });
    [0.25, 1.95].forEach((x) => {
      [0.7, 1.7].forEach((z) => box(0.12, 0.78, 0.12, x, 0.39, z, materials.woodDark));
    });
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.18, 0.06, 24), materials.metal);
    dish.position.set(1.5, 0.9, 1.2);
    dish.castShadow = true;
    scene.add(dish);

    box(1.05, 0.62, 0.95, -4.7, 0.31, 2.75, materials.wood);
    colliders.push({ id: "boxes", minX: -5.25, maxX: -4.15, minZ: 2.15, maxZ: 3.25 });
    box(0.78, 0.55, 0.75, -4.82, 0.89, 2.82, materials.woodDark);
    box(0.07, 0.63, 0.97, -4.7, 0.32, 2.75, materials.paper);
  }

  buildRoom();
  buildNavigation();
  loadFurnitureModels();

  function loadFurnitureModels() {
    const loader = new GLTFLoader();

    function spawn(url, instances, customize) {
      loader.load(
        url,
        (gltf) => {
          const root = gltf.scene;
          root.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                  m.roughness = Math.max(0.65, m.roughness || 0.8);
                });
              }
            }
          });
          if (customize) customize(root);

          const box3 = new THREE.Box3().setFromObject(root);
          const center = new THREE.Vector3();
          box3.getCenter(center);
          const bottomY = box3.min.y;

          for (let i = 0; i < instances.length; i += 1) {
            const inst = instances[i];
            const group = new THREE.Group();
            const clone = root.clone(true);
            clone.position.set(-center.x, -bottomY, -center.z);
            group.add(clone);
            if (inst.scale) group.scale.setScalar(inst.scale);
            if (inst.scaleX || inst.scaleY || inst.scaleZ) {
              group.scale.set(
                inst.scaleX || inst.scale || 1,
                inst.scaleY || inst.scale || 1,
                inst.scaleZ || inst.scale || 1
              );
            }
            if (inst.rotY) group.rotation.y = inst.rotY;
            if (inst.rotX) group.rotation.x = inst.rotX;
            if (inst.rotZ) group.rotation.z = inst.rotZ;
            group.position.set(inst.x || 0, inst.y || 0, inst.z || 0);
            scene.add(group);
          }
        },
        undefined,
        (err) => {
          console.warn("Could not load model:", url, err);
        }
      );
    }

    // Bedroom double bed
    spawn("models/bedDouble.glb", [
      { x: -3.6, y: 0, z: -2.3, scale: 1.7, rotY: -Math.PI / 2 }
    ]);

    // Bedroom bedside nightstand
    spawn("models/cabinetBedDrawer.glb", [
      { x: -1.8, y: 0, z: -3.2, scale: 2.2, rotY: 0 }
    ]);

    // Radio on the bedside nightstand
    spawn("models/radio.glb", [
      { x: -1.8, y: 0.58, z: -3.2, scale: 1.6, rotY: 0 }
    ]);

    // Dining table in kitchen
    spawn("models/table.glb", [
      { x: 14.2, y: 0, z: -4.0, scale: 2.4, rotY: 0 }
    ]);

    // Dining chairs around the kitchen table
    spawn("models/chair.glb", [
      { x: 13.6, y: 0, z: -3.2, scale: 1.8, rotY: 0 },
      { x: 14.8, y: 0, z: -3.2, scale: 1.8, rotY: 0 },
      { x: 13.6, y: 0, z: -4.8, scale: 1.8, rotY: Math.PI },
      { x: 14.8, y: 0, z: -4.8, scale: 1.8, rotY: Math.PI }
    ]);

    // Desk chairs: bedroom study desk and workroom computer desk
    spawn("models/chairDesk.glb", [
      { x: -0.15, y: 0, z: -2.4, scale: 1.9, rotY: 0 },
      { x: 18.0, y: 0, z: 5.0, scale: 1.9, rotY: -Math.PI / 2 }
    ]);

    // Bookcases in workroom
    spawn("models/bookcaseOpen.glb", [
      { x: 13.6, y: 0, z: 9.8, scale: 2.4, rotY: Math.PI },
      { x: 15.2, y: 0, z: 9.8, scale: 2.4, rotY: Math.PI }
    ]);

    // Windows with glass tint
    spawn(
      "models/wallWindow.glb",
      [
        { x: 1.75, y: 1.15, z: -4.02, scale: 1.6, rotY: 0 },
        { x: -6.04, y: 1.15, z: 1.5, scale: 1.6, rotY: Math.PI / 2 },
        { x: 8.08, y: 1.15, z: -10.12, scale: 1.6, rotY: 0 },
        { x: 12.3, y: 1.15, z: -10.12, scale: 1.6, rotY: 0 },
        { x: 20.04, y: 1.15, z: -4.5, scale: 1.6, rotY: -Math.PI / 2 },
        { x: 20.04, y: 1.15, z: 7.2, scale: 1.6, rotY: -Math.PI / 2 },
        { x: 17.65, y: 1.15, z: 10.08, scale: 1.6, rotY: Math.PI }
      ],
      (root) => {
        root.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m.name === "glass") {
                m.transparent = true;
                m.opacity = 0.55;
                m.color.setHex(0x304654);
                m.emissive.setHex(0x182c3a);
                m.emissiveIntensity = 0.7;
              }
            });
          }
        });
      }
    );
  }

  const wardrobeDoors = new THREE.Group();
  scene.add(wardrobeDoors);
  box(0.71, 2.52, 0.08, 4.27, 1.39, -2.0, materials.wood, wardrobeDoors);
  box(0.71, 2.52, 0.08, 5.03, 1.39, -2.0, materials.wood, wardrobeDoors);
  box(0.035, 0.28, 0.06, 4.55, 1.42, -1.94, materials.metal, wardrobeDoors);
  box(0.035, 0.28, 0.06, 4.75, 1.42, -1.94, materials.metal, wardrobeDoors);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(6.08, 0, -0.75);
  scene.add(doorPivot);
  box(0.13, 2.4, 1.5, 0, 1.2, 0.75, materials.woodDark, doorPivot);
  box(0.08, 0.08, 0.08, -0.11, 1.15, 1.28, materials.metal, doorPivot);

  // Front door of the house — the monster comes in through it.
  const frontDoorPivot = new THREE.Group();
  frontDoorPivot.position.set(7.1, 0, 10.16);
  scene.add(frontDoorPivot);
  box(1.8, 2.45, 0.1, 0.9, 1.25, 0, materials.woodDark, frontDoorPivot);
  box(0.06, 0.06, 0.24, 0.2, 1.15, -0.12, materials.metal, frontDoorPivot);
  box(0.06, 0.06, 0.24, 0.2, 1.15, 0.12, materials.metal, frontDoorPivot);
  box(0.16, 2.7, 0.3, 7.02, 1.35, 10.16, materials.trim);
  box(0.16, 2.7, 0.3, 8.98, 1.35, 10.16, materials.trim);
  box(2.12, 0.16, 0.32, 8.0, 2.7, 10.16, materials.trim);
  // Тёмное «снаружи» за входной дверью, чтобы за ней не было пустоты.
  const porchBack = box(5.4, 3.5, 0.12, 8, 1.75, 11.3, materials.black);
  porchBack.castShadow = false;
  const porchFloor = box(5.4, 0.14, 2.3, 8, -0.08, 11.15, materials.floorAlt);
  porchFloor.castShadow = false;

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

  const taskMarkers = [];
  const taskMarkerGeometry = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const taskMarkerMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8a33d,
    emissive: 0xf0b23a,
    emissiveIntensity: 1.8,
    roughness: 0.35
  });
  for (let i = 0; i < taskSpots.length; i += 1) {
    const spot = taskSpots[i];
    const marker = new THREE.Mesh(taskMarkerGeometry, taskMarkerMaterial);
    marker.position.set(spot.lookX, spot.lookY, spot.lookZ);
    marker.castShadow = true;
    scene.add(marker);
    taskMarkers.push(marker);
  }

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
  let tasksDone;
  let taskProgress;
  let activeTask;
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
      z: 2.6,
      yaw: -Math.PI / 2,
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
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get("view");
    if (view === "bedroom") {
      player.x = -1.2; player.z = -0.5; player.yaw = 2.4; player.pitch = -0.15;
    } else if (view === "kitchen") {
      player.x = 12.0; player.z = -2.5; player.yaw = -0.7; player.pitch = -0.1;
    } else if (view === "corridor") {
      player.x = 8.0; player.z = 5.0; player.yaw = Math.PI; player.pitch = 0;
    } else if (view === "workroom") {
      player.x = 13.5; player.z = 4.0; player.yaw = -1.2; player.pitch = -0.1;
    }
    monster = {
      x: 8,
      z: 10,
      radius: MONSTER_RADIUS,
      facing: Math.PI,
      state: "away",
      timer: random(10, 15),
      awareness: 0,
      exposure: 0,
      target: null,
      lastSeen: null,
      lostTimer: 0,
      alertedHide: false,
      stuck: 0,
      path: null,
      pathIndex: 0,
      pathTarget: null,
      repathTimer: 0,
      searchTarget: null,
      searchWait: 0,
      targetIsSearch: false,
      room: null,
      anim: 0
    };
    tasksDone = taskSpots.map(() => false);
    taskProgress = 0;
    activeTask = null;
    for (let i = 0; i < taskMarkers.length; i += 1) taskMarkers[i].visible = true;
    scene.background.set(0x050708);
    ambient.intensity = 0.16;
    wardrobeDoors.visible = true;
    monsterGroup.visible = false;
    doorPivot.rotation.y = 0;
    frontDoorPivot.rotation.y = 0;
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
    notify("Обойди дом: коридор, кухня, рабочая комната. Прячься и выполняй задания.", 4.5);
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
      text: "В доме тихо. По крайней мере, пока ты здесь.",
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
        text: "Первый свет вошёл в дом, и шаги исчезли. Но следующей ночью оно может вернуться.",
        button: "Ещё одна ночь",
        hint: "Обходи комнаты с фонариком и не трать силы зря",
        action: startGame
      });
    } else {
      sound.caught();
      showOverlay({
        eyebrow: `${formatTime()} · НОЧЬ ОКОНЧЕНА`,
        title: "ОНО НАШЛО ТЕБЯ",
        text: reason || "Тьма оказалась быстрее. В следующий раз спрячься до того, как услышишь его в коридоре.",
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

  function nearestTask() {
    let nearest = null;
    let nearestDistance = 1.35;
    for (let i = 0; i < taskSpots.length; i += 1) {
      if (tasksDone[i]) continue;
      const spot = taskSpots[i];
      const dist = Math.hypot(player.x - spot.x, player.z - spot.z);
      if (dist < nearestDistance) {
        nearest = i;
        nearestDistance = dist;
      }
    }
    return nearest;
  }

  function updateTasks(dt) {
    if (mode !== "playing" || player.hidden) {
      taskProgress = 0;
      activeTask = null;
      return;
    }
    const taskIndex = nearestTask();
    activeTask = nearestHideSpot() ? null : taskIndex;
    if (taskIndex === null || activeTask === null) {
      taskProgress = Math.max(0, taskProgress - dt * 1.5);
      return;
    }
    const spot = taskSpots[taskIndex];
    if (keys.has("KeyE")) {
      taskProgress += dt / spot.hold;
      player.noise = Math.max(player.noise, 45);
      if (taskProgress >= 1) {
        tasksDone[taskIndex] = true;
        taskProgress = 0;
        activeTask = null;
        elapsed = Math.min(NIGHT_DURATION, elapsed + spot.bonus);
        taskMarkers[taskIndex].visible = false;
        sound.tone(392, 0.12, "sine", 0.08, 392);
        sound.tone(523, 0.14, "sine", 0.08, 523, 0.12);
        sound.tone(659, 0.2, "sine", 0.07, 659, 0.24);
        notify(`«${spot.name}» выполнено — время приблизилось к утру.`, 2.8);
      }
    } else {
      taskProgress = Math.max(0, taskProgress - dt * 1.5);
    }
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
      const taskIndex = nearestTask();
      if (taskIndex !== null) {
        notify(`Зажми E — ${taskSpots[taskIndex].hint}.`, 1.4);
      } else {
        notify("Здесь негде спрятаться.", 1.4);
      }
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
    const points = patrolRooms[monster.room] || patrolPoints;
    let choices = points.filter((point) => distance(monster, point) > 0.9);
    if (!choices.length) choices = points;
    monster.target = choices[Math.floor(Math.random() * choices.length)];
    monster.stuck = 0;
  }

  function chooseSearchTarget() {
    // Иногда монстр идёт проверять одно из укрытий — так он находит спрятавшегося.
    const spot = hideSpots[Math.floor(Math.random() * hideSpots.length)];
    monster.searchTarget = { x: spot.exitX, z: spot.exitZ };
  }

  function beginHunt() {
    monster.state = "hunting";
    monster.timer = random(16, 24) - (elapsed / NIGHT_DURATION) * 4;
    monster.awareness = 0;
    monster.path = null;
    monster.pathTarget = null;
    monster.stuck = 0;
    monster.searchWait = 0;
    monster.targetIsSearch = false;
    const roomNames = Object.keys(patrolRooms);
    monster.room = roomNames[Math.floor(Math.random() * roomNames.length)];
    if (Math.random() < 0.55) chooseSearchTarget();
    else monster.searchTarget = null;
    choosePatrolTarget();
  }

  function beginLeaving() {
    monster.state = "leaving";
    monster.timer = 12;
    monster.target = { x: 8, z: 10.3 };
    monster.awareness = 0;
    monster.exposure = 0;
    monster.alertedHide = false;
    monster.searchTarget = null;
    monster.searchWait = 0;
    monster.targetIsSearch = false;
    monster.path = null;
    monster.pathTarget = null;
    notify("Шаги удаляются.", 2.2);
  }

  function nearestWalkableCell(x, z, cell, minX, minZ, cols, rows, walkable) {
    const cx = clamp(Math.round((x - minX) / cell), 0, cols - 1);
    const cz = clamp(Math.round((z - minZ) / cell), 0, rows - 1);
    if (walkable[cz * cols + cx]) return cz * cols + cx;
    for (let radius = 1; radius < 6; radius += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
          const index = nz * cols + nx;
          if (walkable[index]) return index;
        }
      }
    }
    return -1;
  }

  // Проходимая сетка дома строится один раз после сборки комнат: стены и мебель статичны.
  function buildNavigation() {
    const cell = nav.cell;
    const radius = MONSTER_RADIUS + 0.02;
    nav.minX = ROOM.minX + radius;
    nav.minZ = ROOM.minZ + radius;
    nav.cols = Math.floor((ROOM.maxX - ROOM.minX - radius * 2) / cell) + 1;
    nav.rows = Math.floor((ROOM.maxZ - ROOM.minZ - radius * 2) / cell) + 1;
    nav.walkable = new Uint8Array(nav.cols * nav.rows);
    for (let row = 0; row < nav.rows; row += 1) {
      for (let col = 0; col < nav.cols; col += 1) {
        nav.walkable[row * nav.cols + col] = collides(nav.minX + col * cell, nav.minZ + row * cell, radius) ? 0 : 1;
      }
    }
  }

  function findPath(from, to) {
    const { cell, minX, minZ, cols, rows, walkable } = nav;
    if (!walkable) return null;
    const start = nearestWalkableCell(from.x, from.z, cell, minX, minZ, cols, rows, walkable);
    const goal = nearestWalkableCell(to.x, to.z, cell, minX, minZ, cols, rows, walkable);
    if (start < 0 || goal < 0) return null;
    const total = cols * rows;
    const cameFrom = new Int32Array(total).fill(-1);
    const gScore = new Float32Array(total).fill(Infinity);
    const closed = new Uint8Array(total);
    const open = [start];
    gScore[start] = 0;
    const heuristic = (index) => {
      const dx = Math.abs((index % cols) - (goal % cols));
      const dz = Math.abs(Math.floor(index / cols) - Math.floor(goal / cols));
      return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
    };
    let iterations = 0;
    while (open.length && iterations < total * 4) {
      iterations += 1;
      let best = 0;
      let bestScore = Infinity;
      for (let i = 0; i < open.length; i += 1) {
        const index = open[i];
        const score = gScore[index] + heuristic(index);
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      const current = open.splice(best, 1)[0];
      if (current === goal) {
        const path = [];
        let cursor = current;
        while (cursor !== -1) {
          const col = cursor % cols;
          const row = Math.floor(cursor / cols);
          path.push({ x: minX + col * cell, z: minZ + row * cell });
          cursor = cameFrom[cursor];
        }
        path.reverse();
        return path;
      }
      closed[current] = 1;
      const col = current % cols;
      const row = Math.floor(current / cols);
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dz) continue;
          const nx = col + dx;
          const nz = row + dz;
          if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
          const next = nz * cols + nx;
          if (!walkable[next] || closed[next]) continue;
          if (dx && dz && (!walkable[row * cols + nx] || !walkable[nz * cols + col])) continue;
          const cost = gScore[current] + (dx && dz ? 1.4142 : 1);
          if (cost < gScore[next]) {
            cameFrom[next] = current;
            gScore[next] = cost;
            if (!open.includes(next)) open.push(next);
          }
        }
      }
    }
    return null;
  }

  function moveMonster(target, speed, dt) {
    if (!target) return 0;
    const targetDistance = distance(monster, target);
    if (targetDistance < 0.02 || dt <= 0) return targetDistance;
    monster.repathTimer -= dt;
    const targetMoved = !monster.pathTarget || Math.hypot(target.x - monster.pathTarget.x, target.z - monster.pathTarget.z) > 0.12;
    if (!monster.path || monster.pathIndex >= monster.path.length || targetMoved || monster.repathTimer <= 0) {
      monster.path = findPath(monster, target);
      monster.pathIndex = 0;
      monster.pathTarget = { x: target.x, z: target.z };
      monster.repathTimer = monster.state === "chase" ? 0.22 : 0.65;
    }
    let waypoint = monster.path && monster.pathIndex < monster.path.length - 1 ? monster.path[monster.pathIndex] : target;
    while (monster.path && monster.pathIndex < monster.path.length - 1 && Math.hypot(monster.x - waypoint.x, monster.z - waypoint.z) < 0.18) {
      monster.pathIndex += 1;
      waypoint = monster.path[monster.pathIndex];
    }
    const dx = waypoint.x - monster.x;
    const dz = waypoint.z - monster.z;
    const waypointDistance = Math.hypot(dx, dz) || 1;
    monster.facing = Math.atan2(dz, dx);
    const moved = moveWithCollisions(monster, (dx / waypointDistance) * speed * dt, (dz / waypointDistance) * speed * dt);
    if (moved < 0.001) {
      monster.stuck += dt;
      // Если монстр упёрся в угол, слегка сдвигаем его в свободную сторону.
      const away = Math.atan2(-dz, -dx);
      for (let i = 0; i < 8; i += 1) {
        const angle = away + (i - 3.5) * (Math.PI / 4);
        const stepX = Math.cos(angle) * 0.06;
        const stepZ = Math.sin(angle) * 0.06;
        if (!collides(monster.x + stepX, monster.z + stepZ, monster.radius)) {
          monster.x += stepX;
          monster.z += stepZ;
          break;
        }
      }
      monster.path = null;
      monster.repathTimer = 0;
      if (monster.state === "hunting" && monster.stuck > 0.65) choosePatrolTarget();
      if (monster.state === "entering" && monster.stuck > 1.2) beginHunt();
    } else {
      monster.stuck = Math.max(0, monster.stuck - dt * 2);
    }
    return targetDistance;
  }

  function moveMonsterDirect(target, speed, dt) {
    if (!target) return 0;
    const dx = target.x - monster.x;
    const dz = target.z - monster.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.02) return 0;
    monster.facing = Math.atan2(dz, dx);
    const moved = moveWithCollisions(monster, (dx / dist) * speed * dt, (dz / dist) * speed * dt);
    if (moved < 0.001) monster.stuck += dt;
    else monster.stuck = Math.max(0, monster.stuck - dt * 2);
    return dist;
  }

  function canSeePlayer() {
    if (player.hidden) return false;
    const dist = distance(monster, player);
    const range = player.flashlight ? 8.5 : 6.5;
    if (dist > range || !hasLineOfSight(monster, player)) return false;
    if (dist < 1.6) return true;
    if (player.flashlight && dist < 2.4) return true;
    const angle = Math.atan2(player.z - monster.z, player.x - monster.x);
    const difference = Math.atan2(Math.sin(angle - monster.facing), Math.cos(angle - monster.facing));
    return Math.abs(difference) < 1.25;
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
        m.x = 8;
        m.z = 10;
        notify("Шаги остановились у входной двери.", 3, true);
        sound.knock();
      }
    } else if (m.state === "warning") {
      m.timer -= dt;
      if (m.timer <= 0) {
        m.state = "entering";
        m.timer = 2.2;
        m.target = { x: 8, z: 8.5 };
        m.x = 8;
        m.z = 10;
        m.alertedHide = false;
        m.stuck = 0;
        notify("Оно вошло в дом.", 2.4, true);
        sound.alert();
      }
    } else if (m.state === "entering") {
      m.timer -= dt;
      const remaining = moveMonsterDirect(m.target, 0.85, dt);
      if (remaining < 0.22 || m.timer <= 0 || (m.z < 9.5 && m.stuck < 0.4)) beginHunt();
    } else if (m.state === "hunting") {
      m.timer -= dt;
      if (m.timer <= 0) {
        beginLeaving();
      } else {
        if (!player.hidden) {
          const visible = canSeePlayer();
          if (visible) {
            const rate = (player.flashlight ? 1.55 : 1.15) * (player.sprinting ? 1.25 : 1);
            m.awareness = Math.min(1, m.awareness + rate * dt);
            m.lastSeen = { x: player.x, z: player.z };
          } else {
            m.awareness = Math.max(0, m.awareness - 0.22 * dt);
            const noiseRange = player.sprinting ? 8.0 : 5.5;
            if (player.moving && distance(m, player) < noiseRange) {
              m.awareness = Math.min(1, m.awareness + (player.sprinting ? 0.65 : 0.34) * dt);
              m.target = { x: player.x, z: player.z };
            }
          }
          if (m.awareness >= 0.85) {
            m.state = "chase";
            m.lostTimer = 3.2;
            m.lastSeen = { x: player.x, z: player.z };
            notify("Оно тебя увидело. Беги!", 2.5, true);
            sound.alert();
          }
        } else {
          m.awareness = Math.max(0, m.awareness - dt);
        }
        if (m.state === "hunting") {
          if (m.searchWait > 0) {
            // Монстр замер у укрытия и прислушивается.
            m.searchWait -= dt;
          } else if (!m.target || distance(m, m.target) < 0.3) {
            if (m.targetIsSearch) {
              m.targetIsSearch = false;
              m.searchWait = 1.8;
            } else if (m.searchTarget) {
              m.target = m.searchTarget;
              m.searchTarget = null;
              m.targetIsSearch = true;
              m.searchWait = 0;
              m.path = null;
              m.pathTarget = null;
            } else {
              choosePatrolTarget();
            }
          } else {
            moveMonster(m.target, 0.78 + progress * 0.22, dt);
          }
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
        const sees = canSeePlayer() || (distance(m, player) < 2.2 && hasLineOfSight(m, player));
        if (sees) {
          m.lastSeen = { x: player.x, z: player.z };
          m.lostTimer = 3.2;
        } else {
          m.lostTimer -= dt;
          if (player.moving && distance(m, player) < 5.5) {
            m.lastSeen = { x: player.x, z: player.z };
            m.lostTimer = Math.max(m.lostTimer, 1.2);
          }
        }
        moveMonster(m.lastSeen || player, 1.55 + progress * 0.3, dt);
        if (distance(m, player) < m.radius + player.radius + 0.24) {
          endGame(false, "Оно догнало тебя. Выключай свет, не беги без нужды и прячься до погони.");
        } else if (m.lostTimer <= 0) {
          m.state = "hunting";
          m.awareness = 0.25;
          choosePatrolTarget();
          notify("Оно потеряло тебя из виду.", 2);
        }
      }
    } else if (m.state === "leaving") {
      m.timer -= dt;
      const remaining = moveMonster(m.target, 1.05, dt);
      if (remaining < 0.3 || m.z > 9.9 || m.timer <= 0 || m.stuck > 1.2) {
        m.state = "away";
        m.timer = random(9, 14) - progress * 3;
        m.awareness = 0;
        m.exposure = 0;
        m.alertedHide = false;
        m.path = null;
        m.pathTarget = null;
        m.stuck = 0;
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
    const inside = ["entering", "hunting", "chase", "leaving"].includes(monster.state);
    const playerNearBedroomDoor = player && !player.hidden && Math.hypot(player.x - 6.08, player.z) < 2.6;
    doorPivot.rotation.y += ((inside || playerNearBedroomDoor ? 1.15 : 0) - doorPivot.rotation.y) * Math.min(1, dt * 5);
    const frontDoorOpen = inside && (monster.z > 8.6 || monster.state === "leaving");
    frontDoorPivot.rotation.y += ((frontDoorOpen ? 1.25 : 0) - frontDoorPivot.rotation.y) * Math.min(1, dt * 4);
    const lightTime = performance.now() / 1000;
    if (roomLights.kitchen) roomLights.kitchen.intensity = 0.8 + Math.sin(lightTime * 6.7) * 0.06 + Math.sin(lightTime * 2.3) * 0.05;
    if (roomLights.desk) roomLights.desk.intensity = 0.75 + Math.sin(lightTime * 1.7) * 0.05;
    warningLight.intensity = monster.state === "warning" ? 3.5 + Math.sin(performance.now() / 130) * 1.5 : 0;
    monitorLight.intensity = 1.35 + Math.sin(performance.now() / 900) * 0.15;
    dust.rotation.y += dt * 0.008;
    const sceneTime = performance.now() / 1000;
    for (let i = 0; i < taskMarkers.length; i += 1) {
      const marker = taskMarkers[i];
      const spot = taskSpots[i];
      marker.visible = !tasksDone[i];
      if (!marker.visible) continue;
      const pulse = 1 + Math.sin(sceneTime * 2.4 + i * 2.1) * 0.25;
      marker.position.set(spot.lookX, spot.lookY + Math.sin(sceneTime * 1.6 + i) * 0.05, spot.lookZ);
      marker.rotation.y = sceneTime * 0.9 + i;
      marker.scale.setScalar(pulse);
    }
  }

  function updateHUD() {
    if (!player || !monster) return;
    ui.clock.textContent = formatTime();
    ui.stamina.style.width = `${player.stamina}%`;
    ui.breath.style.width = `${player.breath}%`;
    ui.breathRow.classList.toggle("visible", Boolean(player.hidden));
    const doneTasks = tasksDone ? tasksDone.filter(Boolean).length : 0;
    ui.objective.textContent = player.hidden
      ? "В укрытии · оставайся тихим"
      : `Задания ${doneTasks}/${taskSpots.length} · доживи до 6:00`;
    ui.hiddenMask.className = `hidden-mask${player.hidden ? ` ${player.hidden}` : ""}`;
    ui.crosshair.classList.toggle("visible", mode === "playing" && !player.hidden);

    const closeToHidden = player.hidden && distance(monster, player) < 2.2 && ["entering", "hunting", "chase"].includes(monster.state);
    let dangerText = "Пока тихо";
    let alert = false;
    if (monster.state === "warning") {
      dangerText = "Оно у входной двери";
      alert = true;
    } else if (monster.state === "entering") {
      dangerText = "Оно вошло в дом";
      alert = true;
    } else if (monster.state === "chase") {
      dangerText = player.hidden ? "Оно ищет тебя" : "Оно видит тебя";
      alert = true;
    } else if (closeToHidden) {
      dangerText = "Оно совсем рядом";
      alert = true;
    } else if (monster.state === "hunting") {
      dangerText = "Оно бродит по дому";
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
      else if (activeTask !== null) {
        const spot = taskSpots[activeTask];
        prompt = taskProgress > 0
          ? `${spot.name} · ${Math.floor(taskProgress * 100)}%`
          : `Удерживай E — ${spot.hint}`;
      } else if (monster.state === "chase") prompt = "Беги или незаметно спрячься";
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
    updateTasks(dt);
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
      if (code === "KeyE") {
        interact();
        keys.add(code);
      } else if (code === "KeyF") toggleFlashlight();
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
    text: "Шаги за дверью. Оно войдёт в дом. Обойди коридор, кухню и рабочую комнату, найди укрытия и продержись до утра.",
    button: "Начать ночь",
    hint: "Мышь — обзор · F — фонарик · P или Esc — пауза",
    rules: true,
    action: startGame
  });
  if (new URLSearchParams(window.location.search).has("autoplay")) {
    startGame();
  }
  requestAnimationFrame(frame);
})();
