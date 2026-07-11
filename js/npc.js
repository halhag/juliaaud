import * as THREE from './lib/three.module.js';
import { createCharacter } from './character.js';

// Baron von Patch: a silly, untrustworthy "businessman" with an eye patch.
// He paces near the path until Julia Aud comes close, then engages her in
// conversation (handled by dialogue.js / main.js). If she gives him coins he
// walks off to his "investment tree" and is never seen again.
export function createBaron(scene) {
  const character = createCharacter({
    shirtColor: 0x7c5cbf, // "business" purple
    pantsColor: 0x4a3b2a,
    hairColor: 0x9a9a9a,
    bow: false,
    eyePatch: true,
    hat: 'tophat',
    mustache: true,
  });
  character.root.name = 'BaronVonPatch';
  scene.add(character.root);

  // Pacing route: a short stroll beside the path, in sight of the start spot
  const paceA = new THREE.Vector3(4, 0, 3);
  const paceB = new THREE.Vector3(6.5, 0, 3);
  character.root.position.copy(paceA);

  const PACE_SPEED = 1.1;
  const LEAVE_SPEED = 2.6;

  // States: 'pacing' | 'talking' | 'huffy' | 'leaving' | 'gone'
  let state = 'pacing';
  let paceTarget = paceB;
  let leaveTarget = null;
  let hasBeenTalkedTo = false; // must exit re-engage radius before re-triggering

  function faceToward(x, z) {
    const dx = x - character.root.position.x;
    const dz = z - character.root.position.z;
    character.root.rotation.y = Math.atan2(dx, dz);
  }

  function moveToward(target, speed, delta) {
    const pos = character.root.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    faceToward(target.x, target.z);
    const step = Math.min(speed * delta, dist);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    return false;
  }

  function update(delta) {
    switch (state) {
      case 'pacing': {
        if (moveToward(paceTarget, PACE_SPEED, delta)) {
          paceTarget = paceTarget === paceB ? paceA : paceB;
        }
        character.update(delta, true);
        break;
      }
      case 'talking':
      case 'huffy': {
        character.update(delta, false);
        break;
      }
      case 'leaving': {
        if (leaveTarget && moveToward(leaveTarget, LEAVE_SPEED, delta)) {
          state = 'gone';
          scene.remove(character.root);
        } else {
          character.update(delta, true);
        }
        break;
      }
      case 'gone':
        break;
    }
  }

  return {
    root: character.root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking(juliaPos) {
      state = 'talking';
      hasBeenTalkedTo = true;
      faceToward(juliaPos.x, juliaPos.z);
    },
    // She said no politely -- back to pacing; can re-engage later
    resumePacing() {
      if (state === 'talking') state = 'pacing';
    },
    // She offered zero coins -- he stands there offended, never engages again
    goHuffy() {
      state = 'huffy';
      character.root.rotation.y += Math.PI; // turns his back on her
    },
    // She gave coins -- off to the "investment tree", never to return
    leaveForever() {
      state = 'leaving';
      // Heads off behind the village houses, then vanishes
      leaveTarget = new THREE.Vector3(-15, 0, -13);
    },
    update,
  };
}

// The castle gate guard: stands at his post outside the gate until the
// release tax is paid, then steps aside.
export function createGuard(scene, position) {
  const character = createCharacter({
    shirtColor: 0xff8c1a, // the Orange King's livery
    pantsColor: 0x5a5a5a,
    hairColor: 0x3a2a1a,
    bow: false,
    hat: 'helmet',
  });
  character.root.name = 'CastleGuard';
  character.root.position.copy(position);
  character.root.rotation.y = 0; // faces +z, out toward the road
  scene.add(character.root);

  // A guard needs a spear: planted at his side, held in his right hand
  const spearGroup = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.7 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 8), shaftMat);
  shaft.position.y = 0.95;
  shaft.castShadow = true;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 8), tipMat);
  tip.position.y = 2.02;
  tip.castShadow = true;
  spearGroup.add(shaft, tip);
  spearGroup.position.set(-0.5, 0, 0.1);
  character.root.add(spearGroup);

  // States: 'guarding' | 'talking' | 'aside'
  let state = 'guarding';
  let asideTarget = null;
  let hasBeenTalkedTo = false;

  function faceToward(x, z) {
    const dx = x - character.root.position.x;
    const dz = z - character.root.position.z;
    character.root.rotation.y = Math.atan2(dx, dz);
  }

  function update(delta) {
    if (state === 'aside' && asideTarget) {
      const pos = character.root.position;
      const dx = asideTarget.x - pos.x;
      const dz = asideTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        faceToward(asideTarget.x, asideTarget.z);
        const step = Math.min(1.6 * delta, dist);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        character.update(delta, true);
        return;
      }
      asideTarget = null;
      character.root.rotation.y = 0; // back to watching the road
    }
    character.update(delta, false);
  }

  return {
    root: character.root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking(juliaPos) {
      state = 'talking';
      hasBeenTalkedTo = true;
      faceToward(juliaPos.x, juliaPos.z);
    },
    resumeGuarding() {
      if (state === 'talking') state = 'guarding';
    },
    // Tax paid: steps aside from the gate and stops caring
    stepAside() {
      state = 'aside';
      asideTarget = character.root.position.clone().add(new THREE.Vector3(5, 0, 1));
    },
    update,
  };
}

