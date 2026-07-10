// Dialogue system: the NPC always speaks first, then Julia Aud picks one of
// three things to say. Node choice kinds:
//   {go: nodeId}      -- jump to another node
//   {leave: true}     -- Baron-style leaving: the FIRST attempt triggers a
//                        harder sales pitch; only the second lets her go
//   {picker: true}    -- open the 0..gold coin amount picker (Baron's scam)
//   {payAttempt: N}   -- try to pay N coins (guard); goes to 'paid' node if
//                        she has enough, 'notEnough' otherwise
//   {end: outcome}    -- end the conversation immediately
// End nodes carry {end: outcome, continueLabel} and show a single button.
// Node text can be a function of a context object (gold, amount).

const boxEl = document.getElementById('dialogue-box');
const nameEl = document.getElementById('dialogue-name');
const textEl = document.getElementById('dialogue-text');
const choicesEl = document.getElementById('dialogue-choices');
const hintEl = document.getElementById('hint-banner');

// ---- Baron von Patch: the coin-doubling scam ----
export const BARON_TREE = {
  start: 'meet',
  name: 'Baron von Patch',
  nodes: {
    meet: {
      npc: 'Psst! Hey! Over here! Yes, you with the magnificent bow! I am Baron von Patch, world-famous businessman! Tell me... do you like GOLD?',
      choices: [
        { text: 'Ooh, I do have a few coins...', go: 'pitch' },
        { text: "I'm looking for my friend Sofia. Have you seen her?", go: 'sofia' },
        { text: "Sorry, I'm in a hurry to find my friend!", leave: true },
      ],
    },
    sofia: {
      npc: "Sofia? Hmm... this eye hasn't seen anyone all day, and the other one is on vacation! BUT -- finding friends goes much faster with MORE GOLD. And doubling gold just happens to be my specialty!",
      choices: [
        { text: 'Doubling gold? How does that work?', go: 'pitch' },
        { text: "That doesn't make any sense.", go: 'nonsense' },
        { text: 'Never mind, I have to keep looking!', leave: true },
      ],
    },
    pitch: {
      npc: "Simple! You hand me your coins -- I run to my secret investment tree -- and I come back with DOUBLE! Ten coins become TWENTY! I've never lost a single coin. (I've lost several entire treasures, but never a SINGLE coin!)",
      choices: [
        { text: "Okay! Here's some gold!", picker: true },
        { text: "How do I know you'll come back?", go: 'trust' },
        { text: 'No thanks -- I have to find Sofia!', leave: true },
      ],
    },
    nonsense: {
      npc: "Nonsense? NONSENSE?! Young lady, I wear a business eye patch! Nothing says 'trustworthy' like a business eye patch!",
      choices: [
        { text: 'Okay, okay! Tell me about the gold.', go: 'pitch' },
        { text: 'Why DO you wear an eye patch?', go: 'patchstory' },
        { text: 'I really have to go now!', leave: true },
      ],
    },
    patchstory: {
      npc: 'This? Battle scar from the Great Seagull Incident of last Tuesday. The seagull won. ANYWAY -- gold! Doubling! Business!',
      choices: [
        { text: 'Fine, tell me about the gold.', go: 'pitch' },
        { text: "Okay! Here's some gold!", picker: true },
        { text: 'I have to go find Sofia!', leave: true },
      ],
    },
    trust: {
      npc: "Come back? COME BACK?! I always come back! I'm famous for it! Ask anyone! (But not the people by the fountain. Or anyone on Cherry Street. Actually, don't ask anyone.)",
      choices: [
        { text: "Alright... here's some gold.", picker: true },
        { text: "That's not very convincing...", go: 'trust2' },
        { text: "No. I'm going to find Sofia now!", leave: true },
      ],
    },
    trust2: {
      npc: "Look, I'll even pinky promise. A DOUBLE pinky promise! That's legally binding in at least four countries!",
      choices: [
        { text: "Okay then! Here's some gold.", picker: true },
        { text: 'Which countries?', go: 'countries' },
        { text: 'No. Goodbye!', leave: true },
      ],
    },
    countries: {
      npc: 'Er... Fantasia, Narnia, uh... Legoland... NEXT QUESTION! Gold?',
      choices: [
        { text: "Fine, fine! Here's some gold.", picker: true },
        { text: 'Tell me how it works one more time.', go: 'pitch' },
        { text: "I'm leaving. Bye!", leave: true },
      ],
    },
    insist: {
      npc: "Wait wait WAIT! Surely your friend can wait five tiny minutes? This is a once-in-a-LIFETIME offer! It expires when I run out of... uh... LIFETIME!",
      choices: [
        { text: 'Well... maybe just a little gold.', picker: true },
        { text: 'How does it work again?', go: 'pitch' },
        { text: "NO. I'm going to find Sofia. Goodbye!", leave: true },
      ],
    },
    byebye: {
      npc: 'Fine, FINE! Go! But if you change your mind, the Baron will be right here! Probably! Depending on seagulls!',
      end: 'left',
      continueLabel: '(wave goodbye)',
    },
    zero: {
      npc: "ZERO coins?! You can't double ZERO! Zero times two is... is... well, it's ZERO! Bah! I am a businessman, not a magician!",
      end: 'zero',
      continueLabel: '(back away slowly)',
    },
    gave: {
      npc: (ctx) =>
        `${ctx.amount} gorgeous coin${ctx.amount === 1 ? '' : 's'}! Soon to be ${ctx.amount * 2}! You've made a BRILLIANT deal, young lady! Now -- please just wait here. Right HERE. Don't move a muscle! I'll dash to my investment tree and be back in two shakes of a seagull's tail!`,
      end: 'gave',
      continueLabel: '(hmm... okay?)',
    },
    pickerPrompt: {
      npc: "Wonderful! How many coins for the ol' Baron? Remember: whatever you give comes back DOUBLED!",
    },
  },
};

