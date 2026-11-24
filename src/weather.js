import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';

// 与 Unity 工程 CatPlanet 的 MeadowWeather 同构：天气只提供一份“观感参数”，
// 由主题负责调色板，两边互不覆盖。
//   - 4~5 份预设（晴 / 雨 / 雪 / 尘 / 雾），每份是一组数字 + 颜色
//   - 切换时按 smoothstep 过渡，逐帧插值整份参数
//   - 粒子全部在顶点着色器里循环，CPU 每帧只更新一次 uniform，一个批次一次 draw
//   - 近景薄雾是一张全屏 quad，用与深度雾同一个颜色，把“空气”补到 0 距离
//   - 地面 / 道路按 wetness、snow 两个量做压暗变冷与积雪覆盖

const color = hex => new THREE.Color(hex);

const luminance = value => value.r * .2126 + value.g * .7152 + value.b * .0722;

// 天空和雾要用去饱和混合，不能相乘：乘法只会把深蓝变成更深的蓝，读不出阴天。
// 但作品集的主题都很暗，直接混向亮灰会把夜色调成灰色，所以先把灰目标按基色的亮度归一，
// 只去掉色相、保留原来的明度（Unity 的做法同样是亮度守恒）。
function liftColor(target, factor) {
  if (factor === 1) return target;
  target.setRGB(Math.min(1, target.r * factor), Math.min(1, target.g * factor), Math.min(1, target.b * factor));
  return target;
}

function mixTowardGrey(target, base, grey, mix, tmp) {
  const baseLum = Math.max(luminance(base), 1e-4);
  const greyLum = Math.max(luminance(grey), 1e-4);
  tmp.copy(grey).multiplyScalar(baseLum / greyLum);
  target.copy(base).lerp(tmp, mix);
}

// 参数直接取自 Unity 的 MeadowWeatherLook，尺寸按作品集场景（米级）折算。
const PRESETS = {
  clear: {
    name: '晴',
    skyMix: 0,
    skyGrey: color('#ffffff'),
    skyLift: 1,
    fogMix: 0,
    fogGrey: color('#ffffff'),
    fogLift: 1,
    fogStart: 60,
    fogEnd: 150,
    sunColor: color('#ffd2a4'),
    sunIntensity: 4.6,
    ambientSky: color('#e7e0cf'),
    ambientGround: color('#1a2118'),
    ambientIntensity: 2.4,
    wetness: 0,
    rain: 0,
    snow: 0,
    sand: 0,
    veil: 0,
    rainColor: color('#cfe4ff'),
    snowColor: color('#ffffff'),
    sandColor: color('#f2b866'),
  },
  rain: {
    name: '雨',
    skyMix: .30,
    skyGrey: color('#8ba7c8'),
    skyLift: 1.05,
    fogMix: .45,
    fogGrey: color('#8db1d8'),
    fogLift: 1.30,
    fogStart: 16,
    fogEnd: 90,
    sunColor: color('#9dc9ff'),
    sunIntensity: 2.2,
    ambientSky: color('#9dbbdd'),
    ambientGround: color('#08131f'),
    ambientIntensity: 1.9,
    wetness: 1,
    rain: 1,
    snow: 0,
    sand: 0,
    veil: .05,
    rainColor: color('#cfe4ff'),
    snowColor: color('#ffffff'),
    sandColor: color('#f2b866'),
  },
  snow: {
    name: '雪',
    skyMix: .28,
    skyGrey: color('#f7f9ff'),
    skyLift: 1.12,
    fogMix: .50,
    fogGrey: color('#f2f6ff'),
    fogLift: 1.35,
    fogStart: 16,
    fogEnd: 80,
    sunColor: color('#e3edff'),
    sunIntensity: 2.6,
    ambientSky: color('#dfe8f6'),
    ambientGround: color('#16202c'),
    ambientIntensity: 2.6,
    wetness: .12,
    rain: 0,
    snow: 1,
    sand: 0,
    veil: .06,
    rainColor: color('#cfe4ff'),
    snowColor: color('#ffffff'),
    sandColor: color('#f2b866'),
  },
  sand: {
    name: '尘',
    skyMix: .40,
    skyGrey: color('#c9a273'),
    skyLift: 1.35,
    fogMix: .62,
    fogGrey: color('#d3a778'),
    fogLift: 1.90,
    fogStart: 5,
    fogEnd: 44,
    sunColor: color('#ffcf9a'),
    sunIntensity: 3.6,
    ambientSky: color('#e8c194'),
    ambientGround: color('#201710'),
    ambientIntensity: 2.2,
    wetness: .10,
    rain: 0,
    snow: 0,
    sand: 1,
    veil: .05,
    rainColor: color('#cfe4ff'),
    snowColor: color('#ffffff'),
    sandColor: color('#f2b866'),
  },
  fog: {
    name: '雾',
    skyMix: .45,
    skyGrey: color('#dbdee2'),
    skyLift: 1.30,
    fogMix: .60,
    fogGrey: color('#e0e2e4'),
    fogLift: 1.90,
    fogStart: 3,
    fogEnd: 45,
    sunColor: color('#d8dee8'),
    sunIntensity: 2.0,
    ambientSky: color('#cfd6de'),
    ambientGround: color('#1a2026'),
    ambientIntensity: 2.3,
    wetness: .30,
    rain: 0,
    snow: 0,
    sand: 0,
    veil: .12,
    rainColor: color('#cfe4ff'),
    snowColor: color('#ffffff'),
    sandColor: color('#f2b866'),
  },
};