// Wizzo the wizard: stands outside his very tall, very thin tower shop.
export function createWizard(scene, position, facing = 0) {
  const character = createCharacter({
    shirtColor: 0x4a3f8f, // deep wizardly blue
    pantsColor: 0x37306b,
    hairColor: 0xf2f2f2,
    bow: false,
    hat: 'wizard',
    beard: true,
  });
  character.root.name = 'Wizzo';
  character.root.position.copy(position);
  character.root.rotation.y = facing;
  scene.add(character.root);

  // States: 'idle' | 'talking'
  let state = 'idle';
  let hasBeenTalkedTo = false;

  function faceToward(x, z) {
    const dx = x - character.root.position.x;
    const dz = z - character.root.position.z;
    character.root.rotation.y = Math.atan2(dx, dz);
  }

  function update(delta) {
    character.update(delta, false);
  }

  return {
    root: character.root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking(juliaPos) {
      state = 'talking';
      hasBeenTalkedTo = true;
      faceToward(juliaPos.x, juliaPos.z);
    },
    resumeIdle() {
      if (state === 'talking') state = 'idle';
    },
    update,
  };
}

// A generic quest villager: stands near their hamlet, idles, talks.
export function createVillager(scene, name, position, facing, characterOpts) {
  const character = createCharacter(characterOpts);
  character.root.name = name;
  character.root.position.copy(position);
  character.root.rotation.y = facing;
  scene.add(character.root);

  let state = 'idle'; // 'idle' | 'talking'
  let hasBeenTalkedTo = false;

  function faceToward(x, z) {
    const dx = x - character.root.position.x;
    const dz = z - character.root.position.z;
    character.root.rotation.y = Math.atan2(dx, dz);
  }

  return {
    root: character.root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking(juliaPos) {
      state = 'talking';
      hasBeenTalkedTo = true;
      faceToward(juliaPos.x, juliaPos.z);
    },
    resumeIdle() {
      if (state === 'talking') state = 'idle';
    },
    update(delta) {
      character.update(delta, false);
    },
  };
}

// Waffles: a very round, very orange cat. Lost somewhere south of the road
// until found, then teleports home to Mrs. Bramble's side.
export function createCat(scene, position) {
  const root = new THREE.Group();
  root.name = 'Waffles';
  root.position.copy(position);

  const orangeFurMat = new THREE.MeshStandardMaterial({ color: 0xe8853a, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), orangeFurMat);
  body.scale.set(1, 0.85, 1.25);
  body.position.y = 0.3;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), orangeFurMat);
  head.position.set(0, 0.58, 0.32);
  head.castShadow = true;
  root.add(head);

  const earGeo = new THREE.ConeGeometry(0.07, 0.14, 6);
  [-0.11, 0.11].forEach((ex) => {
    const ear = new THREE.Mesh(earGeo, orangeFurMat);
    ear.position.set(ex, 0.78, 0.3);
    root.add(ear);
  });

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.3 });
  [-0.08, 0.08].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    eye.position.set(ex, 0.6, 0.52);
    root.add(eye);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.5, 6), orangeFurMat);
  tail.position.set(0, 0.5, -0.42);
  tail.rotation.x = -0.7;
  root.add(tail);

  scene.add(root);

  let state = 'lost'; // 'lost' | 'talking' | 'home'
  let hasBeenTalkedTo = false;
  let idleTime = 0;

  return {
    root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking(juliaPos) {
      const prev = state;
      state = 'talking';
      hasBeenTalkedTo = true;
      const dx = juliaPos.x - root.position.x;
      const dz = juliaPos.z - root.position.z;
      root.rotation.y = Math.atan2(dx, dz);
      this._prevState = prev;
    },
    resumeIdle() {
      if (state === 'talking') state = this._prevState === 'home' ? 'home' : 'lost';
    },
    goHome(homePos) {
      state = 'home';
      this._prevState = 'home';
      root.position.set(homePos.x + 1.2, 0, homePos.z + 0.6);
    },
    update(delta) {
      idleTime += delta;
      tail.rotation.z = Math.sin(idleTime * 3) * 0.3;
      body.position.y = 0.3 + Math.sin(idleTime * 2) * 0.015;
    },
  };
}

