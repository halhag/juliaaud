import * as THREE from './lib/three.module.js';
import { createWorld } from './world.js';
import { createCharacter } from './character.js';
import {
  createBaron,
  createGuard,
  createSofia,
  createWizard,
  createVillager,
  createCat,
  createDragon,
  createRunner,
  createCrocodile,
} from './npc.js';
import {
  startDialogue,
  isDialogueActive,
  BARON_TREE,
  GUARD_TREE,
  WIZARD_TREE,
  WIZARD_SOLD_TREE,
  BRAMBLE_TREES,
  CAT_TREES,
  BAKER_TREES,
  SYLVIE_TREES,
  TOBIAS_TREES,
  ENGINEER_TREE,
  STASH_TREES,
  DRAGON_TREE,
  RUNNER_TREES,
  CROCMAN_TREES,
  CROC_SLIP_TREE,
  FARMER_TREES,
} from './dialogue.js';

const canvas = document.getElementById('game-canvas');

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---- Scene ----
const scene = new THREE.Scene();
const skyColor = 0xbdeaff;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 50, 190);

// ---- Camera (third-person, behind the back) ----
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const cameraOffset = new THREE.Vector3(0, 3.4, -6.2);
const cameraLookOffset = new THREE.Vector3(0, 1.2, 0);
const currentCameraPos = new THREE.Vector3();
const currentLookAt = new THREE.Vector3();

