import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';
import { WeatherSystem } from './weather.js';

const assetUrl = path => new URL(`../${path}`, import.meta.url).href;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#111310');
scene.fog = null;
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true });
// 雨和雾都是满屏叠片，Retina 按 2 倍渲染很吃填充率，压到 1.5 倍几乎看不出差别。
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight('#e7e0cf', '#1a2118', 2.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4d7', 4.5);
sun.position.set(-12, 20, 8);
sun.castShadow = false;
scene.add(sun);

// 马路只铺在小车能开到的范围里：起点在身后一点，终点就是 STOP 牌的位置。
const ROAD_START = 14;
const ROAD_END = -92;
const ROAD_DRIVE_MIN = ROAD_END + 4.5;
const ROAD_LENGTH = ROAD_START - ROAD_END;
const ROAD_CENTER = (ROAD_START + ROAD_END) / 2;

const groundMaterial = new THREE.MeshStandardMaterial({ color: '#20251e', roughness: 1 });
// 地面铺得比马路远得多，开到尽头也只会没入雾里，看不到场景的边界。
const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 620), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -80;
ground.receiveShadow = true;
scene.add(ground);
const roadFadeTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  // v=1 对应马路远端：在最后一段里把路面交给地面，终点不会出现一刀切的边。
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(.05, '#ffffff');
  gradient.addColorStop(.975, '#ffffff');
  gradient.addColorStop(1, '#000000');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
})();
const roadMaterial = new THREE.MeshStandardMaterial({ color: '#2c3028', roughness: .95, transparent: true, alphaMap: roadFadeTexture });
const roadMarks = [];
const road = new THREE.Mesh(new THREE.PlaneGeometry(7, ROAD_LENGTH), roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.set(0, .015, ROAD_CENTER);
road.receiveShadow = true;
scene.add(road);
// 路面虚线：整条路每 3 个单位一段，但每座年份门附近（圈的范围）留空，
// 圈边上就不会再戳出一截白条。
// 每座年份门只在圈口切一刀（圈半径 2.55 + 半段 0.8 + 余量），
// 圈内没有虚线，圈外前后一条线是连着的，路面不会看着断掉。
const gateZs = [-10, -31, -52, -73];
const GATE_CLEAR = 4;
for (let z = ROAD_START - 4; z > ROAD_END + 12; z -= 3) {
  if (gateZs.some(gateZ => Math.abs(z - gateZ) < GATE_CLEAR)) continue;
  const mark = new THREE.Mesh(new THREE.BoxGeometry(.14, .025, 1.6), new THREE.MeshBasicMaterial({ color: '#d9ff65' }));
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
  for (let z = ROAD_START - 4; z >= ROAD_END + 12; z -= step) {
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

// 马路终点立一块 STOP 牌，它就是小车能开到的极限。
const stopSignTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 256, 256);
  const cx = 128, cy = 128;
  const octagon = radius => {
    context.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 8 + i * Math.PI / 4;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
  };
  octagon(120);
  context.fillStyle = '#cf2f27';
  context.fill();
  context.lineWidth = 10;
  context.strokeStyle = '#f6f1e7';
  context.stroke();
  octagon(101);
  context.lineWidth = 5;
  context.strokeStyle = '#f6f1e7';
  context.stroke();
  context.fillStyle = '#f6f1e7';
  context.font = '700 54px Helvetica, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('STOP', cx, cy + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
})();
const stopSign = new THREE.Group();
const stopFace = new THREE.Mesh(
  new THREE.PlaneGeometry(1.08, 1.08),
  new THREE.MeshBasicMaterial({ map: stopSignTexture, transparent: true, side: THREE.DoubleSide })
);
stopFace.position.y = 2.16;
stopFace.position.z = .02;
const stopPost = new THREE.Mesh(
  new THREE.CylinderGeometry(.05, .05, 2.2, 10),
  new THREE.MeshStandardMaterial({ color: '#8c8f8a', roughness: .55, metalness: .35 })
);
stopPost.position.y = 1.1;
stopPost.position.z = -.08;
stopSign.add(stopFace, stopPost);
stopSign.position.set(2.5, 0, ROAD_END + 2.5);
scene.add(stopSign);