// A tired old dragon, lying in the grass. Excellent at talking about the
// glory days. Does absolutely nothing else, ever, by design.
export function createDragon(scene, position) {
  const root = new THREE.Group();
  root.name = 'TiredOldDragon';
  root.position.copy(position);

  const scaleMat = new THREE.MeshStandardMaterial({ color: 0x7a9b6d, roughness: 0.85 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xcfc79a, roughness: 0.9 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x5a7a52, roughness: 0.8, side: THREE.DoubleSide });

  // Big lazy body, lying flat
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 12), scaleMat);
  body.scale.set(1.5, 0.75, 1);
  body.position.y = 1.0;
  body.castShadow = true;
  root.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.45, 12, 10), bellyMat);
  belly.scale.set(1.4, 0.6, 0.9);
  belly.position.y = 0.75;
  root.add(belly);

  // Neck drooping forward, head resting near the ground (tired)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 2.2, 10), scaleMat);
  neck.position.set(2.4, 1.0, 0);
  neck.rotation.z = 1.15; // mostly horizontal
  neck.castShadow = true;
  root.add(neck);
  const headGroup = new THREE.Group();
  headGroup.position.set(3.6, 0.75, 0);
  root.add(headGroup);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), scaleMat);
  head.castShadow = true;
  headGroup.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.55), scaleMat);
  snout.position.set(0.6, -0.12, 0);
  headGroup.add(snout);
  // Sleepy half-closed eyes: lids over small eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.3 });
  [-0.28, 0.28].forEach((ez) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eye.position.set(0.28, 0.22, ez);
    headGroup.add(eye);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), scaleMat);
    lid.position.set(0.28, 0.26, ez);
    headGroup.add(lid);
  });
  // Little horns
  [-0.25, 0.25].forEach((hz) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), hornMat);
    horn.position.set(-0.15, 0.55, hz);
    horn.rotation.x = hz * 0.5;
    headGroup.add(horn);
  });
  // Nostrils (where the smoke of former glory comes from)
  const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x3a4a35, roughness: 1 });
  [-0.14, 0.14].forEach((nz) => {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), nostrilMat);
    nostril.position.set(1.05, -0.02, nz);
    headGroup.add(nostril);
  });

  // Folded, slightly ragged wings
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 3), wingMat);
    wing.scale.z = 0.15;
    wing.position.set(-0.5, 1.9, side * 0.9);
    wing.rotation.z = 0.6;
    wing.rotation.x = side * 0.35;
    wing.castShadow = true;
    root.add(wing);
  });

  // Tail curling around the body
  let prevPos = new THREE.Vector3(-2.2, 0.7, 0.3);
  const tailSegments = [
    { len: 1.6, angle: 0.5 },
    { len: 1.3, angle: 1.4 },
    { len: 1.0, angle: 2.2 },
  ];
  tailSegments.forEach(({ len, angle }, i) => {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 - i * 0.09, 0.42 - i * 0.09, len, 8),
      scaleMat
    );
    const dir = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle));
    const segPos = prevPos.clone().addScaledVector(dir, len / 2);
    seg.position.copy(segPos);
    seg.rotation.z = Math.PI / 2;
    seg.rotation.y = -angle;
    seg.castShadow = true;
    root.add(seg);
    prevPos = prevPos.clone().addScaledVector(dir, len);
  });
  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 6), hornMat);
  tailTip.position.copy(prevPos);
  tailTip.rotation.z = -Math.PI / 2 - 0.5;
  root.add(tailTip);

  // Stubby legs, splayed out (he is NOT getting up)
  [
    [1.0, 1.1],
    [1.0, -1.1],
    [-1.5, 1.1],
    [-1.5, -1.1],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), scaleMat);
    leg.scale.set(1.2, 0.5, 0.7);
    leg.position.set(lx, 0.3, lz);
    root.add(leg);
  });

  scene.add(root);

  let state = 'idle'; // 'idle' | 'talking'
  let hasBeenTalkedTo = false;
  let idleTime = 0;

  return {
    root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking() {
      state = 'talking';
      hasBeenTalkedTo = true;
      // He does not get up. He does not even turn. He is very tired.
    },
    resumeIdle() {
      if (state === 'talking') state = 'idle';
    },
    // A gift of chickens: a little pile appears by his snout
    receiveChickens() {
      const pile = new THREE.Group();
      const chickenBodyMat = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.9 });
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xffb43a, roughness: 0.7 });
      const combMat = new THREE.MeshStandardMaterial({ color: 0xe0503a, roughness: 0.8 });
      [
        [3.9, 0.35],
        [4.3, -0.2],
        [4.15, 0.55],
      ].forEach(([cx, cz]) => {
        const chicken = new THREE.Group();
        const cbody = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), chickenBodyMat);
        cbody.scale.set(1, 0.9, 1.2);
        const chead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), chickenBodyMat);
        chead.position.set(0, 0.18, 0.16);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.18, 0.29);
        const comb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), combMat);
        comb.position.set(0, 0.29, 0.14);
        chicken.add(cbody, chead, beak, comb);
        chicken.position.set(cx, 0.2, cz);
        chicken.rotation.y = Math.random() * Math.PI * 2;
        pile.add(chicken);
      });
      root.add(pile);
    },
    update(delta) {
      idleTime += delta;
      // Slow, weary breathing
      const breathe = 1 + Math.sin(idleTime * 0.9) * 0.03;
      body.scale.set(1.5 * breathe, 0.75 * breathe, 1 * breathe);
      headGroup.position.y = 0.75 + Math.sin(idleTime * 0.9) * 0.03;
    },
  };
}