// ---- Lights ----
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8fdb6a, 0.9);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff2d6, 1.1);
sunLight.position.set(10, 16, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -24;
sunLight.shadow.camera.right = 24;
sunLight.shadow.camera.top = 24;
sunLight.shadow.camera.bottom = -24;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 50;
sunLight.shadow.bias = -0.0015;
scene.add(sunLight);
scene.add(sunLight.target);

// ---- World & Character ----
const world = createWorld(scene);
const character = createCharacter();
scene.add(character.root);

// ---- NPCs ----
const baron = createBaron(scene);
const guard = createGuard(scene, world.castle.guardPos);
const sofia = createSofia(scene, world.sofiaPosition);
const wizard = createWizard(scene, world.wizardTower.wizardPos, world.wizardTower.facing);
let wizardSold = false;

// Quest folk in the hamlets, the engineer, and one very orange cat
const bramble = createVillager(scene, 'MrsBramble', world.npcSpots.bramble, Math.PI, {
  shirtColor: 0xd9534f,
  pantsColor: 0x8a5a3a,
  hairColor: 0xdedede,
  bow: true,
});
const baker = createVillager(scene, 'BakerBerta', world.npcSpots.baker, Math.PI / 2, {
  shirtColor: 0xfff2c2,
  pantsColor: 0x6a4526,
  hairColor: 0x5a3a1a,
  bow: true,
});
const sylvie = createVillager(scene, 'Sylvie', world.npcSpots.sylvie, -Math.PI / 2, {
  shirtColor: 0x6dbf5e,
  pantsColor: 0xffe15c,
  hairColor: 0x5a3a1a,
  bow: true,
});
const tobias = createVillager(scene, 'MrTobias', world.npcSpots.tobias, Math.PI, {
  shirtColor: 0x6ea8ff,
  pantsColor: 0x4a4a5a,
  hairColor: 0xdedede,
  bow: false,
  mustache: true,
});
const engineer = createVillager(scene, 'EdisonGearwhistle', world.npcSpots.engineer, 0.6, {
  shirtColor: 0x4a6a8a,
  pantsColor: 0x8a5a3a,
  hairColor: 0x9a4a1a,
  bow: false,
});
const cat = createCat(scene, world.npcSpots.cat);
const dragon = createDragon(scene, world.npcSpots.dragon);
const runner = createRunner(scene);

// Snap Wetsleeves, the crocodile hustler, with Chompers waiting at his feet
const crocman = createVillager(scene, 'SnapWetsleeves', world.npcSpots.crocman, -2.2, {
  shirtColor: 0x3f7d55,
  pantsColor: 0x2e4a3a,
  hairColor: 0x2a2a2a,
  bow: false,
});
const crocodile = createCrocodile(
  scene,
  world.npcSpots.crocman.clone().add(new THREE.Vector3(1.8, 0, 0.6))
);
// Old MacFeathers, the far-away chicken farmer
const farmer = createVillager(scene, 'OldMacFeathers', world.npcSpots.farmer, 1.0, {
  shirtColor: 0xc94f3a,
  pantsColor: 0x5a6a3a,
  hairColor: 0xcccccc,
  bow: false,
  beard: true,
});

// Dash Thunderlegs' race: roaming -> racing -> settle -> (chasing) -> done
const runnerQuest = {
  state: 'roaming', // 'roaming' | 'racing' | 'settle' | 'chasing' | 'done'
  cheated: false,
  playerWon: false,
  settleShown: false,
  chaseGrace: 0,
};
let dragonMet = false;

// Quest progress. Each quest moves new -> active -> (found) -> done.
const quests = {
  cat: 'new',
  pie: 'new',
  glasses: 'new',
  hasPie: false,
  hasGlasses: false,
  scammed: 0, // coins lost to the Baron (the "investment tree" pays these back doubled)
  stashTaken: false,
  crocHired: false, // paid Snap; Chompers is following (or has slid away)
  crocSlipShown: false,
  hasChickens: false, // bought from the farmer, not yet given to the dragon
  gaveChickensToDragon: false,
};
const ENGAGE_DISTANCE = 3.2; // how close before an NPC starts talking
const GUARD_ENGAGE_DISTANCE = 5; // the guard challenges from a bit further out
const REENGAGE_DISTANCE = 7; // must walk this far away before re-engaging
const WIN_DISTANCE = 1.8; // close enough to hug Sofia

character.root.position.set(0, 0, 0);

// Start the camera in a sensible spot immediately (no lerp-in from origin)
currentCameraPos.copy(character.root.position).add(cameraOffset);
camera.position.copy(currentCameraPos);
currentLookAt.copy(character.root.position).add(cameraLookOffset);
camera.lookAt(currentLookAt);

// ---- Input ----
const keys = { forward: false, backward: false, turnLeft: false, turnRight: false };
const keyMap = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'turnLeft', ArrowLeft: 'turnLeft',
  KeyD: 'turnRight', ArrowRight: 'turnRight',
};
window.addEventListener('keydown', (e) => {
  const action = keyMap[e.code];
  if (action) keys[action] = true;
});
window.addEventListener('keyup', (e) => {
  const action = keyMap[e.code];
  if (action) keys[action] = false;
});

// ---- Touch: invisible virtual joystick (phones and tablets) ----
// Touch the canvas anywhere and drag: up/down walks, left/right turns.
// No visual widget -- your finger IS the joystick. Dialogue buttons still
// take ordinary taps.
const joystick = { active: false, x: 0, y: 0, touchId: null, baseX: 0, baseY: 0 };
const JOYSTICK_RADIUS = 55; // px of drag for full speed

canvas.addEventListener('touchstart', (e) => {
  if (joystick.active) return;
  const touch = e.changedTouches[0];
  joystick.active = true;
  joystick.touchId = touch.identifier;
  joystick.baseX = touch.clientX;
  joystick.baseY = touch.clientY;
  joystick.x = 0;
  joystick.y = 0;
  // First touch: swap the keyboard hint for a touch hint
  document.getElementById('hint-banner').textContent = 'Drag your finger to walk around!';
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!joystick.active) return;
  for (const touch of e.changedTouches) {
    if (touch.identifier !== joystick.touchId) continue;
    let dx = touch.clientX - joystick.baseX;
    let dy = touch.clientY - joystick.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    joystick.x = dx / JOYSTICK_RADIUS; // -1 .. 1, right is positive
    joystick.y = dy / JOYSTICK_RADIUS; // -1 .. 1, down is positive
  }
  e.preventDefault();
}, { passive: false });

