import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';

const assetUrl = path => new URL(`../${path}`, import.meta.url).href;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#111310');
scene.fog = null;
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#e7e0cf', '#1a2118', 2.4));
const sun = new THREE.DirectionalLight('#fff4d7', 4.5);
sun.position.set(-12, 20, 8);
sun.castShadow = false;
scene.add(sun);

const groundMaterial = new THREE.MeshStandardMaterial({ color: '#20251e', roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 176), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -34;
ground.receiveShadow = true;
scene.add(ground);
const roadMaterial = new THREE.MeshStandardMaterial({ color: '#2c3028', roughness: .95 });
const roadMarks = [];
const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 176), roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.set(0, .015, -34);
road.receiveShadow = true;
scene.add(road);
for (let z = -120; z < 54; z += 6) {
  const mark = new THREE.Mesh(new THREE.BoxGeometry(.14, .025, 2.4), new THREE.MeshBasicMaterial({ color: '#d9ff65' }));
  mark.position.set(0, .05, z);
  roadMarks.push(mark);
  scene.add(mark);
}

const roadSlogans = [];
const roadSloganFrames = [];
const sloganTextureCache = new Map();
const sloganFrameTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 12;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
})();
function makeRoadSloganTexture(character) {
  if (sloganTextureCache.has(character)) return sloganTextureCache.get(character);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = '600 78px Manrope, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(character, canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  sloganTextureCache.set(character, texture);
  return texture;
}
function addRoadSlogans() {
  const slogans = [
    { text: '人生路漫漫', x: -3.07 },
    { text: '日月如蹉跎', x: 3.07 },
  ];
  const step = .66;
  let index = 0;
  for (let z = 50; z >= -126; z -= step) {
    slogans.forEach(({ text, x }) => {
      const character = text[index % text.length];
      const group = new THREE.Group();
      group.rotation.x = -Math.PI / 2;
      group.position.set(x, .065, z);
      const frameMaterial = new THREE.MeshBasicMaterial({ map: sloganFrameTexture, color: '#ffad4d', transparent: true, opacity: .174, depthWrite: false, depthTest: false });
      const letterMaterial = new THREE.MeshBasicMaterial({ map: makeRoadSloganTexture(character), color: '#553118', transparent: true, opacity: .3, depthWrite: false, depthTest: false });
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(.36, .36), frameMaterial);
      const letter = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), letterMaterial);
      frame.renderOrder = 4;
      letter.position.z = .004;
      letter.renderOrder = 5;
      group.add(frame, letter);
      roadSlogans.push(letter);
      roadSloganFrames.push(frame);
      scene.add(group);
    });
    index += 1;
  }
}
addRoadSlogans();

const projects = [
  { year: '2023', title: 'spine-cartoonWord', files: Array.from({ length: 3 }, (_, i) => `2021-spine-cartoonWord-${i + 1}.mp4`) },
  { year: '2023', title: 'spine-planet', files: Array.from({ length: 7 }, (_, i) => `2021-spine-planet-${i + 1}.mp4`) },
  { year: '2023', title: 'spine-slots', files: Array.from({ length: 6 }, (_, i) => `2021-spine-slots-${i + 1}.mp4`) },
  { year: '2023', title: 'wordGame', files: Array.from({ length: 4 }, (_, i) => `2021-wordGame-${i + 1}.mp4`) },
  { year: '2023', title: 'wordGameCartoon', files: Array.from({ length: 8 }, (_, i) => `2021-wordGameCartoon-${i + 1}.mp4`) },
  { year: '2025', title: 'match3-buff', files: Array.from({ length: 19 }, (_, i) => `2025-match3-buff-${i + 1}.gif`) },
  { year: '2025', title: 'match3-heroSkill', files: Array.from({ length: 14 }, (_, i) => `2025-match3-heroSkill-${i + 1}.mp4`) },
  { year: '2026', title: 'wordGame', files: Array.from({ length: 10 }, (_, i) => `2026-wordGame-${i + 1}.mp4`) },
  { year: '2027', title: 'resume', files: [], resume: true },
];
const years = [
  { year: '2023', z: -10, color: '#d9ff65' },
  { year: '2025', z: -31, color: '#ffab76' },
  { year: '2026', z: -52, color: '#91b8ff' },
  { year: '2027', label: 'RESUME', z: -73, color: '#f0d58a' },
];
const projectsByYear = Object.groupBy ? Object.groupBy(projects, p => p.year) : projects.reduce((map, p) => ((map[p.year] ??= []).push(p), map), {});
function yearEntries(year) {
  const entries = [];
  projects.filter(project => project.year === year).forEach(project => {
    if (project.resume) entries.push({ ...project, files: [], sequence: entries.length + 1, total: 1 });
    else project.files.forEach(file => entries.push({ ...project, files: [file], sequence: entries.length + 1 }));
  });
  entries.forEach(entry => { entry.total = entries.length; });
  return entries;
}

