// Boxing Club Ostrava — 3D rukavice v hero.
// Progresivni vrstva: bez WebGL / bez modulu / reduced-motion zustava 2D <img id="glove">.
// Ladeni rotace bez commitu:  ?g=x,y,z  (stupne), napr. ?g=-8,140,4
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE_ROT = [-6, 150, 6];          // vychozi natoceni modelu ve stupnich
const FIT = 0.74;                       // kolik z vysky ramecku model zabere (zbytek je rezerva na rotaci)
// Na mobilu je otaceni modelu hlavni pohyb. Na desktopu rizeni prebira window.gloveRig,
// ktery plni hero timeline - model zatáčí do oblouku misto toceni na miste.
const SPIN = matchMedia('(max-width: 700px)').matches ? 4.2 : 0;
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
  const grain = grainTexture();
  const skin = leatherTexture();
  const mat = new THREE.MeshPhysicalMaterial({
    map: skin.tex, color: 0xffffff, roughness: .48, metalness: 0,
    roughnessMap: grain, clearcoat: .55, clearcoatRoughness: .34,
    sheen: .35, sheenColor: new THREE.Color(GOLD), sheenRoughness: .6,
    normalMap: grain, normalScale: new THREE.Vector2(.7, .7),
    envMapIntensity: 1.2
  });

  // Manzeta, zlaty pruh a logo se resi v shaderu, protoze UV mapu toho modelu neznam.
  // Ladi se z URL:  ?cuff=-0.30,-0.62   ?logo=cx,cy,velikost,osa   (osa 0=+Z 1=-Z 2=+X 3=-X)
  const qs = new URLSearchParams(location.search);
  const num = (k, d) => { const a = (qs.get(k) || '').split(',').map(Number); return a.length === d.length && a.every(n => !isNaN(n)) ? a : d; };
  const cuff = num('cuff', [-.30, -.62]);
  const lg = num('logo', [0, .18, .62, 0]);

  const logoTex = new THREE.TextureLoader().load('logo.png',
    t => { t.colorSpace = THREE.SRGBColorSpace; mat.needsUpdate = false; }, undefined, () => { });

  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLogo = { value: logoTex };
    sh.uniforms.uLogoRect = { value: new THREE.Vector4(lg[0], lg[1], lg[2], lg[3]) };
    sh.uniforms.uCuff = { value: new THREE.Vector2(cuff[0], cuff[1]) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec3 vLocN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position; vLocN = normalize(normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLoc; varying vec3 vLocN;
        uniform sampler2D uLogo; uniform vec4 uLogoRect; uniform vec2 uCuff;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        // cerna manzeta se zlatym pruhem - rukavice neni jednolite cervena
        float cf = smoothstep(uCuff.x, uCuff.y, vLoc.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.050,0.044,0.046), cf * 0.94);
        float mid = (uCuff.x + uCuff.y) * 0.5;
        float band = smoothstep(uCuff.x, mid, vLoc.y) * (1.0 - smoothstep(mid, uCuff.y, vLoc.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72,0.54,0.19), band * 0.8);

        // logo promitnute rovinne z prednI strany, takze nezalezi na UV mape
        float ax = uLogoRect.w;
        vec2 pp = (ax < 1.5) ? vLoc.xy : vLoc.zy;
        float facing = (ax < 1.5) ? vLocN.z : vLocN.x;
        if (ax == 1.0 || ax == 3.0) { pp.x = -pp.x; facing = -facing; }
        vec2 duv = (pp - uLogoRect.xy) / uLogoRect.z + 0.5;
        if (duv.x > 0.0 && duv.x < 1.0 && duv.y > 0.0 && duv.y < 1.0 && facing > 0.12) {
          vec4 lgc = texture2D(uLogo, vec2(duv.x, 1.0 - duv.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, lgc.rgb, lgc.a * smoothstep(0.12, 0.42, facing));
        }`);
  };
  model.traverse(o => { if (o.isMesh) { o.material = mat; o.geometry.computeVertexNormals?.(); } });

  // --- vycentrovat a nafitovat ---
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  const fit = () => {                     // nafitovat na vysku ramecku, ne na nejvetsi rozmer
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dh = (size.y / 2 / FIT) / half;
    const dw = (Math.max(size.x, size.z) / 2 / .62) / (half * camera.aspect);
    camera.position.set(0, 0, Math.max(dh, dw));
  };

  const q = new URLSearchParams(location.search).get('g');
  const base = (q ? q.split(',').map(Number) : BASE_ROT).map(THREE.MathUtils.degToRad);

  let progress = 0, cur = 0, dirty = true, visible = true;
  const pose = { y: 0, p: 0, r: 0 };
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
    fit();
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
    const rig = window.gloveRig || { yaw: 0, pitch: 0, roll: 0 };
    pose.y += (rig.yaw - pose.y) * .09;      // dojezd, aby zatacka nebyla hranata
    pose.p += (rig.pitch - pose.p) * .09;
    pose.r += (rig.roll - pose.r) * .09;
    pivot.rotation.set(
      base[0] + pose.p + Math.sin(t * .35) * .05 - cur * .35,
      base[1] + pose.y + cur * SPIN + Math.sin(t * .27) * .06,
      base[2] + pose.r + Math.sin(t * .21) * .04 + cur * .25
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
  blob(330, 34, 200, '#fff0cf');     // hlavni lampa nad ringem
  blob(430, 74, 120, '#ffb765');     // teply bocni zdroj
  blob(110, 62, 140, '#6f86ad');     // studene protisvetlo z okna
  blob(20, 120, 100, '#2f4f7a');     // modry dosvit
  blob(210, 236, 230, '#b02c1c');    // odraz od cervene podlahy
  blob(470, 210, 130, '#4a1d12');    // tmavy kout, aby odlesk nebyl vsude stejny
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kuze rukavice: mramorovany podklad kreslen za behu, takze se nic nestahuje.
function leatherTexture() {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  x.fillStyle = '#8a1f16'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 4200; i++) {                 // mramorovani a poskozeni
    const r = 8 + Math.random() * 46, a = .025 + Math.random() * .045;
    x.fillStyle = Math.random() < .55 ? `rgba(28,4,2,${a})` : `rgba(255,150,124,${a * .6})`;
    x.beginPath(); x.arc(Math.random() * N, Math.random() * N, r, 0, 6.283); x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex };
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