function endJoystickTouch(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier !== joystick.touchId) continue;
    joystick.active = false;
    joystick.touchId = null;
    joystick.x = 0;
    joystick.y = 0;
  }
}
canvas.addEventListener('touchend', endJoystickTouch);
canvas.addEventListener('touchcancel', endJoystickTouch);

// ---- Movement tuning ----
const WALK_SPEED = 7.2; // units per second (the zap doubles it again)
const TURN_SPEED = 2.6; // radians per second
const CHARACTER_RADIUS = 0.35; // rough collision radius around Julia Aud
const moveDir = new THREE.Vector3();
const candidatePos = new THREE.Vector3();

// ---- Game state & HUD ----
const gameState = {
  gold: 10,
  timeLeftSec: 15 * 60, // 15 minutes, counting down
  speedMultiplier: 1, // doubled by Wizzo's Zoom-Zoom Zap
  stunnedTimer: 0, // seconds left of meteor-bonk dizziness
};

// ---- Meteor bonks: comic dizziness, nothing worse ----
const STUN_SECONDS = 3;
const dizzyStars = new THREE.Group();
{
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffe15c });
  for (let i = 0; i < 3; i++) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), starMat);
    const angle = (i / 3) * Math.PI * 2;
    star.position.set(Math.cos(angle) * 0.45, 0, Math.sin(angle) * 0.45);
    dizzyStars.add(star);
  }
  dizzyStars.position.y = 1.75; // circling just above her head
  dizzyStars.visible = false;
  character.root.add(dizzyStars);
}

world.setMeteorLandHandler((x, z) => {
  if (isDialogueActive() || introOpen || won) return;
  const dist = Math.hypot(x - character.root.position.x, z - character.root.position.z);
  if (dist < 1.7) {
    gameState.stunnedTimer = STUN_SECONDS;
    dizzyStars.visible = true;
  }
});
const statGoldEl = document.getElementById('stat-gold');
const statTimeEl = document.getElementById('stat-time');
const statDistanceEl = document.getElementById('stat-distance');
let hintBannerEl = document.getElementById('hint-banner');

// ---- Intro story box ----
// Shown once at startup; the clock and the controls only start once it's
// closed, and closing removes it for good.
let introOpen = true;
document.getElementById('intro-close').addEventListener('click', () => {
  introOpen = false;
  document.getElementById('intro-overlay').remove();
});

function updateHud() {
  statGoldEl.textContent = String(gameState.gold);

  const totalSec = Math.max(0, Math.ceil(gameState.timeLeftSec));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  statTimeEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;

  // Horizontal (ground-plane) distance from Julia Aud to Sofia's hiding spot,
  // recalculated every frame as she walks around.
  const dx = world.sofiaPosition.x - character.root.position.x;
  const dz = world.sofiaPosition.z - character.root.position.z;
  statDistanceEl.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
}

// ---- NPC conversation triggering ----
function distanceTo(obj) {
  const dx = obj.root.position.x - character.root.position.x;
  const dz = obj.root.position.z - character.root.position.z;
  return Math.hypot(dx, dz);
}

function faceEachOther(npc) {
  keys.forward = keys.backward = keys.turnLeft = keys.turnRight = false;
  npc.startTalking(character.root.position);
  const dx = npc.root.position.x - character.root.position.x;
  const dz = npc.root.position.z - character.root.position.z;
  character.root.rotation.y = Math.atan2(dx, dz);
}

const goldCallbacks = {
  getGold: () => gameState.gold,
  spendGold: (n) => {
    gameState.gold -= n;
  },
};

function finishRunnerQuest() {
  runnerQuest.state = 'done';
  world.removeBeacon('runner');
  runner.dismount(); // Gerald is free (if he was ever fetched)
  runner.resumeIdle(); // jogs back to his loop, satisfied
}