// 视频资源统一放在 assets/video/<年份>/<项目>/<序号>.mp4，
// 每个视频的首帧静帧放在 assets/thumbs/<年份>/<项目>/<序号>.jpg，圈里平时只显示静帧。
const projects = [
  { year: '2023', title: 'spine-cartoonWord', count: 3 },
  { year: '2023', title: 'spine-planet', count: 7 },
  { year: '2023', title: 'spine-slots', count: 6 },
  { year: '2023', title: 'wordGame', count: 4 },
  { year: '2023', title: 'wordGameCartoon', count: 8 },
  { year: '2025', title: 'match3-buff', count: 19 },
  { year: '2025', title: 'match3-heroSkill', count: 14 },
  { year: '2026', title: 'wordGame', count: 10 },
  { year: '2027', title: 'resume', count: 0, resume: true },
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
    if (project.resume) { entries.push({ ...project, mediaIndex: 0, sequence: entries.length + 1 }); return; }
    for (let index = 1; index <= project.count; index++) entries.push({ ...project, mediaIndex: index, sequence: entries.length + 1 });
  });
  entries.forEach(entry => { entry.total = entries.length; });
  return entries;
}

function textMesh(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color; ctx.font = '800 112px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 512, 150);
  const meshMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
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
  // 标签是半透明贴图，不写深度（否则会在远处把身后的路“抠”出一道断口），
  // 而且要排在路面之后画，不然会被路面盖掉。
  label.renderOrder = 3;
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

// ── 天光：最后一个场景（2027）里，正上方落下一柱七色光，落在小车身上 ──
const rainbowRig = new THREE.Group();
rainbowRig.visible = false;
scene.add(rainbowRig);
const rainbowTint = new THREE.Color();

const HSL_FN = `
    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
    }
`;

// 圈里的七彩雾：一捧贴着地面浮起来的高光彩雾，只在最后一站的圈里亮。
function makeMistTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, size * .03, size / 2, size / 2, size * .5);
  gradient.addColorStop(0, 'rgba(255,255,255,.95)');
  gradient.addColorStop(.42, 'rgba(255,255,255,.60)');
  gradient.addColorStop(.72, 'rgba(255,255,255,.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
const mistTexture = makeMistTexture();

// 地面上的那圈高光：按角度铺七色，慢慢转，像雾底下被打亮的一层。
const mistSheenMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: .18 },
  },
  vertexShader: `
    varying vec2 vLocal;
    void main() {
      vLocal = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime, uOpacity;
    varying vec2 vLocal;
    ${HSL_FN}
    void main() {
      float radius = length(vLocal) / 2.45;
      if (radius > 1.0) discard;
      float a = fract(atan(vLocal.y, vLocal.x) / 6.2831853 + 0.5 + uTime * 0.04);
      vec3 col = hsl2rgb(vec3(a * 0.82, 0.9, 0.62));
      gl_FragColor = vec4(col, pow(1.0 - radius, 1.5) * uOpacity);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const mistSheen = new THREE.Mesh(new THREE.CircleGeometry(2.45, 72), mistSheenMaterial);
mistSheen.rotation.x = -Math.PI / 2;
mistSheen.position.y = .045;
mistSheen.frustumCulled = false;
rainbowRig.add(mistSheen);

const mistPuffs = [];
// 圈里的七彩雾：24 团分四层铺开，比原来密一倍，颜色一圈一圈错开。
const MIST_COUNT = 24;
for (let index = 0; index < MIST_COUNT; index++) {
  const layer = index % 4;
  const baseAngle = (index / MIST_COUNT) * Math.PI * 2 + layer * .34;
  const baseRadius = .42 + layer * .52 + (index % 2) * .16;
  const baseY = .12 + layer * .15 + (index % 2) * .05;
  const size = 1.55 + layer * .22 + (index % 2) * .28;
  const material = new THREE.SpriteMaterial({
    map: mistTexture,
    color: new THREE.Color().setHSL(index / MIST_COUNT, .9, .58, THREE.SRGBColorSpace),
    transparent: true,
    opacity: .15,
    blending: THREE.AdditiveBlending,
    alphaTest: .01,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(Math.cos(baseAngle) * baseRadius, baseY, Math.sin(baseAngle) * baseRadius);
  sprite.scale.set(size, size * .52, 1);
  sprite.frustumCulled = false;
  rainbowRig.add(sprite);
  mistPuffs.push({ sprite, material, baseAngle, baseRadius, baseY, phase: index * .79 });
}

// 天气系统照 Unity 的 MeadowWeather：预设参数 + 平滑过渡 + GPU 单批次粒子 + 近景雾幕。
const weather = new WeatherSystem({ scene, camera, groundMaterial, roadMaterial, sun, hemi });
const themes = {
  '2023': { background: '#2b1608', fog: '#70431e', ground: '#8a5428', road: '#553118', accent: '#ffad4d', text: '#ffe8c9', muted: '#d5a875', car: '#ffad4d', window: '#3c2016', weather: 'sand' },
  '2025': { background: '#061a33', fog: '#17416e', ground: '#123050', road: '#0b2239', accent: '#7fc9ff', text: '#e6f4ff', muted: '#96b6d4', car: '#a9d9ff', window: '#0c2035', weather: 'rain' },
  '2026': { background: '#091322', fog: '#1c3656', ground: '#1b3150', road: '#12233a', accent: '#9fd8ff', text: '#dceeff', muted: '#8eabc8', car: '#9fd8ff', window: '#14243d', weather: 'snow' },
  '2027': { background: '#2b1a4f', fog: '#5c4494', ground: '#3b3068', road: '#251e4b', accent: '#ffe0a3', text: '#f7f1ff', muted: '#c0b1e4', car: '#fff6ff', window: '#2f2758', weather: 'clear', rainbow: true },
};
let activeTheme = null;
function applyTheme(year) {
  const theme = themes[year];
  if (!theme || activeTheme === year) return;
  const firstTheme = activeTheme === null;
  activeTheme = year;
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--ink', theme.text);
  document.documentElement.style.setProperty('--muted', theme.muted);
  groundMaterial.color.set(theme.ground);
  roadMaterial.color.set(theme.road);
  car.userData.bodyMaterial.color.set(theme.car);
  car.userData.darkMaterial.color.set(theme.window);
  car.userData.lightMaterial.color.set('#fff4c2');
  car.userData.headlightVolumeMaterial.uniforms.uColor.value.set('#fff1b0');
  car.userData.headlightBeams.forEach(light => light.color.set('#fff1b0'));
  car.userData.hazardGlowMaterial.color.set('#ff5b42');
  years.forEach(item => {
    item.color = theme.accent;
    item.group?.userData.material.color.set(theme.accent);
    if (item.group?.userData.labelMaterial) item.group.userData.labelMaterial.color.set(theme.accent);
    if (item.group?.userData.ringMaterial) item.group.userData.ringMaterial.color.set(theme.accent);
    if (item.group?.userData.beamMaterial) item.group.userData.beamMaterial.color.set(theme.accent);
    if (item.group?.userData.beamInnerMaterial) item.group.userData.beamInnerMaterial.color.set(theme.accent);
    if (item.group?.userData.beamUnderMaterial) item.group.userData.beamUnderMaterial.color.set(theme.accent);
    if (item.group?.userData.beamLowMaterial) item.group.userData.beamLowMaterial.color.set(theme.accent);
  });
  roadMarks.forEach(mark => mark.material.color.set(theme.accent));
  roadSlogans.forEach(slogan => slogan.material.color.set(theme.road));
  roadSloganFrames.forEach(frame => frame.material.color.set(theme.accent));
  rainbowRig.visible = !!theme.rainbow;
  weather.setTheme(theme, { instant: firstTheme });
}

const keys = {};
applyTheme('2023');
// 调试用：?weather=rain|snow|sand|fog|clear 可以直接看某一种天气。
const weatherOverride = new URLSearchParams(location.search).get('weather');
if (weatherOverride) weather.setKind(weatherOverride, { instant: true });
// 调试用：?theme=2023|2025|2026|2027 直接看某个场景的配色。
const themeOverride = new URLSearchParams(location.search).get('theme');
if (themes[themeOverride]) applyTheme(themeOverride);
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
function mediaMarkup(project, autoplay, thumbnail = false) {
  const index = project.mediaIndex || 1;
  const clip = assetUrl(`assets/video/${project.year}/${project.title}/${index}.mp4`);
  const still = assetUrl(`assets/thumbs/${project.year}/${project.title}/${index}.jpg`);
  const alt = escapeHtml(displayName(project));
  // 聚焦看大图时直接放视频，静帧当 poster 兜底。
  if (!thumbnail) return `<video src="${clip}" poster="${still}" ${autoplay ? 'autoplay' : ''} muted loop playsinline></video>`;
  // 圈内所有卡片一个逻辑：平时只显示静帧，转到最前面的那张才露出视频并播放，
  // 同一时刻最多一份在解码，转动时不卡。
  return `<img class="ring-still" src="${still}" alt="${alt}" /><video class="ring-clip" src="${clip}" poster="${still}" muted loop playsinline preload="none"></video>`;
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
const ringState = { angle: 0, dragging: false, lastX: 0, moved: false, frontIndex: -1, pending: false };
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
    const scale = (.48 + depth * .52) * (card.__hover && !ringState.dragging ? 1.1 : 1);
    // 转动时会每帧改样式，所以只写真正变化的值：
    // 位置量到 0.5px、透明度量到 0.05、模糊只有三档（模糊是最贵的，不能每帧变）。
    const cache = card.__ringCache || (card.__ringCache = {});
    const ratio = card.dataset.ratio || '1 / 1.12';
    if (cache.ratio !== ratio) { cache.ratio = ratio; card.style.setProperty('--card-ratio', ratio); }
    const transform = `translate3d(calc(-50% + ${Math.round(x * 2) / 2}px), calc(-50% + ${Math.round(y * 2) / 2}px), 0) scale(${scale.toFixed(3)})`;
    if (cache.transform !== transform) { cache.transform = transform; card.style.transform = transform; }
    const zIndex = Math.round(depth * 1000) + (card.__hover ? 1000 : 0);
    if (cache.zIndex !== zIndex) { cache.zIndex = zIndex; card.style.zIndex = String(zIndex); }
    const opacity = Math.round((.28 + depth * .72) * 20) / 20;
    if (cache.opacity !== opacity) { cache.opacity = opacity; card.style.opacity = String(opacity); }
    // 不再给卡片加 blur 滤镜：卡片里可能有视频，模糊层每帧都要重算，
    // 深度感交给缩放和透明度表达。
    if (cache.blur !== undefined) { cache.blur = undefined; card.style.filter = ''; }
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
    group.innerHTML = entries.map(project => `<article class="ring-card" role="button" tabindex="0" aria-label="${escapeHtml(displayName(project))}"><div class="ring-media">${mediaMarkup(project, false, true)}<div class="ring-loading" aria-hidden="true"></div></div><div class="ring-name">${escapeHtml(displayName(project))}</div></article>`).join('');
    const cards = Array.from(group.querySelectorAll('.ring-card'));
    cards.forEach((card, index) => {
      setCardRatio(card, card.querySelector('img, video'));
      watchCardMediaLoading(card);
      // 悬停时轻微放大：卡片 transform 每帧由环上位置重算，所以这里只记状态，
      // 由 updateRingCardTransforms 一并算进去，避免和转动打架。
      card.addEventListener('pointerenter', () => { card.__hover = true; });
      card.addEventListener('pointerleave', () => { card.__hover = false; });
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
    // 按下就掐掉默认行为：否则长按拖拽会变成文字/图片的多选高亮。
    event.preventDefault();
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
    // 一帧最多刷一次样式，pointermove 频率高于屏幕刷新时不重复写 DOM。
    if (!ringState.pending) {
      ringState.pending = true;
      requestAnimationFrame(() => { ringState.pending = false; updateRingCardTransforms(); });
    }
  });
  // 长按/拖动时不要触发文字选中、图片拖拽和长按菜单。
  ['selectstart', 'dragstart', 'contextmenu'].forEach(type => {
    ringGallery.addEventListener(type, event => event.preventDefault());
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
  car.position.z = THREE.MathUtils.clamp(car.position.z, ROAD_DRIVE_MIN, ROAD_START);

  // 小车始终沿道路中心直线行驶。

  car.position.x = 0;
  car.rotation.y = 0;
  car.scale.setScalar(.42);
  const year = nearestYear();
  roadMarks.forEach(mark => {
    mark.visible = !years.some(item => Math.abs(mark.position.z - item.z) < GATE_CLEAR);
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
  // 视线方向写死成相机的固定相对偏移：跟随有延迟时俯仰角也不变，
  // 否则车一动镜头就像被抬起来，把远处地面的边界露出来。
  camera.lookAt(camera.position.x - .25, camera.position.y - 3.05, camera.position.z - 7.15);

  // 2027 场景：正上方落下的七色光柱踩在车上，车一动就跟着走；只有开进最后一站的圈里才亮。
  const lastGate = years[years.length - 1];
  const inLastCircle = Math.abs(car.position.z - lastGate.z) < 3.25;
  rainbowRig.visible = inLastCircle || resumeFocusOpen;
  if (rainbowRig.visible) {
    const time = clock.elapsedTime;
    // 雾待在圈里，不跟着车走。
    rainbowRig.position.set(0, .02, lastGate.z);
    mistSheenMaterial.uniforms.uTime.value = time;
    mistSheenMaterial.uniforms.uOpacity.value = .18 + Math.sin(time * 1.6) * .04;
    mistPuffs.forEach(puff => {
      const angle = puff.baseAngle + time * .16 + Math.sin(time * .45 + puff.phase) * .26;
      puff.sprite.position.set(
        Math.cos(angle) * puff.baseRadius,
        puff.baseY + Math.sin(time * .55 + puff.phase) * .12,
        Math.sin(angle) * puff.baseRadius,
      );
      puff.material.color.setHSL((time * .06 + puff.phase * .1) % 1, .9, .58 + Math.sin(time * 2 + puff.phase) * .10, THREE.SRGBColorSpace);
      puff.material.opacity = .11 + .08 * (.5 + .5 * Math.sin(time * 1.9 + puff.phase));
    });
  }

  // 2027 的霓虹：整个场景的配色一起轮转，还带一点像电流般的明暗抖动。
  if (activeTheme === '2027') {
    const time = clock.elapsedTime;
    const hue = (time * .055) % 1;
    // 最后一个圈（RESUME）和它地上的字、还有小车，走一套更快的换色节奏。
    const lastHue = (time * .24) % 1;
    // 0.6~1.0 之间来回，看起来像霓虹灯管在轻轻闪。
    const shine = .8 + .2 * Math.sin(time * 4.7) * Math.sin(time * 1.4 + .7);
    // 天空、雾、地面、路面这些大色块也跟着换，整条路边走边变颜色。
    weather.palette.background.setHSL(hue, .58, .09 + .03 * shine, THREE.SRGBColorSpace);
    weather.palette.fog.setHSL((hue + .07) % 1, .50, .22 + .05 * shine, THREE.SRGBColorSpace);
    weather.palette.ground.setHSL((hue + .56) % 1, .34, .10 + .02 * shine, THREE.SRGBColorSpace);
    weather.palette.road.setHSL((hue + .58) % 1, .30, .13 + .03 * shine, THREE.SRGBColorSpace);
    car.userData.bodyMaterial.color.setHSL(lastHue, .58, .38 + .18 * shine, THREE.SRGBColorSpace);
    car.userData.darkMaterial.color.setHSL((lastHue + .72) % 1, .42, .07 + .04 * shine, THREE.SRGBColorSpace);
    roadMarks.forEach((mark, index) => mark.material.color.setHSL((hue + index * .09) % 1, .92, .56 + .10 * shine), THREE.SRGBColorSpace);
    roadSlogans.forEach((slogan, index) => slogan.material.color.setHSL((hue + .5 + index * .02) % 1, .85, .48 + .10 * shine), THREE.SRGBColorSpace);
    roadSloganFrames.forEach((frame, index) => frame.material.color.setHSL((hue + .5 + index * .02) % 1, .9, .56 + .10 * shine), THREE.SRGBColorSpace);
    years.forEach((item, index) => {
      const data = item.group?.userData;
      if (!data) return;
      // 最后那个圈跟车、跟字同频，前三个圈保持原来的慢节奏。
      const gateHue = item.label === 'RESUME' ? lastHue : (hue + index * .18) % 1;
      rainbowTint.setHSL(gateHue, .9, .58 + .08 * shine, THREE.SRGBColorSpace);
      data.material?.color.copy(rainbowTint);
      data.labelMaterial?.color.copy(rainbowTint);
      data.ringMaterial?.color.copy(rainbowTint);
      data.beamMaterial?.color.copy(rainbowTint);
      data.beamInnerMaterial?.color.copy(rainbowTint);
      data.beamUnderMaterial?.color.copy(rainbowTint);
      data.beamLowMaterial?.color.copy(rainbowTint);
    });
    const carHue = lastHue;
    car.userData.lightMaterial.color.setHSL(carHue, 1, .70 + .08 * shine, THREE.SRGBColorSpace);
    car.userData.headlightVolumeMaterial.uniforms.uColor.value.setHSL(carHue, 1, .64 + .08 * shine, THREE.SRGBColorSpace);
    car.userData.headlightBeams.forEach(light => light.color.setHSL(carHue, 1, .58 + .08 * shine), THREE.SRGBColorSpace);
    // 尾灯不参与变色，从头到尾都是红的（颜色由 applyTheme 固定成 #ff5b42）。
    car.userData.hazardGlowMaterial.color.set('#ff5b42');
  }

  weather.update(dt, clock.elapsedTime);
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
window.__weather = weather;
window.__renderer = renderer;
window.__scene = scene;
window.__camera = camera;
