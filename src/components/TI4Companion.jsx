import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown, Swords, Layers, BookOpen, Users, Dices, Settings, Star,
  Plus, Minus, RotateCcw, Trash2, ChevronRight, Hexagon, Zap, Shield,
  Rocket, FlaskConical, Coins, Compass, ScrollText, AlertCircle, Check,
  X, Award, Target
} from 'lucide-react';

// =========================================================================
// DATA
// =========================================================================

const STRATEGY_CARDS = [
  {
    num: 1, name: 'Leadership',
    tagline: 'Command tokens for everyone',
    primary: 'Gain 3 command tokens. Then, you may spend any amount of influence to gain 1 command token for every 3 influence spent.',
    secondary: 'You may spend any amount of influence to gain 1 command token for every 3 influence spent.',
    note: 'No strategy CC required for the secondary — everyone can pay influence.'
  },
  {
    num: 2, name: 'Diplomacy',
    tagline: 'Lock down a system, refresh planets',
    primary: 'Choose a system (not Mecatol Rex) that contains a planet you control. Each other player places 1 command token from their reinforcements in that system. Then, ready up to 2 exhausted planets you control.',
    secondary: 'Spend 1 token from your strategy pool to ready up to 2 exhausted planets.'
  },
  {
    num: 3, name: 'Politics',
    tagline: 'Speaker, action cards, agenda control',
    primary: 'Choose a player other than the speaker. That player gains the speaker token. Then draw 2 action cards. Then, look at the top 2 cards of the agenda deck; place each on the top or bottom of the deck in any order.',
    secondary: 'Spend 1 token from your strategy pool to draw 2 action cards.'
  },
  {
    num: 4, name: 'Construction',
    tagline: 'Build structures (the only way to add space docks/PDS off-turn)',
    primary: 'Place 1 PDS or 1 Space Dock on a planet you control. Then, place 1 additional PDS on a planet you control.',
    secondary: 'Spend 1 token from your strategy pool and place it in any system. Then place either 1 PDS or 1 Space Dock on a planet you control in or adjacent to that system.'
  },
  {
    num: 5, name: 'Trade',
    tagline: 'Money for everyone — but you choose who',
    primary: 'Gain 3 trade goods. Then, replenish your commodities. Then, choose any number of other players; those players replenish their commodities.',
    secondary: 'Spend 1 token from your strategy pool to replenish your commodities.',
    note: 'Famous "kingmaker" card — players you snub feel it hard.'
  },
  {
    num: 6, name: 'Warfare',
    tagline: 'Move fleets without a tactical action',
    primary: 'Remove 1 of your command tokens from the game board; then gain 1 command token. Then, you may redistribute any number of your command tokens on your command sheet.',
    secondary: 'Spend 1 token from your strategy pool to use the production ability of 1 of your space docks in your home system.'
  },
  {
    num: 7, name: 'Technology',
    tagline: 'Research, research, research',
    primary: 'Research 1 technology. Then, you may spend 6 resources to research 1 additional technology.',
    secondary: 'Spend 1 token from your strategy pool and 4 resources to research 1 technology.'
  },
  {
    num: 8, name: 'Imperial',
    tagline: 'Score points — and a point if you hold Mecatol',
    primary: 'Immediately score 1 public objective if you fulfill its requirements. Then gain 1 victory point if you control Mecatol Rex; otherwise draw 1 secret objective. Then gain 1 trade good.',
    secondary: 'Spend 1 token from your strategy pool to draw 1 secret objective.',
    note: 'Often a trap — popular but slow. Only powerful if you can hold Mecatol.'
  }
];

const PHASES = [
  {
    key: 'strategy', name: 'Strategy Phase', icon: Layers,
    summary: 'Pick strategy cards in initiative order.',
    steps: [
      'Speaker selects 1 strategy card from the common pool.',
      'Each other player, clockwise, selects 1 card.',
      'Each unselected card gains 1 trade good (placed on it).',
      'When taken later, those trade goods go to the player who picks the card.'
    ],
    tips: 'In a 5–6 player game, each player still picks only 1 card. Remaining 2 cards stay unpicked.'
  },
  {
    key: 'action', name: 'Action Phase', icon: Swords,
    summary: 'Take turns clockwise from the speaker. On your turn, take ONE action.',
    steps: [
      'Tactical action — activate a system, move ships, fight, invade, produce.',
      'Strategic action — resolve YOUR strategy card primary, then others may resolve secondary clockwise.',
      'Component action — play an action card / use a tech / use a leader marked "ACTION".',
      'Pass — only allowed after you\'ve used your strategy card. You can no longer take turns this round.'
    ],
    tips: 'You MUST resolve your strategy card before passing. After all players pass, the action phase ends.'
  },
  {
    key: 'status', name: 'Status Phase', icon: ScrollText,
    summary: 'Clean up the round and score objectives.',
    steps: [
      '1. Score objectives (1 public + any number of secrets you qualify for, in initiative order).',
      '2. Reveal the next public objective (speaker flips it).',
      '3. Each player draws 1 action card.',
      '4. Remove all command tokens from the game board.',
      '5. Each player gains and redistributes 2 command tokens.',
      '6. Ready all exhausted cards and planets.',
      '7. Repair damaged units.',
      '8. Return strategy cards to the common play area.'
    ],
    tips: 'You can only score ONE public objective per status phase. Plan accordingly.'
  },
  {
    key: 'agenda', name: 'Agenda Phase', icon: ScrollText,
    summary: 'Voting on galactic politics. Only triggers AFTER the Custodians Token is removed from Mecatol Rex.',
    steps: [
      'Reveal the first agenda. Each player votes (influence) or abstains, starting clockwise from the speaker.',
      'Resolve outcome. Speaker breaks ties.',
      'Reveal the second agenda. Repeat voting and resolution.',
      'Then ready all planets exhausted from voting.'
    ],
    tips: 'A player must spend 6 INFLUENCE to remove the Custodians Token (as a tactical action invasion of Mecatol). They get 1 VP for doing it.'
  }
];

const UNITS = [
  { name: 'Fighter',     combat: 9, dice: 1, move: 0, capacity: 0, cost: '1 (×2)', notes: 'Need transport (no move). Tribute fodder in space combat.' },
  { name: 'Infantry',    combat: 8, dice: 1, move: 0, capacity: 0, cost: '1 (×2)', notes: 'Ground forces. Need transport.' },
  { name: 'Carrier',     combat: 9, dice: 1, move: 1, capacity: 4, cost: '3',     notes: 'Transports up to 4 fighters/ground forces.' },
  { name: 'Destroyer',   combat: 9, dice: 1, move: 2, capacity: 0, cost: '1',     notes: 'Anti-fighter barrage hits fighters before space combat.' },
  { name: 'Cruiser',     combat: 7, dice: 1, move: 2, capacity: 0, cost: '2',     notes: 'Workhorse hunter. Hits well.' },
  { name: 'Dreadnought', combat: 5, dice: 1, move: 1, capacity: 1, cost: '4',     notes: 'Bombardment 5. Sustain Damage. Carries 1 ground force.' },
  { name: 'War Sun',     combat: 3, dice: 3, move: 2, capacity: 2, cost: '12',    notes: '3 dice at 3+. Bombardment 3 (×3). Sustain. The hammer.' },
  { name: 'Space Dock',  combat: '—', dice: 0, move: 0, capacity: 0, cost: '4',  notes: 'Produces units (capacity = its production value).' },
  { name: 'PDS',         combat: '—', dice: 0, move: 0, capacity: 0, cost: '2',  notes: 'Space Cannon 6 against ships. Planetary Shield blocks bombardment.' },
];

