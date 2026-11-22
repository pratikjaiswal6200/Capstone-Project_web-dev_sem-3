import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mapLocations } from '../shared/sample.js';

const field = '#557a3b';
const foliage = ['#456036', '#526d38', '#667f43', '#738751', '#3c5936'];
const materials = new Map();
const unitBox = new THREE.BoxGeometry();
function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85 }));
  return materials.get(color);
}
function box(parent, color, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(unitBox, material(color));
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = h > .3;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function building(scene, { x, z, w, d, floors, dome = false }) {
  const h = floors * 2.15;
  const structure = new THREE.Group();
  structure.position.set(x, 0, z);
  scene.add(structure);
  box(structure, '#7a776c', 0, .14, 0, w + 1.1, .28, d + 1.1);
  box(structure, '#ddd0ad', 0, h / 2, 0, w, h, d);
  box(structure, '#e7dec6', 0, h + .13, 0, w + .7, .3, d + .62);
  box(structure, '#a7a298', 0, h + .32, 0, w - .7, .11, d - .6);
  for (const side of [-1, 1]) {
    box(structure, '#dcd4c2', 0, h + .54, side * d / 2, w + .45, .45, .25);
    box(structure, '#dcd4c2', side * w / 2, h + .54, 0, .25, .45, d);
    for (let floor = 0; floor < floors; floor++) {
      const y = floor * 2.15 + 1.24;
      box(structure, '#c4b79c', 0, y - .71, side * (d / 2 + .08), w, .13, .18);
      for (let col = 1.3; col < w - .6; col += 1.85) {
        box(structure, col % 3 < 1 ? '#3d5460' : '#587078', col - w / 2, y, side * (d / 2 + .01), 1.24, .95, .08);
        box(structure, '#b9bcab', col - w / 2, y, side * (d / 2 + .055), .055, .95, .025);
      }
      for (let col = 1.4; col < d - .6; col += 1.9) {
        box(structure, '#50676b', side * (w / 2 + .01), y, col - d / 2, .08, 1, 1.28);
      }
    }
  }
  for (let i = -1; i <= 1; i++) {
    box(structure, '#777b76', i * w / 3, h + .57, -d / 4, 2.1, .58, 1.4);
    box(structure, '#b1b1a6', i * w / 3, h + .89, -d / 4, 2.2, .16, 1.46);
  }
  if (dome) {
    box(structure, '#dfd5bc', 0, h / 2, d / 2 + 1.1, 5.4, h + .7, 2.7);
    for (const x of [-2, -.67, .67, 2]) box(structure, '#eee4cb', x, h / 2, d / 2 + 2.65, .23, h, .31);
    box(structure, '#394a4c', 0, 1.41, d / 2 + 2.46, 3, 2.8, .2);
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.25, 1, 24), material('#ddd0ad'));
    cupola.position.set(0, h + .9, d / 2);
    structure.add(cupola);
    const roof = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), material('#d7c7a2'));
    roof.scale.y = .55;
    roof.position.set(0, h + 1.38, d / 2);
    roof.castShadow = true;
    structure.add(roof);
  }
}

