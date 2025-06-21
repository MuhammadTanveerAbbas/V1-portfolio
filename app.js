import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/DRACOLoader.js";
import { gsap } from "https://cdn.skypack.dev/gsap";

// Smooth nav scroll
document.querySelectorAll("nav a[href^='#']").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    const offset = document.querySelector("header").offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 14;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById("container3D").appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.3));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(500, 500, 500);
scene.add(dirLight);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

let model = null;
let mixer = null;
const clock = new THREE.Clock();
let idleClock = 0;
let pulseClock = 0;

const scrollRange = document.body.scrollHeight - window.innerHeight;
const screenWidthWorldUnits = 6;

const isMobile = window.innerWidth < 768;

const sectionMap = {
  banner: { pos: [0, -1, 0], rot: [0, 1.5, 0] },
  intro: { pos: [1, -1, -5], rot: [0.5, -0.5, 0] },
  description: { pos: [-1, -1, -5], rot: [0, 0.5, 0] },
  contact: { pos: [0.8, -1, 0], rot: [0.3, -0.5, 0] },
};

const tween = gsap.timeline({ defaults: { duration: 2, ease: "power1.out" } });

function tweenTo(sectionId) {
  if (!model || !sectionMap[sectionId]) return;
  const { pos, rot } = sectionMap[sectionId];
  tween.clear();
  tween.to(model.position, { x: pos[0], y: pos[1], z: pos[2] }, 0);
  tween.to(model.rotation, { x: rot[0], y: rot[1], z: rot[2] }, 0);
}

function onSectionScroll() {
  let currentSection = null;
  document.querySelectorAll(".section").forEach((sec) => {
    if (sec.getBoundingClientRect().top <= window.innerHeight * 0.33)
      currentSection = sec.id;
  });
  if (currentSection) tweenTo(currentSection);
}

window.addEventListener("scroll", onSectionScroll, { passive: true });

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  idleClock += delta;
  pulseClock += delta;

  dirLight.intensity = 1 + Math.sin(pulseClock * 3) * 0.1;
  if (mixer) mixer.update(delta);

  if (model) {
    const scrollPercent = window.scrollY / scrollRange;
    const targetX =
      screenWidthWorldUnits - scrollPercent * 2 * screenWidthWorldUnits;

    model.position.x += (targetX - model.position.x) * 0.05;
    model.position.y +=
      (Math.cos(idleClock * 0.8) * 0.2 - model.position.y) * 0.05;
    model.rotation.y += delta * 0.5;
    model.lookAt(camera.position);
  }

  renderer.render(scene, camera);
}
animate();

// Lazy load 3D Model
new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(({ isIntersecting }) => {
      if (isIntersecting) {
        loader.load("homelander.glb", (gltf) => {
          model = gltf.scene;

          // Center and scale
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);

          // Responsive scaling
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = isMobile ? 1.5 : 3;
          model.scale.setScalar(scale / maxDim);

          scene.add(model);

          if (gltf.animations.length) {
            mixer = new THREE.AnimationMixer(model);
            mixer.clipAction(gltf.animations[0]).play();
          }

          onSectionScroll(); // position sync
        });

        observer.disconnect();
      }
    });
  },
  { rootMargin: "0px 0px -20% 0px" }
).observe(document.getElementById("container3D"));