// A hireable crocodile. Sits by its owner until paid for, then follows Julia
// Aud at a THIRD of her speed. If it reaches the castle it spots the moat,
// makes a beeline for the water, and vanishes -- helping nobody.
export function createCrocodile(scene, position) {
  const root = new THREE.Group();
  root.name = 'Crocodile';
  root.position.copy(position);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.85 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xcdd98a, roughness: 0.9 });
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), skinMat);
  body.scale.set(1, 0.55, 1.9);
  body.position.y = 0.35;
  body.castShadow = true;
  root.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), bellyMat);
  belly.scale.set(0.95, 0.4, 1.7);
  belly.position.y = 0.22;
  root.add(belly);

  // Long snout out the front (+z), with a row of little teeth
  const snoutGroup = new THREE.Group();
  snoutGroup.position.set(0, 0.32, 0.95);
  root.add(snoutGroup);
  const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.9), skinMat);
  upperJaw.position.y = 0.06;
  upperJaw.castShadow = true;
  const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.85), skinMat);
  lowerJaw.position.set(0, -0.1, -0.02);
  snoutGroup.add(upperJaw, lowerJaw);
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), toothMat);
    t.position.set(-0.18 + i * 0.09, -0.02, 0.1 + (i % 2) * 0.25);
    snoutGroup.add(t);
  }
  // Eyes on top of the head
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 });
  [-0.16, 0.16].forEach((ex) => {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skinMat);
    bump.position.set(ex, 0.55, 0.45);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    eye.position.set(ex, 0.62, 0.5);
    root.add(bump, eye);
  });

  // Ridged tail tapering out the back
  const tailSegs = [];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.ConeGeometry(0.28 - i * 0.06, 0.5, 6), skinMat);
    seg.rotation.x = -Math.PI / 2;
    seg.position.set(0, 0.32, -0.9 - i * 0.42);
    seg.castShadow = true;
    root.add(seg);
    tailSegs.push(seg);
  }
  // Stubby splayed legs
  const legs = [];
  [
    [0.42, 0.5],
    [-0.42, 0.5],
    [0.42, -0.4],
    [-0.42, -0.4],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), skinMat);
    leg.scale.set(0.8, 0.5, 1.1);
    leg.position.set(lx, 0.12, lz);
    root.add(leg);
    legs.push(leg);
  });

  scene.add(root);

  let state = 'idle'; // 'idle' | 'following' | 'sliding' | 'gone'
  let waddleTime = 0;
  let escapeWaypoints = []; // route AROUND the castle to the far moat
  let wpIndex = 0;
  let sinkTimer = 0;

  function faceToward(x, z) {
    root.rotation.y = Math.atan2(x - root.position.x, z - root.position.z);
  }

  return {
    root,
    get state() {
      return state;
    },
    follow() {
      state = 'following';
    },
    // Reached the castle: don't barge through the guard/gate. Loop around the
    // WEST side (away from the front-east guard) and slip into the far moat.
    slideToWater(c) {
      state = 'sliding';
      wpIndex = 0;
      escapeWaypoints = [
        new THREE.Vector3(c.x - 4, 0, c.z + 20), // back off from the gate
        new THREE.Vector3(c.x - 27, 0, c.z + 6), // swing out west, clear of towers
        new THREE.Vector3(c.x - 27, 0, c.z - 12), // down the far west side
        new THREE.Vector3(c.x - 15.6, 0, c.z - 9), // into the west-back moat, and sink
      ];
    },
    isGone() {
      return state === 'gone';
    },
    update(delta, playerPos, playerSpeed, castleCenter) {
      waddleTime += delta;
      const waddle = Math.sin(waddleTime * 6) * 0.09;
      root.rotation.z = waddle;
      tailSegs.forEach((seg, i) => {
        seg.position.x = Math.sin(waddleTime * 6 - i * 0.6) * 0.12 * (i + 1) * 0.3;
      });

      if (state === 'following') {
        const dx = playerPos.x - root.position.x;
        const dz = playerPos.z - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2.4) {
          faceToward(playerPos.x, playerPos.z);
          const step = (playerSpeed / 3) * delta; // a THIRD of her speed
          root.position.x += (dx / dist) * step;
          root.position.z += (dz / dist) * step;
        }
        // Near the castle? Head for the water instead of the guard.
        if (
          Math.hypot(root.position.x - castleCenter.x, root.position.z - castleCenter.z) < 30
        ) {
          this.slideToWater(castleCenter);
        }
      } else if (state === 'sliding') {
        if (wpIndex < escapeWaypoints.length) {
          const t = escapeWaypoints[wpIndex];
          const dx = t.x - root.position.x;
          const dz = t.z - root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.4) {
            faceToward(t.x, t.z);
            const step = 6 * delta;
            root.position.x += (dx / dist) * step;
            root.position.z += (dz / dist) * step;
          } else {
            wpIndex += 1;
          }
        } else {
          // Slip under the surface with a happy little sink
          sinkTimer += delta;
          root.position.y = -sinkTimer * 0.6;
          root.rotation.x = -sinkTimer * 0.4;
          if (sinkTimer > 1.4) {
            scene.remove(root);
            state = 'gone';
          }
        }
      }
    },
  };
}

