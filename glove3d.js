// Boxing Club Ostrava — 3D rukavice v hero.
// Progresivni vrstva: bez WebGL / bez modulu / reduced-motion zustava 2D <img id="glove">.
// Ladeni rotace bez commitu:  ?g=x,y,z  (stupne), napr. ?g=-8,140,4
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE_ROT = [-6, 150, 6];          // vychozi natoceni modelu ve stupnich
const FIT = 0.78;                       // kolik z ramecku model zabere
const LEATHER = 0x8a1f16;               // krvava kuze
const GOLD = 0xd9a441;

const canvas = document.getElementById('g3d');
const img = document.getElementById('glove');
if (canvas) boot();

function bail() { canvas.remove(); }

async function boot() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const weak = conn.saveData || (navigator.deviceMemory && navigator.deviceMemory < 4);
  if (reduce || weak) return bail();

  // WebGL2 check pred stazenim 400 kB modelu
  try {
    if (!document.createElement('canvas').getContext('webgl2')) return bail();
  } catch (e) { return bail(); }

  await new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r)));
  await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 1200 }));

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync('rukavice.glb');
  } catch (e) { return bail(); }

  render(gltf.scene);
}

function render(model) {
  document.body.classList.add('g3d');           // odkryje canvas, schova <img>
  const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);

  // --- prostredi: temna hala, zlaty svetelny pas, cerveny odraz od ringu ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTexture()).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(GOLD, 2.4); key.position.set(2.5, 3, 2.2);
  const rim = new THREE.DirectionalLight(0xff5a3c, 1.6); rim.position.set(-3, -.6, -2);
  const fill = new THREE.DirectionalLight(0x9fb6d8, .35); fill.position.set(-1.5, 1.5, 2);
  scene.add(key, rim, fill);

  // --- material: neotexturovany mesh + procedurální zrno kuze ---
  const mat = new THREE.MeshPhysicalMaterial({
    color: LEATHER, roughness: .46, metalness: 0,
    clearcoat: .55, clearcoatRoughness: .38,
    sheen: .35, sheenColor: new THREE.Color(GOLD), sheenRoughness: .6,
    normalMap: grainTexture(), normalScale: new THREE.Vector2(.4, .4),
    envMapIntensity: 1.15
  });
  model.traverse(o => { if (o.isMesh) { o.material = mat; o.geometry.computeVertexNormals?.(); } });

  // --- vycentrovat a nafitovat ---
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  const radius = Math.max(size.x, size.y, size.z) * .5;
  camera.position.set(0, 0, radius / Math.tan(THREE.MathUtils.degToRad(15)) / FIT);

  const q = new URLSearchParams(location.search).get('g');
  const base = (q ? q.split(',').map(Number) : BASE_ROT).map(THREE.MathUtils.degToRad);

  let progress = 0, cur = 0, dirty = true, visible = true;
  if (window.gsap && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '.wrap', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: s => { progress = s.progress; dirty = true; }
    });
  }

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dirty = true;
  };
  addEventListener('resize', resize, { passive: true });
  resize();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }, { threshold: 0 })
    .observe(canvas);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    cur += (progress - cur) * .12;
    pivot.rotation.set(
      base[0] + Math.sin(t * .35) * .05 - cur * .35,
      base[1] + cur * 4.2 + Math.sin(t * .27) * .06,
      base[2] + Math.sin(t * .21) * .04 + cur * .5
    );
    renderer.render(scene, camera);
    dirty = false;
  });
}

// equirekt. prostredi nakreslene na 2D canvasu — zadny HDR ke stazeni
function envTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0908'; x.fillRect(0, 0, 512, 256);
  const blob = (cx, cy, r, col) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  };
  blob(340, 40, 190, '#ffd48a');     // zlaty svetelny pas nad ringem
  blob(120, 70, 120, '#5c6b86');     // studeny protisvetlo
  blob(200, 230, 220, '#a3271a');    // odraz od cervene podlahy
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// zrno kuze -> normal mapa, generovana za behu (0 B prenosu)
function grainTexture() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), d = x.createImageData(N, N), h = new Float32Array(N * N);
  for (let i = 0; i < h.length; i++) h[i] = Math.random();
  for (let p = 0; p < 2; p++) {                       // rozmazani -> mekci zrno
    const o = h.slice();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
      h[i * N + j] = (o[i * N + j] + o[i * N + (j + 1) % N] + o[((i + 1) % N) * N + j] + o[((i + N - 1) % N) * N + j]) / 4;
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const k = i * N + j, s = 5.5;
    const nx = (h[i * N + (j + 1) % N] - h[i * N + (j + N - 1) % N]) * s;
    const ny = (h[((i + 1) % N) * N + j] - h[((i + N - 1) % N) * N + j]) * s;
    const l = Math.hypot(nx, ny, 1);
    d.data[k * 4] = (nx / l * .5 + .5) * 255;
    d.data[k * 4 + 1] = (ny / l * .5 + .5) * 255;
    d.data[k * 4 + 2] = (1 / l * .5 + .5) * 255;
    d.data[k * 4 + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  return t;
}