const TACTICAL_STEPS = [
  { name: 'Activation', desc: 'Place a command token from your tactic pool in a system. You cannot activate a system you already have a CC in.' },
  { name: 'Movement', desc: 'Move any of your ships from systems WITHOUT your CC into the active system, respecting move values. Space cannon offense triggers on enemy ships entering.' },
  { name: 'Space Combat', desc: 'If both players have ships in the active system, fight in rounds: Anti-Fighter Barrage (Destroyers) → Announce Retreats → Roll combat dice → Assign hits → repeat until one side is gone or retreats.' },
  { name: 'Invasion', desc: 'Bombard with Dreadnoughts/War Suns (unless Planetary Shield). Commit ground forces from ships in the system. Space Cannon Defense (PDS) hits incoming infantry. Then ground combat planet-by-planet.' },
  { name: 'Production', desc: 'Use your Space Dock(s) in the active system to build. Total cost ≤ planet RESOURCES (tap planets). Production value = limit on units built.' },
];

const FACTIONS = [
  { name: 'The Federation of Sol', color: '#1e40af', accent: '#60a5fa',
    style: 'Versatile, infantry-heavy, well-rounded starter faction.',
    abilities: ['ORBITAL DROP — Spend a CC to place 2 infantry from reinforcements on a planet you control.', 'VERSATILE — Each turn at end of action phase, gain 1 CC if you have 0 in any pool.'],
    startingUnits: '2 Carriers, 1 Dreadnought, 1 Destroyer, 1 Fighter, 1 Space Dock, 1 PDS, 5 Infantry',
    startingTech: 'Neural Motivator',
    factionTech: 'Spec Ops II (Infantry II), Advanced Carrier II',
    planets: 'Jord (4/2)' },
  { name: 'The Mentak Coalition', color: '#f59e0b', accent: '#fbbf24',
    style: 'Pirates. Excellent first-strike space combat.',
    abilities: ['AMBUSH — At start of space combat, you may roll 1 die per cruiser/destroyer (max 2); each hit assigns immediately.', 'PILLAGE — When adjacent player has 3+ trade goods/commodities and loses ground forces, take 1.'],
    startingUnits: '2 Cruisers, 1 Carrier, 1 Space Dock, 1 PDS, 4 Infantry, 3 Fighters',
    startingTech: 'Sarween Tools, Plasma Scoring',
    factionTech: 'Salvage Operations, Mylonomedoidals (Mech II via PoK only — but base game has none)',
    planets: 'Moll Primus (4/1)' },
  { name: 'The Yin Brotherhood', color: '#a855f7', accent: '#c084fc',
    style: 'Religious zealots. Manipulative ground combat & sabotage.',
    abilities: ['INDOCTRINATION — At start of invasion combat on a planet, may spend 2 influence; replace one enemy infantry with 1 of yours.', 'STALL TACTICS — As an action, discard 1 action card from your hand.'],
    startingUnits: '1 Carrier, 1 Destroyer, 1 Space Dock, 4 Fighters, 4 Infantry',
    startingTech: 'Sarween Tools',
    factionTech: 'Yin Spinner, Impulse Core',
    planets: 'Darien (4/4)' },
  { name: 'The Embers of Muaat', color: '#dc2626', accent: '#f87171',
    style: 'Fire-elementals. Start with a War Sun.',
    abilities: ['STAR FORGE — As an action, spend 1 CC from strategy pool to place 2 fighters or 1 destroyer in your home system.', 'GASHLAI PHYSIOLOGY — Your ships are unaffected by anomalies; can move through supernovas.'],
    startingUnits: '1 War Sun, 1 Carrier, 1 Dreadnought, 1 Destroyer, 1 Fighter, 1 Space Dock, 4 Infantry',
    startingTech: 'Plasma Scoring',
    factionTech: 'Magmus Reactor, Prototype War Sun II',
    planets: 'Muaat (4/1)' },
  { name: 'The Arborec', color: '#16a34a', accent: '#4ade80',
    style: 'Plant-based hivemind. Cannot produce from space docks — only from infantry.',
    abilities: ['MITOSIS — At start of status phase, place 1 infantry from reinforcements on any planet you control.', 'LET THEM EAT PLASTIC — Cannot trade commodities. Other players cannot give you commodities.'],
    startingUnits: '1 Carrier, 1 Cruiser, 1 Space Dock, 1 PDS, 2 Fighters, 4 Infantry',
    startingTech: 'Magen Defense Grid',
    factionTech: 'Bioplasmosis, Letani Warrior II',
    planets: 'Nestphar (3/2)' },
  { name: 'The L1Z1X Mindnet', color: '#374151', accent: '#9ca3af',
    style: 'Cybernetic tyrants. Best dreadnoughts in the galaxy.',
    abilities: ['ASSIMILATE — When you gain control of a planet, replace any PDS/Space Dock with one of yours.', 'HARROW — At end of each round of ground combat on a planet you bombarded earlier this combat, roll 1 die against opponent ground forces (hits at 5+).'],
    startingUnits: '1 Dreadnought, 1 Carrier, 1 Fighter, 1 Space Dock, 1 PDS, 5 Infantry',
    startingTech: 'Neural Motivator, Plasma Scoring',
    factionTech: 'Inheritance Systems, Super-Dreadnought II (combat 4!)',
    planets: '[0.0.0] (5/0)' },
  { name: 'The Winnu', color: '#fbbf24', accent: '#fde68a',
    style: 'Lazax remnants. Mecatol Rex is their birthright.',
    abilities: ['BLOOD TIES — You do not have to spend influence to remove the Custodians Token from Mecatol.', 'RECLAMATION — After resolving a tactical action in Mecatol\'s system, you may place 1 PDS and 1 Space Dock from reinforcements on Mecatol.'],
    startingUnits: '1 Cruiser, 1 Carrier, 1 Fighter, 1 Space Dock, 1 PDS, 2 Infantry',
    startingTech: 'Choose any 1 starting tech',
    factionTech: 'Hegemonic Trade Policy, Lazax Gate Folding',
    planets: 'Winnu (3/4)' },
  { name: 'The Nekro Virus', color: '#1f2937', accent: '#ef4444',
    style: 'Genocidal AI. Cannot be a Speaker. Cannot vote. Steal tech.',
    abilities: ['GALACTIC THREAT — Cannot vote on agendas. Cannot be the speaker. Other players cannot have promissory notes from you.', 'TECHNOLOGICAL SINGULARITY — Once per combat, after winning a combat, you may research 1 of your opponent\'s technologies (ignoring prerequisites).'],
    startingUnits: '1 Dreadnought, 1 Cruiser, 1 Carrier, 2 Fighters, 1 Space Dock, 2 Infantry',
    startingTech: 'Daxcive Animators',
    factionTech: 'Valefar Assimilator X, Valefar Assimilator Y (steal & color any tech)',
    planets: 'Mordai II (4/0)' },
  { name: 'The Naalu Collective', color: '#0d9488', accent: '#5eead4',
    style: 'Reptilian psychics. Always go first in the action phase.',
    abilities: ['TELEPATHIC — At end of strategy phase, place the "0" Naalu token on top of your strategy card; you have initiative 0.', 'FOFTAR FLEETS — Your fighters have a move value of 1.'],
    startingUnits: '1 Cruiser, 1 Destroyer, 1 Carrier, 3 Fighters, 1 Space Dock, 1 PDS, 4 Infantry',
    startingTech: 'Neural Motivator, Sarween Tools',
    factionTech: 'Hybrid Crystal Fighter II, Neuroglaive',
    planets: 'Maaluuk (0/2), Druaa (3/1)' },
  { name: 'The Barony of Letnev', color: '#991b1b', accent: '#fca5a5',
    style: 'Aristocratic warmongers. Big fleets, big damage.',
    abilities: ['MUNITIONS RESERVES — At start of each round of space combat, you may spend 2 trade goods to reroll any number of your dice.', 'ARMADA — Your fleet pool capacity is increased by 2.'],
    startingUnits: '1 Dreadnought, 1 Destroyer, 1 Carrier, 1 Fighter, 1 Space Dock, 3 Infantry',
    startingTech: 'Antimass Deflectors, Plasma Scoring',
    factionTech: 'Non-Euclidean Shielding, L4 Disruptors',
    planets: 'Arc Prime (4/0), Wren Terra (2/1)' },
  { name: 'The Clan of Saar', color: '#84cc16', accent: '#bef264',
    style: 'Nomadic raiders. Their Space Dock MOVES.',
    abilities: ['SCAVENGE — After gaining control of a planet, gain 1 trade good.', 'NOMADIC — You cannot have your space docks pinned in your home system. Floating Factory: your Space Docks are placed in space (in systems, not on planets).'],
    startingUnits: '2 Cruisers, 1 Carrier, 2 Fighters, 1 Space Dock, 4 Infantry',
    startingTech: 'Antimass Deflectors',
    factionTech: 'Chaos Mapping, Floating Factory II',
    planets: 'Lisis II (1/0), Ragh (2/1)' },
  { name: 'The Universities of Jol-Nar', color: '#7c3aed', accent: '#a78bfa',
    style: 'Hyper-intelligent fish. Bad at combat, brilliant at tech.',
    abilities: ['FRAGILE — Apply -1 to your unit combat rolls.', 'BRILLIANT — Apply +1 to result of any roll required by a tech\'s ability. Start with 2 tech of your choice (any color).'],
    startingUnits: '2 Carriers, 1 Dreadnought, 1 Fighter, 1 Space Dock, 1 PDS, 2 Infantry',
    startingTech: 'Choose 2 starting tech',
    factionTech: 'E-Res Siphons, Spacial Conduit Cylinder',
    planets: 'Jol (1/2), Nar (2/3)' },
  { name: 'The Sardakk N\'orr', color: '#b91c1c', accent: '#fecaca',
    style: 'Insectoid warriors. +1 to ALL unit combat rolls.',
    abilities: ['UNRELENTING — Apply +1 to all your unit combat rolls.'],
    startingUnits: '1 Dreadnought, 1 Carrier, 1 Cruiser, 1 Space Dock, 1 PDS, 5 Infantry',
    startingTech: 'None',
    factionTech: 'Exotrireme II, Valkyrie Particle Weave',
    planets: 'Tren\'lak (1/0), Quinarra (3/1)' },
  { name: 'The Xxcha Kingdom', color: '#0891b2', accent: '#67e8f9',
    style: 'Diplomatic turtles. Best defensive faction.',
    abilities: ['PEACE ACCORDS — When you resolve Diplomacy primary, you may also ready 1 additional planet.', 'QUASH — When an agenda is revealed, you may spend 1 token from strategy pool to discard it; reveal another.'],
    startingUnits: '1 Cruiser, 1 Carrier, 2 Fighters, 1 Space Dock, 1 PDS, 3 Infantry',
    startingTech: 'Graviton Laser System',
    factionTech: 'Nullification Field, Instinct Training',
    planets: 'Archon Ren (2/3), Archon Tau (1/1)' },
  { name: 'The Yssaril Tribes', color: '#65a30d', accent: '#a3e635',
    style: 'Reptilian spies. Hoard action cards. Take stalls.',
    abilities: ['STALL TACTICS — As an action, discard 1 action card from your hand.', 'SCHEMING — When you draw action cards, draw 1 additional, then discard 1.', 'CRAFTY — There is no maximum hand size for action cards.'],
    startingUnits: '1 Carrier, 1 Cruiser, 2 Fighters, 1 Space Dock, 1 PDS, 5 Infantry',
    startingTech: 'Neural Motivator',
    factionTech: 'Mageon Implants, Transparasteel Plating',
    planets: 'Retillion (2/3), Shalloq (1/2)' },
  { name: 'The Emirates of Hacan', color: '#ea580c', accent: '#fdba74',
    style: 'Lion-merchants. The galaxy\'s economic engine.',
    abilities: ['MASTERS OF TRADE — You do not have to spend a CC for the secondary of Trade.', 'GUILD SHIPS — Other players cannot block your trade. You can trade action cards & promissory notes.', 'ARBITERS — When you trade with another player, you may exchange action cards.'],
    startingUnits: '2 Carriers, 1 Cruiser, 2 Fighters, 1 Space Dock, 1 PDS, 4 Infantry',
    startingTech: 'Antimass Deflectors, Sarween Tools',
    factionTech: 'Production Biomes, Quantum Datahub Node',
    planets: 'Arretze (2/0), Hercant (1/1), Kamdorn (0/1)' },
  { name: 'The Ghosts of Creuss', color: '#22d3ee', accent: '#a5f3fc',
    style: 'Inter-dimensional travelers. Wormholes connect their empire.',
    abilities: ['QUANTUM ENTANGLEMENT — Treat alpha and beta wormholes as if adjacent.', 'CREUSS GATE — Set up your home system on the edge of the galaxy. The Creuss Gate is a wormhole leading to it.', 'SLIPSTREAM — Your ships moving out of a system containing your wormhole gain +1 movement.'],
    startingUnits: '1 Dreadnought, 1 Carrier, 2 Fighters, 1 Space Dock, 4 Infantry',
    startingTech: 'Gravity Drive',
    factionTech: 'Wormhole Generator, Dimensional Splicer',
    planets: 'Creuss (4/2)' },
];