// Gerald: a small, permanently exhausted horse. Carried, not ridden.
function createHorse() {
  const horse = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x8a6242, roughness: 0.9 });
  const maneMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 0.55), coatMat);
  body.castShadow = true;
  horse.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.34), coatMat);
  head.position.set(0.95, 0.42, 0);
  head.rotation.z = -0.4;
  horse.add(head);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.36), maneMat);
  mane.position.set(0.62, 0.52, 0);
  mane.rotation.z = -0.4;
  horse.add(mane);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.6, 6), maneMat);
  tail.position.set(-0.82, -0.05, 0);
  tail.rotation.z = 0.7;
  horse.add(tail);
  const legs = [];
  [
    [0.55, 0.2],
    [0.55, -0.2],
    [-0.55, 0.2],
    [-0.55, -0.2],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 6), coatMat);
    leg.position.set(lx, -0.55, lz);
    horse.add(leg);
    legs.push(leg);
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
  [-0.18, 0.18].forEach((ez) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    eye.position.set(1.1, 0.52, ez);
    horse.add(eye);
  });
  horse.userData.legs = legs;
  return horse;
}

// Prince Percival, astride his beloved horse Gerald. Loves that horse more
// than the kingdom he traded for it. If the runner steals Gerald, the prince
// is left horseless and heartbroken, and will pay 5 coins to get a horse back.
export function createPrince(scene, position) {
  const character = createCharacter({
    shirtColor: 0x8a5cd0, // royal purple
    pantsColor: 0xf0d060, // gold hose
    hairColor: 0x6a4a2a,
    bow: false,
  });
  character.root.name = 'PrincePercival';
  character.root.position.copy(position);

  // A small gold crown
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.3, metalness: 0.6 });
  const crown = new THREE.Group();
  crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 12, 1, true), crownMat));
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), crownMat);
    const a = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3);
    crown.add(spike);
  }
  crown.position.y = 1.74;
  character.root.add(crown);
  scene.add(character.root);

  let horse = null;
  function mountUp() {
    horse = createHorse();
    horse.position.y = -0.35;
    horse.rotation.y = -Math.PI / 2;
    character.root.position.y = 1.25; // seated proudly on Gerald
    character.root.add(horse);
  }
  mountUp();

  let talkState = 'idle'; // 'idle' | 'talking'
  let phase = 'mounted'; // 'mounted' | 'horseless' | 'reunited'
  let hasBeenTalkedTo = false;
  let horseTime = 0;
  const facing = character.root.rotation.y;

  function faceToward(x, z) {
    character.root.rotation.y = Math.atan2(x - character.root.position.x, z - character.root.position.z);
  }

  return {
    root: character.root,
    get state() {
      return talkState;
    },
    get phase() {
      return phase;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking(pos) {
      talkState = 'talking';
      hasBeenTalkedTo = true;
      faceToward(pos.x, pos.z);
    },
    resumeIdle() {
      if (talkState === 'talking') {
        talkState = 'idle';
        character.root.rotation.y = facing;
      }
    },
    // The runner made off with Gerald: dismount, stand forlornly on the grass
    loseHorse() {
      if (phase !== 'mounted') return;
      phase = 'horseless';
      if (horse) character.root.remove(horse);
      horse = null;
      character.root.position.y = 0;
    },
    // Reunited with a horse -- back in the saddle
    regainHorse() {
      phase = 'reunited';
      mountUp();
    },
    update(delta) {
      character.update(delta, false);
      if (horse) {
        horseTime += delta;
        horse.userData.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(horseTime * 1.5 + i) * 0.05; // idle hoof shuffle
        });
      }
    },
  };
}