function buildTerrain(scene) {
  box(scene, '#667b4e', 0, -.41, 0, 320, .8, 240);
  box(scene, '#869059', 0, -.025, 0, 111, .05, 84);
  box(scene, '#44494b', 0, .018, 42, 220, .05, 7);
  box(scene, '#8d8c80', 0, .023, 37.9, 109, .055, 1.6);
  box(scene, '#666763', -28, .02, 23, 5, .055, 30);
  box(scene, '#666763', -2, .02, 21, 48, .055, 4);
  box(scene, '#aeaa90', -1, .023, 7, 4, .06, 29);
  box(scene, '#b7b295', 8, .023, 4, 27, .062, 2.4);
  box(scene, '#9d987f', 18, .023, -16, 44, .06, 2.3);
  box(scene, '#96a272', -13, .033, 21, 14, .065, 9);
  box(scene, '#759353', 0, .04, -1, 12, .07, 10);
  box(scene, field, 22, .046, 29, 32, .08, 13);
  for (let i = 0; i < 8; i++) box(scene, i % 2 ? '#5a803d' : '#668a47', 8 + i * 4, .093, 29, 4, .01, 13);
  for (const z of [23, 35]) box(scene, '#d6debd', 22, .107, z, 30, .02, .13);
  for (const x of [7, 22, 37]) box(scene, '#d6debd', x, .107, 29, .13, .02, 12);
  const circle = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.16, 40), material('#d6debd'));
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(22, .12, 29);
  scene.add(circle);

  building(scene, { x: -20, z: 9, w: 24, d: 13, floors: 4, dome: true });
  building(scene, { x: 9, z: -9, w: 23, d: 11, floors: 4 });
  building(scene, { x: 25, z: 9, w: 18, d: 12, floors: 4 });
  building(scene, { x: -37, z: -12, w: 14, d: 9, floors: 4 });
  building(scene, { x: 36, z: -16, w: 13, d: 10, floors: 3 });
  building(scene, { x: -38, z: 18, w: 10, d: 11, floors: 3 });
  for (const x of [-28, -22]) box(scene, '#d6c8a8', x, 1.3, 34, .65, 2.6, .7);
  box(scene, '#d6c8a8', -25, 2.65, 34, 6.6, .47, .67);
  for (let x = -81; x < 84; x += 6) {
    box(scene, '#c8b987', x, .051, 42, 2.1, .016, .08);
  }

  let seed = 147;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }
  const trees = [];
  for (let index = 0; index < 520; index++) {
    let x = random() * 212 - 106;
    let z = random() * 130 - 82;
    if (Math.abs(x) < 48 && z > -21 && z < 40) continue;
    if (z > 37 && z < 47) continue;
    trees.push([x, z, .65 + random() * 1.3, random()]);
  }
  for (let index = 0; index < 20; index++) {
    trees.push([-49 + index * 5.1, -22, 1.05, random()]);
    trees.push([-49 + index * 5.1, 36.3, .62, random()]);
  }
  for (let index = 0; index < 9; index++) trees.push([-9 + index * 2.5, 15, .67, random()]);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material('#ffffff'), trees.length);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.10, .17, 1.7, 5), material('#66523b'), trees.length);
  const dummy = new THREE.Object3D();
  trees.forEach(([x, z, size, variance], i) => {
    dummy.position.set(x, 1.62 * size, z);
    dummy.scale.set(size, size * 1.24, size * .9);
    dummy.rotation.y = variance * Math.PI;
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
    crowns.setColorAt(i, new THREE.Color(foliage[Math.floor(variance * foliage.length)]));
    dummy.position.y = size * .8;
    dummy.scale.setScalar(size);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  crowns.castShadow = trunks.castShadow = true;
  crowns.receiveShadow = true;
  scene.add(crowns, trunks);

  for (let index = 0; index < 14; index++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), material(index % 2 ? '#6c8060' : '#758363'));
    hill.scale.set(24 + random() * 16, 3 + random() * 12, 12 + random() * 17);
    hill.position.set(index * 25 - 151, -2, -83 - random() * 36);
    scene.add(hill);
  }

  for (let i = 0; i < 18; i++) {
    const x = -47 + i * 5.5;
    const z = i % 2 ? 41 : 43;
    box(scene, ['#c6c9c7', '#606b77', '#906057', '#dedcd0'][i % 4], x, .32, z, 2.15, .55, .92);
    box(scene, '#656f6f', x - .13, .69, z, 1.03, .28, .72);
  }
}

export function createCampusModel(element, onFrame) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  element.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#aebcc2');
  scene.fog = new THREE.FogExp2('#b4c0c0', .004);
  const camera = new THREE.PerspectiveCamera(38, 1, .5, 420);
  const getOverview = () => element.clientWidth / element.clientHeight < 1.3
    ? new THREE.Vector3(99, 109, 157)
    : new THREE.Vector3(68, 69, 104);
  const homeTarget = new THREE.Vector3(0, 0, 4);
  camera.position.copy(getOverview());
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(homeTarget);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * .47;
  controls.minPolarAngle = .17;
  controls.minDistance = 17;
  controls.maxDistance = 235;
  controls.update();
  scene.add(new THREE.HemisphereLight('#fce9ce', '#8b9984', 2.18));
  const sun = new THREE.DirectionalLight('#fff2d9', 2.3);
  sun.position.set(-37, 66, 19);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 58, bottom: -62, near: 1, far: 165 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.normalBias = .063;
  scene.add(sun);
  buildTerrain(scene);
  scene.updateMatrixWorld(true);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = element;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  let move;
  let dirty = true;
  controls.addEventListener('change', () => { dirty = true; });
  controls.addEventListener('start', () => { move = undefined; });
  const preferredMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function moveTo(position, target) {
    move = { position, target, started: performance.now(), from: camera.position.clone(), fromTarget: controls.target.clone() };
  }
  const coordinates = mapLocations.map(place => new THREE.Vector3(...place.world));
  renderer.setAnimationLoop(time => {
    if (move) {
      const progress = preferredMotion.matches ? 1 : Math.min((time - move.started) / 780, 1);
      const easing = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(move.from, move.position, easing);
      controls.target.lerpVectors(move.fromTarget, move.target, easing);
      if (progress >= 1) move = undefined;
    }
    controls.update();
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    onFrame(coordinates.map(position => {
      const view = position.clone().project(camera);
      return { x: (view.x + 1) * 50, y: (1 - view.y) * 50, visible: view.z < 1 && Math.abs(view.x) < .93 && Math.abs(view.y) < .90 };
    }));
  });
  const resizeObserver = new ResizeObserver(() => { resize(); dirty = true; });
  resizeObserver.observe(element);

  return {
    focus(place) {
      const target = new THREE.Vector3(place.world[0], 2, place.world[2]);
      const distance = element.clientWidth / element.clientHeight < 1.3 ? 1.4 : 1;
      moveTo(target.clone().add(new THREE.Vector3(22, 24, 32).multiplyScalar(distance)), target);
    },
    reset: () => moveTo(getOverview(), homeTarget),
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
      moveTo(controls.target.clone().add(offset), controls.target.clone());
    },
    destroy() {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse(object => {
        if (object.geometry && object.geometry !== unitBox) object.geometry.dispose();
        if (object.isInstancedMesh) object.dispose();
      });
      sun.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