const FACTION_SHORT = {
  'The Federation of Sol': 'Sol',
  'The Mentak Coalition': 'Mentak',
  'The Yin Brotherhood': 'Yin',
  'The Embers of Muaat': 'Muaat',
  'The Arborec': 'Arborec',
  'The L1Z1X Mindnet': 'L1Z1X',
  'The Winnu': 'Winnu',
  'The Nekro Virus': 'Nekro',
  'The Naalu Collective': 'Naalu',
  'The Barony of Letnev': 'Letnev',
  'The Clan of Saar': 'Saar',
  'The Universities of Jol-Nar': 'Jol-Nar',
  "The Sardakk N'orr": 'Sardakk',
  'The Xxcha Kingdom': 'Xxcha',
  'The Yssaril Tribes': 'Yssaril',
  'The Emirates of Hacan': 'Hacan',
  'The Ghosts of Creuss': 'Creuss',
};

const SETUP_STEPS = [
  { title: 'Choose factions', desc: 'Each player draws or picks a faction sheet. Take your starting tech, units, and 8 command tokens (3 tactic, 3 fleet, 2 strategy).' },
  { title: 'Build the galaxy', desc: 'Place Mecatol Rex in the center. Players take turns placing system tiles outward (use the standard 4/5/6 player setup chart). Home systems are placed last on the outer ring.' },
  { title: 'Place starting units', desc: 'Each player places their starting units in their home system per the faction sheet.' },
  { title: 'Speaker token', desc: 'Random player gets the Speaker token. They will pick first in the strategy phase.' },
  { title: 'Custodians Token', desc: 'Place the Custodians Token on Mecatol Rex. Until removed (cost: 6 influence during invasion), no Agenda Phase.' },
  { title: 'Public objectives', desc: 'Reveal the first Stage I public objective. Stage II remain hidden until all Stage I are revealed.' },
  { title: 'Action cards & secrets', desc: 'Each player draws 1 secret objective and 1 action card.' },
  { title: 'Trade goods & commodities', desc: 'Take 2 trade goods. Set commodities to 0. Your faction sheet shows your commodity replenish value.' },
  { title: 'Begin Round 1', desc: 'Speaker selects a strategy card first. Round 1 has no agenda phase regardless.' }
];