// A loose horse (Gerald, abandoned by the runner). Stands about looking
// betrayed until Julia Aud leads it away; then it follows her home.
export function createLooseHorse(scene, position) {
  const root = new THREE.Group();
  root.name = 'LooseHorse';
  const horse = createHorse();
  horse.position.y = 0.85; // hooves on the ground
  root.add(horse);
  root.position.copy(position);
  scene.add(root);

  let state = 'idle'; // 'idle' | 'following' | 'delivered'
  let hasBeenTalkedTo = false;
  let t = 0;

  function faceToward(x, z) {
    root.rotation.y = Math.atan2(x - root.position.x, z - root.position.z);
  }

  return {
    root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking() {
      hasBeenTalkedTo = true; // engagement gate; state stays 'idle' until led
    },
    resumeIdle() {},
    follow() {
      state = 'following';
    },
    delivered() {
      state = 'delivered';
      scene.remove(root);
    },
    update(delta, playerPos, playerSpeed) {
      t += delta;
      horse.position.y = 0.85 + Math.sin(t * 2) * 0.02;
      if (state === 'following') {
        const dx = playerPos.x - root.position.x;
        const dz = playerPos.z - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2.6) {
          faceToward(playerPos.x, playerPos.z);
          const step = playerSpeed * 1.05 * delta; // a horse keeps up easily
          root.position.x += (dx / dist) * step;
          root.position.z += (dz / dist) * step;
          horse.userData.legs.forEach((leg, i) => {
            leg.rotation.x = Math.sin(t * 12 + i * 1.6) * 0.5;
          });
        }
      }
    },
  };
}