// ---- The castle gate guard: no tax, no entry ----
export const GUARD_TREE = {
  start: 'halt',
  name: 'Castle Guard',
  nodes: {
    halt: {
      npc: 'HALT! None shall pass! State your business at the castle of the Wicked Orange King! Delivery? Tax payment? Complaint about a neighbor? Speak!',
      choices: [
        { text: "I'm here for my friend Sofia! Your agents took her!", go: 'taxDemand' },
        { text: 'Um... sightseeing?', go: 'sightseeing' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    sightseeing: {
      npc: 'Sightseeing?! This is a fortress of DOOM! (And moderate tax administration.) There are no tours! State your REAL business or be gone!',
      choices: [
        { text: "Fine. I'm looking for my friend Sofia.", go: 'taxDemand' },
        { text: 'Is it nice, working at a fortress of doom?', go: 'workchat' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    workchat: {
      npc: 'Long hours. Heavy helmet. The King yells a lot about hedges. But the dental plan is excellent! NOW STATE YOUR BUSINESS!',
      choices: [
        { text: "Okay, okay! I'm here for my friend Sofia.", go: 'taxDemand' },
        { text: 'Just enjoying the conversation, really.', go: 'sightseeing' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    taxDemand: {
      npc: "Sofia! Ah yes... prisoner 24601... no, wait... 'Sofia', here she is. By decree of the Wicked Orange King: prisoner release requires a Release Tax of 20 GOLD coins. No coins, no Sofia. NO EXCEPTIONS!",
      choices: [
        { text: 'Here! Take the 20 coins!', payAttempt: 20 },
        { text: 'But Sofia is my best friend!', go: 'plead' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    plead: {
      npc: "And she seems very nice! Very deportable, too. The N.I.C.E. wagon is ALWAYS on time. 20 coins, young lady. Tick tock!",
      choices: [
        { text: 'Fine! Take the 20 coins!', payAttempt: 20 },
        { text: 'Where am I supposed to find 20 coins?!', go: 'hint' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    hint: {
      npc: "Do I look like a bank? Try being HELPFUL around the Kingdom! People pay for good deeds. Or find treasure! Or a rich uncle! (Do NOT ask the fellow with the eye patch. That is my only free advice.)",
      choices: [
        { text: 'Okay! Take the 20 coins!', payAttempt: 20 },
        { text: 'Can I at least SEE Sofia?', go: 'plead2' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    plead2: {
      npc: "See her? This is a castle, not a zoo! ...She IS right there in the courtyard though. You may wave. Waving is tax-free. For now.",
      choices: [
        { text: 'TAKE MY 20 COINS!', payAttempt: 20 },
        { text: 'This King of yours is really wicked.', go: 'wicked' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    wicked: {
      npc: "Wicked AND orange. But the dental plan is excellent, so here I stand. 20 coins or good day to you!",
      choices: [
        { text: 'Alright. Here are 20 coins!', payAttempt: 20 },
        { text: 'Tell me about the tax again?', go: 'taxDemand' },
        { text: '(step back from the gate)', end: 'left' },
      ],
    },
    notEnough: {
      npc: (ctx) =>
        `Let me count... ${ctx.gold} coin${ctx.gold === 1 ? '' : 's'}. That is NOT 20. The King may be wicked, but he can COUNT! Come back when your pockets jingle properly!`,
      end: 'notEnough',
      continueLabel: "(I'll find more coins...)",
    },
    paid: {
      npc: "...18, 19, 20! Counted and confirmed! One prisoner release, paid in full: 'Sofia'. Go on in then! And tell the King his hair looks AMAZING. He likes that.",
      end: 'paid',
      continueLabel: '(run inside!)',
    },
  },
};

// ---- Wizzo the wizard: the Zoom-Zoom Zap shop ----
export const WIZARD_TREE = {
  start: 'greet',
  name: 'Wizzo the Wizard',
  nodes: {
    greet: {
      npc: "Ahh! A customer! Welcome to Wizzo's Wondrous Wares -- the tallest, thinnest shop in all the Kingdom! I sense... yes... I sense you are in a TERRIBLE hurry!",
      choices: [
        { text: 'How did you know?!', go: 'knew' },
        { text: 'What do you sell?', go: 'shop' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    knew: {
      npc: 'Wizards KNOW things! ...Also, you look quite sweaty. Now! To business!',
      choices: [
        { text: 'So what do you sell?', go: 'shop' },
        { text: "I'm looking for my friend Sofia.", go: 'sofia' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    sofia: {
      npc: "The castle, hmm? The King's 'guests' wait in the courtyard. A long way on small legs! You'll want QUICK FEET for that errand... which reminds me!",
      choices: [
        { text: 'Quick feet? Tell me more!', go: 'shop' },
        { text: 'Do you know the Wicked Orange King?', go: 'king' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    king: {
      npc: "Know him? He banned my flying carpet for 'airspace violations'! And his N.I.C.E. agents seized my supply cart at the border. 'Paperwork irregularities.' Bah!",
      choices: [
        { text: 'So what CAN you sell me?', go: 'shop' },
        { text: 'That sounds unfair.', go: 'unfair' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    unfair: {
      npc: "Unfair, unkind, and largely orange. Which is why I give N.I.C.E. discounts to anyone rescuing a friend from that castle! Well. Not discounts. But enthusiasm!",
      choices: [
        { text: "Okay, okay -- what's for sale?", go: 'shop' },
        { text: 'Enthusiasm is not a discount.', go: 'shop' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    shop: {
      npc: "Today's special -- and today's EVERYTHING, thanks to the seized supply cart: the ZOOM-ZOOM ZAP! An enchantment of the feet. Walk TWICE as fast, FOREVER! Yours for a mere 2 gold coins!",
      choices: [
        { text: 'Yes please! Here are 2 coins!', payAttempt: 2 },
        { text: 'Is it safe...?', go: 'safe' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    safe: {
      npc: "Safe?! I've zapped DOZENS of feet! Almost all of them still walk forward! (The backwards fellow was wearing his shoes wrong. Not my fault.)",
      choices: [
        { text: "Good enough! Here are 2 coins!", payAttempt: 2 },
        { text: 'Tell me about the zap again?', go: 'shop' },
        { text: '(leave the wizard alone)', end: 'left' },
      ],
    },
    notEnough: {
      npc: (ctx) =>
        `Hmm... ${ctx.gold} coin${ctx.gold === 1 ? '' : 's'}. The zap costs 2. Magic has PRICES, young lady! The rent on this tower is OUTRAGEOUS -- have you seen how tall it is?`,
      end: 'notEnough',
      continueLabel: '(come back with more coins)',
    },
    paid: {
      npc: '✨ ZAP! ✨ There! Feel the tingle? Those are SPEEDY FEET! Off you go -- quick like a bunny, swift like a seagull! (Not the one that fought the Baron. A faster one.)',
      end: 'paid',
      continueLabel: '(wiggle toes... whoa!)',
    },
  },
};

// After she's bought the zap, Wizzo is sold out
export const WIZARD_SOLD_TREE = {
  start: 'again',
  name: 'Wizzo the Wizard',
  nodes: {
    again: {
      npc: 'Back again? How are the speedy feet? Wonderful, yes, I can tell -- you got here FAST! Alas, nothing else in stock until the N.I.C.E. agents release my supply cart. NO REFUNDS! Ha!',
      end: 'left',
      continueLabel: '(wave and zoom off)',
    },
  },
};

// ---- Mrs. Bramble and the lost cat ----
export const BRAMBLE_TREES = {
  new: {
    start: 'greet',
    name: 'Mrs. Bramble',
    nodes: {
      greet: {
        npc: "Oh dear, oh dear! My cat Waffles chased a butterfly and simply VANISHED! She's very orange and very round. Last seen zooming south, past the big road!",
        choices: [
          { text: "I'll find her for you!", end: 'accept' },
          { text: "What's in it for me?", go: 'reward' },
          { text: "(no time for cats, sorry)", end: 'left' },
        ],
      },
      reward: {
        npc: 'Five whole gold coins! Waffles is worth at least ten, but I am haggling.',
        choices: [
          { text: "Deal! I'll find her!", end: 'accept' },
          { text: 'Where did she go again?', go: 'where' },
          { text: '(back away from the cat lady)', end: 'left' },
        ],
      },
      where: {
        npc: 'South! Past the big road to the castle! Follow the mrows!',
        choices: [
          { text: "On my way!", end: 'accept' },
          { text: 'Is she friendly?', go: 'friendly' },
          { text: '(leave)', end: 'left' },
        ],
      },
      friendly: {
        npc: "Friendly? She's a CAT, dear. She'll ignore you with great warmth.",
        choices: [
          { text: "Good enough. I'll find her!", end: 'accept' },
          { text: 'Fair point.', go: 'reward' },
          { text: '(leave)', end: 'left' },
        ],
      },
    },
  },
  active: {
    start: 'greet',
    name: 'Mrs. Bramble',
    nodes: {
      greet: {
        npc: 'Any sign of my Waffles? Very orange? Very round? Zooms?',
        end: 'left',
        continueLabel: '(still looking...)',
      },
    },
  },
  found: {
    start: 'greet',
    name: 'Mrs. Bramble',
    nodes: {
      greet: {
        npc: 'WAFFLES CAME HOME! You found her, you wonderful child! Here -- five gold coins, as promised! Waffles would thank you herself but she is busy pretending nothing happened.',
        end: 'reward',
        continueLabel: '(collect 5 coins!)',
      },
    },
  },
  done: {
    start: 'greet',
    name: 'Mrs. Bramble',
    nodes: {
      greet: {
        npc: 'Waffles says mrow. That means thank you. Probably.',
        end: 'left',
        continueLabel: '(wave at Waffles)',
      },
    },
  },
};

export const CAT_TREES = {
  ignore: {
    start: 'greet',
    name: 'A Very Orange Cat',
    nodes: {
      greet: {
        npc: 'Mrow? (A very round, very orange cat ignores you professionally.)',
        end: 'left',
        continueLabel: '(leave the cat to its business)',
      },
    },
  },
  found: {
    start: 'greet',
    name: 'Waffles!',
    nodes: {
      greet: {
        npc: 'MROW! (This must be Waffles -- very orange, very round! She looks extremely pleased with herself, then zooms off toward home at incredible speed.)',
        end: 'catFound',
        continueLabel: '(watch her zoom away)',
      },
    },
  },
  home: {
    start: 'greet',
    name: 'Waffles',
    nodes: {
      greet: {
        npc: 'Purrrr. (Waffles is home, pretending nothing ever happened.)',
        end: 'left',
        continueLabel: '(pet the cat)',
      },
    },
  },
};

// ---- Baker Berta and the pie delivery ----
export const BAKER_TREES = {
  new: {
    start: 'greet',
    name: 'Baker Berta',
    nodes: {
      greet: {
        npc: "Perfect timing, dear! I baked a raspberry pie for my sister Sylvie, but my oven needs me THIS instant. Could you deliver it? She lives in the hamlet to the south-west, across the fields. She pays 4 coins on delivery -- she's good for it!",
        choices: [
          { text: "I'll deliver it!", end: 'accept' },
          { text: 'Which hamlet, exactly?', go: 'directions' },
          { text: '(no time for pies)', end: 'left' },
        ],
      },
      directions: {
        npc: 'South-west! Past the fields! If you reach the fence, you have gone too far. If you smell burning, you have gone backwards -- that would be my oven.',
        choices: [
          { text: "Got it. I'll take the pie!", end: 'accept' },
          { text: 'Why raspberry?', go: 'raspberry' },
          { text: '(leave)', end: 'left' },
        ],
      },
      raspberry: {
        npc: "Because Sylvie hates blueberries, fears plums, and is legally forbidden from cherries. Don't ask. RASPBERRY. Now -- will you take it?",
        choices: [
          { text: "Yes! Hand over the pie!", end: 'accept' },
          { text: '(leave, slightly concerned)', end: 'left' },
          { text: 'Legally forbidden?', go: 'directions' },
        ],
      },
    },
  },
  active: {
    start: 'greet',
    name: 'Baker Berta',
    nodes: {
      greet: {
        npc: 'Careful with that pie, dear! Sylvie HATES dented raspberries. South-west, across the fields!',
        end: 'left',
        continueLabel: '(guard the pie carefully)',
      },
    },
  },
  done: {
    start: 'greet',
    name: 'Baker Berta',
    nodes: {
      greet: {
        npc: "Sylvie sent a thank-you seagull! Lovely delivery, dear. ...You didn't eat any on the way, did you? ...Good. GOOD.",
        end: 'left',
        continueLabel: '(look innocent)',
      },
    },
  },
};

export const SYLVIE_TREES = {
  noPie: {
    start: 'greet',
    name: 'Sylvie',
    nodes: {
      greet: {
        npc: 'My sister owes me a pie, you know. Raspberry. She ALWAYS forgets. Sisters!',
        end: 'left',
        continueLabel: '(nod sympathetically)',
      },
    },
  },
  deliver: {
    start: 'greet',
    name: 'Sylvie',
    nodes: {
      greet: {
        npc: 'IS THAT MY PIE?! Raspberry! Not a single dented berry! Oh, you darling -- here, 4 coins, worth every single one!',
        end: 'reward',
        continueLabel: '(hand over the pie, collect 4 coins!)',
      },
    },
  },
  done: {
    start: 'greet',
    name: 'Sylvie',
    nodes: {
      greet: {
        npc: 'Best pie in the Kingdom. Come back next pie season, dear!',
        end: 'left',
        continueLabel: '(promise to return)',
      },
    },
  },
};

// ---- Mr. Tobias and the lost spectacles ----
export const TOBIAS_TREES = {
  new: {
    start: 'greet',
    name: 'Mr. Tobias',
    nodes: {
      greet: {
        npc: "Blast and bother! I dropped my spectacles somewhere along the castle road and now the whole Kingdom is a smudge! You there -- blurry child -- find them and I'll pay 5 gold coins!",
        choices: [
          { text: "I'll find them!", end: 'accept' },
          { text: 'Where exactly did you drop them?', go: 'where' },
          { text: "(leave the blurry man alone)", end: 'left' },
        ],
      },
      where: {
        npc: "If I knew EXACTLY, I would see them, wouldn't I? Somewhere on the road south, halfway to the castle, maybe? It's all a blur. Literally.",
        choices: [
          { text: "On it! I'll look on the road.", end: 'accept' },
          { text: 'How did you get home without them?', go: 'how' },
          { text: '(leave)', end: 'left' },
        ],
      },
      how: {
        npc: 'I followed the smell of my own house! Never underestimate a man who lives next to a baker.',
        choices: [
          { text: "Impressive. I'll find the glasses!", end: 'accept' },
          { text: '(leave)', end: 'left' },
          { text: 'Wait, that was two hamlets ago.', go: 'where' },
        ],
      },
    },
  },
  active: {
    start: 'greet',
    name: 'Mr. Tobias',
    nodes: {
      greet: {
        npc: 'Found them yet? Everything is still very round and very fuzzy. You could be ANYONE.',
        end: 'left',
        continueLabel: '(keep looking)',
      },
    },
  },
  found: {
    start: 'greet',
    name: 'Mr. Tobias',
    nodes: {
      greet: {
        npc: 'MY SPECTACLES! Oh glorious day -- the world has CORNERS again! Five coins, as promised, sharp-eyed child!',
        end: 'reward',
        continueLabel: '(hand them over, collect 5 coins!)',
      },
    },
  },
  done: {
    start: 'greet',
    name: 'Mr. Tobias',
    nodes: {
      greet: {
        npc: 'I can see EVERYTHING now. Including that fellow with the eye patch loitering near the village. Stay away from him, child!',
        end: 'left',
        continueLabel: '(too late...)',
      },
    },
  },
};

// ---- Edison Gearwhistle and the Time Machine ----
export const ENGINEER_TREE = {
  start: 'greet',
  name: 'Edison Gearwhistle',
  nodes: {
    greet: {
      npc: 'Ah! A visitor! I am Edison Gearwhistle: engineer, inventor, and proud owner of that MAGNIFICENT machine right there. Care for a spin in my Time Machine? Free of charge!',
      choices: [
        { text: 'Yes! Spin me!', ride: true },
        { text: 'What does it do, exactly?', go: 'what' },
        { text: '(back away from the machine)', end: 'left' },
      ],
    },
    what: {
      npc: "It does TIME! In a direction! For an amount! I cannot legally say more. Mostly because I don't know more.",
      choices: [
        { text: '...Alright. Spin me!', ride: true },
        { text: 'Is it SAFE?', go: 'safe' },
        { text: '(back away from the machine)', end: 'left' },
      ],
    },
    safe: {
      npc: 'The machine? PERFECTLY safe! Time, on the other hand, makes no promises.',
      choices: [
        { text: "Good enough for me. Spin!", ride: true },
        { text: 'Why did you even build this?', go: 'why' },
        { text: '(back away from the machine)', end: 'left' },
      ],
    },
    why: {
      npc: 'My oven kept burning my toast! With this machine I can UN-burn it. In theory. The toast is currently... somewhere. SomeWHEN. Anyway! Fancy a spin?',
      choices: [
        { text: "For the toast. Spin me!", ride: true },
        { text: 'What does it do again?', go: 'what' },
        { text: '(back away from the machine)', end: 'left' },
      ],
    },
    // She went BACK five minutes: for Edison, their meeting hasn't happened yet
    wentBack: {
      npc: "Ah! A visitor! I am Edison Gearwhistle: engineer, inventor, and proud owner of that MAGNIFICENT... wait. Why are you climbing OUT of my machine? We haven't even met yet! Have we? HAVE WE?!",
      end: 'left',
      continueLabel: "(check the clock... it's EARLIER. Sneak away.)",
    },
    // She went FORWARD three minutes: from Edison's view, she simply vanished
    wentForward: {
      npc: 'THERE you are! You disappeared! POOF! Gone for three whole minutes! I was beginning to think the machine finally... I mean -- I NEVER doubted it for a second! Welcome back!',
      end: 'left',
      continueLabel: '(check the clock... three minutes GONE)',
    },
  },
};

// ---- The Baron's "investment tree" ----
export const STASH_TREES = {
  scammed: {
    start: 'greet',
    name: 'A Suspiciously Ordinary Tree',
    nodes: {
      greet: {
        npc: (ctx) =>
          `A suspiciously ordinary tree... with a hollow in the trunk! Inside: gold coins -- ${ctx.scammed * 2} of them! Wait... the Baron's investment tree is REAL?! Your coins really did double! (The Baron himself, however, is long gone. Keep the interest.)`,
        end: 'stash',
        continueLabel: '(scoop up the coins!)',
      },
    },
  },
  clean: {
    start: 'greet',
    name: 'A Suspiciously Ordinary Tree',
    nodes: {
      greet: {
        npc: 'A suspiciously ordinary tree with a hollow in the trunk. Inside: 3 dusty gold coins somebody hid and clearly forgot. Finders keepers!',
        end: 'stash',
        continueLabel: '(pocket the 3 coins)',
      },
    },
  },
};

// ---- The Tired Old Dragon: a bottomless well of glory-days stories ----
// Every branch leads deeper. The only exit is the "(slip away)" option.
// This is a deliberate time-waster. He never does anything. Ever.
export const DRAGON_TREE = {
  start: 'greet',
  name: 'A Tired Old Dragon',
  nodes: {
    greet: {
      npc: "Mmm? A visitor. Sit, sit. Or stand. I shall lie here, if it's all the same. In my day, of course, I would have INCINERATED you by now. Wonderful times. Did you know dragons once ruled this entire world?",
      choices: [
        { text: 'You RULED the world?', go: 'ruled' },
        { text: 'Why are you just lying there?', go: 'lying' },
        { text: "(slip away while it's talking)", end: 'left' },
      ],
    },
    ruled: {
      npc: 'Oh yes. Skies black with wings. Mountains hollowed into palaces. Kings paid us tribute in gold and -- far more importantly -- in CHICKEN. Ah, the chicken. Rivers of it. Do you like chicken? Of course you do. Everyone likes chicken.',
      choices: [
        { text: 'How much chicken are we talking about?', go: 'chickenCount' },
        { text: 'What happened to the palaces?', go: 'palaces' },
        { text: '(slip away mid-sentence)', end: 'left' },
      ],
    },
    lying: {
      npc: "Lying? LYING?! This is a strategic recline. I am conserving my power. Been conserving it for... what year is it? ...Doesn't matter. The point is, at any moment I COULD do something tremendous. I simply choose not to. That is true power, small one.",
      choices: [
        { text: 'What tremendous thing could you do?', go: 'tremendous' },
        { text: 'When did you last actually get up?', go: 'lastUp' },
        { text: '(nod politely and slip away)', end: 'left' },
      ],
    },
    chickenCount: {
      npc: "The Royal Tribute of Year 402 was, and I remember this precisely, forty thousand chickens. Roasted. Per WEEK. The baron of Cluckshire wept. I ate his weight in drumsticks before lunch. They named a sauce after me, you know. They don't make it anymore. Nobody remembers the recipe.",
      choices: [
        { text: 'What was in the sauce?', go: 'sauce' },
        { text: 'Forty thousand?! Per week?!', go: 'perWeek' },
        { text: '(slip away, suddenly hungry)', end: 'left' },
      ],
    },
    palaces: {
      npc: "Condominiums now, mostly. My cousin Gorthanax's volcano lair is a spa. A SPA. They do hot stone massages in the treasure vault. He'd be furious if he weren't, and I quote, 'actually finding the cucumber water quite refreshing.'",
      choices: [
        { text: 'Tell me about Gorthanax.', go: 'gorthanax' },
        { text: "And YOUR palace?", go: 'myPalace' },
        { text: '(slip away past the tail)', end: 'left' },
      ],
    },
    tremendous: {
      npc: "Fire, child! Fire that melted BRIDGES. Knights would arrive gleaming and leave as... well, as very hot puddles with a sword in them. Tasted terrible, knights. Like licking a kettle. That's why we stuck with chicken. Chicken never wears armor. Smart animal, in its way.",
      choices: [
        { text: 'Could you show me a little fire?', go: 'fireDemo' },
        { text: 'Wait, you ATE knights?', go: 'knights' },
        { text: '(slip away before the fire comes)', end: 'left' },
      ],
    },
    lastUp: {
      npc: "I got up... hm. There was that Tuesday. The GREAT Tuesday. A chicken wandered within reach, you see. Didn't even have to stand fully -- more of a lunge. Magnificent lunge. My knees sang the old songs for a month afterward. Worth it? Absolutely.",
      choices: [
        { text: 'Your knees SING?', go: 'knees' },
        { text: 'So when do you plan to get up next?', go: 'nextUp' },
        { text: '(slip away very quietly)', end: 'left' },
      ],
    },
    sauce: {
      npc: "Honey. Fire-roasted garlic. A whisper of brimstone. And the tears of the baron of Cluckshire, though I suspect that was optional. I once flew four hundred miles for a barrel of it. FOUR HUNDRED MILES. Nowadays I wouldn't fly four hundred inches for the secret of eternal youth. But for the sauce? ...Hm. Perhaps a short glide.",
      choices: [
        { text: 'You could fly and get some!', go: 'fireDemo' },
        { text: 'What else did dragons eat?', go: 'menu' },
        { text: '(slip away, licking lips)', end: 'left' },
      ],
    },
    perWeek: {
      npc: "PER WEEK. And that was just MY tribute. Old Scaldrath the Enormous demanded double. He got so round he couldn't leave his mountain, and the villagers stopped being scared and started being... fond of him. FOND. He became a tourist attraction. Died of contentment. A cautionary tale, which I ignore daily.",
      choices: [
        { text: 'Tell me about Scaldrath.', go: 'scaldrath' },
        { text: "Aren't YOU becoming a tourist attraction?", go: 'attraction' },
        { text: '(slip away like a scared villager)', end: 'left' },
      ],
    },
    gorthanax: {
      npc: "Gorthanax the Dread! Terror of Three Coastlines! He once ate a pirate ship because it 'looked at him funny.' Now he does a podcast. About wellness. He says rage was 'weighing him down.' It was the four hundred sheep a day weighing him down, but you can't tell him anything.",
      choices: [
        { text: 'Dragons have podcasts?', go: 'podcast' },
        { text: 'What do YOU do for wellness?', go: 'wellness' },
        { text: '(slip away from the gossip)', end: 'left' },
      ],
    },
    myPalace: {
      npc: "You're looking at it. This patch of grass has EVERYTHING: sun in the morning, shade in the afternoon, and a slight hill so I can watch the road without moving my neck. In the old days I had a throne of gold. Gold is cold, child. Grass is warm. Don't let the poets fool you.",
      choices: [
        { text: 'What happened to the gold throne?', go: 'throne' },
        { text: 'That is... surprisingly wise?', go: 'wise' },
        { text: '(slip away across the warm grass)', end: 'left' },
      ],
    },
    fireDemo: {
      npc: "Show you fire? FIRE? ...Mmm. The thing about fire is. Well. It requires sitting up. And a deep breath, and my lungs have opinions now. Tell you what: imagine a truly ENORMOUS flame. Orange. Very hot. Are you imagining it? THAT is almost exactly what it looked like. You're welcome. No no, don't thank me. The performance drains me.",
      choices: [
        { text: '...That was nothing. You did nothing.', go: 'didNothing' },
        { text: 'Amazing! Tell me about the old battles!', go: 'battles' },
        { text: '(slip away, imagination exhausted)', end: 'left' },
      ],
    },
    knights: {
      npc: "Only the rude ones. There was an etiquette! A knight who bowed got to go home and say he'd 'survived the beast.' Good for his career, good for my nap schedule. Everybody wins. But the ones who yelled about GLORY and poked with lances... straight onto the barbecue. With sauce, if the baron had paid up.",
      choices: [
        { text: 'Back up -- the sauce again?', go: 'sauce' },
        { text: 'Did any knight ever beat you?', go: 'beaten' },
        { text: '(bow politely and slip away)', end: 'left' },
      ],
    },
    knees: {
      npc: "Every joint has its own song now. The left knee does a sort of creaking ballad. The right one prefers percussion. My tail does a number I can only describe as 'experimental.' When I stretch in the morning, it's practically an orchestra. Tickets are free. Performances daily. Attendance: you, currently.",
      choices: [
        { text: 'Do the stretch! I want to hear it!', go: 'fireDemo' },
        { text: 'How old ARE you, exactly?', go: 'age' },
        { text: '(applaud softly and slip away)', end: 'left' },
      ],
    },
    nextUp: {
      npc: "Plan? PLAN? Getting up is not PLANNED, child, it is INSPIRED. The moment must call. A worthy cause must present itself. A dragon rises for destiny, for vengeance, or for chicken within lunging distance. So far today, destiny has been quiet, vengeance is more of a young dragon's game, and you do not appear to be carrying a chicken. Are you? Carrying a chicken?",
      choices: [
        { text: 'No chicken, sorry.', go: 'noChicken' },
        { text: 'What if I FOUND you a chicken?', go: 'findChicken' },
        { text: '(check pockets, slip away)', end: 'left' },
      ],
    },
    menu: {
      npc: "Sheep, obviously. Goats for texture. The occasional cow for special occasions. Fish, when by the coast, though the seagulls fought us for it -- vicious creatures, seagulls, ask anyone. But chicken was the crown jewel. Crispy. Portable. Comes in flocks. The perfect food. I have composed poems about it. Seventeen of them.",
      choices: [
        { text: 'Recite a chicken poem!', go: 'poem' },
        { text: 'Seagulls fought DRAGONS?', go: 'seagulls' },
        { text: '(slip away before the poetry)', end: 'left' },
      ],
    },
    scaldrath: {
      npc: "My mentor! Taught me everything. 'Never negotiate before breakfast.' 'A hoard unpolished is a hoard unloved.' 'The second chicken tastes better than the first, and the fortieth better still.' Wisdom, all of it. He also said 'never lie in one spot so long the moss claims you' but frankly the moss and I have an arrangement.",
      choices: [
        { text: 'What arrangement do you have with moss?', go: 'moss' },
        { text: 'Tell me more of his wisdom.', go: 'wisdom' },
        { text: '(slip away before the moss spreads)', end: 'left' },
      ],
    },
    attraction: {
      npc: "NONSENSE. A tourist attraction is GAWKED at. I am VISITED. Completely different. You, for instance, are not a tourist. You are an audience. Do you see the distinction? The distinction is that I prefer it. Now sit back down, I was mid-legend.",
      choices: [
        { text: 'Fine, continue the legend.', go: 'battles' },
        { text: 'I never sat down.', go: 'neverSat' },
        { text: '(slip away like a tourist)', end: 'left' },
      ],
    },
    podcast: {
      npc: "Two hundred episodes. TWO HUNDRED. Episode one: 'Letting Go of Hoard Attachment.' Episode two: 'Knights: Enemies or Teachers?' I listened to half of one. I fell asleep. In my defense, I was already asleep when I started it.",
      choices: [
        { text: 'How do you listen to... anything out here?', go: 'wellness' },
        { text: "Let's get back to the glory days.", go: 'battles' },
        { text: '(slip away and unsubscribe)', end: 'left' },
      ],
    },
    wellness: {
      npc: "My wellness routine: I lie here. Sun rotates around me, which shows the sky knows who's important. Occasionally I blink. On ambitious days, both eyes. And every evening I think about the old days for six to eight hours. The physicians call it 'rumination.' I call it CINEMA.",
      choices: [
        { text: 'What plays in tonight’s cinema?', go: 'battles' },
        { text: 'That cannot be healthy.', go: 'healthy' },
        { text: '(slip away before the show starts)', end: 'left' },
      ],
    },
    throne: {
      npc: "Sold it. Well -- traded it. To a very persuasive fellow with an eye patch who said he would DOUBLE it. He took the throne 'to his investment tree' and, you know, I'm sure he's simply been delayed. Any century now. Any century.",
      choices: [
        { text: 'I think I’ve met that guy!!', go: 'baronStory' },
        { text: "He's not coming back.", go: 'notComing' },
        { text: '(slip away, making a mental note)', end: 'left' },
      ],
    },
    wise: {
      npc: "Wisdom is what glory turns into if you lie still long enough. That, and moss. Mostly moss, honestly. But every now and then, between the naps, a truly profound thought arrives. I had one in spring. I meant to write it down. The spring of which YEAR, you ask? Mind your own business.",
      choices: [
        { text: 'What was the profound thought?', go: 'profound' },
        { text: 'Back up -- the glory days. More.', go: 'battles' },
        { text: '(slip away profoundly)', end: 'left' },
      ],
    },
    didNothing: {
      npc: "I did EVERYTHING. In here. (He taps his head against the grass, slowly.) The greatest fires now burn in the theater of the mind, child. Also my healer says open flame is 'off the table' until my scales grow back on the left side. Long story. Involves a barbecue I attended. As a guest! As a GUEST.",
      choices: [
        { text: 'Tell the barbecue story!', go: 'barbecue' },
        { text: 'Your scales fell OFF?', go: 'scales' },
        { text: '(slip away from the heat)', end: 'left' },
      ],
    },
    battles: {
      npc: "The Battle of the Burning Hill! Four hundred knights! Twelve dragons! The sky orange from horizon to horizon! And at the center: ME, magnificent, terrible, slightly hungry because we'd skipped lunch to be punctual. We won, of course. The victory feast lasted a MONTH. The chicken course alone took nine days.",
      choices: [
        { text: 'NINE days of chicken?', go: 'chickenCount' },
        { text: 'What were the other courses?', go: 'menu' },
        { text: '(slip away during the feast story)', end: 'left' },
      ],
    },
    beaten: {
      npc: "Once. ONE knight. Sir Reginald the Patient. He didn't fight, you understand. He sat down at the edge of my lair and WAITED. Weeks. Months. Eventually I got so curious I came out to ask what he wanted, and the moment I opened my mouth he threw a chicken in it and stole a single gold cup while I was distracted. Genius. Absolute genius. We exchange letters.",
      choices: [
        { text: 'You STILL write to him?', go: 'reginald' },
        { text: 'The chicken trick works on you?', go: 'nextUp' },
        { text: '(slip away, taking notes)', end: 'left' },
      ],
    },
    age: {
      npc: "A dragon never tells. But I will say this: when I was hatched, that castle over there was a puddle with ambitions. I watched them lay the first stone. I watched them lay the LAST stone. Between those two stones I ate approximately -- and this is a conservative figure -- one million chickens.",
      choices: [
        { text: 'One MILLION?', go: 'perWeek' },
        { text: 'What was the Kingdom like back then?', go: 'ruled' },
        { text: '(slip away feeling very young)', end: 'left' },
      ],
    },
    noChicken: {
      npc: "Mm. A pity. You had the look, briefly, of someone with a chicken. The posture. The AURA. Well. If you ever come across one -- roasted, ideally, but I am not proud -- you know where I lie. I am always where I lie. That is the entire arrangement.",
      choices: [
        { text: 'Tell me another story then.', go: 'battles' },
        { text: 'What does a chicken aura look like?', go: 'aura' },
        { text: '(slip away, chickenless)', end: 'left' },
      ],
    },
    findChicken: {
      npc: "Would you? WOULD you? ...No. No, don't. Because then I would have to lunge, and lunging leads to standing, and standing leads to FLYING, and flying leads to GLORY, and glory, child, is EXHAUSTING. I've done glory. Forty centuries of it. Do you know what glory never once gave me? A good lie-down.",
      choices: [
        { text: "So you're really never getting up.", go: 'nextUp' },
        { text: 'Forty CENTURIES?', go: 'age' },
        { text: '(slip away, glory-free)', end: 'left' },
      ],
    },
    poem: {
      npc: "Ahem. 'Ode to a Drumstick, Number Twelve.' -- O golden leg, O crispy friend, / You waddle to a noble end. / The knights bring swords, the kings bring gold, / But you bring joy... and don't get old... -- I'm sorry. I need a moment. It gets me every time. The ending. 'Don't get old.' Because the chicken is EATEN, you see. The chicken never grows old. Unlike... unlike some of us.",
      choices: [
        { text: '(pat his claw gently)', go: 'patClaw' },
        { text: 'Read another one!', go: 'poem2' },
        { text: '(slip away, moved)', end: 'left' },
      ],
    },
    seagulls: {
      npc: "You laugh. YOU LAUGH. A seagull fears nothing, child. A dragon has pride, dignity, self-preservation. A seagull has NONE of these. It will land on your snout, look you dead in one eye, and take the fish OUT OF YOUR MOUTH. My uncle lost a whole salmon that way. He wrote it into his will: 'and to the seagull -- NOTHING.'",
      choices: [
        { text: 'I heard a seagull beat up the Baron.', go: 'baronStory' },
        { text: 'Back to the chicken, please.', go: 'chickenCount' },
        { text: '(slip away, watching the sky)', end: 'left' },
      ],
    },
    moss: {
      npc: "The moss gets the north side of me, I get insulation for the winter. We renegotiate every spring. This year the moss brought in a lichen as a 'consultant.' I don't trust it. It has an agenda. But that, child, is politics, and politics is the one thing I refuse to rise for.",
      choices: [
        { text: "The lichen has an AGENDA?", go: 'lichen' },
        { text: 'Tell me about the old politics -- dragon politics!', go: 'ruled' },
        { text: '(slip away, avoiding the lichen)', end: 'left' },
      ],
    },
    wisdom: {
      npc: "'Hoard bright, sleep tight.' 'A knight in the hand is worth two in the keep.' 'Never eat anything wearing more armor than you.' And the great one, the one I live by: 'There is no problem so large that it cannot be slept on. Repeatedly. For years.'",
      choices: [
        { text: 'You certainly live by that one.', go: 'lying' },
        { text: 'What problems are you sleeping on?', go: 'profound' },
        { text: '(slip away, enlightened)', end: 'left' },
      ],
    },
    neverSat: {
      npc: "Didn't you? Hm. You have a very seated ENERGY. Most visitors sit. Then they lean. Then they check the sun and gasp and sprint off to whatever tiny urgent thing their tiny urgent lives demand. You have somewhere to be, don't you? They always do. Nobody just LIES anymore. It's a lost art.",
      choices: [
        { text: 'I DO have somewhere to be, actually--', go: 'somewhereToBe' },
        { text: 'Teach me the art of lying down.', go: 'artOfLying' },
        { text: '(prove him right; sprint off)', end: 'left' },
      ],
    },
    healthy: {
      npc: "Healthy? HEALTHY? Child, I am four thousand years old and my chief complaint is that my knees have become musicians. Meanwhile the knights who 'exercised' and 'ate sensibly' have been dust for thirty-nine centuries. Explain that with your 'health.' I'll wait. I'm extremely good at waiting.",
      choices: [
        { text: 'That... is hard to argue with.', go: 'wise' },
        { text: 'Four thousand years old!', go: 'age' },
        { text: '(slip away to go exercise, nervously)', end: 'left' },
      ],
    },
    baronStory: {
      npc: "Small fellow? Eye patch? Business hat? THAT'S HIM. He also sold my cousin a 'self-refilling hoard.' It was a bucket. A regular bucket. And yet -- and this is the humiliating part -- when he comes by, we still listen. He's just very good at talking. Like me. But EVIL. Well. Evil-ish. Evil-adjacent. He has the SPIRIT of a seagull.",
      choices: [
        { text: 'The spirit of a seagull!', go: 'seagulls' },
        { text: 'He took MY coins to "double" them.', go: 'notComing' },
        { text: '(slip away, checking coin purse)', end: 'left' },
      ],
    },
    notComing: {
      npc: "Not coming back? Of course he's... hm. HM. You know, four hundred years is a long delay, even by dragon standards. Well! The joke is on HIM. That throne gave me back trouble anyway. The REAL treasure was the lying down I did afterward. That's not a lesson, child, that's a COPING MECHANISM, and it works beautifully.",
      choices: [
        { text: 'Tell me about the glory days again.', go: 'ruled' },
        { text: 'You okay, big fella?', go: 'patClaw' },
        { text: '(slip away respectfully)', end: 'left' },
      ],
    },
    profound: {
      npc: "The thought was this: 'What if the chicken... also remembers US?' ...I know. I KNOW. Sit with it. Let it wash over you. Somewhere out there is a flock that tells legends of ME, the great devourer, and in their tiny hearts burns a tiny fear, and in that fear -- I live FOREVER. That's immortality, child. The poets can keep their books.",
      choices: [
        { text: '...whoa.', go: 'wise' },
        { text: 'I need to sit down.', go: 'artOfLying' },
        { text: '(slip away, forever changed)', end: 'left' },
      ],
    },
    barbecue: {
      npc: "A retirement party for a knight I used to fight. Sir Hubert. Lovely fellow, terrible swordsman. There was a grill. Someone said -- and I quote -- 'can the dragon light it?' And I, wanting to impress, took a TREMENDOUS breath, and, well. The gazebo is gone. Hubert's eyebrows are gone. The party, however, was legendary. I'm banned from three counties. WORTH IT.",
      choices: [
        { text: 'You went to your enemy’s party?', go: 'reginald' },
        { text: 'What happened to your scales though?', go: 'scales' },
        { text: '(slip away from open flames)', end: 'left' },
      ],
    },
    scales: {
      npc: "Backfire. Literal backfire. Do not laugh. The healer says they'll grow back 'if I rest,' which is the single easiest prescription I have ever been given. I have never been so medically compliant in my life. Some patients struggle with doctor's orders. I have achieved PERFECTION.",
      choices: [
        { text: 'The perfect patient.', go: 'healthy' },
        { text: 'Back to the glory days!', go: 'battles' },
        { text: '(slip away, prescribing yourself a rest)', end: 'left' },
      ],
    },
    reginald: {
      npc: "Every solstice. His handwriting is getting shaky, but the wit remains. Last letter: 'Dear Monster. Still alive. Your move. -- R.' I laughed smoke for an hour. I'm drafting my reply. It will say: 'Dear Thief. Likewise. Checkmate takes decades. -- D.' We are both, I believe, stalling.",
      choices: [
        { text: 'That’s... actually beautiful.', go: 'patClaw' },
        { text: 'What did he do with the gold cup?', go: 'throne' },
        { text: '(slip away and write a letter someday)', end: 'left' },
      ],
    },
    aura: {
      npc: "Round. Golden. Faintly crispy at the edges. You see it above certain wagons, certain kitchens, certain unusually confident farmers. My grandmother could spot a chicken aura through a MOUNTAIN. 'Grandson,' she'd say, 'dinner is two valleys east.' Never wrong. Not once in nine hundred years.",
      choices: [
        { text: 'Tell me about your grandmother!', go: 'grandmother' },
        { text: 'Do I have an aura?', go: 'yourAura' },
        { text: '(slip away, faintly crispy)', end: 'left' },
      ],
    },
    patClaw: {
      npc: "...Did you just PAT me? (A long silence. One enormous eye opens fully for the first time.) The last creature that touched this claw was a knight, and he was attempting a theft. This was... nicer. You may continue your errand, small one. And if anyone asks: you saw a TERRIFYING beast today. Absolutely fearsome. It's important to me that they know that.",
      choices: [
        { text: 'The most fearsome beast ever. Promise.', go: 'fearsome' },
        { text: '(pat the claw one more time)', go: 'patAgain' },
        { text: '(slip away, telling everyone)', end: 'left' },
      ],
    },
    poem2: {
      npc: "'Haiku for a Hen.' -- Feathered gold nugget / You cross the road for freedom / I am the road's end. -- ...The imagery. The TENSION. I performed it once for a flock of actual chickens. They didn't get it. Critics never do.",
      choices: [
        { text: 'One more! One more!', go: 'poem3' },
        { text: 'You performed poetry AT chickens?', go: 'chickenCount' },
        { text: '(slip away before poem three)', end: 'left' },
      ],
    },
    poem3: {
      npc: "Very well, the epic. 'The Ballad of the Ten Thousand Wings.' Canto one of forty-one. -- 'In elder days when fire was young, and every peak had smoke upon't...' -- actually, you know what, we should save this one. It takes four hours and you keep glancing at the sun. AUDIENCES today. Sir Reginald would have stayed. He once listened to the whole thing TWICE. Genius man. Terrible thief.",
      choices: [
        { text: 'Four HOURS?', go: 'neverSat' },
        { text: 'Fine -- back to Reginald.', go: 'reginald' },
        { text: '(slip away before canto two)', end: 'left' },
      ],
    },
    lichen: {
      npc: "It arrived without references. It 'consults' -- on WHAT? Growing slowly on things? I invented that! The moss says give it a chance. The moss is naive. Mark me, child: within a decade that lichen will be running the whole north side. This is how empires fall. I have SEEN it. First the lichen, then the mushrooms, then one day you wake up and you're a HABITAT.",
      choices: [
        { text: 'How do empires ACTUALLY fall?', go: 'ruled' },
        { text: "You're already a habitat, aren't you.", go: 'moss' },
        { text: '(slip away before joining the ecosystem)', end: 'left' },
      ],
    },
    somewhereToBe: {
      npc: "Of course you do. Somewhere urgent. Everyone's somewhere is urgent. You know what I've learned in four thousand years? The somewhere WAITS. It always waits. ...Although. Hm. If your somewhere involves that castle, I did notice wagons going in this morning. N.I.C.E. fellows. Efficient-looking. Unpleasant. But I'm sure it can wait a LITTLE longer. Now: canto one--",
      choices: [
        { text: 'WAIT. What did you see?!', go: 'sawWagons' },
        { text: 'NO CANTOS. But quickly -- what wagons?', go: 'sawWagons' },
        { text: '(sprint off immediately)', end: 'left' },
      ],
    },
    artOfLying: {
      npc: "Lesson one: choose your grass. Lesson two: lower yourself with dignity -- collapse is for amateurs. Lesson three, and this is the masterstroke: DECIDE that everything you were supposed to do today was optional. There. You now know more about lying down than any knight who ever lived. Practice daily. For decades.",
      choices: [
        { text: '(try lying down for a moment)', go: 'tryLying' },
        { text: 'I really should go...', go: 'somewhereToBe' },
        { text: '(slip away, standing proudly)', end: 'left' },
      ],
    },
    sawWagons: {
      npc: "Wagons. Orange flags. Much clanking. In MY day we'd have eaten the lot and the paperwork too -- ESPECIALLY the paperwork, very fibrous, good for digestion. But these days... (he yawns, enormously) ...these days I mostly observe. They went to the castle. That's all I know. That, and forty-one cantos.",
      choices: [
        { text: 'Thank you! (turn to leave)', go: 'fearsome' },
        { text: 'Would you REALLY have eaten paperwork?', go: 'menu' },
        { text: '(sprint toward the castle)', end: 'left' },
      ],
    },
    tryLying: {
      npc: "(You lie down in the grass next to the dragon. The clouds drift. Somewhere, a clock is ticking on your best friend's freedom.) ...Comfortable, isn't it. THIS is what I fought four centuries of wars for, in the end. Not the gold. The lie-down afterward. You may stay as long as you like. Forever, ideally. I could use the company.",
      choices: [
        { text: '(leap up -- SOFIA!)', end: 'left' },
        { text: '(five more seconds...)', go: 'fiveMore' },
        { text: 'Tell me a story while we lie here.', go: 'battles' },
      ],
    },
    fiveMore: {
      npc: "(Five seconds pass. Then ten. The dragon hums an ancient tune. It is dangerously relaxing.) ...Your generation is always counting, you know. Five more seconds, ten more minutes. In dragon time, we round everything to the nearest century. Much more restful. Almost nothing matters at that resolution. Almost nothing... except, I suppose, whatever it is YOU'RE supposed to be doing. What WERE you supposed to be doing?",
      choices: [
        { text: 'SOFIA! (scramble up and run)', end: 'left' },
        { text: "...I genuinely can't remember.", go: 'artOfLying' },
        { text: 'Shh. Five more seconds.', go: 'tryLying' },
      ],
    },
    grandmother: {
      npc: "Grandmother Emberclaw. Nine hundred years of terror, and the best cook in the hemisphere. Her secret? 'Low heat, patience, and make sure the village WATCHES.' Presentation, you see. She invented the rotisserie. Historians credit some human. HISTORIANS. Don't get me started on historians.",
      choices: [
        { text: 'Get started on historians.', go: 'historians' },
        { text: 'The village had to WATCH?', go: 'ruled' },
        { text: '(slip away, hungry and afraid)', end: 'left' },
      ],
    },
    yourAura: {
      npc: "(He squints at you for a very long time.) ...Faint gold shimmer. Determined posture. A whiff of raspberry pie about you. No chicken, sadly, but -- hm. HM. You have the aura of someone who FINDS things. Lost cats. Lost spectacles. Lost friends. That's rarer than a chicken aura, child. Don't waste it lying in the grass with an old lizard.",
      choices: [
        { text: '...That was almost helpful?!', go: 'fearsome' },
        { text: 'ALMOST is doing a lot of work there.', go: 'wise' },
        { text: '(take the hint and go find Sofia)', end: 'left' },
      ],
    },
    historians: {
      npc: "THE BATTLE OF BURNING HILL: 'a minor agricultural fire.' MY TRIBUTE OF FORTY THOUSAND CHICKENS: 'localized poultry shortage.' GORTHANAX EATING A PIRATE SHIP: 'shipwreck, causes unknown.' UNKNOWN? He did it in front of EVERYONE. There were SURVIVORS. They wrote SONGS. But no, the 'sources are unreliable.' I AM THE SOURCE. I WAS THERE.",
      choices: [
        { text: 'Tell me the REAL history then.', go: 'ruled' },
        { text: 'The songs! Sing one!', go: 'poem' },
        { text: '(slip away, citing sources)', end: 'left' },
      ],
    },
    fearsome: {
      npc: "GOOD. Fearsome. Terrifying. Twenty feet of coiled doom. (He settles deeper into the grass, eyes already closing.) You were a fine audience, small one. Top three this century. Come back anytime. I'll be here. I am ALWAYS here. That's not sad, by the way. It's BRANDING.",
      choices: [
        { text: '(wave goodbye to the fearsome beast)', end: 'left' },
        { text: 'Wait -- who were the other two audiences?', go: 'reginald' },
        { text: 'One more chicken story for the road?', go: 'chickenCount' },
      ],
    },
    patAgain: {
      npc: "(You pat the claw again. Deep inside the enormous chest, something rumbles. It takes you a moment to recognize it: purring. A dragon. Purring. He would deny it to his dying breath.) ...I am NOT purring. That is a WAR GROWL. It simply happens to be cozy. Go on now. Your friend needs you more than my ego does. Barely.",
      choices: [
        { text: '(go save Sofia)', end: 'left' },
        { text: 'That was definitely a purr.', go: 'fearsome' },
        { text: 'One last story first?', go: 'battles' },
      ],
    },
  },
};

// ---- Dash Thunderlegs: the racing gambler ----
export const RUNNER_TREES = {
  challenge: {
    start: 'greet',
    name: 'Dash Thunderlegs',
    nodes: {
      greet: {
        npc: "WHOA! You stopped me! Do you know how RARE that is?! (He jogs in place, furiously.) Dash Thunderlegs, fastest legs in the Kingdom, pleasure, hello, hi. You've got runner's calves, kid. I can tell. RACE ME TO THE CASTLE. Two gold coins says I win!",
        choices: [
          { text: "You're on! (bet 2 coins)", requireGold: 2, go: 'go', elseGo: 'broke' },
          { text: 'Why are you always running?', go: 'why' },
          { text: '(no time for races)', end: 'left' },
        ],
      },
      why: {
        npc: "Because WALKING is for people with TIME! I sat down once. Once! HATED it. My knees were like 'what is this' and my heart was like 'are we dying' and I was like 'NO, we're SITTING' and they were like 'same thing.' Never again. So! Race! Two coins! You and me! Castle! GO! -- wait, no, not yet, you have to accept first.",
        choices: [
          { text: "Okay, okay! Let's race! (bet 2 coins)", requireGold: 2, go: 'go', elseGo: 'broke' },
          { text: 'What do you do BETWEEN races?', go: 'between' },
          { text: '(back away at walking speed, to spite him)', end: 'left' },
        ],
      },
      between: {
        npc: "Warm-up jogs. Cool-down sprints. Interval dashes. And sometimes -- don't tell ANYONE -- I jog in place. (He is currently jogging in place.) It's not a rest! It's a TACTICAL PAUSE. Are we racing or what? My heart rate is PERFECT right now, you're wasting the zone!",
        choices: [
          { text: "Fine! Race! (bet 2 coins)", requireGold: 2, go: 'go', elseGo: 'broke' },
          { text: 'Have you ever lost?', go: 'lost' },
          { text: '(tactically pause, then leave)', end: 'left' },
        ],
      },
      lost: {
        npc: "LOST? ME? (His jogging intensifies.) One time. ONE time. To a falcon. And honestly? The course favored her. Everyone said so. Everyone being me, but I said it LOUDLY. Anyway I demanded a rematch and she never showed, which means I win by forfeit, which means I'm undefeated. That's just math.",
        choices: [
          { text: "Let's test that math. (bet 2 coins)", requireGold: 2, go: 'go', elseGo: 'broke' },
          { text: '(leave him to his math)', end: 'left' },
          { text: 'That is not how math works.', go: 'why' },
        ],
      },
      broke: {
        npc: "Two coins?! You don't HAVE two coins! (He checks your pockets by jogging around you very fast.) I don't race for EXPOSURE, kid. The legs demand stakes! Come back when you're rich. Or richer. Or two-coins rich, specifically, that's the number.",
        end: 'left',
        continueLabel: '(fair enough)',
      },
      go: {
        npc: "THEN WE RACE! First one to the road's end by the castle gate! On your marks! Get set! GO!!! (He is, of course, already gone. You can see his dust.)",
        end: 'race',
        continueLabel: '(RUN!!!)',
      },
    },
  },
  playerWins: {
    start: 'greet',
    name: 'Dash Thunderlegs',
    nodes: {
      greet: {
        npc: "*wheeze* ... *wheeze* ... WHAT. *wheeze* ... NOBODY beats Dash Thunderlegs! You must be MEASURED! Weighed! Tested for rockets! Disqualif-- (he checks your shoes, panting) -- no rockets. FINE. Fine!! Two coins, a bet's a bet. TAKE THEM. Take my coins AND my dignity, they travel together!",
        end: 'collect',
        continueLabel: '(collect 2 coins, graciously)',
      },
    },
  },
  lostFair: {
    start: 'greet',
    name: 'Dash Thunderlegs',
    nodes: {
      greet: {
        npc: "WOOOOO! Did you SEE me?! Of course you did -- FROM BEHIND! (He does a victory lap around you. Then another one.) The legs! The LEGS, kid! Two coins, please and thank you!",
        choices: [
          { text: '(pay the 2 coins)', payAttempt: 2 },
          { text: 'Best two out of three?', go: 'rematch' },
          { text: '(leave without paying)', end: 'refuse' },
        ],
      },
      rematch: {
        npc: "HA! No. New policy: I only race people I haven't beaten. Keeps the record clean. The record being: magnificent. Coins please!",
        choices: [
          { text: '(pay the 2 coins)', payAttempt: 2 },
          { text: '(leave without paying)', end: 'refuse' },
          { text: 'Your record includes losing to a falcon.', go: 'falcon' },
        ],
      },
      falcon: {
        npc: "THE COURSE FAVORED HER. This is settled falcon history! COINS. PLEASE.",
        choices: [
          { text: '(pay the 2 coins)', payAttempt: 2 },
          { text: '(leave without paying)', end: 'refuse' },
          { text: '(leave slowly, to annoy him)', end: 'refuse' },
        ],
      },
      paid: {
        npc: "Pleasure doing business! Tell your friends! Tell your SLOW friends especially, I've got a mortgage! (He speeds off, high-fiving a fence post on the way.)",
        end: 'settled',
        continueLabel: '(hand over the 2 coins)',
      },
      notEnough: {
        npc: "You don't even HAVE the two coins anymore?! What did you spend it on MID-RACE?! Ugh. FINE. An IOU. Signed in sweat. I'll collect. Oh, I'll collect. I know where you run.",
        end: 'refuse',
        continueLabel: '(gulp)',
      },
    },
  },
  cheated: {
    start: 'greet',
    name: 'Dash Thunderlegs (and Gerald)',
    nodes: {
      greet: {
        npc: "FIRST! I'm FIRST! Right here! At the castle! FIRST! (He is still standing on the horse's back, arms raised. The horse looks resigned.) That'll be two coins, pay the legs!",
        choices: [
          { text: 'You rode a HORSE!', go: 'argue1' },
          { text: '(pay the 2 coins, defeated)', payAttempt: 2 },
          { text: '(leave without paying)', end: 'refuse' },
        ],
      },
      argue1: {
        npc: "And?! I never said I would RUN. I said I would RACE. Horse racing! Extremely traditional! Ancient, even! Look it up! (He hops down; the horse immediately lies down.) The rules of racing are old and beautiful and, conveniently, on my side.",
        choices: [
          { text: 'Where did you even GET a horse?!', go: 'argue2' },
          { text: 'That is NOT what racing means!', go: 'argue3' },
          { text: '(pay the 2 coins, exhausted by him)', payAttempt: 2 },
        ],
      },
      argue2: {
        npc: "Found him! His name is Gerald. Horses are EVERYWHERE if you believe, kid. There I am, mid-race, LOSING -- I know, unthinkable -- and I look left and there's Gerald, just standing in a field, absolutely covered in destiny. Some things are meant to be. Gerald was meant to be. Weren't you, Gerald? (Gerald says nothing. Gerald has seen things.)",
        choices: [
          { text: 'Gerald deserves better than this.', go: 'argue4' },
          { text: 'This is outrageous!', go: 'argue3' },
          { text: '(leave without paying)', end: 'refuse' },
        ],
      },
      argue3: {
        npc: "OUTRAGEOUS? What's outrageous is your FORM on the back straight! Flailing! Beautiful speed, TERRIBLE elbows! And yet do you hear ME lodging complaints? No! I am GRACIOUS in victory! (He gestures grandly at Gerald, who has fallen asleep.) The champion's circle demands two coins!",
        choices: [
          { text: '(pay the 2 coins, elbows burning with shame)', payAttempt: 2 },
          { text: '(leave without paying)', end: 'refuse' },
          { text: 'Gerald agrees with ME.', go: 'argue4' },
        ],
      },
      argue4: {
        npc: "Gerald deserves a WINNER, and Gerald GOT one! We're a team now. Me and Gerald. Thunderlegs and Gerald. I'm getting jackets made. (He whispers:) Don't tell Gerald about the jackets, his size is a surprise. ANYWAY. Two coins! The podium is waiting and by podium I mean my pocket!",
        choices: [
          { text: '(pay the 2 coins. For Gerald.)', payAttempt: 2 },
          { text: '(leave without paying)', end: 'refuse' },
          { text: '(pet Gerald, then leave without paying)', end: 'refuse' },
        ],
      },
      paid: {
        npc: "PLEASURE doing business! Gerald and I thank you! Half of this goes to his carrot fund -- Gerald, wave to the nice loser! (Gerald does not wave. Gerald is asleep.) See you on the circuit, kid! Work on those elbows!",
        end: 'settled',
        continueLabel: '(hand over the 2 coins)',
      },
      notEnough: {
        npc: "You don't HAVE two coins?! I carried a HORSE for nothing?! ...An IOU then. Signed in sweat. Gerald is my witness. I'll collect, kid. The legs ALWAYS collect.",
        end: 'refuse',
        continueLabel: '(gulp)',
      },
    },
  },
  caught: {
    start: 'greet',
    name: 'Dash Thunderlegs',
    nodes: {
      greet: {
        npc: "*WHEEZE* -- GOT YOU! Fastest debt collector in the Kingdom! You owe the legs TWO COINS! Pay up or the chase continues, and let me tell you, I can do this ALL DAY. It's literally all I do. This or jogging in place.",
        choices: [
          { text: '(pay the 2 coins, end this madness)', payAttempt: 2 },
          { text: 'NEVER! (run!!)', end: 'refuse' },
          { text: "You're really committed to this.", go: 'committed' },
        ],
      },
      committed: {
        npc: "Commitment is 90% of running! The other 90% is LEGS! (He counts on his fingers, frowns, shrugs.) Numbers are for walkers! COINS!",
        choices: [
          { text: '(pay the 2 coins)', payAttempt: 2 },
          { text: '(sprint away dramatically)', end: 'refuse' },
          { text: '(walk away slowly, which somehow offends him more)', end: 'refuse' },
        ],
      },
      paid: {
        npc: "FINALLY! The debt is settled! The legs are appeased! No hard feelings, kid -- honestly, best chase I've had in YEARS. You've got real fleeing talent. Ever consider running professionally? No? Offer stands! (He jogs off, high-fiving a tree.)",
        end: 'settled',
        continueLabel: '(hand over the 2 coins, rub sore legs)',
      },
      notEnough: {
        npc: "STILL broke?! I can't chase an empty purse, kid, there's no GLORY in it! ...One lap of mercy. But the legs never forget. THE LEGS NEVER FORGET.",
        end: 'refuse',
        continueLabel: '(enjoy the lap of mercy)',
      },
    },
  },
};

let active = false;
let leaveAttempts = 0;
let current = null; // { tree, callbacks, ctx }
// Click shield: ignore clicks that land immediately after the box opens (a
// stray click/tap at the moment of engagement would otherwise pick a choice
// -- possibly "(leave)" -- before the player has even read the text).
let clickShieldUntil = 0;

export function isDialogueActive() {
  return active;
}

export function startDialogue(tree, callbacks, ctx = {}) {
  current = { tree, callbacks, ctx };
  active = true;
  leaveAttempts = 0;
  clickShieldUntil = performance.now() + 400;
  nameEl.textContent = tree.name;
  boxEl.style.display = 'block';
  hintEl.style.display = 'none';
  showNode(tree.start);
}

function endDialogue(outcome) {
  active = false;
  boxEl.style.display = 'none';
  hintEl.style.display = '';
  current.callbacks.onEnd(outcome);
}

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'dialogue-choice';
  btn.textContent = label;
  btn.addEventListener('click', () => {
    if (performance.now() < clickShieldUntil) return; // swallow stray clicks
    onClick();
  });
  return btn;
}

function nodeText(node, ctx = {}) {
  return typeof node.npc === 'function' ? node.npc(ctx) : node.npc;
}

function showNode(id, ctx = {}) {
  // Brief shield on every node change too, so a double-click can't blindly
  // activate whatever choice appears next under the cursor
  clickShieldUntil = Math.max(clickShieldUntil, performance.now() + 150);
  const node = current.tree.nodes[id];
  textEl.textContent = nodeText(node, {
    gold: current.callbacks.getGold(),
    ...current.ctx,
    ...ctx,
  });
  choicesEl.innerHTML = '';

  if (node.end) {
    choicesEl.appendChild(makeButton(node.continueLabel, () => endDialogue(node.end)));
    return;
  }

  for (const choice of node.choices) {
    choicesEl.appendChild(
      makeButton(choice.text, () => {
        if (choice.leave) {
          leaveAttempts += 1;
          showNode(leaveAttempts >= 2 ? 'byebye' : 'insist');
        } else if (choice.picker) {
          showAmountPicker();
        } else if (choice.payAttempt) {
          if (current.callbacks.getGold() >= choice.payAttempt) {
            current.callbacks.spendGold(choice.payAttempt);
            showNode('paid');
          } else {
            showNode('notEnough');
          }
        } else if (choice.requireGold) {
          // Gate a choice on having enough gold (without spending it)
          showNode(
            current.callbacks.getGold() >= choice.requireGold ? choice.go : choice.elseGo
          );
        } else if (choice.ride) {
          // The time machine: rideTime() shifts the clock and reports the
          // direction so the right story plays out.
          const secondsGained = current.callbacks.rideTime();
          showNode(secondsGained > 0 ? 'wentBack' : 'wentForward');
        } else if (choice.end) {
          endDialogue(choice.end);
        } else {
          showNode(choice.go);
        }
      })
    );
  }
}

function showAmountPicker() {
  textEl.textContent = nodeText(current.tree.nodes.pickerPrompt);
  choicesEl.innerHTML = '';

  const maxGive = Math.min(10, current.callbacks.getGold());
  const row = document.createElement('div');
  row.className = 'coin-row';
  for (let n = 0; n <= maxGive; n++) {
    const btn = makeButton(`${n} 🪙`, () => {
      if (n === 0) {
        showNode('zero');
      } else {
        current.callbacks.spendGold(n);
        showNode('gave', { amount: n });
      }
    });
    btn.classList.add('coin-choice');
    row.appendChild(btn);
  }
  choicesEl.appendChild(row);
}