function handleRunnerSettleOutcome(outcome) {
  if (outcome === 'collect') {
    gameState.gold += 2; // she won the bet
    finishRunnerQuest();
  } else if (outcome === 'settled') {
    finishRunnerQuest(); // payAttempt already took the 2 coins
  } else {
    // 'refuse': the chase begins (and never ends until she pays)
    runnerQuest.state = 'chasing';
    runnerQuest.chaseGrace = 4; // head start, so she can actually flee
    runner.startChase();
  }
}

function maybeStartConversation() {
  if (isDialogueActive()) return;
  if (runnerQuest.state === 'racing') return; // no chit-chat mid-race!

  // The tired old dragon (a wide target; he is not small)
  if (
    dragon.state === 'idle' &&
    !dragon.hasBeenTalkedTo &&
    distanceTo(dragon) <= 5.5
  ) {
    keys.forward = keys.backward = keys.turnLeft = keys.turnRight = false;
    dragon.startTalking();
    const ddx = dragon.root.position.x - character.root.position.x;
    const ddz = dragon.root.position.z - character.root.position.z;
    character.root.rotation.y = Math.atan2(ddx, ddz);
    startDialogue(DRAGON_TREE, {
      ...goldCallbacks,
      showIf: (key) =>
        key === 'hasChickens' && quests.hasChickens && !quests.gaveChickensToDragon,
      action: (key) => {
        if (key === 'giveChickens') {
          quests.hasChickens = false;
          quests.gaveChickensToDragon = true;
          document.getElementById('stat-chicken-row').style.display = 'none';
          dragon.receiveChickens();
        }
      },
      onEnd: () => {
        if (!dragonMet) {
          dragonMet = true;
          world.removeBeacon('dragon');
        }
        dragon.resumeIdle();
      },
    });
    return;
  }

  // Dash Thunderlegs: the challenge (only catchable by cutting him off)
  if (
    runnerQuest.state === 'roaming' &&
    runner.state === 'looping' &&
    !runner.hasBeenTalkedTo &&
    distanceTo(runner) <= 3.2
  ) {
    faceEachOther(runner);
    startDialogue(RUNNER_TREES.challenge, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'race') {
          runnerQuest.state = 'racing';
          runner.startRace(world.npcSpots.raceFinish);
        } else {
          runner.resumeIdle();
        }
      },
    });
    return;
  }

  // Post-race settling, at the finish line
  if (runnerQuest.state === 'settle' && !runnerQuest.settleShown && distanceTo(runner) <= 6) {
    runnerQuest.settleShown = true;
    faceEachOther(runner);
    const tree = runnerQuest.playerWon
      ? RUNNER_TREES.playerWins
      : runnerQuest.cheated
        ? RUNNER_TREES.cheated
        : RUNNER_TREES.lostFair;
    startDialogue(tree, { ...goldCallbacks, onEnd: handleRunnerSettleOutcome });
    return;
  }

  // The eternal chase: caught!
  if (
    runnerQuest.state === 'chasing' &&
    runnerQuest.chaseGrace <= 0 &&
    distanceTo(runner) <= 1.7
  ) {
    faceEachOther(runner);
    startDialogue(RUNNER_TREES.caught, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'settled') {
          finishRunnerQuest();
        } else {
          runnerQuest.chaseGrace = 4; // another head start
          runner.startChase();
        }
      },
    });
    return;
  }

  // Snap Wetsleeves, the crocodile hustler
  if (
    crocman.state === 'idle' &&
    !crocman.hasBeenTalkedTo &&
    distanceTo(crocman) <= ENGAGE_DISTANCE
  ) {
    faceEachOther(crocman);
    const tree = crocodile.state === 'idle' ? CROCMAN_TREES.offer : CROCMAN_TREES.hired;
    startDialogue(quests.crocHired ? CROCMAN_TREES.spent : tree, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'hired') {
          quests.crocHired = true;
          crocodile.follow();
          world.removeBeacon('crocman');
        }
        crocman.resumeIdle();
      },
    });
    return;
  }

  // Old MacFeathers, the far-away chicken farmer
  if (
    farmer.state === 'idle' &&
    !farmer.hasBeenTalkedTo &&
    distanceTo(farmer) <= ENGAGE_DISTANCE
  ) {
    faceEachOther(farmer);
    const soldOut = quests.hasChickens || quests.gaveChickensToDragon;
    startDialogue(soldOut ? FARMER_TREES.sold : FARMER_TREES.sell, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'boughtChickens') {
          quests.hasChickens = true;
          document.getElementById('stat-chicken-row').style.display = '';
          world.removeBeacon('farmer');
        }
        farmer.resumeIdle();
      },
    });
    return;
  }

  // Baron von Patch (village)
  if (
    baron.state === 'pacing' &&
    !baron.hasBeenTalkedTo &&
    distanceTo(baron) <= ENGAGE_DISTANCE
  ) {
    faceEachOther(baron);
    const goldBefore = gameState.gold;
    startDialogue(BARON_TREE, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'gave') {
          quests.scammed = goldBefore - gameState.gold; // the stash pays it back doubled
          baron.leaveForever(); // "I'll be right back!" (he will not)
          world.removeBeacon('baron');
        } else if (outcome === 'zero') {
          baron.goHuffy();
          world.removeBeacon('baron');
        } else {
          baron.resumePacing(); // left politely -- the offer (and the light) still stands
        }
      },
    });
    return;
  }

  // The castle gate guard
  if (
    guard.state === 'guarding' &&
    !guard.hasBeenTalkedTo &&
    distanceTo(guard) <= GUARD_ENGAGE_DISTANCE
  ) {
    faceEachOther(guard);
    startDialogue(GUARD_TREE, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'paid') {
          world.openGate();
          guard.stepAside();
        } else {
          guard.resumeGuarding();
        }
      },
    });
    return;
  }

  // Wizzo the wizard at his tower shop (greets customers from a bit away,
  // like the guard does)
  if (
    wizard.state === 'idle' &&
    !wizard.hasBeenTalkedTo &&
    distanceTo(wizard) <= 4.2
  ) {
    faceEachOther(wizard);
    startDialogue(wizardSold ? WIZARD_SOLD_TREE : WIZARD_TREE, {
      ...goldCallbacks,
      onEnd: (outcome) => {
        if (outcome === 'paid') {
          wizardSold = true;
          gameState.speedMultiplier = 2;
          document.getElementById('stat-speed-row').style.display = '';
          world.removeBeacon('wizard');
        }
        wizard.resumeIdle();
      },
    });
    return;
  }

  // Quest folk, the engineer, and the cat
  for (const enc of questEncounters) {
    const idle = enc.npc.state === 'idle' || enc.npc.state === 'lost' || enc.npc.state === 'home';
    if (!idle || enc.npc.hasBeenTalkedTo) continue;
    if (distanceTo(enc.npc) > (enc.radius || 2.8)) continue;
    faceEachOther(enc.npc);
    startDialogue(enc.getTree(), {
      ...goldCallbacks,
      ...(enc.callbacks || {}),
      onEnd: (outcome) => {
        enc.onEnd(outcome);
        enc.npc.resumeIdle();
      },
    });
    return;
  }

  // The Baron's stash tree (a place, not a person)
  if (!quests.stashTaken) {
    const dx = world.stashPos.x - character.root.position.x;
    const dz = world.stashPos.z - character.root.position.z;
    if (Math.hypot(dx, dz) <= 3.0) {
      keys.forward = keys.backward = keys.turnLeft = keys.turnRight = false;
      startDialogue(
        quests.scammed > 0 ? STASH_TREES.scammed : STASH_TREES.clean,
        {
          ...goldCallbacks,
          onEnd: (outcome) => {
            if (outcome === 'stash') {
              gameState.gold += quests.scammed > 0 ? quests.scammed * 2 : 3;
              quests.stashTaken = true;
              world.takeStash();
            }
          },
        },
        { scammed: quests.scammed }
      );
    }
  }
}

