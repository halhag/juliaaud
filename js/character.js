import * as THREE from './lib/three.module.js';

// A cute, chibi-style character: the head is roughly the same size as the
// rest of the body, like the friendly kid-game characters this is modeled on.
export function createCharacter({
  shirtColor = 0xff8fb3,
  pantsColor = 0x6ec6ff,
  hairColor = 0xf0d478,
  skinColor = 0xffe0c2,
  bow = true,
  eyePatch = false,
  hat = 'none', // 'none' | 'tophat' | 'helmet' | 'wizard'
  beard = false,
  mustache = false,
} = {}) {
  const root = new THREE.Group();
  root.name = 'JuliaAud';

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.6 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.3 });
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff9db0, roughness: 0.9 });

  // ---- Proportions (chibi: head is about as tall as the rest of the body) ----
  const legHeight = 0.32;
  const torsoHeight = 0.42;
  const headRadius = 0.42;

  // ---- Legs (simple pivoted cylinders so they can swing while walking) ----
  function makeLeg() {
    const pivot = new THREE.Group();
    pivot.position.y = legHeight; // hip height
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, legHeight, 10), pantsMat);
    leg.position.y = -legHeight / 2;
    leg.castShadow = true;
    pivot.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.26), shoeMat);
    shoe.position.set(0, -legHeight - 0.02, 0.05);
    shoe.castShadow = true;
    pivot.add(shoe);

    return pivot;
  }
  const leftLeg = makeLeg();
  leftLeg.position.x = -0.14;
  const rightLeg = makeLeg();
  rightLeg.position.x = 0.14;
  root.add(leftLeg, rightLeg);

  // ---- Torso ----
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, torsoHeight * 0.5, 4, 10), shirtMat);
  torso.position.y = legHeight + torsoHeight / 2;
  torso.castShadow = true;
  root.add(torso);

  // ---- Arms (pivoted so they can swing) ----
  function makeArm() {
    const pivot = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.32, 4, 8), shirtMat);
    arm.position.y = -0.2;
    arm.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinMat);
    hand.position.y = -0.38;
    hand.castShadow = true;
    pivot.add(arm, hand);
    return pivot;
  }
  const leftArm = makeArm();
  leftArm.position.set(-0.36, legHeight + torsoHeight - 0.05, 0);
  const rightArm = makeArm();
  rightArm.position.set(0.36, legHeight + torsoHeight - 0.05, 0);
  root.add(leftArm, rightArm);

  // ---- Head group (big, chibi-style) ----
  const headGroup = new THREE.Group();
  headGroup.position.y = legHeight + torsoHeight + headRadius * 0.85;
  root.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 20, 20), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Hair: a simple cap plus a little back-tuft, and a bow for a friendly look
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius * 1.05, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.y = headRadius * 0.18;
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.9, 16, 16), hairMat);
  hairBack.position.set(0, headRadius * 0.05, -headRadius * 0.35);
  headGroup.add(hairBack);

  if (bow) {
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xff5f8f, roughness: 0.6 });
    const bowLeft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 8), bowMat);
    bowLeft.rotation.z = Math.PI / 2;
    bowLeft.position.set(-0.12, headRadius * 0.55, headRadius * 0.55);
    const bowRight = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 8), bowMat);
    bowRight.rotation.z = -Math.PI / 2;
    bowRight.position.set(0.12, headRadius * 0.55, headRadius * 0.55);
    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bowMat);
    bowKnot.position.set(0, headRadius * 0.55, headRadius * 0.55);
    headGroup.add(bowLeft, bowRight, bowKnot);
  }

  // Face: simple friendly eyes + rosy cheeks, no mouth needed to keep it cute/simple
  // Eyes with whites and pupils (much more readable than plain dots).
  // The character faces +z, so their RIGHT eye is the one at negative x.
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  function addEye(x) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhiteMat);
    white.position.set(x, headRadius * 0.05, headRadius * 0.88);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), eyeMat);
    pupil.position.set(x, headRadius * 0.05, headRadius * 0.95);
    headGroup.add(white, pupil);
  }
  addEye(0.15); // left eye (their left, +x)
  if (!eyePatch) addEye(-0.15); // right eye, unless it's under a patch

  // Eyebrows: thin tilted boxes above the eyes
  const browMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 });
  const browGeo = new THREE.BoxGeometry(0.13, 0.028, 0.02);
  if (!eyePatch) {
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(-0.15, headRadius * 0.28, headRadius * 0.9);
    rightBrow.rotation.z = -0.15;
    headGroup.add(rightBrow);
  }
  const leftBrow = new THREE.Mesh(browGeo, browMat);
  leftBrow.position.set(0.15, headRadius * 0.28, headRadius * 0.9);
  leftBrow.rotation.z = 0.15;
  headGroup.add(leftBrow);

  // A friendly smile (arc of a thin torus)
  const smileMat = new THREE.MeshStandardMaterial({ color: 0xb0563a, roughness: 0.8 });
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.02, 8, 16, Math.PI * 0.6),
    smileMat
  );
  smile.position.set(0, -0.1, headRadius * 0.92);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.6) / 2; // arc opens upward
  headGroup.add(smile);

  if (mustache) {
    const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.9 });
    const mGeo = new THREE.BoxGeometry(0.13, 0.035, 0.03);
    const mLeft = new THREE.Mesh(mGeo, mustacheMat);
    mLeft.position.set(0.08, -0.05, headRadius * 0.93);
    mLeft.rotation.z = 0.25;
    const mRight = new THREE.Mesh(mGeo, mustacheMat);
    mRight.position.set(-0.08, -0.05, headRadius * 0.93);
    mRight.rotation.z = -0.25;
    headGroup.add(mLeft, mRight);
  }

  if (beard) {
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.9 });
    const beardMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), beardMat);
    beardMesh.scale.set(1.1, 1.5, 0.6);
    beardMesh.position.set(0, -headRadius * 0.62, headRadius * 0.6);
    headGroup.add(beardMesh);
  }

  if (eyePatch) {
    // Big, clearly visible patch over the right eye plus a thick strap
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45 });
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.045, 16), patchMat);
    patch.rotation.x = Math.PI / 2; // face forward
    patch.position.set(-0.15, headRadius * 0.05, headRadius * 0.92);
    headGroup.add(patch);

    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(headRadius * 1.02, 0.03, 8, 28),
      patchMat
    );
    strap.rotation.x = Math.PI / 2;
    strap.rotation.z = -0.35;
    strap.position.y = headRadius * 0.1;
    headGroup.add(strap);
  }

  // ---- Hats ----
  if (hat === 'tophat') {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.4 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x7c5cbf, roughness: 0.6 });
    const hatGroup = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 18), hatMat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 18), hatMat);
    crown.position.y = 0.22;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.09, 18), bandMat);
    band.position.y = 0.08;
    hatGroup.add(brim, crown, band);
    hatGroup.position.y = headRadius * 0.82;
    hatGroup.rotation.z = 0.1; // jaunty businessman tilt
    hatGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    headGroup.add(hatGroup);
  } else if (hat === 'helmet') {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xb8bcc4,
      roughness: 0.35,
      metalness: 0.7,
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius * 0.9, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      metalMat
    );
    dome.position.y = headRadius * 0.32;
    dome.castShadow = true;
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius * 0.92, headRadius * 0.98, 0.09, 18),
      metalMat
    );
    rim.position.y = headRadius * 0.34;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, headRadius * 1.1), // front-to-back plume ridge
      new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.6 }));
    crest.position.y = headRadius * 0.32 + headRadius * 0.9;
    headGroup.add(dome, rim, crest);
  } else if (hat === 'wizard') {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x3f3277, roughness: 0.7 });
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffe15c, roughness: 0.4 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 18), hatMat);
    brim.position.y = headRadius * 0.72;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.72, 14), hatMat);
    cone.position.y = headRadius * 0.72 + 0.36;
    cone.rotation.y = 0.3;
    cone.castShadow = true;
    headGroup.add(brim, cone);
    // Little stars on the hat
    [
      [0.16, 0.15, 0.14],
      [-0.13, 0.32, 0.1],
      [0.03, 0.5, 0.08],
    ].forEach(([sx, sy, sz]) => {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), starMat);
      star.position.set(sx, headRadius * 0.72 + sy, sz + 0.16);
      headGroup.add(star);
    });
  }

  const cheekGeo = new THREE.CircleGeometry(0.08, 12);
  const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
  leftCheek.position.set(-0.26, -0.08, headRadius * 0.88);
  leftCheek.lookAt(leftCheek.position.clone().multiplyScalar(2));
  const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
  rightCheek.position.set(0.26, -0.08, headRadius * 0.88);
  rightCheek.lookAt(rightCheek.position.clone().multiplyScalar(2));
  headGroup.add(leftCheek, rightCheek);

  root.traverse((obj) => {
    if (obj.isMesh) obj.receiveShadow = true;
  });

  // ---- Simple procedural walk/idle animation ----
  let walkTime = 0;
  let idleTime = 0;

  function update(delta, isMoving, strideRate = 8) {
    if (isMoving) {
      walkTime += delta * strideRate;
      const swing = Math.sin(walkTime) * 0.55;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.8;
      rightArm.rotation.x = swing * 0.8;
      headGroup.position.y =
        legHeight + torsoHeight + headRadius * 0.85 + Math.abs(Math.sin(walkTime)) * 0.03;
    } else {
      idleTime += delta;
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.1);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.1);
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.1);
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.1);
      headGroup.position.y =
        legHeight + torsoHeight + headRadius * 0.85 + Math.sin(idleTime * 1.5) * 0.015;
    }
  }

  return { root, update };
}