const NUMBER_KEYS = ['skyMix', 'skyLift', 'fogMix', 'fogLift', 'fogStart', 'fogEnd', 'sunIntensity', 'ambientIntensity',
  'wetness', 'rain', 'snow', 'sand', 'veil'];
const COLOR_KEYS = ['skyGrey', 'fogGrey', 'sunColor', 'ambientSky', 'ambientGround',
  'rainColor', 'snowColor', 'sandColor'];

function copyLook(target, source) {
  NUMBER_KEYS.forEach(key => { target[key] = source[key]; });
  COLOR_KEYS.forEach(key => { target[key].copy(source[key]); });
  return target;
}

function blankLook() {
  return {
    skyMix: 0, skyLift: 1, fogMix: 0, fogLift: 1, fogStart: 0, fogEnd: 0, sunIntensity: 0, ambientIntensity: 0,
    wetness: 0, rain: 0, snow: 0, sand: 0, veil: 0,
    skyGrey: new THREE.Color(), fogGrey: new THREE.Color(), sunColor: new THREE.Color(),
    ambientSky: new THREE.Color(), ambientGround: new THREE.Color(),
    rainColor: new THREE.Color(), snowColor: new THREE.Color(), sandColor: new THREE.Color(),
  };
}

function blendLook(target, a, b, t) {
  NUMBER_KEYS.forEach(key => { target[key] = a[key] + (b[key] - a[key]) * t; });
  COLOR_KEYS.forEach(key => { target[key].copy(a[key]).lerp(b[key], t); });
  return target;
}

const CORNERS = [[-1, -1], [-1, 1], [1, 1], [1, -1]];