// Encounter table for the quest NPCs. getTree picks dialogue by quest state;
// onEnd applies the consequences.
const questEncounters = [
  {
    npc: bramble,
    getTree: () => BRAMBLE_TREES[quests.cat],
    onEnd: (outcome) => {
      if (outcome === 'accept') quests.cat = 'active';
      if (outcome === 'reward') {
        gameState.gold += 5;
        quests.cat = 'done';
        world.removeBeacon('bramble');
      }
    },
  },
  {
    npc: cat,
    radius: 1.6,
    getTree: () =>
      quests.cat === 'active'
        ? CAT_TREES.found
        : cat.state === 'home'
          ? CAT_TREES.home
          : CAT_TREES.ignore,
    onEnd: (outcome) => {
      if (outcome === 'catFound') {
        quests.cat = 'found';
        cat.goHome(world.npcSpots.bramble);
      }
    },
  },
  {
    npc: baker,
    getTree: () => BAKER_TREES[quests.pie === 'done' ? 'done' : quests.pie],
    onEnd: (outcome) => {
      if (outcome === 'accept') {
        quests.pie = 'active';
        quests.hasPie = true;
        document.getElementById('stat-pie-row').style.display = '';
        world.removeBeacon('baker');
      }
    },
  },
  {
    npc: sylvie,
    getTree: () =>
      quests.hasPie
        ? SYLVIE_TREES.deliver
        : quests.pie === 'done'
          ? SYLVIE_TREES.done
          : SYLVIE_TREES.noPie,
    onEnd: (outcome) => {
      if (outcome === 'reward') {
        gameState.gold += 4;
        quests.hasPie = false;
        quests.pie = 'done';
        document.getElementById('stat-pie-row').style.display = 'none';
        world.removeBeacon('sylvie');
      }
    },
  },
  {
    npc: tobias,
    getTree: () =>
      quests.glasses === 'done'
        ? TOBIAS_TREES.done
        : quests.hasGlasses
          ? TOBIAS_TREES.found
          : TOBIAS_TREES[quests.glasses],
    onEnd: (outcome) => {
      if (outcome === 'accept') quests.glasses = 'active';
      if (outcome === 'reward') {
        gameState.gold += 5;
        quests.hasGlasses = false;
        quests.glasses = 'done';
        document.getElementById('stat-glasses-row').style.display = 'none';
        world.removeBeacon('tobias');
      }
    },
  },
  {
    npc: engineer,
    radius: 3.2,
    callbacks: {
      // The house edge: 40% back in time (three minutes gained),
      // 60% forward (three minutes lost)
      rideTime: () => {
        const gain = Math.random() < 0.4 ? 180 : -180;
        gameState.timeLeftSec = Math.max(0, gameState.timeLeftSec + gain);
        return gain;
      },
    },
    getTree: () => ENGINEER_TREE,
    onEnd: () => {},
  },
];