function textMesh(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color; ctx.font = '800 112px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 512, 150);
  const meshMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), meshMaterial);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .09;
  return mesh;
}
function makeBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(.24, 'rgba(255,255,255,.28)');
  gradient.addColorStop(.5, 'rgba(255,255,255,.92)');
  gradient.addColorStop(.76, 'rgba(255,255,255,.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const edge = ctx.createLinearGradient(0, 0, 0, canvas.height);
  edge.addColorStop(0, 'rgba(255,255,255,0)');
  edge.addColorStop(.18, 'rgba(255,255,255,.7)');
  edge.addColorStop(.82, 'rgba(255,255,255,.7)');
  edge.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = edge; ctx.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}
function addYearGate(item) {
  const group = new THREE.Group();
  group.position.z = item.z;
  const material = new THREE.MeshStandardMaterial({ color: item.color, emissive: item.color, emissiveIntensity: .35, roughness: .4 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: .7 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, .035, 10, 96), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .06;
  group.add(ring);
  const label = textMesh(item.label || item.year, item.color);
  label.position.z = .15;
  group.add(label);
  const beamTexture = makeBeamTexture();
  const beamMaterial = new THREE.SpriteMaterial({ map: beamTexture, color: item.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Sprite(beamMaterial);
  beam.position.y = 5.4;
  beam.scale.set(3.8, 10.5, 1);
  const beamInnerMaterial = beamMaterial.clone();
  beamInnerMaterial.opacity = 0;
  const beamInner = new THREE.Sprite(beamInnerMaterial);
  beamInner.position.y = 5.35;
  beamInner.scale.set(2.1, 10.2, 1);
  const beamUnderMaterial = beamMaterial.clone();
  beamUnderMaterial.opacity = 0;
  beamUnderMaterial.depthTest = false;
  const beamUnder = new THREE.Sprite(beamUnderMaterial);
  beamUnder.position.y = -.65;
  beamUnder.scale.set(4.8, 4.8, 1);
  const beamLowMaterial = beamMaterial.clone();
  beamLowMaterial.opacity = 0;
  beamLowMaterial.depthTest = false;
  const beamLow = new THREE.Sprite(beamLowMaterial);
  beamLow.position.y = 2.3;
  beamLow.scale.set(5.2, 7.6, 1);
  group.add(beam, beamInner, beamUnder, beamLow);
  group.userData.material = material;
  group.userData.ringMaterial = ringMaterial;
  group.userData.labelMaterial = label.material;
  group.userData.beamMaterial = beamMaterial;
  group.userData.beamInnerMaterial = beamInnerMaterial;
  group.userData.beamUnderMaterial = beamUnderMaterial;
  group.userData.beamLowMaterial = beamLowMaterial;
  group.userData.beam = beam;
  group.userData.beamInner = beamInner;
  group.userData.beamUnder = beamUnder;
  group.userData.beamLow = beamLow;
  item.group = group;
  scene.add(group);
}
years.forEach(addYearGate);

function makeCar() {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#eae6dc', roughness: .3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#22251f', roughness: .22, metalness: .25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, .42, 2.55), bodyMat); body.position.y = .48; body.castShadow = true; car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, .48, 1.2), darkMat); cabin.position.set(0, .83, .08); cabin.castShadow = true; car.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.4, .12, .58), bodyMat); hood.position.set(0, .68, -.83); hood.castShadow = true; car.add(hood);
  const wheelGeo = new THREE.CylinderGeometry(.28, .28, .18, 20); wheelGeo.rotateZ(Math.PI / 2);
  [[-.83, .33, -.78], [.83, .33, -.78], [-.83, .33, .78], [.83, .33, .78]].forEach(([x, y, z]) => { const wheel = new THREE.Mesh(wheelGeo, darkMat); wheel.position.set(x, y, z); wheel.castShadow = true; car.add(wheel); });
  const headlightMat = new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: .08 });
  const headlights = [-.48, .48].map(x => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(.25, .12, .06), headlightMat);
    light.position.set(x, .56, -1.3);
    car.add(light);
    return light;
  });
  const headlightBeams = [-.48, .48].map(x => {
    const pointLight = new THREE.PointLight('#fff1b0', 0, 4.5, 2);
    pointLight.position.set(x, .58, -1.35);
    car.add(pointLight);
    return pointLight;
  });
  const hazardMat = new THREE.MeshBasicMaterial({ color: '#090705', transparent: true, opacity: 1 });
  const hazards = [[-.76, .64, 1.36], [.76, .64, 1.36]].map(([x, y, z]) => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(.22, .16, .08), hazardMat);
    light.position.set(x, y, z);
    car.add(light);
    return light;
  });
  const hazardGlowMat = new THREE.MeshBasicMaterial({ color: '#ff5b42', transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const hazardGlows = [[-.76, .64, 1.405], [.76, .64, 1.405]].map(([x, y, z]) => {
    const glow = new THREE.Mesh(new THREE.BoxGeometry(.16, .11, .03), hazardGlowMat);
    glow.position.set(x, y, z);
    car.add(glow);
    return glow;
  });
  const headlightVolumeMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#fff1b0') },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      varying float vDepth;
      void main() {
        vDepth = clamp((position.y + 9.0) / 18.0, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vDepth;
      void main() {
        float nearGlow = pow(vDepth, 1.45);
        gl_FragColor = vec4(uColor, uOpacity * nearGlow);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const headlightVolumes = [-.48, .48].map(x => {
    const volume = new THREE.Mesh(new THREE.ConeGeometry(4.13, 18, 32, 1, true), headlightVolumeMat);
    volume.position.set(x, .58, -9.5);
    volume.rotation.x = Math.PI / 2;
    volume.rotation.y = x < 0 ? THREE.MathUtils.degToRad(30) : -THREE.MathUtils.degToRad(30);
    car.add(volume);
    return volume;
  });
  car.userData.bodyMaterial = bodyMat;
  car.userData.darkMaterial = darkMat;
  car.userData.lightMaterial = headlightMat;
  car.userData.headlights = headlights;
  car.userData.headlightBeams = headlightBeams;
  car.userData.hazards = hazards;
  car.userData.hazardMaterial = hazardMat;
  car.userData.hazardGlowMaterial = hazardGlowMat;
  car.userData.hazardGlows = hazardGlows;
  car.userData.headlightVolumeMaterial = headlightVolumeMat;
  car.userData.headlightVolumes = headlightVolumes;
  return car;
}
const car = makeCar();
car.position.set(0, 0, 5);
car.scale.setScalar(.42);
scene.add(car);
camera.position.set(0, 3.3, 18);
const weatherGroup = new THREE.Group();
scene.add(weatherGroup);
const themes = {
  '2023': { background: '#2b1608', fog: '#70431e', ground: '#8a5428', road: '#553118', accent: '#ffad4d', text: '#ffe8c9', muted: '#d5a875', car: '#ffad4d', window: '#3c2016', weather: 'sand' },
  '2025': { background: '#071811', fog: '#17452d', ground: '#1c4a34', road: '#123126', accent: '#7dff9a', text: '#ddffe6', muted: '#94c7a4', car: '#7dff9a', window: '#10271c', weather: 'rain' },
  '2026': { background: '#091322', fog: '#1c3656', ground: '#1b3150', road: '#12233a', accent: '#9fd8ff', text: '#dceeff', muted: '#8eabc8', car: '#9fd8ff', window: '#14243d', weather: 'snow' },
  '2027': { background: '#1b0d0d', fog: '#4a1d1d', ground: '#4b211f', road: '#2d1718', accent: '#e65b52', text: '#ffe0dc', muted: '#c79a96', car: '#e65b52', window: '#351617', weather: 'sun' },
};
let activeTheme = null;
const weatherParticles = [];
function clearWeather() {
  while (weatherGroup.children.length) weatherGroup.remove(weatherGroup.children[0]);
  weatherParticles.length = 0;
}
function makeDustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,220,150,.8)');
  gradient.addColorStop(.45, 'rgba(235,160,70,.42)');
  gradient.addColorStop(1, 'rgba(235,160,70,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
function buildWeather(theme) {
  clearWeather();
  if (theme.weather === 'sun') return;
  const isRain = theme.weather === 'rain';
  const isLeaves = theme.weather === 'leaves';
  const isSand = theme.weather === 'sand';
  const count = isRain ? 180 : isLeaves ? 150 : isSand ? 360 : 110;
  const texturePath = isLeaves ? assetUrl('assets/pixel-maple.svg') : theme.weather === 'snow' ? assetUrl('assets/pixel-snowflake.svg') : '';
  const particleTexture = texturePath ? new THREE.TextureLoader().load(texturePath) : isSand ? makeDustTexture() : null;

  if (isRain) {
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - .5) * 18;
      const y = Math.random() * 10 + 1;
      const z = car.position.z - Math.random() * 28;
      positions[i * 6] = x; positions[i * 6 + 1] = y; positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x - .08; positions[i * 6 + 4] = y - .75; positions[i * 6 + 5] = z;
      weatherParticles.push({ index: i, speed: .28 + Math.random() * .18 });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const weather = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#b6ffd0', transparent: true, opacity: .48 }));
    weather.userData.particles = weatherParticles;
    weather.userData.isRain = true;
    weather.userData.isLeaves = false;
    weatherGroup.add(weather);
    return;
  }

  // 叶片和雪花使用独立 Sprite，让每个粒子拥有不同大小和旋转速度。
  const weather = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      color: isSand ? '#f2b866' : '#ffffff',
      map: particleTexture,
      alphaTest: .08,
      transparent: true,
      opacity: .9,
      depthWrite: false
    }));
    const size = isLeaves ? .24 + Math.random() * .42 : isSand ? .018 + Math.random() * .072 : .07 + Math.random() * .16;
    sprite.scale.set(size, size, 1);
    const particleY = isSand ? .08 + Math.random() * .62 : Math.random() * 10 + 1;
    sprite.position.set((Math.random() - .5) * 18, particleY, car.position.z - Math.random() * 28);
    sprite.material.rotation = Math.random() * Math.PI * 2;
    weather.add(sprite);
    weatherParticles.push({
      sprite,
      speed: isLeaves ? .035 + Math.random() * .05 : .04 + Math.random() * .04,
      sway: Math.random() * 6.28,
      rotationSpeed: isLeaves ? (Math.random() - .5) * 1.8 : isSand ? (Math.random() - .5) * 1.2 : -(0.25 + Math.random() * .65),
      driftSpeed: isSand ? .02 + Math.random() * .06 : 0
    });
  }
  weather.userData.particles = weatherParticles;
  weather.userData.isRain = false;
  weather.userData.isLeaves = isLeaves;
  weather.userData.isSand = isSand;
  weatherGroup.add(weather);
}
function applyTheme(year) {
  const theme = themes[year];
  if (!theme || activeTheme === year) return;
  activeTheme = year;
  scene.background.set(theme.background);
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--ink', theme.text);
  document.documentElement.style.setProperty('--muted', theme.muted);
  groundMaterial.color.set(theme.ground);
  roadMaterial.color.set(theme.road);
  sun.color.set(theme.weather === 'sun' ? '#ffd2a4' : theme.weather === 'rain' ? '#b7e3cf' : '#b8dcff');
  sun.intensity = theme.weather === 'sun' ? 4.6 : 2.2;
  car.userData.bodyMaterial.color.set(theme.car);
  car.userData.darkMaterial.color.set(theme.window);
  car.userData.lightMaterial.color.set('#fff4c2');
  years.forEach(item => {
    item.color = theme.accent;
    item.group?.userData.material.color.set(theme.accent);
    if (item.group?.userData.labelMaterial) item.group.userData.labelMaterial.color.set(theme.accent);
    if (item.group?.userData.ringMaterial) item.group.userData.ringMaterial.color.set(theme.accent);
    if (item.group?.userData.beamMaterial) item.group.userData.beamMaterial.color.set(theme.accent);
  });
  roadMarks.forEach(mark => mark.material.color.set(theme.accent));
  roadSlogans.forEach(slogan => slogan.material.color.set(theme.road));
  roadSloganFrames.forEach(frame => frame.material.color.set(theme.accent));
  buildWeather(theme);
}