// Dash Thunderlegs: always running, at 1.5x Julia Aud's base speed. Will
// bet anyone 2 coins on a race to the castle. Has a backup plan (Gerald).
export function createRunner(scene) {
  const character = createCharacter({
    shirtColor: 0xff4444, // racing red
    pantsColor: 0xffffff,
    hairColor: 0x2a1a0a,
    bow: false,
  });
  character.root.name = 'DashThunderlegs';
  // Sweatband: essential athletic equipment
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.06, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.8 })
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.32;
  character.root.add(band);
  scene.add(character.root);

  const RUN_SPEED = 10.8; // 1.5x Julia Aud's base speed
  const HORSE_SPEED = 20; // Gerald, when "raced"

  // Patrol loop in the far north-west, a long way from the castle
  const LOOP_CENTER = { x: -95, z: 85 };
  const LOOP_RADIUS = 20;
  const patrol = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    patrol.push(
      new THREE.Vector3(
        LOOP_CENTER.x + Math.cos(a) * LOOP_RADIUS,
        0,
        LOOP_CENTER.z + Math.sin(a) * LOOP_RADIUS
      )
    );
  }
  character.root.position.copy(patrol[0]);
  let patrolIndex = 1;

  // States: 'looping' | 'talking' | 'racing' | 'waiting' | 'chasing'
  let state = 'looping';
  let hasBeenTalkedTo = false;
  let raceTarget = null;
  let horse = null;
  let horseTime = 0;

  function faceToward(x, z) {
    const dx = x - character.root.position.x;
    const dz = z - character.root.position.z;
    character.root.rotation.y = Math.atan2(dx, dz);
  }

  function moveToward(target, speed, delta) {
    const pos = character.root.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.2) return true;
    faceToward(target.x, target.z);
    const step = Math.min(speed * delta, dist);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    return false;
  }

  return {
    root: character.root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    get hasHorse() {
      return horse !== null;
    },
    startTalking(juliaPos) {
      state = 'talking';
      hasBeenTalkedTo = true;
      faceToward(juliaPos.x, juliaPos.z);
    },
    resumeIdle() {
      if (state === 'talking') state = 'looping';
    },
    startRace(target) {
      state = 'racing';
      raceTarget = target.clone();
    },
    // The backup plan: mount Gerald and "race" properly
    cheat() {
      if (horse) return;
      horse = createHorse();
      character.root.position.y = 1.25; // Dash stands proudly on horseback
      // The horse is a child of the (raised) rider, so it needs a negative
      // offset to keep its hooves on the ground: body center ends up at
      // world y ~0.9, hooves at ~0.05, saddle just under Dash's feet.
      horse.position.y = -0.35;
      horse.rotation.y = -Math.PI / 2; // face the same way as his rider
      character.root.add(horse);
    },
    dismount() {
      if (!horse) return;
      character.root.remove(horse);
      horse = null;
      character.root.position.y = 0;
    },
    distanceToTarget() {
      if (!raceTarget) return Infinity;
      return Math.hypot(
        raceTarget.x - character.root.position.x,
        raceTarget.z - character.root.position.z
      );
    },
    waitAtFinish() {
      state = 'waiting';
    },
    startChase() {
      // Gerald went home. The chase is on foot, forever.
      this.dismount();
      state = 'chasing';
    },
    update(delta, playerPos) {
      const speed = horse ? HORSE_SPEED : RUN_SPEED;
      switch (state) {
        case 'looping': {
          if (moveToward(patrol[patrolIndex], RUN_SPEED, delta)) {
            patrolIndex = (patrolIndex + 1) % patrol.length;
          }
          character.update(delta, true, 18);
          break;
        }
        case 'racing': {
          if (raceTarget && moveToward(raceTarget, speed, delta)) {
            state = 'waiting';
          }
          // Mounted: he stands heroically still while Gerald's legs do the work
          character.update(delta, !horse, 18);
          break;
        }
        case 'chasing': {
          if (playerPos) moveToward(playerPos, RUN_SPEED, delta);
          character.update(delta, true, 18);
          break;
        }
        case 'talking':
        case 'waiting': {
          character.update(delta, false);
          break;
        }
      }
      // Gerald's legs kick helplessly while carried
      if (horse) {
        horseTime += delta;
        horse.userData.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(horseTime * 10 + i * 1.7) * 0.5;
        });
      }
    },
  };
}

