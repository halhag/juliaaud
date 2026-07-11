import * as THREE from './lib/three.module.js';

// The Kingdom: a big friendly countryside. The starting village sits at the
// center, a long winding path leads to the Wicked Orange King's castle in
// the far south-east, and trees/houses/flowers are scattered (deterministically)
// in between. Trees, fence posts, and path discs are instanced so the large
// world stays cheap to render.
export function createWorld(scene) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'Kingdom';

  const WORLD_RADIUS = 200;

  // Simple circular collision footprints for solid obstacles.
  const obstacles = [];
  const HOUSE_COLLISION_RADIUS = 2.3;
  const TREE_COLLISION_RADIUS = 0.55;

  // Deterministic pseudo-random (LCG) so the Kingdom looks the same every game
  let randState = 1234567;
  function rand() {
    randState = (randState * 1664525 + 1013904223) >>> 0;
    return randState / 4294967296;
  }

  // ---- Ground ----
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x8fdb6a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(WORLD_RADIUS + 8, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  // ---- Castle layout constants (south-east of the village) ----
  const CASTLE_CENTER = new THREE.Vector3(110, 0, -130);
  const CASTLE_HALF = 12; // walls form a 24x24 square
  const GATE_POS = new THREE.Vector3(110, 0, -118); // middle of the front wall
  const GUARD_POS = new THREE.Vector3(111.5, 0, -114.5); // outside the gate
  const SOFIA_POS = new THREE.Vector3(110, 0, -128); // courtyard, in front of the keep

  // ---- Paths (disc-stamped; fold-proof at any bend) ----
  const PATH_Y = 0.05;
  const pathHalfWidth = 1.1;
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xf3d9a4,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // Village loop (unchanged from the small map)
  const villageCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-10, 0, 8),
      new THREE.Vector3(-4, 0, 2),
      new THREE.Vector3(0, 0, 6),
      new THREE.Vector3(6, 0, 0),
      new THREE.Vector3(10, 0, -8),
      new THREE.Vector3(2, 0, -10),
      new THREE.Vector3(-8, 0, -4),
    ],
    true,
    'centripetal'
  );
  // Long winding road from the village to the castle gate
  const castleRoadCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(10, 0, -8),
      new THREE.Vector3(28, 0, -26),
      new THREE.Vector3(52, 0, -40),
      new THREE.Vector3(72, 0, -72),
      new THREE.Vector3(92, 0, -98),
      new THREE.Vector3(106, 0, -112),
      new THREE.Vector3(110, 0, -115),
    ],
    false,
    'centripetal'
  );

  const villagePathPoints = villageCurve.getSpacedPoints(240);
  const castleRoadPoints = castleRoadCurve.getSpacedPoints(380);
  const allPathPoints = villagePathPoints.concat(castleRoadPoints);

  const discGeo = new THREE.CircleGeometry(pathHalfWidth, 16);
  discGeo.rotateX(-Math.PI / 2);
  const pathMesh = new THREE.InstancedMesh(discGeo, pathMat, allPathPoints.length);
  const tmpMatrix = new THREE.Matrix4();
  allPathPoints.forEach((p, i) => {
    tmpMatrix.setPosition(p.x, PATH_Y, p.z);
    pathMesh.setMatrixAt(i, tmpMatrix);
  });
  pathMesh.receiveShadow = true;
  worldGroup.add(pathMesh);

  // ---- Houses ----
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xa9573f, roughness: 0.95 });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xe8b923, roughness: 0.35, metalness: 0.5 });
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xb9b2a6, roughness: 1 });

  function createHouse({ wallColor, roofColor, doorColor = 0x8a5a3a, scale = 1 }) {
    const house = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 });
    const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.8 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xbdeeff, roughness: 0.3 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), wallMat);
    body.position.y = 1.1;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 4), roofMat);
    roof.position.y = 2.2 + 0.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // Brick chimney poking through the roof
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 0.42), brickMat);
    chimney.position.set(-0.85, 2.9, -0.5);
    chimney.castShadow = true;
    const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.54), brickMat);
    chimneyTop.position.set(-0.85, 3.45, -0.5);
    house.add(chimney, chimneyTop);

    // Door with white frame, golden knob, and a stone doorstep
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.36, 0.06), frameMat);
    doorFrame.position.set(0, 0.66, 1.5);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.1), doorMat);
    door.position.set(0, 0.6, 1.54);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), knobMat);
    knob.position.set(0.22, 0.58, 1.61);
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.5), stepMat);
    step.position.set(0, 0.06, 1.75);
    house.add(doorFrame, door, knob, step);

    // Windows with white frames and cross bars
    const winGeo = new THREE.BoxGeometry(0.55, 0.55, 0.08);
    const winFrameGeo = new THREE.BoxGeometry(0.68, 0.68, 0.05);
    const barVGeo = new THREE.BoxGeometry(0.04, 0.55, 0.04);
    const barHGeo = new THREE.BoxGeometry(0.55, 0.04, 0.04);
    [-0.95, 0.95].forEach((wx) => {
      const frame = new THREE.Mesh(winFrameGeo, frameMat);
      frame.position.set(wx, 1.3, 1.51);
      const glass = new THREE.Mesh(winGeo, windowMat);
      glass.position.set(wx, 1.3, 1.53);
      const barV = new THREE.Mesh(barVGeo, frameMat);
      barV.position.set(wx, 1.3, 1.58);
      const barH = new THREE.Mesh(barHGeo, frameMat);
      barH.position.set(wx, 1.3, 1.58);
      house.add(frame, glass, barV, barH);
    });

    house.scale.setScalar(scale);
    return house;
  }

  const housePalette = [
    { wallColor: 0xffd3e0, roofColor: 0xff8fa3 },
    { wallColor: 0xd3e8ff, roofColor: 0x6ea8ff },
    { wallColor: 0xfff2c2, roofColor: 0xffb84d },
    { wallColor: 0xd9f7d3, roofColor: 0x6dbf5e },
  ];

  const housePositions = [
    // The starting village
    { x: -13, z: 11, ry: 0.4 },
    { x: 12, z: 9, ry: -0.5 },
    { x: 13, z: -12, ry: 2.6 },
    { x: -12, z: -10, ry: -2.4 },
  ];
  // Hamlets scattered around the Kingdom (clusters of 3-4 houses)
  const hamletCenters = [
    [55, 35],
    [-65, 55],
    [-45, -85],
    [85, 10],
    [-100, -25],
    [-15, 100],
  ];
  hamletCenters.forEach(([cx, cz]) => {
    const count = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      housePositions.push({
        x: cx + (rand() - 0.5) * 16,
        z: cz + (rand() - 0.5) * 16,
        ry: rand() * Math.PI * 2,
      });
    }
  });
  housePositions.forEach((pos, i) => {
    const house = createHouse(housePalette[i % housePalette.length]);
    house.position.set(pos.x, 0, pos.z);
    house.rotation.y = pos.ry;
    worldGroup.add(house);
    obstacles.push({ x: pos.x, z: pos.z, radius: HOUSE_COLLISION_RADIUS });
  });

  // ---- Trees (instanced: one mesh each for trunks / lower / upper leaves) ----
  const treeSpots = [
    // Keep the original village trees
    { x: -6, z: -2, s: 1 },
    { x: 8, z: 3, s: 0.85 },
    { x: -2, z: 12, s: 1.1 },
    { x: -16, z: 2, s: 0.9 },
    { x: 4, z: -14, s: 1 },
    { x: 16, z: -4, s: 0.95 },
    { x: -8, z: -13, s: 0.9 },
  ];
  // Scatter more across the countryside, avoiding paths, houses, and the castle
  const pathSample = allPathPoints.filter((_, i) => i % 4 === 0);
  let tries = 0;
  while (treeSpots.length < 100 && tries < 3000) {
    tries++;
    const angle = rand() * Math.PI * 2;
    const dist = 14 + Math.sqrt(rand()) * (WORLD_RADIUS - 22);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.hypot(x - CASTLE_CENTER.x, z - CASTLE_CENTER.z) < 32) continue;
    if (Math.hypot(x - 98, z - -95) < 8) continue; // the wizard's tower plot
    // Keep quest spots clear: villagers, the lost cat, the stash tree, and
    // the engineer's time-machine plot
    if (
      [
        [55, 25],
        [-65, 45],
        [-45, -75],
        [85, 0],
        [20, -40],
        [-90, -110, 7],
        [-20, -55, 6],
        [-58, -32, 9], // the tired old dragon's strategic recline
        [55, -60, 6], // the crocodile hustler
        [-140, 110, 6], // the far-away chicken farmer
        [75, -35, 6], // Prince Percival on horseback
        [-18, 22, 5], // Priya the kind villager
      ].some(([qx, qz, r = 4]) => Math.hypot(x - qx, z - qz) < r)
    )
      continue;
    if (housePositions.some((h) => Math.hypot(x - h.x, z - h.z) < 5.5)) continue;
    if (pathSample.some((p) => Math.hypot(x - p.x, z - p.z) < 3)) continue;
    treeSpots.push({ x, z, s: 0.8 + rand() * 0.5 });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.1, 8);
  trunkGeo.translate(0, 0.55, 0);
  const leavesGeo = new THREE.SphereGeometry(0.95, 12, 12);
  leavesGeo.translate(0, 1.5, 0);
  const leaves2Geo = new THREE.SphereGeometry(0.65, 10, 10);
  leaves2Geo.translate(0, 2.15, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 1 });
  // White base so per-instance tints come through unchanged
  const leavesWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

  // Per-tree color variation makes the forest read as individual trees
  // instead of copy-paste (instance colors multiply the white base).
  const treeTints = treeSpots.map(() => {
    const c = new THREE.Color();
    c.setHSL(0.3 + (rand() - 0.5) * 0.06, 0.5, 0.4 + (rand() - 0.5) * 0.12);
    return c;
  });
  for (const [geo, mat, tinted] of [
    [trunkGeo, trunkMat, false],
    [leavesGeo, leavesWhiteMat, true],
    [leaves2Geo, leavesWhiteMat, true],
  ]) {
    const instanced = new THREE.InstancedMesh(geo, mat, treeSpots.length);
    treeSpots.forEach((t, i) => {
      tmpMatrix.makeScale(t.s, t.s, t.s);
      tmpMatrix.setPosition(t.x, 0, t.z);
      instanced.setMatrixAt(i, tmpMatrix);
      if (tinted) instanced.setColorAt(i, treeTints[i]);
    });
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    worldGroup.add(instanced);
  }
  treeSpots.forEach((t) => {
    obstacles.push({ x: t.x, z: t.z, radius: TREE_COLLISION_RADIUS * t.s });
  });

  // ---- Flowers ----
  function createFlowerPatch(x, z) {
    const group = new THREE.Group();
    const colors = [0xff6f91, 0xffe15c, 0xffffff, 0xa78bfa];
    for (let i = 0; i < 5; i++) {
      const petalMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] });
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), petalMat);
      const angle = (i / 5) * Math.PI * 2;
      flower.position.set(Math.cos(angle) * 0.3, 0.08, Math.sin(angle) * 0.3);
      group.add(flower);
    }
    group.position.set(x, 0, z);
    return group;
  }
  const flowerSpots = [
    [-3, 5],
    [3, -6],
    [9, -9],
    [-10, -6],
  ];
  for (let i = 0; i < 22; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 15 + rand() * (WORLD_RADIUS - 30);
    flowerSpots.push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
  }
  flowerSpots.forEach(([x, z]) => worldGroup.add(createFlowerPatch(x, z)));

  // ---- The Wicked Orange King's castle ----
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcfc8bd, roughness: 0.95 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.7 });

  const castleGroup = new THREE.Group();
  castleGroup.position.copy(CASTLE_CENTER);

  // Courtyard floor
  const courtyard = new THREE.Mesh(
    new THREE.CircleGeometry(CASTLE_HALF - 1, 24),
    new THREE.MeshStandardMaterial({ color: 0xbfb8ac, roughness: 1 })
  );
  courtyard.rotation.x = -Math.PI / 2;
  courtyard.position.y = 0.04;
  courtyard.receiveShadow = true;
  castleGroup.add(courtyard);

  // Walls (local coords; front wall faces +z, toward the village road).
  // Front wall has a 6-unit gate gap in the middle.
  const WALL_H = 6;
  const WALL_T = 1.5;
  const wallDefs = [
    { cx: -7.5, cz: CASTLE_HALF, len: 9, rot: 0 },  // front-left of gate
    { cx: 7.5, cz: CASTLE_HALF, len: 9, rot: 0 },   // front-right of gate
    { cx: 0, cz: -CASTLE_HALF, len: 24, rot: 0 },   // back
    { cx: -CASTLE_HALF, cz: 0, len: 24, rot: Math.PI / 2 }, // left
    { cx: CASTLE_HALF, cz: 0, len: 24, rot: Math.PI / 2 },  // right
  ];
  wallDefs.forEach(({ cx, cz, len, rot }) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, WALL_T), stoneMat);
    wall.position.set(cx, WALL_H / 2, cz);
    wall.rotation.y = rot;
    wall.castShadow = true;
    wall.receiveShadow = true;
    castleGroup.add(wall);

    // Collision circles along the wall (world coords)
    const steps = Math.ceil(len / 2.2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps - 0.5;
      const lx = rot === 0 ? cx + t * len : cx;
      const lz = rot === 0 ? cz : cz + t * len;
      obstacles.push({
        x: CASTLE_CENTER.x + lx,
        z: CASTLE_CENTER.z + lz,
        radius: 1.6,
      });
    }
  });

  // Corner towers with orange cone roofs
  [
    [-CASTLE_HALF, -CASTLE_HALF],
    [CASTLE_HALF, -CASTLE_HALF],
    [-CASTLE_HALF, CASTLE_HALF],
    [CASTLE_HALF, CASTLE_HALF],
  ].forEach(([tx, tz]) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 12), stoneMat);
    tower.position.set(tx, 5, tz);
    tower.castShadow = true;
    castleGroup.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 4, 12), orangeMat);
    roof.position.set(tx, 12, tz);
    roof.castShadow = true;
    castleGroup.add(roof);
    obstacles.push({ x: CASTLE_CENTER.x + tx, z: CASTLE_CENTER.z + tz, radius: 3.4 });
  });

  // The keep (Sofia is held here -- she stands in the courtyard in front of it)
  const keep = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), stoneMat);
  keep.position.set(0, 4, -6);
  keep.castShadow = true;
  keep.receiveShadow = true;
  castleGroup.add(keep);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(7.4, 4, 4), orangeMat);
  keepRoof.position.set(0, 10, -6);
  keepRoof.rotation.y = Math.PI / 4;
  keepRoof.castShadow = true;
  castleGroup.add(keepRoof);
  obstacles.push({ x: CASTLE_CENTER.x, z: CASTLE_CENTER.z - 6, radius: 6.4 });

  // Flag of the Wicked Orange King
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), stoneMat);
  pole.position.set(0, 14, -6);
  castleGroup.add(pole);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2, 3), orangeMat);
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(1, 15.2, -6);
  castleGroup.add(flag);

  // Crenellations (merlons) along the wall tops -- instanced
  const merlonGeo = new THREE.BoxGeometry(0.9, 0.7, WALL_T * 0.9);
  const merlonSpots = [];
  wallDefs.forEach(({ cx, cz, len, rot }) => {
    const count = Math.floor(len / 1.8);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count - 0.5;
      merlonSpots.push({
        x: rot === 0 ? cx + t * len : cx,
        z: rot === 0 ? cz : cz + t * len,
        rot,
      });
    }
  });
  const merlonMesh = new THREE.InstancedMesh(merlonGeo, stoneMat, merlonSpots.length);
  const merlonQuat = new THREE.Quaternion();
  const merlonScale = new THREE.Vector3(1, 1, 1);
  merlonSpots.forEach((m, i) => {
    merlonQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), m.rot);
    tmpMatrix.compose(new THREE.Vector3(m.x, WALL_H + 0.35, m.z), merlonQuat, merlonScale);
    merlonMesh.setMatrixAt(i, tmpMatrix);
  });
  merlonMesh.castShadow = true;
  castleGroup.add(merlonMesh);

  // Big wooden gate doors, swung open inward
  const gateDoorMat = new THREE.MeshStandardMaterial({ color: 0x6a4526, roughness: 0.9 });
  const gateDoorGeo = new THREE.BoxGeometry(2.9, 4.6, 0.25);
  const gateLeft = new THREE.Mesh(gateDoorGeo, gateDoorMat);
  gateLeft.position.set(-2.2, 2.3, CASTLE_HALF - 1.2);
  gateLeft.rotation.y = 0.9;
  gateLeft.castShadow = true;
  const gateRight = new THREE.Mesh(gateDoorGeo, gateDoorMat);
  gateRight.position.set(2.2, 2.3, CASTLE_HALF - 1.2);
  gateRight.rotation.y = -0.9;
  gateRight.castShadow = true;
  castleGroup.add(gateLeft, gateRight);

  // Banner of the Orange King hanging over the gateway
  const banner = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.4, 0.15), orangeMat);
  banner.position.set(0, WALL_H + 0.5, CASTLE_HALF);
  castleGroup.add(banner);

  // Keep door and windows
  const keepDoor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.1, 0.12), gateDoorMat);
  keepDoor.position.set(0, 1.05, -1.93);
  castleGroup.add(keepDoor);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2e2a3a, roughness: 0.9 });
  [-2.6, 2.6].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.1), darkMat);
    win.position.set(wx, 5.2, -1.93);
    castleGroup.add(win);
  });
  // Arrow slits on the front towers
  [
    [-CASTLE_HALF, CASTLE_HALF],
    [CASTLE_HALF, CASTLE_HALF],
  ].forEach(([tx, tz]) => {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.1), darkMat);
    slit.position.set(tx, 6.5, tz + 2.98);
    castleGroup.add(slit);
  });

  worldGroup.add(castleGroup);

  // ---- A little blue moat around the castle ----
  // A ring of water, with a gap on the front (+z) side so the road, gate,
  // and guard sit on a land causeway. Angle is measured atan2(relZ, relX);
  // water covers everything except the front arc [50deg, 130deg].
  const MOAT_INNER = 15;
  const MOAT_OUTER = 22;
  const MOAT_Y = 0.06;
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x4ba6dd,
    roughness: 0.25,
    metalness: 0.1,
    // A little self-glow so the water still reads as bright blue even inside
    // the castle's big shadow (which falls right across the moat).
    emissive: 0x2f7bb0,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  {
    const startDeg = 130;
    const endDeg = 410; // wraps past 360 back to 50, leaving [50,130] open
    const segs = 96;
    const positions = [];
    const indices = [];
    for (let i = 0; i <= segs; i++) {
      const a = ((startDeg + (endDeg - startDeg) * (i / segs)) * Math.PI) / 180;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      positions.push(
        CASTLE_CENTER.x + cos * MOAT_INNER, MOAT_Y, CASTLE_CENTER.z + sin * MOAT_INNER,
        CASTLE_CENTER.x + cos * MOAT_OUTER, MOAT_Y, CASTLE_CENTER.z + sin * MOAT_OUTER
      );
      if (i < segs) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const moatGeo = new THREE.BufferGeometry();
    moatGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    moatGeo.setIndex(indices);
    const up = new Float32Array(positions.length);
    for (let i = 1; i < up.length; i += 3) up[i] = 1;
    moatGeo.setAttribute('normal', new THREE.BufferAttribute(up, 3));
    const moat = new THREE.Mesh(moatGeo, waterMat);
    moat.receiveShadow = false; // the castle's shadow would otherwise blacken it
    worldGroup.add(moat);
  }
  // Where a hired crocodile makes its escape: a watered spot on the east side
  const MOAT_ESCAPE = new THREE.Vector3(CASTLE_CENTER.x + 18, 0, CASTLE_CENTER.z + 6);

  // ---- The wizard's very tall, very thin tower ----
  const TOWER_POS = new THREE.Vector3(98, 0, -95);
  const towerFacing = Math.atan2(92 - TOWER_POS.x, -98 - TOWER_POS.z); // toward the road
  const towerGroup = new THREE.Group();
  towerGroup.position.copy(TOWER_POS);

  const towerMat = new THREE.MeshStandardMaterial({ color: 0xa393d1, roughness: 0.85 });
  const towerRoofMat = new THREE.MeshStandardMaterial({ color: 0x3f3277, roughness: 0.7 });
  const towerBody = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 30, 14), towerMat);
  towerBody.position.y = 15;
  towerBody.castShadow = true;
  towerGroup.add(towerBody);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 6, 14), towerRoofMat);
  towerRoof.position.y = 33;
  towerRoof.castShadow = true;
  towerGroup.add(towerRoof);
  // Golden star on the very top
  const towerStar = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe15c, roughness: 0.3 })
  );
  towerStar.position.y = 36.4;
  towerGroup.add(towerStar);

  // Little glowing windows spiraling up the tower
  const towerWinMat = new THREE.MeshStandardMaterial({
    color: 0xffe98a,
    emissive: 0xcfa93a,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });
  for (let i = 0; i < 5; i++) {
    const angle = towerFacing + 0.9 + i * 1.25;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.12), towerWinMat);
    win.position.set(Math.sin(angle) * 1.85, 6 + i * 4.8, Math.cos(angle) * 1.85);
    win.rotation.y = angle;
    towerGroup.add(win);
  }

  // Shop door facing the road, with a sign
  const towerDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.15), gateDoorMat);
  towerDoor.position.set(Math.sin(towerFacing) * 2.0, 0.95, Math.cos(towerFacing) * 2.0);
  towerDoor.rotation.y = towerFacing;
  towerGroup.add(towerDoor);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), frameMat);
  sign.position.set(Math.sin(towerFacing) * 2.05, 2.6, Math.cos(towerFacing) * 2.05);
  sign.rotation.y = towerFacing;
  towerGroup.add(sign);

  worldGroup.add(towerGroup);
  obstacles.push({ x: TOWER_POS.x, z: TOWER_POS.z, radius: 2.6 });

  const WIZARD_POS = new THREE.Vector3(
    TOWER_POS.x + Math.sin(towerFacing) * 3.6,
    0,
    TOWER_POS.z + Math.cos(towerFacing) * 3.6
  );

  // Gate blocker: removed via openGate() once the release tax is paid
  const gateObstacle = { x: GATE_POS.x, z: GATE_POS.z, radius: 2.2 };
  obstacles.push(gateObstacle);
  function openGate() {
    const idx = obstacles.indexOf(gateObstacle);
    if (idx !== -1) obstacles.splice(idx, 1);
  }

  // ---- Fence around the whole Kingdom (instanced posts) ----
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
  postGeo.translate(0, 0.3, 0);
  const postCount = 220;
  const fenceMesh = new THREE.InstancedMesh(postGeo, fenceMat, postCount);
  for (let i = 0; i < postCount; i++) {
    const angle = (i / postCount) * Math.PI * 2;
    tmpMatrix.setPosition(
      Math.cos(angle) * WORLD_RADIUS,
      0,
      Math.sin(angle) * WORLD_RADIUS
    );
    fenceMesh.setMatrixAt(i, tmpMatrix);
  }
  worldGroup.add(fenceMesh);

  // ---- Drifting clouds ----
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const cloud = new THREE.Group();
    const puffCount = 3 + Math.floor(rand() * 2);
    for (let j = 0; j < puffCount; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1 + rand() * 0.6, 8, 8), cloudMat);
      puff.position.set(j * 1.1 - puffCount * 0.5, rand() * 0.3, rand() * 0.5);
      cloud.add(puff);
    }
    cloud.scale.setScalar(1.5 + rand() * 1.5);
    cloud.position.set(
      (rand() - 0.5) * WORLD_RADIUS * 2,
      14 + rand() * 8,
      (rand() - 0.5) * WORLD_RADIUS * 2
    );
    clouds.push(cloud);
    worldGroup.add(cloud);
  }

  // ---- Coins fall from the sky inside meteors ----
  // Roughly every two minutes a meteor streaks down somewhere in the
  // Kingdom and leaves a coin at the crash site. A column of smoke rises
  // from the spot for 90 seconds, guiding the way; after that the coin is
  // still there, but she'll have to remember where it fell.
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffc93c,
    emissive: 0x8a6a10,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.6,
  });
  const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 16);
  const coins = []; // filled by meteor landings
  function placeCoin(x, z) {
    const spinner = new THREE.Group();
    const coinMesh = new THREE.Mesh(coinGeo, coinMat);
    coinMesh.rotation.x = Math.PI / 2; // stand the coin on its edge
    coinMesh.castShadow = true;
    spinner.add(coinMesh);
    spinner.position.set(x, 0.6, z);
    worldGroup.add(spinner);
    coins.push({ x, z, spinner, taken: false });
  }
  function collectCoin(coin) {
    coin.taken = true;
    worldGroup.remove(coin.spinner);
  }

  const SMOKE_LIFETIME = 90; // seconds of guidance after a landing
  const METEOR_FLIGHT = 30; // seconds visible in the sky before touchdown
  const meteorMat = new THREE.MeshStandardMaterial({
    color: 0xff7733,
    emissive: 0xff5511,
    emissiveIntensity: 1.4,
    roughness: 0.6,
    fog: false, // a fireball should be visible from anywhere in the Kingdom
  });
  const meteorTrailMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0x9a938a,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false, // the column stays visible from across the Kingdom
  });

  const activeMeteors = []; // { mesh, from, to, t, duration }
  const activeSmokes = []; // { group, puffs, age, x, z }
  let meteorCountdown = 25 + Math.random() * 20; // first one comes quickly

  function pickLandingSpot() {
    for (let attempt = 0; attempt < 60; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.sqrt(Math.random()) * (WORLD_RADIUS - 25);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.hypot(x - CASTLE_CENTER.x, z - CASTLE_CENTER.z) < 30) continue;
      if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + 1.4)) continue;
      return { x, z };
    }
    return { x: 0, z: 20 }; // fallback: near the village, always reachable
  }

  function isValidLanding(x, z) {
    if (Math.hypot(x, z) > WORLD_RADIUS - 5) return false;
    if (Math.hypot(x - CASTLE_CENTER.x, z - CASTLE_CENTER.z) < 30) return false;
    if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + 1.4)) return false;
    return true;
  }

  const warningMat = new THREE.MeshBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const warningGeo = new THREE.CircleGeometry(1.3, 16);

  // Fired when a meteor touches down (main.js checks whether Julia got bonked)
  let onMeteorLand = null;
  function setMeteorLandHandler(fn) {
    onMeteorLand = fn;
  }

  function spawnMeteorAt(x, z, smokeLifetime = SMOKE_LIFETIME, flightSeconds = METEOR_FLIGHT) {
    // A glowing rock with a fiery trail, entering high up from a random
    // compass direction so it hangs in the sky before swooping down.
    const group = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 10), meteorMat);
    group.add(rock);
    const trail = new THREE.Mesh(new THREE.ConeGeometry(1.7, 10, 8, 1, true), meteorTrailMat);
    trail.position.y = 5.8; // sits "behind" the rock, along the flight path
    group.add(trail);

    // Enter LOW and far away -- a shallow streak just above the horizon.
    // The gameplay camera looks slightly downward, so anything high in the
    // sky would never be on screen; skimming the treeline keeps the whole
    // 30-second approach visible.
    const entryAngle = Math.random() * Math.PI * 2;
    const from = new THREE.Vector3(
      x + Math.cos(entryAngle) * 170,
      24 + Math.random() * 8,
      z + Math.sin(entryAngle) * 170
    );
    const to = new THREE.Vector3(x, 0.4, z);
    group.position.copy(from);
    // Point the trail back along the direction of travel
    const dir = to.clone().sub(from).normalize();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    worldGroup.add(group);

    // Cartoon-style warning: a growing shadow at the impact spot -- only
    // shown for the final seconds, so a quick-footed player can dodge
    const warning = new THREE.Mesh(warningGeo, warningMat.clone());
    warning.rotation.x = -Math.PI / 2;
    warning.position.set(x, 0.07, z);
    warning.visible = false;
    worldGroup.add(warning);
    activeMeteors.push({
      mesh: group,
      warning,
      from,
      to,
      t: 0,
      duration: flightSeconds,
      smokeLifetime,
    });
  }

  function spawnMeteor(playerPos) {
    // A third of the meteors aim close to Julia Aud -- watch the sky!
    if (playerPos && Math.random() < 0.35) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.5 + Math.random() * 7;
        const x = playerPos.x + Math.cos(angle) * dist;
        const z = playerPos.z + Math.sin(angle) * dist;
        if (isValidLanding(x, z)) {
          spawnMeteorAt(x, z);
          return;
        }
      }
    }
    const { x, z } = pickLandingSpot();
    spawnMeteorAt(x, z);
  }

  function startSmoke(x, z, lifetime) {
    const group = new THREE.Group();
    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), smokeMat.clone());
      // Stagger the puffs along the column so it looks alive immediately
      puff.userData.cycle = i / 7;
      puffs.push(puff);
      group.add(puff);
    }
    group.position.set(x, 0, z);
    worldGroup.add(group);
    activeSmokes.push({ group, puffs, age: 0, lifetime });
  }

  function updateMeteors(delta) {
    for (let i = activeMeteors.length - 1; i >= 0; i--) {
      const m = activeMeteors[i];
      m.t += delta;
      const k = Math.min(1, m.t / m.duration);
      // k^2 easing: drifts slowly across the sky, then swoops down at the end
      m.mesh.position.lerpVectors(m.from, m.to, k * k);
      // ...and grows as it comes in, per the laws of cartoon physics
      m.mesh.scale.setScalar(1 + k * 0.8);
      // The landing-spot shadow only appears for the final stretch
      const remaining = m.duration - m.t;
      if (remaining < 2.5) {
        m.warning.visible = true;
        m.warning.scale.setScalar(0.3 + (1 - remaining / 2.5) * 0.9);
      }
      if (k >= 1) {
        worldGroup.remove(m.mesh);
        worldGroup.remove(m.warning);
        activeMeteors.splice(i, 1);
        placeCoin(m.to.x, m.to.z);
        startSmoke(m.to.x, m.to.z, m.smokeLifetime);
        if (onMeteorLand) onMeteorLand(m.to.x, m.to.z);
      }
    }
  }

  const SMOKE_CYCLE = 4; // seconds for a puff to rise and dissolve
  function updateSmokes(delta) {
    for (let i = activeSmokes.length - 1; i >= 0; i--) {
      const s = activeSmokes[i];
      s.age += delta;
      if (s.age >= s.lifetime) {
        worldGroup.remove(s.group);
        activeSmokes.splice(i, 1);
        continue;
      }
      // Fade the whole column out over its last 8 seconds
      const globalFade = Math.min(1, (s.lifetime - s.age) / 8);
      s.puffs.forEach((puff) => {
        const phase = (s.age / SMOKE_CYCLE + puff.userData.cycle) % 1;
        puff.position.set(
          Math.sin(phase * 9 + puff.userData.cycle * 20) * 0.9 * phase,
          0.5 + phase * 17,
          Math.cos(phase * 7 + puff.userData.cycle * 15) * 0.9 * phase
        );
        const grow = 0.6 + phase * 2.2;
        puff.scale.setScalar(grow);
        puff.material.opacity = 0.5 * (1 - phase) * globalFade;
      });
    }
  }

  // ---- Mr. Tobias's lost spectacles, dropped on the castle road ----
  const glassesGroup = new THREE.Group();
  const glassesMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.4, metalness: 0.4 });
  [-0.22, 0.22].forEach((gx) => {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 18), glassesMat);
    lens.position.x = gx;
    glassesGroup.add(lens);
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), glassesMat);
  glassesGroup.add(bridge);
  glassesGroup.position.set(72, 0.5, -72); // right on the road, halfway to the castle
  worldGroup.add(glassesGroup);
  const glassesItem = { x: 72, z: -72, group: glassesGroup, taken: false };
  function collectGlasses() {
    glassesItem.taken = true;
    worldGroup.remove(glassesGroup);
  }

  // ---- The Baron's "investment tree" (a suspiciously ordinary tree) ----
  const STASH_POS = new THREE.Vector3(-90, 0, -110);
  const stashGroup = new THREE.Group();
  stashGroup.position.copy(STASH_POS);
  const stashTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.3, 8), trunkMat);
  stashTrunk.position.y = 0.65;
  stashTrunk.castShadow = true;
  const stashLeaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x5fbf4f, roughness: 0.9 })
  );
  stashLeaves.position.y = 1.7;
  stashLeaves.castShadow = true;
  // The hollow
  const hollow = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 1 })
  );
  hollow.position.set(0, 0.75, 0.26);
  stashGroup.add(stashTrunk, stashLeaves, hollow);
  // A little wooden sign that totally doesn't mean anything
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), trunkMat);
  signPost.position.set(0.9, 0.4, 0.6);
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.06), frameMat);
  signBoard.position.set(0.9, 0.85, 0.6);
  signBoard.rotation.y = 0.3;
  stashGroup.add(signPost, signBoard);
  // The pile of "invested" coins at the base
  const stashCoins = new THREE.Group();
  [
    [0.35, 0.1, 0.4],
    [0.5, 0.1, 0.15],
    [0.2, 0.1, 0.6],
    [0.42, 0.24, 0.32],
  ].forEach(([cx, cy, cz]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), coinMat);
    c.position.set(cx, cy, cz);
    stashCoins.add(c);
  });
  stashGroup.add(stashCoins);
  worldGroup.add(stashGroup);
  obstacles.push({ x: STASH_POS.x, z: STASH_POS.z, radius: 0.55 });
  function takeStash() {
    stashGroup.remove(stashCoins);
  }

  // ---- The engineer's time machine ----
  const ENGINEER_SPOT = new THREE.Vector3(-20, 0, -55);
  const machineGroup = new THREE.Group();
  machineGroup.position.set(ENGINEER_SPOT.x + 2.4, 0, ENGINEER_SPOT.z);

  const machineMat = new THREE.MeshStandardMaterial({
    color: 0xb87333, // coppery
    roughness: 0.35,
    metalness: 0.7,
  });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.0, 12), machineMat);
  pod.position.y = 1.0;
  pod.castShadow = true;
  machineGroup.add(pod);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xbdeeff,
    roughness: 0.15,
    transparent: true,
    opacity: 0.6,
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    domeMat
  );
  dome.position.y = 2.0;
  machineGroup.add(dome);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), machineMat);
  antenna.position.y = 3.2;
  machineGroup.add(antenna);
  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff5f5f, emissive: 0xaa2020, emissiveIntensity: 0.8 })
  );
  antennaTip.position.y = 3.8;
  machineGroup.add(antennaTip);
  // A big clock face on the front, its hands permanently confused
  const clockFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 20),
    new THREE.MeshStandardMaterial({ color: 0xfffbe8, roughness: 0.6 })
  );
  clockFace.position.set(0, 1.2, 1.22);
  machineGroup.add(clockFace);
  const handMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 });
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.02), handMat);
  hourHand.position.set(0, 1.28, 1.24);
  hourHand.rotation.z = 2.4;
  const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.02), handMat);
  minuteHand.position.set(0, 1.18, 1.24);
  minuteHand.rotation.z = -0.8;
  machineGroup.add(hourHand, minuteHand);
  worldGroup.add(machineGroup);
  obstacles.push({ x: ENGINEER_SPOT.x + 2.4, z: ENGINEER_SPOT.z, radius: 1.7 });

  // ---- Sky beacons: faint beams of light marking people worth meeting ----
  // Visible from far away (they ignore fog), each with a glowing dot on top.
  const beacons = {};
  const beaconBeamGeo = new THREE.CylinderGeometry(0.14, 0.22, 55, 8, 1, true);
  const beaconDotGeo = new THREE.SphereGeometry(0.85, 10, 10);
  function addBeacon(name, x, z, color) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.13, // vague, dreamy line rather than a spotlight
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false, // stays visible on the horizon
      side: THREE.DoubleSide,
    });
    const group = new THREE.Group();
    const beam = new THREE.Mesh(beaconBeamGeo, mat);
    beam.position.y = 27.5;
    const dotMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      fog: false,
    });
    const dot = new THREE.Mesh(beaconDotGeo, dotMat);
    dot.position.y = 55;
    group.add(beam, dot);
    group.position.set(x, 0, z);
    worldGroup.add(group);
    beacons[name] = group;
  }
  function removeBeacon(name) {
    const b = beacons[name];
    if (b) {
      worldGroup.remove(b);
      delete beacons[name];
    }
  }
  // For beacons attached to characters that wander (the Baron paces, Dash
  // never stops) -- main.js calls this each frame
  function moveBeacon(name, x, z) {
    const b = beacons[name];
    if (b) b.position.set(x, 0, z);
  }
  const QUEST_YELLOW = 0xffe15c;
  addBeacon('bramble', 55, 25, QUEST_YELLOW);
  addBeacon('baker', -65, 45, QUEST_YELLOW);
  addBeacon('sylvie', -45, -75, QUEST_YELLOW);
  addBeacon('tobias', 85, 0, QUEST_YELLOW);
  addBeacon('wizard', WIZARD_POS.x, WIZARD_POS.z, 0xa78bfa);
  addBeacon('engineer', ENGINEER_SPOT.x, ENGINEER_SPOT.z, 0x6ec6ff);
  addBeacon('baron', 5, 3, QUEST_YELLOW); // follows him as he paces
  addBeacon('dragon', -58, -32, 0x6dbf5e);
  addBeacon('runner', -95, 85, 0xff8c69); // follows him as he runs
  addBeacon('crocman', 55, -60, 0x3fae6b); // the crocodile hustler
  addBeacon('farmer', -140, 110, 0xffcf6e); // the far-away chicken farmer
  addBeacon('prince', 75, -35, 0xc9a0ff); // Prince Percival and Gerald
  addBeacon('priya', -18, 22, 0x7fe6c0); // Priya, the kind villager

  // The dragon is a large, permanent, immovable object (his words)
  obstacles.push({ x: -58, z: -32, radius: 3.4 });

  // Where the quest folk stand (main.js spawns the NPCs here)
  const npcSpots = {
    bramble: new THREE.Vector3(55, 0, 25),
    baker: new THREE.Vector3(-65, 0, 45),
    sylvie: new THREE.Vector3(-45, 0, -75),
    tobias: new THREE.Vector3(85, 0, 0),
    engineer: ENGINEER_SPOT.clone(),
    cat: new THREE.Vector3(20, 0, -40),
    dragon: new THREE.Vector3(-58, 0, -32),
    crocman: new THREE.Vector3(55, 0, -60),
    farmer: new THREE.Vector3(-140, 0, 110),
    prince: new THREE.Vector3(75, 0, -35),
    priya: new THREE.Vector3(-18, 0, 22),
    raceFinish: new THREE.Vector3(104, 0, -110), // road's end, short of the guard
  };

  // Where Sofia is held (inside the castle courtyard). The HUD distance
  // points here, so the castle is easy to find.
  const sofiaPosition = SOFIA_POS.clone();

  scene.add(worldGroup);

  let sparkleTime = 0;
  function update(delta, running = true, playerPos = null) {
    clouds.forEach((cloud, i) => {
      cloud.position.x += delta * (0.4 + i * 0.05);
      if (cloud.position.x > WORLD_RADIUS + 20) cloud.position.x = -WORLD_RADIUS - 20;
    });
    // Spin and bob the collectibles so they catch the eye
    sparkleTime += delta;
    coins.forEach((coin, i) => {
      if (coin.taken) return;
      coin.spinner.rotation.y += delta * 2.2;
      coin.spinner.position.y = 0.6 + Math.sin(sparkleTime * 2 + i) * 0.08;
    });
    if (!glassesItem.taken) {
      glassesGroup.rotation.y += delta * 1.6;
      glassesGroup.position.y = 0.5 + Math.sin(sparkleTime * 2) * 0.06;
    }
    // Meteors only fall while the clock is running
    if (running) {
      meteorCountdown -= delta;
      if (meteorCountdown <= 0) {
        spawnMeteor(playerPos);
        meteorCountdown = 105 + Math.random() * 30; // roughly every two minutes
      }
    }
    updateMeteors(delta);
    updateSmokes(delta);
  }

  return {
    group: worldGroup,
    worldRadius: WORLD_RADIUS,
    obstacles,
    sofiaPosition,
    castle: {
      center: CASTLE_CENTER.clone(),
      gatePos: GATE_POS.clone(),
      guardPos: GUARD_POS.clone(),
      moatEscape: MOAT_ESCAPE.clone(),
    },
    wizardTower: {
      pos: TOWER_POS.clone(),
      wizardPos: WIZARD_POS.clone(),
      facing: towerFacing,
    },
    coins,
    collectCoin,
    setMeteorLandHandler,
    debugSpawnMeteor: spawnMeteorAt, // for testing from the console
    glassesItem,
    collectGlasses,
    stashPos: STASH_POS.clone(),
    takeStash,
    npcSpots,
    addBeacon,
    removeBeacon,
    moveBeacon,
    openGate,
    update,
  };
}