const QUICK_REF = {
  resources: 'Spent on units & tech. Top number on planet card. Exhaust the planet to spend.',
  influence: 'Spent on votes, command tokens (Leadership), the Custodians Token (6). Bottom number on planet card. Exhaust the planet to spend.',
  commodities: 'Tradable currency only. Become trade goods when received from another player. Replenish from your faction value.',
  tradeGoods: 'Permanent currency. Each = 1 resource OR 1 influence (when not voting on agendas).',
  commandTokens: 'Tactic pool (1 per tactical action), Fleet pool (capacity), Strategy pool (secondaries). Get 2 each status phase.',
  fleetSupply: 'Number of CCs in fleet pool = max non-fighter ships you can have in any one system. Fighters don\'t count.',
  victoryPoints: 'First to 10 wins. From scoring objectives, Imperial primary on Mecatol, support-for-the-throne, agenda riders, etc.',
};

// =========================================================================
// MAIN APP
// =========================================================================

const PLAYER_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#9333ea', '#0891b2'];

const App = () => {
  const [tab, setTab] = useState('tracker');
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState('strategy');
  const [players, setPlayers] = useState([
    { id: 1, name: 'Player 1', faction: 'The Federation of Sol', vp: 0, strategyCard: null, speaker: true, active: false },
    { id: 2, name: 'Player 2', faction: 'The Emirates of Hacan', vp: 0, strategyCard: null, speaker: false, active: false },
    { id: 3, name: 'Player 3', faction: 'The Universities of Jol-Nar', vp: 0, strategyCard: null, speaker: false, active: false },
    { id: 4, name: 'Player 4', faction: 'The Mentak Coalition', vp: 0, strategyCard: null, speaker: false, active: false },
  ]);
  const [vpTarget, setVpTarget] = useState(10);

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  const fontDisplay = { fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' };
  const fontBody = { fontFamily: "'Cormorant Garamond', serif" };
  const fontMono = { fontFamily: "'JetBrains Mono', monospace" };

  const tabs = [
    { key: 'tracker', label: 'Tracker', icon: Crown },
    { key: 'combat', label: 'Combat', icon: Dices },
    { key: 'phases', label: 'Phases', icon: ScrollText },
    { key: 'strategy', label: 'Strategy', icon: Layers },
    { key: 'factions', label: 'Factions', icon: Users },
    { key: 'units', label: 'Units & Ref', icon: Rocket },
    { key: 'setup', label: 'Setup', icon: Settings },
  ];

  return (
    <div
      className="min-h-screen w-full text-amber-50"
      style={{
        background: '#0b0d12',
        ...fontBody,
        fontSize: '17px',
      }}
    >

      {/* Header */}
      <header className="relative border-b border-amber-700/30 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Hexagon className="w-8 h-8 text-amber-400" strokeWidth={1.2} />
            <div>
              <h1 style={{ ...fontDisplay, fontSize: '22px', fontWeight: 700 }} className="text-amber-200">
                TWILIGHT IMPERIUM
              </h1>
              <p style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70">
                COMPANION · 4TH EDITION · BASE GAME
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{ ...fontDisplay, fontSize: '11px' }}
                  className={`flex items-center gap-1.5 px-3 py-2 transition-all border ${
                    active
                      ? 'bg-amber-400/15 text-amber-200 border-amber-400/60'
                      : 'text-amber-100/60 border-transparent hover:text-amber-200 hover:border-amber-700/40'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {t.label.toUpperCase()}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {tab === 'tracker' && (
          <Tracker
            round={round} setRound={setRound}
            phase={phase} setPhase={setPhase}
            players={players} setPlayers={setPlayers}
            vpTarget={vpTarget} setVpTarget={setVpTarget}
            fontDisplay={fontDisplay} fontMono={fontMono}
          />
        )}
        {tab === 'combat' && <Combat fontDisplay={fontDisplay} fontMono={fontMono} />}
        {tab === 'phases' && <Phases fontDisplay={fontDisplay} fontMono={fontMono} />}
        {tab === 'strategy' && <StrategyCards fontDisplay={fontDisplay} fontMono={fontMono} />}
        {tab === 'factions' && <Factions fontDisplay={fontDisplay} fontMono={fontMono} />}
        {tab === 'units' && <UnitsRef fontDisplay={fontDisplay} fontMono={fontMono} />}
        {tab === 'setup' && <Setup fontDisplay={fontDisplay} fontMono={fontMono} />}
      </main>

      <footer className="relative border-t border-amber-700/20 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-amber-500/40" style={{ ...fontDisplay, fontSize: '10px' }}>
          MAY THE LAZAX BIRTHRIGHT BE WITH YOU
        </div>
      </footer>
    </div>
  );
};

// =========================================================================
// TRACKER
// =========================================================================

const Tracker = ({ round, setRound, phase, setPhase, players, setPlayers, vpTarget, setVpTarget, fontDisplay, fontMono }) => {
  const phaseList = [
    { key: 'strategy', label: 'Strategy', icon: Layers },
    { key: 'action', label: 'Action', icon: Swords },
    { key: 'status', label: 'Status', icon: ScrollText },
    { key: 'agenda', label: 'Agenda', icon: Crown },
  ];

  const updatePlayer = (id, patch) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const setSpeaker = (id) => {
    setPlayers((ps) => ps.map((p) => ({ ...p, speaker: p.id === id })));
  };

  const setActive = (id) => {
    setPlayers((ps) => ps.map((p) => ({ ...p, active: p.id === id })));
  };

  const addPlayer = () => {
    if (players.length >= 6) return;
    const newId = (Math.max(...players.map(p => p.id), 0)) + 1;
    setPlayers((ps) => [...ps, {
      id: newId,
      name: `Player ${newId}`,
      faction: FACTIONS[(newId - 1) % FACTIONS.length].name,
      vp: 0, strategyCard: null, speaker: false, active: false,
    }]);
  };

  const removePlayer = (id) => {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
  };

  const advancePhase = () => {
    const idx = phaseList.findIndex((p) => p.key === phase);
    const next = phaseList[(idx + 1) % phaseList.length];
    if (next.key === 'strategy') setRound((r) => r + 1);
    setPhase(next.key);
  };

  const resetGame = () => {
    if (!window.confirm('Reset the entire game tracker?')) return;
    setRound(1);
    setPhase('strategy');
    setPlayers((ps) => ps.map((p) => ({ ...p, vp: 0, strategyCard: null, active: false })));
  };

  // Sort by initiative for display
  const orderedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.strategyCard == null && b.strategyCard == null) return 0;
      if (a.strategyCard == null) return 1;
      if (b.strategyCard == null) return -1;
      return a.strategyCard - b.strategyCard;
    });
  }, [players]);

  const winner = players.find((p) => p.vp >= vpTarget);

  return (
    <div className="space-y-6">
      {winner && (
        <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-400/20 to-amber-600/10 p-6 text-center">
          <Award className="w-12 h-12 text-amber-300 mx-auto mb-2" />
          <div style={{ ...fontDisplay, fontSize: '12px' }} className="text-amber-400/80 mb-1">VICTORY ACHIEVED</div>
          <div style={{ ...fontDisplay, fontSize: '24px', fontWeight: 700 }} className="text-amber-200">
            {winner.name} ASCENDS TO IMPERIUM
          </div>
          <div className="text-amber-300/70 mt-1">{winner.faction}</div>
        </div>
      )}

      {/* Round + Phase */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="border border-amber-700/30 bg-black/30 p-5">
          <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70 mb-3">ROUND</div>
          <div className="flex items-center justify-between">
            <button onClick={() => setRound(Math.max(1, round - 1))} className="text-amber-300 hover:text-amber-100">
              <Minus className="w-5 h-5" />
            </button>
            <div style={{ ...fontMono, fontSize: '48px', fontWeight: 700 }} className="text-amber-200 tabular-nums">
              {round}
            </div>
            <button onClick={() => setRound(round + 1)} className="text-amber-300 hover:text-amber-100">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="md:col-span-2 border border-amber-700/30 bg-black/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70">PHASE</div>
            <button
              onClick={advancePhase}
              style={{ ...fontDisplay, fontSize: '10px' }}
              className="px-3 py-1 border border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
            >
              ADVANCE →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {phaseList.map((p) => {
              const Icon = p.icon;
              const active = phase === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPhase(p.key)}
                  style={{ ...fontDisplay, fontSize: '11px' }}
                  className={`flex flex-col items-center gap-1 py-3 border transition-all ${
                    active
                      ? 'bg-amber-400/15 text-amber-200 border-amber-400/60'
                      : 'text-amber-100/50 border-amber-700/30 hover:text-amber-200 hover:border-amber-500/50'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.4} />
                  {p.label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VP target */}
      <div className="border border-amber-700/30 bg-black/30 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-amber-400" />
          <span style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70">VICTORY THRESHOLD</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setVpTarget(Math.max(6, vpTarget - 1))} className="text-amber-300 hover:text-amber-100"><Minus className="w-4 h-4"/></button>
            <span style={{ ...fontMono }} className="text-amber-200 text-lg tabular-nums w-8 text-center">{vpTarget}</span>
            <button onClick={() => setVpTarget(Math.min(14, vpTarget + 1))} className="text-amber-300 hover:text-amber-100"><Plus className="w-4 h-4"/></button>
          </div>
          <span className="text-amber-100/40 text-sm">VP (standard is 10)</span>
        </div>
        <button
          onClick={resetGame}
          style={{ ...fontDisplay, fontSize: '10px' }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-700/40 text-red-300 hover:bg-red-900/20"
        >
          <RotateCcw className="w-3 h-3"/>
          RESET GAME
        </button>
      </div>

      {/* Players */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ ...fontDisplay, fontSize: '14px' }} className="text-amber-300">
            PLAYERS · ORDERED BY INITIATIVE
          </h2>
          {players.length < 6 && (
            <button
              onClick={addPlayer}
              style={{ ...fontDisplay, fontSize: '10px' }}
              className="flex items-center gap-1 px-3 py-1.5 border border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
            >
              <Plus className="w-3 h-3"/> ADD PLAYER
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {orderedPlayers.map((p) => {
            const playerColor = PLAYER_COLORS[(p.id - 1) % PLAYER_COLORS.length];
            const factionData = FACTIONS.find((f) => f.name === p.faction);
            return (
              <div
                key={p.id}
                className={`border bg-black/30 transition-all flex flex-col ${
                  p.active ? 'border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.25)]' : 'border-amber-700/30'
                }`}
              >
                {/* Header strip: color + initiative + name + actions */}
                <div className="flex items-stretch border-b border-amber-700/20">
                  <div className="w-1.5 flex-shrink-0" style={{ background: playerColor }} />
                  <div className="px-3 py-2 flex items-center justify-center border-r border-amber-700/20 min-w-[3rem]">
                    <span style={{ ...fontMono, fontSize: '22px', fontWeight: 700 }} className="text-amber-200 tabular-nums">
                      {p.strategyCard != null ? p.strategyCard : '—'}
                    </span>
                  </div>
                  <input
                    value={p.name}
                    onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                    className="bg-transparent text-amber-100 px-3 py-2 flex-1 min-w-0 focus:outline-none focus:bg-amber-400/5"
                    style={{ ...fontDisplay, fontSize: '13px' }}
                  />
                  <div className="flex items-stretch border-l border-amber-700/20">
                    <button
                      title="Speaker"
                      onClick={() => setSpeaker(p.id)}
                      className={`px-2.5 flex items-center ${p.speaker ? 'bg-amber-400/20 text-amber-200' : 'text-amber-100/40 hover:text-amber-300'}`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Active turn"
                      onClick={() => setActive(p.active ? -1 : p.id)}
                      className={`px-2.5 flex items-center border-l border-amber-700/20 ${p.active ? 'bg-amber-400/20 text-amber-200' : 'text-amber-100/40 hover:text-amber-300'}`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Remove player"
                      onClick={() => removePlayer(p.id)}
                      className="px-2.5 flex items-center border-l border-amber-700/20 text-red-400/40 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Faction selector */}
                <div className="p-3 pb-2">
                  <select
                    value={p.faction}
                    onChange={(e) => updatePlayer(p.id, { faction: e.target.value })}
                    className="bg-black/60 border border-amber-700/40 text-amber-100 px-2 py-1.5 w-full focus:outline-none focus:border-amber-400 text-sm"
                    style={fontBody()}
                  >
                    {FACTIONS.map((f) => (
                      <option key={f.name} value={f.name} style={{ background: '#0a0e1c' }}>{f.name}</option>
                    ))}
                  </select>
                  {factionData && (
                    <div className="mt-1.5 text-amber-100/45 text-xs italic" style={fontBody()}>
                      {factionData.style}
                    </div>
                  )}
                </div>

                {/* Strategy card initiative selector */}
                <div className="px-3 pb-3">
                  <div style={{ ...fontDisplay, fontSize: '9px' }} className="text-amber-500/60 mb-1.5">
                    STRATEGY CARD
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <button
                        key={n}
                        onClick={() => updatePlayer(p.id, { strategyCard: p.strategyCard === n ? null : n })}
                        style={{ ...fontMono, fontSize: '11px' }}
                        className={`aspect-square border tabular-nums transition-colors ${
                          p.strategyCard === n
                            ? 'bg-amber-400/30 border-amber-400 text-amber-100'
                            : 'border-amber-700/30 text-amber-100/40 hover:border-amber-500'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VP footer */}
                <div className="mt-auto p-3 border-t border-amber-700/20 flex items-center justify-between">
                  <div style={{ ...fontDisplay, fontSize: '10px' }} className="text-amber-500/70">
                    VICTORY POINTS
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updatePlayer(p.id, { vp: Math.max(0, p.vp - 1) })} className="text-amber-300 hover:text-amber-100">
                      <Minus className="w-4 h-4"/>
                    </button>
                    <div className="flex items-center gap-1.5 min-w-[3.5rem] justify-center">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span style={{ ...fontMono, fontSize: '22px', fontWeight: 700 }} className="text-amber-200 tabular-nums">
                        {p.vp}
                      </span>
                    </div>
                    <button onClick={() => updatePlayer(p.id, { vp: Math.min(vpTarget, p.vp + 1) })} className="text-amber-300 hover:text-amber-100">
                      <Plus className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {players.length === 0 && (
          <div className="text-center py-12 text-amber-500/40" style={fontBody()}>
            No players. Add some to begin.
          </div>
        )}
      </div>

      {/* Reminders by phase */}
      <div className="border border-amber-700/30 bg-black/40 p-5">
        <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4"/> CURRENT PHASE REMINDER
        </div>
        <PhaseReminder phase={phase} round={round} fontDisplay={fontDisplay} />
      </div>
    </div>
  );
};

const fontBody = () => ({ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px' });

const PhaseReminder = ({ phase, round, fontDisplay }) => {
  const data = PHASES.find((p) => p.key === phase);
  if (!data) return null;
  return (
    <div>
      <div style={{ ...fontDisplay, fontSize: '16px', fontWeight: 600 }} className="text-amber-200 mb-2">{data.name.toUpperCase()}</div>
      <p className="text-amber-100/80 mb-3" style={fontBody()}>{data.summary}</p>
      <ol className="space-y-1.5 text-amber-100/70 list-none">
        {data.steps.map((s, i) => (
          <li key={i} className="flex gap-3" style={fontBody()}>
            <span className="text-amber-500 flex-shrink-0">▸</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {data.tips && (
        <div className="mt-3 pt-3 border-t border-amber-700/20 text-amber-300/80 text-sm italic" style={fontBody()}>
          ⚑ {data.tips}
        </div>
      )}
      {phase === 'agenda' && round === 1 && (
        <div className="mt-3 pt-3 border-t border-red-700/30 text-red-300/80 text-sm" style={fontBody()}>
          ⚠ Round 1 has no Agenda Phase. The Custodians Token must first be removed from Mecatol Rex.
        </div>
      )}
    </div>
  );
};

// =========================================================================
// COMBAT
// =========================================================================

const Combat = ({ fontDisplay, fontMono }) => {
  const [diceCount, setDiceCount] = useState(3);
  const [target, setTarget] = useState(7);
  const [modifier, setModifier] = useState(0);
  const [results, setResults] = useState([]);

  const roll = () => {
    const newResults = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 10) + 1);
    setResults(newResults);
  };

  const rerollMisses = () => {
    setResults((prev) => prev.map((r) => (r + modifier < target ? Math.floor(Math.random() * 10) + 1 : r)));
  };

  const clearRolls = () => setResults([]);

  const hits = results.filter((r) => r + modifier >= target).length;

  const presetUnit = (unit) => {
    setTarget(typeof unit.combat === 'number' ? unit.combat : 9);
    setDiceCount(unit.dice || 1);
    setModifier(0);
    setResults([]);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Roller */}
      <div className="lg:col-span-2 space-y-4">
        <div className="border border-amber-700/30 bg-black/30 p-6">
          <h2 style={{ ...fontDisplay, fontSize: '14px' }} className="text-amber-300 mb-4">COMBAT DICE ROLLER</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stepper label="DICE" value={diceCount} setValue={setDiceCount} min={1} max={20} fontDisplay={fontDisplay} fontMono={fontMono} />
            <Stepper label="TARGET (HIT ON ≥)" value={target} setValue={setTarget} min={1} max={10} fontDisplay={fontDisplay} fontMono={fontMono} />
            <Stepper label="MODIFIER" value={modifier} setValue={setModifier} min={-3} max={5} signed fontDisplay={fontDisplay} fontMono={fontMono} />
          </div>

          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={roll}
              style={{ ...fontDisplay, fontSize: '12px' }}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-400/20 border border-amber-400 text-amber-100 hover:bg-amber-400/30"
            >
              <Dices className="w-4 h-4" /> ROLL DICE
            </button>
            <button
              onClick={rerollMisses}
              disabled={results.length === 0}
              style={{ ...fontDisplay, fontSize: '12px' }}
              className="px-4 py-2.5 border border-amber-700/40 text-amber-300 hover:bg-amber-400/10 disabled:opacity-30"
            >
              REROLL MISSES
            </button>
            <button
              onClick={clearRolls}
              disabled={results.length === 0}
              style={{ ...fontDisplay, fontSize: '12px' }}
              className="px-4 py-2.5 border border-amber-700/40 text-amber-300 hover:bg-amber-400/10 disabled:opacity-30"
            >
              CLEAR
            </button>
          </div>

          {/* Dice display */}
          {results.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {results.map((r, i) => {
                  const total = r + modifier;
                  const isHit = total >= target;
                  return (
                    <div
                      key={i}
                      className={`relative flex flex-col items-center justify-center w-16 h-16 border-2 ${
                        isHit ? 'border-amber-400 bg-amber-400/10' : 'border-amber-700/30 bg-black/40'
                      }`}
                    >
                      <span
                        style={{ ...fontMono, fontSize: '24px', fontWeight: 700 }}
                        className={`tabular-nums ${isHit ? 'text-amber-200' : 'text-amber-100/50'}`}
                      >
                        {r}
                      </span>
                      {modifier !== 0 && (
                        <span style={{ ...fontMono, fontSize: '9px' }} className="text-amber-500/70 absolute bottom-1">
                          ={total}
                        </span>
                      )}
                      {isHit && <Check className="absolute -top-2 -right-2 w-4 h-4 text-amber-300 bg-black rounded-full p-0.5" />}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-amber-700/20 pt-3 flex items-center justify-between">
                <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70">RESULT</div>
                <div className="text-right">
                  <div style={{ ...fontMono, fontSize: '32px', fontWeight: 700 }} className="text-amber-200 tabular-nums leading-none">
                    {hits} <span className="text-amber-500/60 text-base">/ {results.length}</span>
                  </div>
                  <div style={{ ...fontDisplay, fontSize: '10px' }} className="text-amber-500/70 mt-1">
                    {hits === 1 ? 'HIT' : 'HITS'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border border-amber-700/30 bg-black/30 p-5 text-amber-100/70 text-sm" style={fontBody()}>
          <strong className="text-amber-300">How to use:</strong> Set dice to total combat dice (e.g., 3 cruisers = 3 dice).
          Set target to lowest combat value rolling. If multiple unit types, roll each separately. Common modifiers: <span className="text-amber-300">+1 from Sardakk N'orr's Unrelenting</span>, <span className="text-amber-300">−1 from Jol-Nar's Fragile</span>, <span className="text-amber-300">+1 from Plasma Scoring (one die in space combat)</span>.
        </div>
      </div>

      {/* Unit reference */}
      <div className="border border-amber-700/30 bg-black/30 p-5">
        <h3 style={{ ...fontDisplay, fontSize: '12px' }} className="text-amber-300 mb-3">UNIT QUICK SELECT</h3>
        <div className="space-y-1">
          {UNITS.filter((u) => typeof u.combat === 'number').map((u) => (
            <button
              key={u.name}
              onClick={() => presetUnit(u)}
              className="w-full text-left px-3 py-2 border border-amber-700/20 hover:border-amber-400/50 hover:bg-amber-400/5 transition-colors flex items-center justify-between"
            >
              <span style={fontBody()} className="text-amber-100/90">{u.name}</span>
              <span style={fontMono} className="text-amber-300 text-xs tabular-nums">
                {u.dice > 1 ? `${u.dice}×` : ''}{u.combat}+
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Stepper = ({ label, value, setValue, min = 0, max = 99, signed = false, fontDisplay, fontMono }) => (
  <div>
    <div style={{ ...fontDisplay, fontSize: '10px' }} className="text-amber-500/70 mb-2">{label}</div>
    <div className="flex items-center justify-between border border-amber-700/30 bg-black/40 px-2 py-2">
      <button onClick={() => setValue(Math.max(min, value - 1))} className="text-amber-300 hover:text-amber-100">
        <Minus className="w-4 h-4" />
      </button>
      <span style={{ ...fontMono, fontSize: '22px', fontWeight: 700 }} className="text-amber-200 tabular-nums">
        {signed && value > 0 ? '+' : ''}{value}
      </span>
      <button onClick={() => setValue(Math.min(max, value + 1))} className="text-amber-300 hover:text-amber-100">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// =========================================================================
// PHASES
// =========================================================================

const Phases = ({ fontDisplay }) => (
  <div>
    <div className="text-amber-300/80 mb-4" style={fontBody()}>
      Each round of TI4 has four phases. Master the order and you've mastered the bones of the game.
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
    {PHASES.map((p, i) => {
      const Icon = p.icon;
      return (
        <div key={p.key} className="border border-amber-700/30 bg-black/30 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-[0.04]">
            <Icon className="w-40 h-40 text-amber-300" strokeWidth={0.5} />
          </div>
          <div className="relative">
            <div className="flex items-baseline gap-3 mb-3">
              <span style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/60">{String(i + 1).padStart(2, '0')}</span>
              <h2 style={{ ...fontDisplay, fontSize: '20px', fontWeight: 700 }} className="text-amber-200">
                {p.name.toUpperCase()}
              </h2>
            </div>
            <p className="text-amber-100/80 mb-4 text-lg" style={fontBody()}>{p.summary}</p>
            <ol className="space-y-2">
              {p.steps.map((s, idx) => (
                <li key={idx} className="flex gap-3" style={fontBody()}>
                  <span className="text-amber-500 flex-shrink-0 mt-1">◆</span>
                  <span className="text-amber-100/80">{s}</span>
                </li>
              ))}
            </ol>
            {p.tips && (
              <div className="mt-4 pt-3 border-t border-amber-700/20 italic text-amber-300/90" style={fontBody()}>
                ⚑ {p.tips}
              </div>
            )}
          </div>
        </div>
      );
    })}
    </div>
  </div>
);

// =========================================================================
// STRATEGY CARDS
// =========================================================================

const StrategyCards = ({ fontDisplay, fontMono }) => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-3">
      <div className="text-amber-300/80 mb-2" style={fontBody()}>
        The 8 strategy cards. Each round, every player picks one. The lowest number takes the action phase first.
      </div>
      {STRATEGY_CARDS.map((c) => {
        const isOpen = expanded === c.num;
        return (
          <div key={c.num} className="border border-amber-700/30 bg-black/30 overflow-hidden transition-all">
            <button
              onClick={() => setExpanded(isOpen ? null : c.num)}
              className="w-full p-5 flex items-center gap-5 text-left hover:bg-amber-400/5 transition-colors"
            >
              <div
                className="flex-shrink-0 w-14 h-14 border-2 border-amber-400 flex items-center justify-center bg-gradient-to-br from-amber-400/20 to-transparent"
                style={{ ...fontMono, fontSize: '28px', fontWeight: 700 }}
              >
                <span className="text-amber-200 tabular-nums">{c.num}</span>
              </div>
              <div className="flex-1">
                <div style={{ ...fontDisplay, fontSize: '18px', fontWeight: 700 }} className="text-amber-200">
                  {c.name.toUpperCase()}
                </div>
                <div className="text-amber-300/80 text-sm mt-0.5" style={fontBody()}>{c.tagline}</div>
              </div>
              <ChevronRight className={`w-5 h-5 text-amber-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 border-t border-amber-700/20 grid md:grid-cols-2 gap-5 pt-5">
                <div>
                  <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-400 mb-2">▸ PRIMARY (CARD HOLDER)</div>
                  <p className="text-amber-100/85" style={fontBody()}>{c.primary}</p>
                </div>
                <div>
                  <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70 mb-2">▸ SECONDARY (OTHER PLAYERS)</div>
                  <p className="text-amber-100/85" style={fontBody()}>{c.secondary}</p>
                </div>
                {c.note && (
                  <div className="md:col-span-2 pt-3 border-t border-amber-700/20 italic text-amber-300/80 text-sm" style={fontBody()}>
                    ⚑ {c.note}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// =========================================================================
// FACTIONS
// =========================================================================

const Factions = ({ fontDisplay, fontMono }) => {
  const [selected, setSelected] = useState(FACTIONS[0]);

  return (
    <div className="space-y-5">
      {/* Compact chip selector */}
      <div>
        <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70 mb-2">
          SELECT FACTION
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FACTIONS.map((f) => {
            const isSelected = selected.name === f.name;
            return (
              <button
                key={f.name}
                onClick={() => setSelected(f)}
                className={`flex items-center gap-2 pr-3 py-1.5 border transition-all ${
                  isSelected
                    ? 'bg-amber-400/15 border-amber-400/70'
                    : 'border-amber-700/25 hover:border-amber-500/50 bg-black/20'
                }`}
              >
                <div className="w-1 h-5" style={{ background: f.color }} />
                <span
                  style={{ ...fontDisplay, fontSize: '11px', fontWeight: 600 }}
                  className={isSelected ? 'text-amber-100' : 'text-amber-200/70'}
                >
                  {(FACTION_SHORT[f.name] || f.name).toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="border border-amber-700/30 bg-black/30 overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(to right, ${selected.color}, ${selected.accent} 60%, transparent)` }} />

        <div className="p-7">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
            <div>
              <div style={{ ...fontDisplay, fontSize: '11px', color: selected.accent }}>
                FACTION DOSSIER
              </div>
              <h2 style={{ ...fontDisplay, fontSize: '26px', fontWeight: 700 }} className="text-amber-100 mt-1">
                {selected.name.toUpperCase()}
              </h2>
            </div>
          </div>
          <p className="text-amber-300/80 italic mb-6 text-lg" style={fontBody()}>
            {selected.style}
          </p>

          {/* Quick reference stats - prominent, scannable */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            <StatCard label="HOME SYSTEM" value={selected.planets} fontDisplay={fontDisplay} />
            <StatCard label="STARTING UNITS" value={selected.startingUnits} fontDisplay={fontDisplay} />
            <StatCard label="STARTING TECH" value={selected.startingTech} fontDisplay={fontDisplay} />
            <StatCard label="FACTION TECH" value={selected.factionTech} fontDisplay={fontDisplay} />
          </div>

          {/* Abilities - the deep read */}
          <div>
            <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-400 mb-3">
              ▸ FACTION ABILITIES
            </div>
            <ul className="space-y-3">
              {selected.abilities.map((a, i) => (
                <li key={i} className="flex gap-3 text-amber-100/85 leading-relaxed" style={fontBody()}>
                  <span className="text-amber-400 flex-shrink-0 mt-1">◆</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, fontDisplay }) => (
  <div className="border border-amber-700/30 bg-black/40 p-3">
    <div style={{ ...fontDisplay, fontSize: '9px' }} className="text-amber-500/70 mb-1.5">
      {label}
    </div>
    <div className="text-amber-100/90 text-sm leading-snug" style={fontBody()}>{value}</div>
  </div>
);

// =========================================================================
// UNITS & QUICK REF
// =========================================================================

const UnitsRef = ({ fontDisplay, fontMono }) => (
  <div className="space-y-6">
    {/* Units table */}
    <div className="border border-amber-700/30 bg-black/30 p-6">
      <h2 style={{ ...fontDisplay, fontSize: '14px' }} className="text-amber-300 mb-4">UNIT REFERENCE</h2>
      <div className="overflow-x-auto">
        <table className="w-full" style={fontBody()}>
          <thead>
            <tr className="border-b border-amber-700/30 text-amber-500/70" style={{ ...fontDisplay, fontSize: '10px' }}>
              <th className="text-left py-2 px-2">UNIT</th>
              <th className="text-center py-2 px-2">COMBAT</th>
              <th className="text-center py-2 px-2">DICE</th>
              <th className="text-center py-2 px-2">MOVE</th>
              <th className="text-center py-2 px-2">CAPACITY</th>
              <th className="text-center py-2 px-2">COST</th>
              <th className="text-left py-2 px-2">NOTES</th>
            </tr>
          </thead>
          <tbody>
            {UNITS.map((u, i) => (
              <tr key={u.name} className={i % 2 === 0 ? 'bg-amber-400/[0.02]' : ''}>
                <td className="py-2.5 px-2 text-amber-100" style={{ ...fontDisplay, fontSize: '12px', fontWeight: 600 }}>{u.name.toUpperCase()}</td>
                <td className="py-2.5 px-2 text-center text-amber-200" style={fontMono}>{u.combat}{typeof u.combat === 'number' ? '+' : ''}</td>
                <td className="py-2.5 px-2 text-center text-amber-200" style={fontMono}>{u.dice || '—'}</td>
                <td className="py-2.5 px-2 text-center text-amber-200" style={fontMono}>{u.move || '—'}</td>
                <td className="py-2.5 px-2 text-center text-amber-200" style={fontMono}>{u.capacity || '—'}</td>
                <td className="py-2.5 px-2 text-center text-amber-200" style={fontMono}>{u.cost}</td>
                <td className="py-2.5 px-2 text-amber-100/70 text-sm">{u.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Tactical action steps */}
    <div className="border border-amber-700/30 bg-black/30 p-6">
      <h2 style={{ ...fontDisplay, fontSize: '14px' }} className="text-amber-300 mb-4">TACTICAL ACTION — IN ORDER</h2>
      <div className="grid md:grid-cols-5 gap-3">
        {TACTICAL_STEPS.map((s, i) => (
          <div key={s.name} className="border border-amber-700/30 p-4 relative">
            <div className="absolute top-2 right-2" style={{ ...fontMono, fontSize: '11px' }}>
              <span className="text-amber-500/40 tabular-nums">{i + 1}</span>
            </div>
            <div style={{ ...fontDisplay, fontSize: '11px', fontWeight: 700 }} className="text-amber-200 mb-2 pr-4">
              {s.name.toUpperCase()}
            </div>
            <div className="text-amber-100/80 text-sm" style={fontBody()}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Glossary */}
    <div className="border border-amber-700/30 bg-black/30 p-6">
      <h2 style={{ ...fontDisplay, fontSize: '14px' }} className="text-amber-300 mb-4">CORE CONCEPTS</h2>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
        {Object.entries(QUICK_REF).map(([key, value]) => {
          const labels = {
            resources: ['Resources', Coins],
            influence: ['Influence', Crown],
            commodities: ['Commodities', Compass],
            tradeGoods: ['Trade Goods', Coins],
            commandTokens: ['Command Tokens', Zap],
            fleetSupply: ['Fleet Supply', Shield],
            victoryPoints: ['Victory Points', Star],
          };
          const [label, Icon] = labels[key];
          return (
            <div key={key} className="flex gap-3">
              <Icon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <div style={{ ...fontDisplay, fontSize: '11px', fontWeight: 600 }} className="text-amber-200 mb-1">
                  {label.toUpperCase()}
                </div>
                <div className="text-amber-100/80 text-sm" style={fontBody()}>{value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Action types */}
    <div className="border border-amber-700/30 bg-black/30 p-6">
      <h2 style={{ ...fontDisplay, fontSize: '14px' }} className="text-amber-300 mb-4">ACTION TYPES (PICK ONE PER TURN)</h2>
      <div className="grid md:grid-cols-4 gap-3">
        {[
          { name: 'Tactical', desc: 'Activate a system. Move, fight, invade, build. The main verb of TI4.' },
          { name: 'Strategic', desc: 'Resolve your strategy card. Once per round.' },
          { name: 'Component', desc: 'Play an action card or use an "ACTION" ability on a tech, leader, etc.' },
          { name: 'Pass', desc: 'Only after you\'ve used your strategy card. You\'re out for the rest of the round.' },
        ].map((a) => (
          <div key={a.name} className="border border-amber-700/30 p-4">
            <div style={{ ...fontDisplay, fontSize: '11px', fontWeight: 700 }} className="text-amber-200 mb-2">
              {a.name.toUpperCase()}
            </div>
            <div className="text-amber-100/80 text-sm" style={fontBody()}>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =========================================================================
// SETUP
// =========================================================================

const Setup = ({ fontDisplay, fontMono }) => {
  const [done, setDone] = useState(new Set());

  const toggle = (i) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const progress = (done.size / SETUP_STEPS.length) * 100;

  return (
    <div className="space-y-5">
      <div className="border border-amber-700/30 bg-black/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <div style={{ ...fontDisplay, fontSize: '11px' }} className="text-amber-500/70">SETUP PROGRESS</div>
          <div style={{ ...fontMono, fontSize: '14px' }} className="text-amber-200 tabular-nums">
            {done.size} / {SETUP_STEPS.length}
          </div>
        </div>
        <div className="h-1 bg-amber-900/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {SETUP_STEPS.map((s, i) => {
          const checked = done.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full text-left flex gap-4 p-5 border transition-all ${
                checked ? 'border-amber-700/40 bg-amber-400/[0.04]' : 'border-amber-700/30 bg-black/30 hover:border-amber-500/40'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 border-2 flex items-center justify-center mt-0.5 ${
                  checked ? 'bg-amber-400/30 border-amber-400' : 'border-amber-700/40'
                }`}
              >
                {checked ? <Check className="w-4 h-4 text-amber-100" /> : <span style={{ ...fontMono, fontSize: '12px' }} className="text-amber-500/60 tabular-nums">{i + 1}</span>}
              </div>
              <div className="flex-1">
                <div
                  style={{ ...fontDisplay, fontSize: '14px', fontWeight: 700 }}
                  className={`mb-1 ${checked ? 'text-amber-100/50 line-through' : 'text-amber-200'}`}
                >
                  {s.title.toUpperCase()}
                </div>
                <div className={`${checked ? 'text-amber-100/40' : 'text-amber-100/80'}`} style={fontBody()}>
                  {s.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {done.size === SETUP_STEPS.length && (
        <div className="border-2 border-amber-400 bg-amber-400/10 p-6 text-center">
          <Hexagon className="w-10 h-10 text-amber-300 mx-auto mb-2" />
          <div style={{ ...fontDisplay, fontSize: '16px', fontWeight: 700 }} className="text-amber-200">
            THE GALAXY AWAITS
          </div>
          <div className="text-amber-100/70 mt-1" style={fontBody()}>
            Setup complete. Switch to TRACKER and have the speaker pick first.
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
