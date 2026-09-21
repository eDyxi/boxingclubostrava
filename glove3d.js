// Boxing Club Ostrava — 3D rukavice v hero.
// Progresivni vrstva: bez WebGL / bez modulu / reduced-motion zustava 2D <img id="glove">.
// Ladeni rotace bez commitu:  ?g=x,y,z  (stupne), napr. ?g=-8,140,4
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE_ROT = [0, 0, 0];          // vychozi natoceni modelu ve stupnich
const GOLD = 0xd9a441;                  // barva hlavniho svetla
const FIT = 0.74;                       // kolik z vysky ramecku model zabere (zbytek je rezerva na rotaci)
// Na mobilu je otaceni modelu hlavni pohyb. Na desktopu rizeni prebira window.gloveRig,
// ktery plni hero timeline - model zatáčí do oblouku misto toceni na miste.
const SPIN = matchMedia('(max-width: 700px)').matches ? 4.2 : 0;

const canvas = document.getElementById('g3d');
const DBG = new URLSearchParams(location.search).has('3d');   // ?3d=1 jen zapina vypis stavu

function say(t) { const d = document.getElementById('diag'); if (d) d.textContent = '3D: ' + t; }
function bail(why) { if (canvas) canvas.remove(); document.body.classList.remove('g3d'); if (DBG) say(why); }

if (canvas) boot();

async function boot() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const weak = conn.saveData || (navigator.deviceMemory && navigator.deviceMemory < 4);
  if (reduce || weak) return bail('reduced-motion nebo uspornu rezim');

  // WebGL2 check pred stazenim 400 kB modelu
  try {
    if (!document.createElement('canvas').getContext('webgl2')) return bail('neni WebGL2');
  } catch (e) { return bail('WebGL2 selhal'); }

  await new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r)));
  await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 1200 }));

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync('rukavice.glb');
  } catch (e) { return bail('model se nenacetl'); }

  // Kdyz cokoli ve stavbe sceny spadne, musi se vratit 2D obrazek - jinak
  // zustane odkryty prazdny canvas a v hero neni rukavice zadna.
  try { render(gltf.scene); }
  catch (e) { console.error(e); bail('vyjimka: ' + e.message); }
}

function render(model) {
  document.body.classList.add('g3d');           // odkryje canvas, aby mel rozmery
  const dpr = Math.min((devicePixelRatio || 1) * (innerWidth < 700 ? 1 : 1.9), innerWidth < 700 ? 1.5 : 3.6);
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
  // Model prichazi s vlastni diffuse texturou, takze se barva ani manzeta neresi.
  // Doladi se jen povrch a promitne logo klubu.
  const qs = new URLSearchParams(location.search);
  const num = (k, d) => { const a = (qs.get(k) || '').split(',').map(Number); return a.length === d.length && a.every(n => !isNaN(n)) ? a : d; };
  const lg = qs.get('logo') === 'off' ? null : num('logo', [.10, .22, .9, 0]);   // ?logo=off vypne, ?logo=cx,cy,velikost,osa ladi

  const logoTex = new THREE.TextureLoader().load('logo-glove.png',
    t => { t.colorSpace = THREE.SRGBColorSpace; }, undefined, () => { });

  model.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    m.roughness = .62; m.metalness = 0; m.envMapIntensity = 1.0;
    if (m.map) { m.map.anisotropy = 4; m.map.colorSpace = THREE.SRGBColorSpace; }
    // logo promitnute rovinne z prednI strany - nezavisle na UV mape modelu
    if (lg) m.onBeforeCompile = (sh) => {
      sh.uniforms.uLogo = { value: logoTex };
      sh.uniforms.uLogoRect = { value: new THREE.Vector4(lg[0], lg[1], lg[2], lg[3]) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLoc; varying vec3 vLocN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position; vLocN = normalize(normal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vLoc; varying vec3 vLocN;
          uniform sampler2D uLogo; uniform vec4 uLogoRect;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          float ax = uLogoRect.w;
          vec2 pp = (ax < 1.5) ? vLoc.xy : vLoc.zy;
          float facing = (ax < 1.5) ? vLocN.z : vLocN.x;
          if (ax == 1.0 || ax == 3.0) { pp.x = -pp.x; facing = -facing; }
          vec2 duv = (pp - uLogoRect.xy) / uLogoRect.z + 0.5;
          if (duv.x > 0.0 && duv.x < 1.0 && duv.y > 0.0 && duv.y < 1.0 && facing > 0.10) {
            vec4 lgc = texture2D(uLogo, vec2(duv.x, duv.y));   // bez prevraceni - jinak bylo vzhuru nohama
            diffuseColor.rgb = mix(diffuseColor.rgb, lgc.rgb, smoothstep(0.35, 0.85, lgc.a) * smoothstep(0.10, 0.40, facing));
          }`);
    };
    m.needsUpdate = true;
  });

  // --- vycentrovat a nafitovat ---
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  let baseZ = 5;
  const fit = () => {                     // nafitovat na vysku ramecku, ne na nejvetsi rozmer
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dh = (size.y / 2 / FIT) / half;
    const dw = (Math.max(size.x, size.z) / 2 / .62) / (half * camera.aspect);
    baseZ = Math.max(dh, dw);
    camera.position.set(0, 0, baseZ);
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
    const box = canvas.getBoundingClientRect();
    const w = Math.round(box.width) || canvas.clientWidth || 320;
    const h = Math.round(box.height) || canvas.clientHeight || Math.round(w * 4 / 3);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    fit();                                   // fit se musi provest vzdy, i na nahradnich rozmerech
    dirty = true;
  };
  addEventListener('resize', resize, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }, { threshold: 0 })
    .observe(canvas);

  // Zkusebni snimek. Kdyz se nevykreslil ani jeden trojuhelnik (spatny shader,
  // prazdna scena, ztraceny kontext), vratime se k 2D obrazku misto prazdna.
  renderer.render(scene, camera);
  if (!renderer.info.render.triangles) {
    renderer.dispose();
    return bail('nevykreslen zadny trojuhelnik');
  }
  say('ok, ' + renderer.info.render.triangles + ' trojuhelniku');

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
    // Pri silnem naklonu je rukavice sirsi nez ramecek - kamera o kus couvne,
    // aby se nic neorizlo.
    const cr = Math.abs(Math.cos(pose.r)), sr = Math.abs(Math.sin(pose.r));
    const visH = 2 * baseZ * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), visW = visH * camera.aspect;
    const need = Math.max((size.x * cr + size.y * sr) / (visW * .96), (size.x * sr + size.y * cr) / (visH * .9));
    camera.position.z = baseZ * Math.max(1, need);
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
  blob(256, 10, 320, '#f2ece6');     // siroke mekke svetlo shora
  blob(80, 96, 190, '#8f9aab');       // studeny vyplnovy odraz zleva
  blob(440, 110, 170, '#caa98c');     // teply dosvit zprava
  blob(256, 250, 260, '#3a2320');     // tmavsi podlaha, aby spodek nesvitil
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