// 每颗粒子四个顶点共享中心、种子，UV 当角标——和 Unity 的 BuildQuads 完全一致。
function buildQuads(count, seedFactory) {
  const centers = new Float32Array(count * 4 * 3);
  const seeds = new Float32Array(count * 4 * 4);
  const corners = new Float32Array(count * 4 * 2);
  const indices = count * 4 <= 65535 ? new Uint16Array(count * 6) : new Uint32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const { center, seed } = seedFactory(i);
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      centers[v * 3] = center.x; centers[v * 3 + 1] = center.y; centers[v * 3 + 2] = center.z;
      seeds[v * 4] = seed.x; seeds[v * 4 + 1] = seed.y; seeds[v * 4 + 2] = seed.z; seeds[v * 4 + 3] = seed.w;
      corners[v * 2] = CORNERS[k][0]; corners[v * 2 + 1] = CORNERS[k][1];
    }
    const o = i * 4, t = i * 6;
    indices[t] = o; indices[t + 1] = o + 1; indices[t + 2] = o + 2;
    indices[t + 3] = o; indices[t + 4] = o + 2; indices[t + 5] = o + 3;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(centers, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aCorner', new THREE.BufferAttribute(corners, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

// 每颗粒子要确定性随机，换主题时不能重排——用固定种子的线性同余。
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const RAIN_VERT = `
attribute vec4 aSeed;
attribute vec2 aCorner;

uniform float uTime, uSpeed, uHeight, uWidth, uLength, uWindX, uWindZ;
uniform vec3 uAnchor;

varying vec2 vCorner;
varying float vFade;

void main() {
  vec3 center = position;
  float height = max(uHeight, 1.0);
  float fall = uTime * uSpeed * aSeed.x;
  float phase = fract((center.y - fall) / height);
  center.y = phase * height;
  // 水平漂移和雨丝的倾斜必须同源，否则斜线会在每一帧横向滑出自己的方向。
  center.x += uWindX * (1.0 - phase) * height;
  center.z += uWindZ * (1.0 - phase) * height;

  vec3 world = uAnchor + center;
  vec3 direction = normalize(vec3(uWindX, -1.0, uWindZ));
  vec3 forward = -viewMatrix[2].xyz;
  vec3 side = cross(direction, forward);
  float sideLength = length(side);
  side = sideLength > 0.001 ? side / sideLength : viewMatrix[0].xyz;

  float cameraDistance = distance(world, cameraPosition);
  // 贴脸的雨丝会投影成白棒，宽度和长度都按距离封顶。
  float width = min(uWidth * aSeed.z, cameraDistance * 0.0075);
  float streak = min(uLength * aSeed.y, cameraDistance * 0.17);
  world += side * (aCorner.x * width) + direction * (aCorner.y * streak);

  vFade = clamp((distance(world, cameraPosition) - 0.55) / 1.1, 0.0, 1.0);
  vCorner = aCorner;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const RAIN_FRAG = `
uniform vec3 uColor;
uniform float uAmount, uOpacity;

varying vec2 vCorner;
varying float vFade;

void main() {
  float side = 1.0 - abs(vCorner.x);
  float uvY = (vCorner.y + 1.0) * 0.5;
  float ends = smoothstep(0.0, 0.22, uvY) * smoothstep(1.0, 0.72, uvY);
  float alpha = side * side * ends * uAmount * vFade * uOpacity;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const SNOW_VERT = `
attribute vec4 aSeed;
attribute vec2 aCorner;

uniform float uTime, uSpeed, uHeight, uSize, uSway, uSwaySpeed;
uniform vec3 uAnchor;

varying vec2 vCorner;
varying float vFade;

void main() {
  vec3 center = position;
  float height = max(uHeight, 1.0);
  float fall = uTime * uSpeed * aSeed.x;
  center.y = fract((center.y - fall) / height) * height;

  // 每片雪自带相位和摆速，整片雪不会同步晃。
  float phase = aSeed.w * 6.2831853;
  float swaySpeed = uSwaySpeed * aSeed.z;
  center.x += sin(uTime * swaySpeed * 0.9 + phase) * uSway;
  center.z += cos(uTime * swaySpeed * 0.72 + phase * 1.37) * uSway * 0.8;

  vec3 world = uAnchor + center;
  float size = uSize * aSeed.y;
  float cameraDistance = distance(world, cameraPosition);
  size *= mix(0.30, 1.0, clamp((cameraDistance - 1.2) / 5.0, 0.0, 1.0));
  world += (viewMatrix[0].xyz * aCorner.x + viewMatrix[1].xyz * aCorner.y) * size;

  vFade = clamp((distance(world, cameraPosition) - 0.45) / 1.2, 0.0, 1.0);
  vCorner = aCorner;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const SNOW_FRAG = `
uniform vec3 uColor;
uniform float uAmount, uOpacity;

varying vec2 vCorner;
varying float vFade;

void main() {
  float radius = length(vCorner);
  if (radius > 1.0) discard;
  float body = smoothstep(1.0, 0.15, radius) * 0.75 + smoothstep(0.42, 0.0, radius) * 0.45;
  float alpha = body * uAmount * vFade * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const SAND_VERT = `
attribute vec4 aSeed;
attribute vec2 aCorner;

uniform float uTime, uSpeed, uSpan, uSize;
uniform vec3 uAnchor;

varying vec2 vCorner;
varying float vFade;

void main() {
  // 尘是横向被风吹着走的，所以在世界坐标上按盒子长度取模回绕。
  float x = mod(position.x + uTime * uSpeed * aSeed.z + uSpan * 0.5, uSpan) - uSpan * 0.5 + uAnchor.x;
  float z = mod(position.z + uTime * uSpeed * 0.6 * aSeed.z + uSpan * 0.5, uSpan) - uSpan * 0.5 + uAnchor.z;
  float y = position.y + sin(uTime * 1.1 * aSeed.y + aSeed.w * 6.2831853) * 0.4;

  vec3 world = vec3(x, y, z);
  float size = uSize * aSeed.y;
  float cameraDistance = distance(world, cameraPosition);
  size *= mix(0.35, 1.0, clamp((cameraDistance - 0.8) / 4.0, 0.0, 1.0));
  world += (viewMatrix[0].xyz * aCorner.x + viewMatrix[1].xyz * aCorner.y) * size;

  vFade = clamp((distance(world, cameraPosition) - 0.4) / 1.0, 0.0, 1.0);
  vCorner = aCorner;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const SAND_FRAG = `
uniform vec3 uColor;
uniform float uAmount, uOpacity;

varying vec2 vCorner;
varying float vFade;

void main() {
  float radius = length(vCorner);
  if (radius > 1.0) discard;
  float alpha = pow(1.0 - radius, 2.2) * uAmount * vFade * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const RIPPLE_VERT = `
attribute vec4 aSeed;
attribute vec2 aCorner;

uniform float uTime, uSpan, uSize;
uniform vec3 uAnchor;

varying vec2 vCorner;
varying float vSeed;
varying float vFade;

// 把一个固定的落点 p 拖到离 anchor 最近的那一份格子副本上（副本间隔 span）。
float lattice(float p, float anchor, float span) {
  return p + span * floor((anchor - p) / span + 0.5);
}

void main() {
  // 水圈钉在世界地面上：取离相机最近的那一份格子副本，相机走多远只是换一份副本，
  // 水圈本身的落点不动，所以不会跟着小车平移。副本切换发生在半格之外，那里已经淡出，看不见。
  float x = lattice(position.x, uAnchor.x, uSpan);
  float z = lattice(position.z, uAnchor.z, uSpan);
  vec3 world = vec3(x, 0.02, z);
  world.xz += aCorner * (uSize * aSeed.y);

  float cameraDistance = distance(world, cameraPosition);
  // 太远看不见，贴脸的那一圈又会占满屏幕，两头都淡出。
  vFade = clamp((cameraDistance - 1.4) / 2.2, 0.0, 1.0) * clamp((30.0 - cameraDistance) / 12.0, 0.0, 1.0);
  vCorner = aCorner;
  vSeed = aSeed.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const RIPPLE_FRAG = `
uniform vec3 uColor;
uniform float uAmount, uRate, uTime, uOpacity;

varying vec2 vCorner;
varying float vSeed;
varying float vFade;

void main() {
  float radius = length(vCorner);
  if (radius > 1.0) discard;
  // 相位和每圈的速率都错开，地面不会整片同步脉冲。
  float life = fract(uTime * uRate + vSeed * 7.31);
  float ringRadius = life * 0.92;
  float ringWidth = 0.03 + 0.13 * life;
  float ring = 1.0 - clamp(abs(radius - ringRadius) / ringWidth, 0.0, 1.0);
  float splash = clamp(1.0 - radius / 0.24, 0.0, 1.0) * clamp(1.0 - life * 6.0, 0.0, 1.0);
  float alpha = (ring * ring * (1.0 - life) * 0.46 + splash * 0.34) * uAmount * vFade * uOpacity;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

// 全屏薄雾：顶点着色器直接写裁剪空间，不吃物体的变换 / FOV / 画幅；
// 片元把视线和地面求交，再用交点采同一张雾噪，所以近处是一团一团而不是一层白纱。
const VEIL_VERT = `
varying vec2 vNdc;

void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.5, 1.0);
}
`;

const VEIL_FRAG = `
uniform vec3 uRight, uUp, uForward, uFogColor;
uniform float uTanHalfFov, uAspect, uVeil, uScale, uTime;
uniform sampler2D uNoise;

varying vec2 vNdc;

void main() {
  vec3 direction = normalize(
    uRight * (vNdc.x * uTanHalfFov * uAspect) +
    uUp * (vNdc.y * uTanHalfFov) +
    uForward
  );
  float veil = clamp(uVeil, 0.0, 1.0);

  if (direction.y < -0.03) {
    float travel = -cameraPosition.y / direction.y;
    vec2 world = cameraPosition.xz + direction.xz * travel;
    float scale = max(uScale, 0.001);
    vec2 uvA = world * scale + vec2(uTime * 0.018, uTime * 0.011);
    vec2 uvB = world * scale * 2.45 - vec2(uTime * 0.027, uTime * 0.016);
    float bank = texture2D(uNoise, uvA).r * 0.68 + texture2D(uNoise, uvB).g * 0.32;
    bank = clamp(bank, 0.0, 1.0);
    bank = bank * bank * (3.0 - 2.0 * bank);
    float reach = clamp((26.0 - travel) / 18.0, 0.0, 1.0);
    float strength = clamp(uVeil * 8.0, 0.0, 1.0);
    veil *= mix(1.0, mix(0.22, 2.05, bank), reach * strength);
  }

  gl_FragColor = vec4(uFogColor, clamp(veil, 0.0, 1.0));
}
`;

// Unity 的 BuildFogNoise：128²、四通道互不相干、两倍频（宽网格 + 细网格），
// 因为挂在世界坐标上，转镜头时雾会从地面滑过。
function makeFogNoise(seed = 20261121) {
  const size = 128;
  const random = makeRandom(seed);
  const grid = cells => {
    const values = new Float32Array(cells * cells);
    for (let i = 0; i < values.length; i++) values[i] = random();
    return { cells, values };
  };
  const sample = (map, u, v) => {
    const cells = map.cells;
    const fx = u * cells, fy = v * cells;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const x0w = ((x0 % cells) + cells) % cells, y0w = ((y0 % cells) + cells) % cells;
    const x1w = (x0w + 1) % cells, y1w = (y0w + 1) % cells;
    const a = map.values[y0w * cells + x0w] + (map.values[y0w * cells + x1w] - map.values[y0w * cells + x0w]) * tx;
    const b = map.values[y1w * cells + x0w] + (map.values[y1w * cells + x1w] - map.values[y1w * cells + x0w]) * tx;
    return a + (b - a) * ty;
  };
  const data = new Uint8Array(size * size * 4);
  for (let channel = 0; channel < 4; channel++) {
    const broad = grid(6 + channel);
    const fine = grid(13 + channel * 3);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x + .5) / size, v = (y + .5) / size;
        const value = Math.round(Math.min(1, Math.max(0, sample(broad, u, v) * .68 + sample(fine, u, v) * .32)) * 255);
        data[(y * size + x) * 4 + channel] = value;
      }
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export class WeatherSystem {
  constructor({ scene, camera, groundMaterial, roadMaterial, sun, hemi }) {
    this.scene = scene;
    this.camera = camera;
    this.groundMaterial = groundMaterial;
    this.roadMaterial = roadMaterial;
    this.sun = sun;
    this.hemi = hemi;

    this.palette = {
      background: new THREE.Color('#111310'),
      fog: new THREE.Color('#111310'),
      ground: new THREE.Color('#20251e'),
      road: new THREE.Color('#2c3028'),
    };
    this.look = copyLook(blankLook(), PRESETS.clear);
    this.from = copyLook(blankLook(), PRESETS.clear);
    this.to = PRESETS.clear;
    this.kind = 'clear';
    this.blend = 1;
    this.transitionSeconds = .8;
    this.anchor = new THREE.Vector3();
    this.tmp = new THREE.Color();
    this.snowTarget = new THREE.Color('#dde8f4');
    this.tmpB = new THREE.Color();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();

    this.rainCount = 1900;
    this.rainSpan = 22;
    this.rainHeight = 12;
    this.snowCount = 1400;
    this.snowSpan = 20;
    this.snowHeight = 12;
    this.sandCount = 1600;
    this.sandSpan = 26;
    this.rippleCount = 2000;
    this.rippleSpan = 48;

    this.noise = makeFogNoise();
    this.buildRain();
    this.buildSnow();
    this.buildSand();
    this.buildRipples();
    this.buildVeil();

    this.scene.fog = new THREE.Fog(0x000000, 60, 150);
    this.apply(0);
  }

  // 主题只提供调色板，天气只提供观感；两边都不直接写死对方的颜色。
  setTheme(theme, { instant = false } = {}) {
    this.palette.background.set(theme.background);
    this.palette.fog.set(theme.fog);
    this.palette.ground.set(theme.ground);
    this.palette.road.set(theme.road);
    this.setKind(theme.weather || 'clear', { instant });
  }

  setKind(kind, { instant = false } = {}) {
    const preset = PRESETS[kind] ? kind : 'clear';
    if (this.kind === preset && this.blend >= 1) return;
    this.kind = preset;
    copyLook(this.from, this.look);
    this.to = PRESETS[preset];
    this.blend = instant ? 1 : 0;
    if (instant) { copyLook(this.look, this.to); this.apply(0); }
  }

  // 在预设之间来回切，等价于 Unity 的 Cycle 按钮，方便调试或以后加天气按钮。
  cycle(instant = false) {
    const order = ['clear', 'rain', 'snow', 'sand', 'fog'];
    const next = order[(order.indexOf(this.kind) + 1) % order.length];
    this.setKind(next, { instant });
  }

  buildRain() {
    const random = makeRandom(20261113);
    const geometry = buildQuads(this.rainCount, () => ({
      center: new THREE.Vector3(
        (random() - .5) * this.rainSpan,
        random() * this.rainHeight,
        (random() - .5) * this.rainSpan
      ),
      seed: new THREE.Vector4(.85 + random() * .4, .7 + random() * .75, .7 + random() * .65, random()),
    }));
    this.rainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 16 },
        uHeight: { value: this.rainHeight },
        uWidth: { value: .014 },
        uLength: { value: .42 },
        uWindX: { value: .13 },
        uWindZ: { value: .05 },
        uAnchor: { value: new THREE.Vector3() },
        uColor: { value: new THREE.Color('#cfe4ff') },
        uAmount: { value: 0 },
        uOpacity: { value: .55 },
      },
      side: THREE.DoubleSide,
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.rain = new THREE.Mesh(geometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 3;
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  buildSnow() {
    const random = makeRandom(20261117);
    const geometry = buildQuads(this.snowCount, () => ({
      center: new THREE.Vector3(
        (random() - .5) * this.snowSpan,
        random() * this.snowHeight,
        (random() - .5) * this.snowSpan
      ),
      seed: new THREE.Vector4(.7 + random() * .65, .65 + random() * .85, .6 + random() * .8, random()),
    }));
    this.snowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.6 },
        uHeight: { value: this.snowHeight },
        uSize: { value: .052 },
        uSway: { value: .55 },
        uSwaySpeed: { value: .9 },
        uAnchor: { value: new THREE.Vector3() },
        uColor: { value: new THREE.Color('#ffffff') },
        uAmount: { value: 0 },
        uOpacity: { value: .92 },
      },
      side: THREE.DoubleSide,
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.snow = new THREE.Mesh(geometry, this.snowMaterial);
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 4;
    this.snow.visible = false;
    this.scene.add(this.snow);
  }

  buildSand() {
    const random = makeRandom(20261119);
    const geometry = buildQuads(this.sandCount, () => ({
      center: new THREE.Vector3(
        (random() - .5) * this.sandSpan,
        .2 + random() * 2.6,
        (random() - .5) * this.sandSpan
      ),
      seed: new THREE.Vector4(.65 + random() * .7, .5 + random() * 1.3, .4 + random() * 1.2, random()),
    }));
    this.sandMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 3.2 },
        uSpan: { value: this.sandSpan },
        uSize: { value: .042 },
        uAnchor: { value: new THREE.Vector3() },
        uColor: { value: new THREE.Color('#e8bd85') },
        uAmount: { value: 0 },
        uOpacity: { value: .50 },
      },
      side: THREE.DoubleSide,
      vertexShader: SAND_VERT,
      fragmentShader: SAND_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.sand = new THREE.Mesh(geometry, this.sandMaterial);
    this.sand.frustumCulled = false;
    this.sand.renderOrder = 4;
    this.sand.visible = false;
    this.scene.add(this.sand);
  }

  buildRipples() {
    const random = makeRandom(20261119);
    const geometry = buildQuads(this.rippleCount, () => ({
      center: new THREE.Vector3((random() - .5) * this.rippleSpan, 0, (random() - .5) * this.rippleSpan),
      seed: new THREE.Vector4(random(), .65 + random() * .7, random(), 0),
    }));
    this.rippleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpan: { value: this.rippleSpan },
        uSize: { value: .13 },
        uRate: { value: 1.7 },
        uAnchor: { value: new THREE.Vector3() },
        uColor: { value: new THREE.Color('#cfe0ff') },
        uAmount: { value: 0 },
        uOpacity: { value: .9 },
      },
      side: THREE.DoubleSide,
      vertexShader: RIPPLE_VERT,
      fragmentShader: RIPPLE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.ripples = new THREE.Mesh(geometry, this.rippleMaterial);
    this.ripples.frustumCulled = false;
    this.ripples.renderOrder = 2;
    this.ripples.visible = false;
    this.scene.add(this.ripples);
  }

  buildVeil() {
    this.veilMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uForward: { value: new THREE.Vector3(0, 0, -1) },
        uTanHalfFov: { value: Math.tan(THREE.MathUtils.degToRad(21)) },
        uAspect: { value: 1 },
        uVeil: { value: 0 },
        uScale: { value: .09 },
        uTime: { value: 0 },
        uFogColor: { value: new THREE.Color() },
        uNoise: { value: this.noise },
      },
      vertexShader: VEIL_VERT,
      fragmentShader: VEIL_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.veilMaterial);
    this.veil.frustumCulled = false;
    this.veil.renderOrder = 1000;
    this.veil.visible = false;
    this.camera.add(this.veil);
    if (!this.camera.parent) this.scene.add(this.camera);
  }

  update(dt, elapsed) {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / Math.max(.05, this.transitionSeconds));
      const eased = this.blend * this.blend * (3 - 2 * this.blend);
      blendLook(this.look, this.from, this.to, eased);
    }
    this.apply(elapsed);
  }

  apply(elapsed) {
    const look = this.look;
    const camera = this.camera;
    // 粒子盒子跟着相机走，但只取相机的水平位置，竖直方向固定在地面上。
    this.anchor.set(camera.position.x, 0, camera.position.z);

    // 天空：去饱和混向灰目标（乘法只会把深蓝变成更深的蓝）。
    if (!this.scene.background || !this.scene.background.isColor) this.scene.background = new THREE.Color();
    mixTowardGrey(this.scene.background, this.palette.background, look.skyGrey, look.skyMix, this.tmp);
    liftColor(this.scene.background, look.skyLift);

    // 雾：颜色从调色板出发，只混到预设的灰目标。
    mixTowardGrey(this.scene.fog.color, this.palette.fog, look.fogGrey, look.fogMix, this.tmp);
    liftColor(this.scene.fog.color, look.fogLift);
    this.scene.fog.near = look.fogStart;
    this.scene.fog.far = look.fogEnd;

    this.sun.color.copy(look.sunColor);
    this.sun.intensity = look.sunIntensity;
    this.hemi.color.copy(look.ambientSky);
    this.hemi.groundColor.copy(look.ambientGround);
    this.hemi.intensity = look.ambientIntensity;

    this.applySurface(this.groundMaterial, this.palette.ground, look.wetness, look.snow * .70, .45);
    this.applySurface(this.roadMaterial, this.palette.road, look.wetness, look.snow * .55, .40);

    const rainAmount = look.rain;
    const snowAmount = look.snow;
    const sandAmount = look.sand;

    this.rain.visible = rainAmount > .01;
    if (this.rain.visible) {
      const u = this.rainMaterial.uniforms;
      u.uTime.value = elapsed;
      u.uAnchor.value.copy(this.anchor);
      u.uAmount.value = rainAmount;
      u.uColor.value.copy(look.rainColor);
    }

    this.snow.visible = snowAmount > .01;
    if (this.snow.visible) {
      const u = this.snowMaterial.uniforms;
      u.uTime.value = elapsed;
      u.uAnchor.value.copy(this.anchor);
      u.uAmount.value = snowAmount;
      u.uColor.value.copy(look.snowColor);
    }

    this.sand.visible = sandAmount > .01;
    if (this.sand.visible) {
      const u = this.sandMaterial.uniforms;
      u.uTime.value = elapsed;
      u.uAnchor.value.copy(this.anchor);
      u.uAmount.value = sandAmount;
      u.uColor.value.copy(look.sandColor);
    }

    this.ripples.visible = rainAmount > .01;
    if (this.ripples.visible) {
      const u = this.rippleMaterial.uniforms;
      u.uTime.value = elapsed;
      u.uAnchor.value.copy(this.anchor);
      u.uAmount.value = rainAmount;
    }

    this.veil.visible = look.veil > .002;
    if (this.veil.visible) {
      camera.updateMatrixWorld();
      this.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      this.up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      camera.getWorldDirection(this.forward);
      const u = this.veilMaterial.uniforms;
      u.uRight.value.copy(this.right);
      u.uUp.value.copy(this.up);
      u.uForward.value.copy(this.forward);
      u.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
      u.uAspect.value = camera.aspect;
      u.uTime.value = elapsed;
      u.uVeil.value = look.veil;
      u.uFogColor.value.copy(this.scene.fog.color);
    }
  }

  // 地表响应：雨把地面压暗变冷并降粗糙度，雪只按比例铺白。
  applySurface(material, baseColor, wetness, snowCover, wetRoughness) {
    material.color.copy(baseColor);
    const wet = Math.min(1, wetness);
    if (wet > 0) material.color.multiply(this.tmp.setRGB(1 - .28 * wet, 1 - .21 * wet, 1 - .16 * wet));
    if (snowCover > 0) material.color.lerp(this.snowTint(baseColor, this.tmpB), Math.min(1, snowCover));
    if ('roughness' in material) material.roughness = 1 - wetRoughness * wet;
  }

  // 积雪不是把地表刷成纯白：按底色亮度定一个冷白，暗夜里只在原有明度上抬一档。
  snowTint(base, out) {
    const lum = base.r * .299 + base.g * .587 + base.b * .114;
    const k = THREE.MathUtils.clamp(lum * 1.35 + .16, .18, .82);
    return out.setRGB(.88, .94, 1).multiplyScalar(k);
  }
}