// Sofia, waiting in the castle courtyard. Idles with a hopeful little bounce.
// Guru Ohm: a serene, levitating meditator in the forest clearing. Sits
// cross-legged, gently floats and bobs, and dispenses questionable wisdom.
export function createGuru(scene, position) {
  const root = new THREE.Group();
  root.name = 'GuruOhm';
  root.position.copy(position);

  const inner = new THREE.Group(); // everything that floats/bobs
  root.add(inner);

  const robeMat = new THREE.MeshStandardMaterial({ color: 0xd98a3a, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xcaa06a, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.4 });

  // Robe body -- a wide seated cone
  const robe = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.3, 16), robeMat);
  robe.position.y = 0.65;
  robe.castShadow = true;
  inner.add(robe);
  // Crossed-leg suggestion: a low wide band at the base
  const lap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 16), robeMat);
  lap.position.y = 0.18;
  inner.add(lap);
  // Knees
  [-0.7, 0.7].forEach((kx) => {
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), robeMat);
    knee.scale.set(1, 0.7, 1.1);
    knee.position.set(kx, 0.22, 0.55);
    inner.add(knee);
  });

  // Head (chibi)
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.7;
  inner.add(headGroup);
  const headR = 0.42;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 18, 18), skinMat);
  head.castShadow = true;
  headGroup.add(head);
  // Topknot bun
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), hairMat);
  bun.position.y = headR * 0.95;
  headGroup.add(bun);
  const hairBand = new THREE.Mesh(
    new THREE.TorusGeometry(headR * 0.98, 0.04, 8, 24),
    hairMat
  );
  hairBand.rotation.x = Math.PI / 2.4;
  hairBand.position.y = headR * 0.35;
  headGroup.add(hairBand);
  // Serene closed eyes: thin downward arcs
  [-0.15, 0.15].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.017, 6, 12, Math.PI), darkMat);
    eye.position.set(ex, headR * 0.08, headR * 0.9);
    eye.rotation.z = Math.PI; // arc opening downward = closed, content eyes
    headGroup.add(eye);
  });
  // Bindi dot
  const bindi = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xd23a5a, roughness: 0.5 })
  );
  bindi.position.set(0, headR * 0.4, headR * 0.92);
  headGroup.add(bindi);
  // A gentle smile
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.02, 8, 16, Math.PI * 0.6),
    new THREE.MeshStandardMaterial({ color: 0xb0563a, roughness: 0.8 })
  );
  smile.position.set(0, -0.12, headR * 0.92);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.6) / 2;
  headGroup.add(smile);

  // Hands resting on knees in a meditation mudra
  [-0.7, 0.7].forEach((hx) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMat);
    hand.position.set(hx, 0.42, 0.6);
    inner.add(hand);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), skinMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(hx, 0.5, 0.6);
    inner.add(ring);
  });

  // A faint halo of serenity
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.03, 8, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.rotation.x = Math.PI / 2.2;
  halo.position.y = 1.7;
  inner.add(halo);

  scene.add(root);

  let state = 'idle'; // 'idle' | 'talking'
  let hasBeenTalkedTo = false;
  let t = 0;

  return {
    root,
    get state() {
      return state;
    },
    get hasBeenTalkedTo() {
      return hasBeenTalkedTo;
    },
    set hasBeenTalkedTo(v) {
      hasBeenTalkedTo = v;
    },
    startTalking() {
      state = 'talking';
      hasBeenTalkedTo = true;
    },
    resumeIdle() {
      if (state === 'talking') state = 'idle';
    },
    update(delta) {
      t += delta;
      inner.position.y = 0.35 + Math.sin(t * 0.8) * 0.08; // levitate & bob
      halo.rotation.z += delta * 0.6;
    },
  };
}

export function createSofia(scene, position) {
  const character = createCharacter({
    shirtColor: 0xa78bfa, // purple, to tell her apart from Julia Aud
    pantsColor: 0xffe15c,
    hairColor: 0x5a3a1a, // brown hair
    skinColor: 0x9c6b45, // Sofia is from India -- darker skin
  });
  character.root.name = 'Sofia';
  character.root.position.copy(position);
  character.root.rotation.y = 0; // faces the gate (+z), watching for rescue
  scene.add(character.root);

  function update(delta) {
    character.update(delta, false);
  }

  return { root: character.root, update };
}