// ---- Winning & losing ----
let won = false;
let lost = false;
document.getElementById('win-restart').addEventListener('click', () => location.reload());
document.getElementById('lose-restart').addEventListener('click', () => location.reload());

function checkLose() {
  if (won || lost) return;
  if (gameState.timeLeftSec > 0) return;
  lost = true;
  document.getElementById('lose-overlay').style.display = 'flex';
}

function checkWin() {
  if (won) return;
  const dx = world.sofiaPosition.x - character.root.position.x;
  const dz = world.sofiaPosition.z - character.root.position.z;
  if (Math.hypot(dx, dz) > WIN_DISTANCE) return;
  won = true;
  document.getElementById('win-overlay').style.display = 'flex';
}

// Dev-only hook for manual/automated testing from the console; harmless to
// leave in, not surfaced anywhere in the UI.
window.__debug = {
  character,
  world,
  THREE,
  camera,
  gameState,
  baron,
  guard,
  sofia,
  wizard,
  dragon,
  runner,
  runnerQuest,
  crocman,
  crocodile,
  farmer,
  quests,
};

// ---- Main loop ----
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  const inDialogue = isDialogueActive() || introOpen || won || lost;

  // Meteor-bonk dizziness: she spins in place, stars circle her head
  const stunned = gameState.stunnedTimer > 0;
  if (stunned) {
    gameState.stunnedTimer = Math.max(0, gameState.stunnedTimer - delta);
    character.root.rotation.y += 9 * delta;
    dizzyStars.rotation.y -= 6 * delta;
    if (gameState.stunnedTimer === 0) dizzyStars.visible = false;
  }

  // Turning (frozen while talking or seeing stars)
  const canAct = !inDialogue && !stunned;
  // Merge keyboard and joystick into analog inputs (-1..1)
  const DEADZONE = 0.18;
  let turnInput = (keys.turnRight ? 1 : 0) - (keys.turnLeft ? 1 : 0);
  let forwardInput = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
  if (joystick.active) {
    turnInput = Math.abs(joystick.x) > DEADZONE ? joystick.x : 0;
    forwardInput = Math.abs(joystick.y) > DEADZONE ? -joystick.y : 0; // drag up = forward
  }
  if (canAct && turnInput !== 0) {
    character.root.rotation.y -= TURN_SPEED * turnInput * delta;
  }

  // Forward/back movement along facing direction (frozen while talking)
  const isMoving = canAct && forwardInput !== 0;
  if (isMoving) {
    moveDir.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), character.root.rotation.y);
    candidatePos
      .copy(character.root.position)
      .addScaledVector(moveDir, forwardInput * WALK_SPEED * gameState.speedMultiplier * delta);

    // Push the candidate position out of any obstacle it would land inside
    // (simple circle-vs-circle collision against houses and trees).
    for (const obstacle of world.obstacles) {
      const dx = candidatePos.x - obstacle.x;
      const dz = candidatePos.z - obstacle.z;
      const minDist = obstacle.radius + CHARACTER_RADIUS;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = minDist / dist;
        candidatePos.x = obstacle.x + dx * push;
        candidatePos.z = obstacle.z + dz * push;
      }
    }

    // Keep the character within the fenced playable area
    const distFromCenter = Math.hypot(candidatePos.x, candidatePos.z);
    if (distFromCenter > world.worldRadius - 0.6) {
      const scale = (world.worldRadius - 0.6) / distFromCenter;
      candidatePos.x *= scale;
      candidatePos.z *= scale;
    }

    character.root.position.x = candidatePos.x;
    character.root.position.z = candidatePos.z;
  }

  // Faster feet need faster steps (and the zap makes them a blur)
  character.update(delta, isMoving, 12 * gameState.speedMultiplier);
  world.update(delta, !introOpen && !won && !lost, character.root.position);
  baron.update(delta);
  guard.update(delta);
  sofia.update(delta);
  wizard.update(delta);
  dragon.update(delta);
  runner.update(delta, character.root.position);
  crocman.update(delta);
  farmer.update(delta);
  for (const enc of questEncounters) enc.npc.update(delta);

  // ---- Chompers the crocodile ----
  crocodile.update(
    delta,
    character.root.position,
    WALK_SPEED * gameState.speedMultiplier,
    world.castle.center
  );
  // When Chompers reaches the moat and vanishes, play the little payoff once
  if (
    crocodile.isGone() &&
    !quests.crocSlipShown &&
    !isDialogueActive() &&
    !introOpen &&
    !won &&
    !lost
  ) {
    quests.crocSlipShown = true;
    keys.forward = keys.backward = keys.turnLeft = keys.turnRight = false;
    startDialogue(CROC_SLIP_TREE, { ...goldCallbacks, onEnd: () => {} });
  }

  // ---- The race to the castle ----
  if (runnerQuest.state === 'racing') {
    const finish = world.npcSpots.raceFinish;
    const playerDist = Math.hypot(
      finish.x - character.root.position.x,
      finish.z - character.root.position.z
    );
    const runnerDist = runner.distanceToTarget();
    // The dirty secret: if she's zapped AND takes a real lead, out comes Gerald
    if (
      !runnerQuest.cheated &&
      gameState.speedMultiplier === 2 &&
      runnerDist - playerDist > 6
    ) {
      runner.cheat();
      runnerQuest.cheated = true;
    }
    if (playerDist < 4 && runner.state !== 'waiting') {
      runnerQuest.playerWon = true;
      runnerQuest.state = 'settle'; // he'll arrive shortly, fuming
    } else if (runner.state === 'waiting') {
      runnerQuest.playerWon = false;
      runnerQuest.state = 'settle';
    }
  }
  if (runnerQuest.chaseGrace > 0) {
    runnerQuest.chaseGrace -= delta;
  }

  // Guiding lights follow the wanderers they belong to
  world.moveBeacon('baron', baron.root.position.x, baron.root.position.z);
  world.moveBeacon('runner', runner.root.position.x, runner.root.position.z);

  // Once she has walked far enough away, NPCs may re-engage (unless huffy,
  // gone for good, or stepped aside)
  for (const npc of [
    baron,
    guard,
    wizard,
    dragon,
    runner,
    crocman,
    farmer,
    ...questEncounters.map((e) => e.npc),
  ]) {
    if (npc.hasBeenTalkedTo && !inDialogue && distanceTo(npc) > REENGAGE_DISTANCE) {
      npc.hasBeenTalkedTo = false;
    }
  }
  if (!stunned) maybeStartConversation();
  checkLose();

  // Pick up coins (and Mr. Tobias's spectacles) by walking over them
  if (!inDialogue) {
    for (const coin of world.coins) {
      if (coin.taken) continue;
      if (
        Math.hypot(
          coin.x - character.root.position.x,
          coin.z - character.root.position.z
        ) < 1.0
      ) {
        world.collectCoin(coin);
        gameState.gold += 1;
      }
    }
    if (
      !world.glassesItem.taken &&
      Math.hypot(
        world.glassesItem.x - character.root.position.x,
        world.glassesItem.z - character.root.position.z
      ) < 1.0
    ) {
      world.collectGlasses();
      quests.hasGlasses = true;
      document.getElementById('stat-glasses-row').style.display = '';
    }
  }
  checkWin();

  // Keep the shadow-casting sun centered on Julia Aud -- the world is far
  // too big for one shadow map to cover it all
  sunLight.position.set(
    character.root.position.x + 10,
    16,
    character.root.position.z + 8
  );
  sunLight.target.position.set(character.root.position.x, 0, character.root.position.z);

  // Tick the countdown (only once the intro is closed) and refresh the stats box
  if (!introOpen) {
    gameState.timeLeftSec = Math.max(0, gameState.timeLeftSec - delta);
  }
  // The how-to-move hint has served its purpose after the first minute.
  // Removing (not just hiding) the element keeps the dialogue system's
  // show/hide toggling from ever resurrecting it.
  if (hintBannerEl && 15 * 60 - gameState.timeLeftSec >= 60) {
    hintBannerEl.remove();
    hintBannerEl = null;
  }
  updateHud();

  // Smooth third-person camera follow
  const desiredOffset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), character.root.rotation.y);
  const desiredPos = character.root.position.clone().add(desiredOffset);
  currentCameraPos.lerp(desiredPos, 1 - Math.pow(0.001, delta));
  camera.position.copy(currentCameraPos);

  const desiredLookAt = character.root.position.clone().add(cameraLookOffset);
  currentLookAt.lerp(desiredLookAt, 1 - Math.pow(0.0001, delta));
  camera.lookAt(currentLookAt);

  renderer.render(scene, camera);
}
animate();

// ---- Resize handling ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