const keys = {};
applyTheme('2023');
let currentYear = null;
let inYearContact = false;
let currentYearEntries = [];
const focusLayer = document.querySelector('#focus-layer');
const focusMedia = document.querySelector('#focus-media');
const focusTag = document.querySelector('#focus-tag');
const focusTitle = document.querySelector('#focus-title');
const focusDescription = document.querySelector('#focus-description');
const focusCounter = document.querySelector('#focus-counter');
const focusClose = document.querySelector('#focus-close');
const focusPrev = document.querySelector('#focus-prev');
const focusNext = document.querySelector('#focus-next');
const ringGallery = document.querySelector('#ring-gallery');
let resumeFocusOpen = false;
let focusEntries = [];
let focusIndex = -1;
const ringItems = document.querySelector('#ring-items');

const chineseNames = { 'spine-cartoonWord': 'Spine 卡通单词', 'spine-planet': 'Spine 星球', 'spine-slots': 'Spine 插槽动画', 'wordGame': '单词游戏', 'wordGameCartoon': '单词游戏角色', 'match3-buff': '三消增益', 'match3-heroSkill': '三消英雄技能' };
let fileConfig = {};
try {
  const configResponse = await fetch(new URL('../portfolio-config.json', import.meta.url), { cache: 'no-store' });
  if (configResponse.ok) fileConfig = await configResponse.json();
} catch {}
let copyOverrides = {};
try { copyOverrides = JSON.parse(localStorage.getItem('portfolio-copy') || '{}'); } catch {}
copyOverrides = { ...copyOverrides, ...(fileConfig.projects || {}) };
function copyFor(project) {
  const entryKey = project.sequence ? `${project.year}-${project.title}-${project.sequence}` : `${project.year}-${project.title}`;
  const legacyEntryKey = entryKey.replace(/^2023-/, '2021-');
  const legacyProjectKey = `${project.year}` === '2023' ? `2021-${project.title}` : `${project.year}-${project.title}`;
  return copyOverrides[entryKey] || copyOverrides[`${project.year}-${project.title}`] || copyOverrides[legacyEntryKey] || copyOverrides[legacyProjectKey] || {};
}
function titleCase(value) { return value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase()); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char])); }
function displayName(project) { return copyFor(project).title || project.entryTitle || chineseNames[project.title] || titleCase(project.title); }
const defaultResume = {
  name: '冀晓禹',
  role: '游戏特效师 / UI 动画与特效设计',
  contact: '18513418090　709168163@qq.com',
  education: '石家庄科技工程职业学院｜动漫设计与制作（大专）\n火星时代 118 期｜游戏特效',
  experience: '2014.09 — 至今\n游戏特效、UI 动画与特效制作、Spine 动画特效、Unity Animator、资源优化与项目协作。\n\n北京贝塔科技股份有限公司\n负责 UI 动画与特效制作、项目动画支援、资源优化和程序对接。',
  skills: 'PS、AE、Spine、Unity、UE\n熟悉 UI 动画、UI 特效、休闲游戏视觉表现和程序协作。',
  summary: '工作积极认真，细心负责，善于分析问题、解决问题和与程序沟通。长期参与休闲游戏项目，主要方向是 2D UI 动画、UI 特效与 Spine 动画。'
};
let resumeOverrides = {};
try { resumeOverrides = JSON.parse(localStorage.getItem('portfolio-resume-copy') || '{}') || {}; } catch {}
resumeOverrides = { ...resumeOverrides, ...(fileConfig.resume || {}) };
function resumeData() { return { ...defaultResume, ...resumeOverrides }; }
function resumeMarkup() {
  const data = resumeData();
  return `<div class="resume-content"><div class="resume-head"><div><h3>${escapeHtml(data.name)}</h3><p class="resume-role">${escapeHtml(data.role)}</p></div><div class="resume-contact">${escapeHtml(data.contact).replace(/　/g, '<br>')}</div></div><div class="resume-grid"><section><h4>教育背景</h4><p>${escapeHtml(data.education).replace(/\n/g, '<br>')}</p></section><section><h4>工作经验</h4><p>${escapeHtml(data.experience).replace(/\n/g, '<br>')}</p></section><section><h4>技能特长</h4><p>${escapeHtml(data.skills).replace(/\n/g, '<br>')}</p></section><section><h4>自我评价</h4><p>${escapeHtml(data.summary).replace(/\n/g, '<br>')}</p></section></div></div>`;
}
function mediaMarkup(project, autoplay) {
  const source = project.files[0];
  const url = assetUrl(`myWorks/${source}`);
  if (source.endsWith('.gif')) {
    return `<img src="${url}" alt="${escapeHtml(displayName(project))}" />`;
  }
  return `<video src="${url}" ${autoplay ? 'autoplay' : ''} muted loop playsinline></video>`;
}
function watchCardMediaLoading(card) {
  if (!card) return;
  const media = card.querySelector('video, img');
  const loading = card.querySelector('.ring-loading');
  if (!media || !loading) return;
  const finish = () => loading.classList.remove('visible');
  if (media.tagName === 'VIDEO') {
    if (media.readyState >= 3) { finish(); return; }
    loading.classList.add('visible');
    media.addEventListener('canplay', finish, { once: true });
    media.addEventListener('error', finish, { once: true });
  } else {
    if (media.complete && media.naturalWidth > 0) { finish(); return; }
    loading.classList.add('visible');
    media.addEventListener('load', finish, { once: true });
    media.addEventListener('error', finish, { once: true });
  }
}
function openProjectFocus(project) {
  if (!project || !focusLayer) return;
  if (project.resume) { openResumeFocus(); return; }
  focusEntries = currentYearEntries.length ? currentYearEntries : yearEntries(project.year);
  focusIndex = Math.max(0, focusEntries.findIndex(entry => entry.sequence === project.sequence));
  focusPrev.hidden = focusEntries.length < 2;
  focusNext.hidden = focusEntries.length < 2;
  focusMedia.innerHTML = mediaMarkup(project, true);
  focusTag.textContent = '';
  focusTitle.textContent = displayName(project);
  const description = copyFor(project).description || '';
  focusDescription.textContent = description;
  focusDescription.style.display = description ? 'block' : 'none';
  focusCounter.textContent = `${String(project.sequence).padStart(2, '0')} / ${String(project.total).padStart(2, '0')}`;
  focusLayer.classList.add('visible');
  focusLayer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('focus-open');
}
function cycleFocusProject(direction) {
  if (!focusEntries.length || focusIndex < 0) return;
  focusIndex = (focusIndex + direction + focusEntries.length) % focusEntries.length;
  openProjectFocus(focusEntries[focusIndex]);
}
focusPrev?.addEventListener('click', event => { event.stopPropagation(); cycleFocusProject(-1); });
focusNext?.addEventListener('click', event => { event.stopPropagation(); cycleFocusProject(1); });
function openResumeFocus() {
  if (!focusLayer) return;
  resumeFocusOpen = true;
  focusMedia.innerHTML = resumeMarkup();
  focusTag.textContent = '简历';
  focusTitle.textContent = resumeData().name;
  focusDescription.textContent = '';
  focusDescription.style.display = 'none';
  focusCounter.textContent = '';
  focusClose.style.display = '';
  focusPrev.hidden = true;
  focusNext.hidden = true;
  focusLayer.classList.add('resume-focus', 'visible');
  focusLayer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('focus-open');
}
function closeProjectFocus() {
  if (!focusLayer) return;
  focusLayer.classList.remove('visible', 'resume-focus');
  resumeFocusOpen = false;
  focusLayer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('focus-open');
  setTimeout(() => { if (!focusLayer.classList.contains('visible')) focusMedia.innerHTML = ''; }, 300);
}
focusClose?.addEventListener('click', closeProjectFocus);
focusLayer?.addEventListener('click', event => { if (event.target === focusLayer) closeProjectFocus(); });
addEventListener('keydown', event => {
  if (event.key === 'Escape') closeProjectFocus();
  if (!focusLayer?.classList.contains('visible') || resumeFocusOpen) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); cycleFocusProject(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); cycleFocusProject(1); }
});
const ringState = { angle: 0, dragging: false, lastX: 0, moved: false, frontIndex: -1 };
const ringGalleries = new Map();
let activeRing = null;
function syncRingMedia(frontIndex) {
  if (!activeRing || frontIndex === ringState.frontIndex) return;
  const previous = activeRing.cards[ringState.frontIndex];
  previous?.classList.remove('is-front');
  previous?.querySelector('video')?.pause();

  ringState.frontIndex = frontIndex;
  const front = activeRing.cards[frontIndex];
  front?.classList.add('is-front');
  front?.querySelector('video')?.play().catch(() => {});
}
function updateRingCardTransforms() {
  if (!activeRing?.cards.length) return;
  const { cards } = activeRing;
  const cardWidth = Math.min(132, Math.max(86, innerWidth * .1));
  const radiusX = Math.max(innerWidth * .5, cards.length * cardWidth * .3);
  const radiusY = Math.min(innerHeight * .22, 180);
  let frontIndex = 0;
  let frontDepth = -1;
  cards.forEach((card, index) => {
    const theta = (Math.PI * 2 * index / cards.length) + ringState.angle;
    const depth = (Math.cos(theta) + 1) / 2;
    if (depth > frontDepth) { frontDepth = depth; frontIndex = index; }
    const x = Math.sin(theta) * radiusX;
    const y = Math.cos(theta) * radiusY;
    const scale = .48 + depth * .52;
    const blur = Math.max(0, (1 - depth) * 3.2);
    card.style.setProperty('--card-ratio', card.dataset.ratio || '1 / 1.12');
    card.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${scale})`;
    card.style.zIndex = String(Math.round(depth * 1000));
    card.style.opacity = String(.28 + depth * .72);
    card.style.filter = `blur(${blur.toFixed(2)}px) brightness(${.68 + depth * .32})`;
  });
  syncRingMedia(frontIndex);
}
function setCardRatio(card, media) {
  if (!media) return;
  const apply = (width, height) => {
    if (width > 0 && height > 0) {
      card.dataset.ratio = `${width} / ${height}`;
      card.style.setProperty('--card-ratio', card.dataset.ratio);
    }
  };
  if (media.tagName === 'VIDEO') {
    if (media.videoWidth) apply(media.videoWidth, media.videoHeight);
    else media.addEventListener('loadedmetadata', () => apply(media.videoWidth, media.videoHeight), { once: true });
  } else if (media.naturalWidth) apply(media.naturalWidth, media.naturalHeight);
  else media.addEventListener('load', () => apply(media.naturalWidth, media.naturalHeight), { once: true });
}
function renderRingGallery(year) {
  if (year === '2027') { setRingVisible(false); return; }
  if (!ringGallery || !ringItems) return;
  let gallery = ringGalleries.get(year);
  if (!gallery) {
    const group = document.createElement('div');
    group.hidden = true;
    const entries = yearEntries(year);
    group.innerHTML = entries.map(project => `<article class="ring-card" role="button" tabindex="0" aria-label="${escapeHtml(displayName(project))}"><div class="ring-media">${mediaMarkup(project, false)}<div class="ring-loading" aria-hidden="true"></div></div><div class="ring-name">${escapeHtml(displayName(project))}</div></article>`).join('');
    const cards = Array.from(group.querySelectorAll('.ring-card'));
    cards.forEach((card, index) => {
      setCardRatio(card, card.querySelector('img, video'));
      watchCardMediaLoading(card);
      card.addEventListener('click', () => {
        if (!ringState.moved) openProjectFocus(entries[index]);
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProjectFocus(entries[index]);
        }
      });
    });
    gallery = { group, cards };
    ringGalleries.set(year, gallery);
    ringItems.appendChild(group);
  }
  if (activeRing !== gallery) {
    syncRingMedia(-1);
    if (activeRing) activeRing.group.hidden = true;
    activeRing = gallery;
  }
  gallery.group.hidden = false;
  updateRingCardTransforms();
}
function startRingInteraction() {
  if (!ringGallery) return;
  ringGallery.addEventListener('pointerdown', event => {
    if (!ringGallery.classList.contains('visible')) return;
    ringState.dragging = true;
    ringState.moved = false;
    ringState.lastX = event.clientX;
  });
  ringGallery.addEventListener('pointermove', event => {
    if (!ringState.dragging) return;
    const delta = event.clientX - ringState.lastX;
    if (Math.abs(delta) > 2) ringState.moved = true;
    ringState.angle += delta * .006;
    ringState.lastX = event.clientX;
    updateRingCardTransforms();
  });
  const endDrag = () => { ringState.dragging = false; setTimeout(() => { ringState.moved = false; }, 100); };
  ringGallery.addEventListener('pointerup', endDrag);
  ringGallery.addEventListener('pointercancel', endDrag);
  ringGallery.addEventListener('pointerleave', endDrag);
}
startRingInteraction();
function animateRing() {
  if (ringGallery?.classList.contains('visible') && !ringState.dragging) {
    ringState.angle -= .00065;
    updateRingCardTransforms();
  }
  requestAnimationFrame(animateRing);
}
animateRing();
function setRingVisible(visible) {
  if (!ringGallery) return;
  if (!visible) syncRingMedia(-1);
  ringGallery.classList.toggle('visible', visible);
  ringGallery.setAttribute('aria-hidden', String(!visible));
}
addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  keys[key] = true;
});
addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });
document.querySelectorAll('[data-key]').forEach(button => {
  const key = button.dataset.key.toLowerCase();
  const release = event => {
    keys[key] = false;
    if (event?.pointerId != null && button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    keys[key] = true;
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', () => { keys[key] = false; });
  button.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') release(event); });
  button.addEventListener('contextmenu', event => event.preventDefault());
});

function nearestYear() {
  return years.reduce((best, item) => Math.abs(car.position.z - item.z) < Math.abs(car.position.z - best.z) ? item : best, years[0]);
}

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .05);
  const drive = (keys.w || keys.arrowup ? 1 : 0) + (keys.s || keys.arrowdown ? -1 : 0);
  car.position.z -= drive * dt * 11;
  car.position.z = THREE.MathUtils.clamp(car.position.z, -90, 14);

  // 小车始终沿道路中心直线行驶。

  car.position.x = 0;
  car.rotation.y = 0;
  car.scale.setScalar(.42);
  const year = nearestYear();
  roadMarks.forEach(mark => {
    mark.visible = !years.some(item => Math.abs(mark.position.z - item.z) < 2.7);
  });
  const distanceToYear = Math.abs(car.position.z - year.z);
  const circleActive = distanceToYear < 3.25;
  const hazardVisible = circleActive && Math.sin(clock.elapsedTime * 8) > 0;
  car.userData.headlights.forEach(light => { light.material.opacity = circleActive ? 1 : .08; });
  car.userData.headlightBeams.forEach(light => { light.intensity = circleActive ? 1.4 : 0; });
  car.userData.headlightVolumeMaterial.uniforms.uOpacity.value = circleActive ? .14 : 0;
  car.userData.hazardGlowMaterial.opacity = hazardVisible ? .98 : 0;
  if (circleActive) {
    inYearContact = true;
    if (currentYear !== year.year) {
      currentYear = year.year;
      currentYearEntries = yearEntries(currentYear);
      applyTheme(currentYear);
      if (currentYear === '2027') {
        setRingVisible(false);
        openResumeFocus();
      } else {
        renderRingGallery(currentYear);
        setRingVisible(true);
      }
    }
  } else if (inYearContact) {
    inYearContact = false;
    currentYear = null;
    currentYearEntries = [];
    setRingVisible(false);
    if (resumeFocusOpen) closeProjectFocus();
  }
  camera.position.lerp(new THREE.Vector3(car.position.x + .25, 3.4, car.position.z + 7), .08);
  camera.lookAt(car.position.x, .35, car.position.z - .15);
  const weather = weatherGroup.children[0];
  if (weather) {
    if (weather.userData.isRain) {
      const positions = weather.geometry.attributes.position.array;
      weather.userData.particles.forEach(particle => {
        const i = particle.index * 6;
        positions[i + 1] -= particle.speed;
        positions[i + 4] -= particle.speed;
        positions[i] += Math.sin(clock.elapsedTime * 1.2 + particle.index) * .001;
        positions[i + 3] = positions[i] - .08;
        positions[i + 2] = car.position.z - ((car.position.z - positions[i + 2] + 32) % 32);
        positions[i + 5] = positions[i + 2];
        if (positions[i + 1] < .2) { positions[i + 1] = 10; positions[i + 4] = 9.25; }
      });
      weather.geometry.attributes.position.needsUpdate = true;
    } else {
      weather.userData.particles.forEach(particle => {
        const sprite = particle.sprite;
        if (weather.userData.isSand) {
          sprite.position.x += particle.driftSpeed;
          sprite.position.z += Math.sin(clock.elapsedTime * 1.4 + particle.sway) * .012;
          if (sprite.position.x > 10) sprite.position.x = -10;
          if (sprite.position.z > car.position.z + 4) sprite.position.z = car.position.z - 28;
          if (sprite.position.z < car.position.z - 30) sprite.position.z = car.position.z + 3;
        } else {
          sprite.position.y -= particle.speed;
          sprite.position.x += Math.sin(clock.elapsedTime * (weather.userData.isLeaves ? 1.6 : 1.2) + particle.sway) * (weather.userData.isLeaves ? .012 : .003);
          if (weather.userData.isLeaves) sprite.position.z += Math.cos(clock.elapsedTime * 1.1 + particle.sway) * .006;
          sprite.position.z = car.position.z - ((car.position.z - sprite.position.z + 32) % 32);
          if (sprite.position.y < .2) sprite.position.y = 10;
        }
        sprite.material.rotation += particle.rotationSpeed * dt;
      });
    }
  }
  years.forEach(item => {
    const beam = item.group?.userData.beamMaterial;
    const beamInner = item.group?.userData.beamInnerMaterial;
    const ring = item.group?.userData.ringMaterial;
    const active = currentYear === item.year && inYearContact;
    const pulse = .78 + Math.sin(clock.elapsedTime * 1.7 + item.z) * .22;
    if (beam) beam.opacity = THREE.MathUtils.lerp(beam.opacity, active ? .18 * pulse : 0, .1);
    if (beamInner) beamInner.opacity = THREE.MathUtils.lerp(beamInner.opacity, active ? .24 * pulse : 0, .1);
    const beamUnder = item.group?.userData.beamUnderMaterial;
    const beamLow = item.group?.userData.beamLowMaterial;
    if (beamUnder) beamUnder.opacity = THREE.MathUtils.lerp(beamUnder.opacity, active ? .12 * pulse : 0, .1);
    if (beamLow) beamLow.opacity = THREE.MathUtils.lerp(beamLow.opacity, active ? .1 * pulse : 0, .1);
    if (item.group?.userData.beam) item.group.userData.beam.scale.y = THREE.MathUtils.lerp(item.group.userData.beam.scale.y, active ? 10.5 + pulse * .8 : 10.5, .08);
    if (ring) ring.opacity = THREE.MathUtils.lerp(ring.opacity, active ? 1 : .42, .08);
  });
  renderer.render(scene, camera);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); updateRingCardTransforms(); });
