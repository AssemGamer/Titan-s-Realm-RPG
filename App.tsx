import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Item, Player, Monster, GameView, ItemType, ItemRarity, CastleState, Guild, EquipmentSlot, Skill, MarketListing, FloatingText, Recipe, CraftingProcess, GatheringProcess, Buff
} from './types';
import { 
  SwordIcon, ShieldIcon, CastleIcon, BagIcon, SkullIcon, TreeIcon, HammerIcon, UsersIcon, 
  MarketIcon, HelmetIcon, BootIcon, PickaxeIcon, AxeIcon, ZapIcon, AnvilIcon, ScrollIcon, CoinIcon, FireIcon, PotionIcon
} from './components/Icons';
import { generateMonsterLore, generateCastleTaunt } from './services/geminiService';

// --- DATA CONFIGURATION ---

const MATERIALS = ['Bronze', 'Iron', 'Steel', 'Mithril', 'Adamantite', 'Rune', 'Dragon', 'Crystal', 'Void', 'Solar'];
const ARMOR_TYPES = ['Helmet', 'Chestplate', 'Leggings', 'Boots'];

const FOREST_MOBS = [
    'Rat', 'Wolf', 'Spider', 'Boar', 'Bandit', 'Treant', 'Giant Hornet', 'Wild Bear', 'Goblin Scout', 'Forest Slime', 
    'Centaur', 'Dryad', 'Giant Snake', 'Rabid Fox', 'Earth Golem'
];
const DUNGEON_MOBS = [
    'Skeleton', 'Zombie', 'Bat', 'Kobold', 'Crypt Ghoul', 'Necromancer', 'Dark Knight', 'Mimic', 'Cave Troll', 
    'Banshee', 'Ogre', 'Basilisk', 'Shadow Shade', 'Cursed Armor', 'Lich'
];
const VOLCANO_MOBS = [
    'Imp', 'Magma Golem', 'Hellhound', 'Fire Elemental', 'Demon', 'Salamander', 'Lava Slime', 'Phoenix Hatchling', 
    'Efreet', 'Obsidian Gargoyle', 'Succubus', 'Fire Drake', 'Ash Walker', 'Burning Skeleton', 'Molten Giant'
];

// --- INITIAL DATA & UTILS ---

const KNIGHT_SKILLS: Skill[] = [
  { id: 'sk_passive_1', name: 'Iron Will', type: 'PASSIVE', description: 'Reduces incoming damage by 15%.', cost: 1, unlocked: false, equipped: false, cooldown: 0, effectValue: 0.15 },
  { id: 'sk_active_1', name: 'Heavy Strike', type: 'ACTIVE', description: 'Deal 35 extra damage instantly.', cost: 1, unlocked: false, equipped: false, cooldown: 5, effectValue: 35 },
  { id: 'sk_passive_2', name: 'Loot Mastery', type: 'PASSIVE', description: 'Enemies drop 30% more gold.', cost: 2, unlocked: false, equipped: false, cooldown: 0, effectValue: 0.3 },
  { id: 'sk_active_2', name: 'Second Wind', type: 'ACTIVE', description: 'Heal 40% Max HP instantly.', cost: 3, unlocked: false, equipped: false, cooldown: 15, effectValue: 0.4 },
  { id: 'sk_active_3', name: 'Shield Bash', type: 'ACTIVE', description: 'Stun enemy for 0.5s + 50 DMG.', cost: 5, unlocked: false, equipped: false, cooldown: 8, effectValue: 50 },
  { id: 'sk_passive_3', name: 'Vampiric Blade', type: 'PASSIVE', description: 'Heal for 15% of damage dealt.', cost: 5, unlocked: false, equipped: false, cooldown: 0, effectValue: 0.15 },
  { id: 'sk_passive_4', name: 'Tenacity', type: 'PASSIVE', description: 'Resistance against status effects +20% (Passive Def Bonus).', cost: 3, unlocked: false, equipped: false, cooldown: 0, effectValue: 0.2 },
  { id: 'sk_active_4', name: 'Charge', type: 'ACTIVE', description: 'Rush target: 70 DMG + 1s Stun.', cost: 4, unlocked: false, equipped: false, cooldown: 6, effectValue: 70, stunDuration: 1000 },
];

const INITIAL_PLAYER: Player = {
  name: '',
  class: 'Knight',
  level: 1,
  xp: 0,
  maxXp: 100,
  hp: 150,
  maxHp: 150,
  gold: 100,
  attack: 10,
  defense: 5,
  skillPoints: 1,
  inventory: [],
  equipped: {},
  skills: JSON.parse(JSON.stringify(KNIGHT_SKILLS)),
  activeBuffs: [],
  resources: { wood: 0, ore: 0, stone: 0, leather: 0 },
  castleKeys: 0,
  lastSaveTime: Date.now(),
  automation: { miner: false, lumberjack: false }
};

// Generate Recipes
const RECIPES: Recipe[] = [];
MATERIALS.forEach((mat, i) => {
    const tier = i + 1;
    // Weapons
    RECIPES.push({
        id: `rec_sword_${i}`,
        result: { id: `craft_sword_${i}`, name: `${mat} Sword`, type: ItemType.WEAPON, slot: EquipmentSlot.MAIN_HAND, rarity: i > 7 ? ItemRarity.LEGENDARY : i > 5 ? ItemRarity.EPIC : i > 3 ? ItemRarity.RARE : ItemRarity.COMMON, power: tier * 10, value: tier * 50 },
        category: 'Weapon',
        cost: { ore: tier * 10, wood: tier * 5 },
        craftTime: 25
    });
    // Armor
    ARMOR_TYPES.forEach((armor, j) => {
        const slot = armor === 'Helmet' ? EquipmentSlot.HEAD : armor === 'Chestplate' ? EquipmentSlot.BODY : armor === 'Leggings' ? EquipmentSlot.LEGS : EquipmentSlot.HEAD;
        RECIPES.push({
            id: `rec_armor_${i}_${j}`,
            result: { id: `craft_armor_${i}_${j}`, name: `${mat} ${armor}`, type: ItemType.ARMOR, slot, rarity: i > 7 ? ItemRarity.LEGENDARY : i > 5 ? ItemRarity.EPIC : i > 3 ? ItemRarity.RARE : ItemRarity.COMMON, power: tier * 8, value: tier * 60 },
            category: 'Armor',
            cost: { ore: tier * 12 },
            craftTime: 25
        });
    });
    // Tools
    RECIPES.push({
        id: `rec_axe_${i}`,
        result: { id: `craft_axe_${i}`, name: `${mat} Axe`, type: ItemType.TOOL, slot: EquipmentSlot.TOOL, rarity: i > 5 ? ItemRarity.EPIC : ItemRarity.COMMON, power: tier * 5, value: tier * 40 },
        category: 'Tool',
        cost: { wood: tier * 20, ore: tier * 5 },
        craftTime: 25
    });
});
// Potion
RECIPES.push({
    id: `rec_pot_1`,
    result: { id: `craft_pot_1`, name: `Lesser Health Potion`, type: ItemType.CONSUMABLE, rarity: ItemRarity.COMMON, power: 0, value: 20 },
    category: 'Potion',
    cost: { wood: 5, gold: 10 },
    craftTime: 5
});

const BOT_GUILDS: Guild[] = [
  { id: 'g1', name: 'Crimson Blades', level: 50, members: 45, power: 5000, gold: 100000, leaderName: 'Ares' },
  { id: 'g2', name: 'Azure Magi', level: 42, members: 30, power: 4200, gold: 50000, leaderName: 'Merlin' },
  { id: 'g3', name: 'Iron Vanguard', level: 60, members: 99, power: 8000, gold: 500000, leaderName: 'Titan' },
  { id: 'g4', name: 'Shadow Stalkers', level: 35, members: 20, power: 3000, gold: 25000, leaderName: 'Noctis' },
  { id: 'g5', name: 'Golden Lions', level: 70, members: 150, power: 12000, gold: 1000000, leaderName: 'Midas' },
];

const RARITY_ORDER = {
  [ItemRarity.COMMON]: 0,
  [ItemRarity.UNCOMMON]: 1,
  [ItemRarity.RARE]: 2,
  [ItemRarity.EPIC]: 3,
  [ItemRarity.LEGENDARY]: 4,
  [ItemRarity.MYTHIC]: 5,
  [ItemRarity.GODLY]: 6
};

// --- STORAGE KEYS ---
const KEY_DB = 'rpg_database_v4';

// --- APP COMPONENT ---

export default function App() {
  const [view, setView] = useState<GameView>(GameView.LOGIN);
  
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [guilds, setGuilds] = useState<Guild[]>(BOT_GUILDS);
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [castle, setCastle] = useState<CastleState>({ ownerName: 'Lord Vex', ownerGuild: 'Shadows', ownerPower: 50, occupiedSince: Date.now() });
  
  // Auth State
  const [authForm, setAuthForm] = useState({ name: '', pass: '', confirm: '' });
  const [authError, setAuthError] = useState('');

  // Game Loop State
  const [combatZone, setCombatZone] = useState<GameView.FOREST | GameView.DUNGEON | GameView.VOLCANO | null>(null);
  const [lastTick, setLastTick] = useState<number>(Date.now());
  const [onlinePlayers, setOnlinePlayers] = useState(1);
  const [offlineGains, setOfflineGains] = useState<string>('');
  
  // Visuals State
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [isMonsterHit, setIsMonsterHit] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [monsterDescription, setMonsterDescription] = useState<string>('');
  const [showUpdateNotes, setShowUpdateNotes] = useState(false);
  
  // Crafting & Gathering
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [draggedSkill, setDraggedSkill] = useState<Skill | null>(null);
  const [activeCraft, setActiveCraft] = useState<CraftingProcess | null>(null);
  const [activeGather, setActiveGather] = useState<GatheringProcess | null>(null);
  const [craftAmount, setCraftAmount] = useState(1);
  const [craftingTab, setCraftingTab] = useState<'Weapon' | 'Armor' | 'Tool' | 'Potion'>('Weapon');
  
  // UI Filters
  const [skillFilter, setSkillFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');

  // Trade System
  const [tradeModal, setTradeModal] = useState<{partner: string, myOffer: Item[], theirOffer: Item[], locked: boolean} | null>(null);

  // Market
  const [marketListings, setMarketListings] = useState<MarketListing[]>([]);

  // Refs
  const playerRef = useRef(player);
  const monsterRef = useRef(currentMonster);
  const marketRef = useRef(marketListings);
  const guildsRef = useRef(guilds);
  
  // Sync Refs
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { monsterRef.current = currentMonster; }, [currentMonster]);
  useEffect(() => { marketRef.current = marketListings; }, [marketListings]);
  useEffect(() => { guildsRef.current = guilds; }, [guilds]);

  // --- INIT & PERSISTENCE ---

  useEffect(() => {
    const dbStr = localStorage.getItem(KEY_DB);
    if (dbStr) {
        const db = JSON.parse(dbStr);
        if (db.market) setMarketListings(db.market);
        if (db.guilds) setGuilds(db.guilds);
    } else {
        generateBotListings();
    }

    const timer = setInterval(() => {
        simulateWorld();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Save on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (playerRef.current.name) {
        saveDatabase(playerRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const saveDatabase = (p: Player) => {
      const dbStr = localStorage.getItem(KEY_DB);
      let db = dbStr ? JSON.parse(dbStr) : { players: {}, market: [], guilds: [] };
      db.players[p.name] = { ...p, lastSaveTime: Date.now() };
      db.market = marketRef.current;
      db.guilds = guildsRef.current;
      localStorage.setItem(KEY_DB, JSON.stringify(db));
  };

  const calculateOfflineProgress = (p: Player) => {
      const now = Date.now();
      const last = p.lastSaveTime || now;
      const secondsOffline = (now - last) / 1000;
      
      let msg = '';
      if (p.automation.miner && secondsOffline > 30) {
          const cycles = Math.floor(secondsOffline / 30);
          const oreGained = cycles * (1 + Math.floor(Math.random() * 2));
          p.resources.ore += oreGained;
          p.xp += cycles * 2;
          msg += `Offline Mining: +${oreGained} Ore, +${cycles*2} XP. `;
      }

      setPlayer({...p, lastSaveTime: now});
      if (msg) {
          setOfflineGains(msg);
          setTimeout(() => setOfflineGains(''), 8000);
      }
  };

  // --- SIMULATION ---

  const simulateWorld = () => {
      // 1. Online Players Fluctuation
      setOnlinePlayers(Math.floor(Math.random() * 50) + 120);

      // 2. Guild Evolution
      let updatedGuilds = [...guildsRef.current];
      // Randomly boost a guild
      const luckyIndex = Math.floor(Math.random() * updatedGuilds.length);
      updatedGuilds[luckyIndex] = {
          ...updatedGuilds[luckyIndex],
          power: updatedGuilds[luckyIndex].power + Math.floor(Math.random() * 20) + 5
      };
      
      // Randomly hinder a guild (competition)
      if (Math.random() > 0.7) {
          const unluckyIndex = Math.floor(Math.random() * updatedGuilds.length);
          if (unluckyIndex !== luckyIndex) {
               updatedGuilds[unluckyIndex] = {
                  ...updatedGuilds[unluckyIndex],
                  power: Math.max(0, updatedGuilds[unluckyIndex].power - Math.floor(Math.random() * 10))
              };
          }
      }
      setGuilds(updatedGuilds);

      // 3. Dynamic Market (Bots Buying/Selling)
      let updatedMarket = [...marketRef.current];
      // Bot Buys Item
      if (updatedMarket.length > 0 && Math.random() > 0.8) {
          const removeIdx = Math.floor(Math.random() * updatedMarket.length);
          updatedMarket.splice(removeIdx, 1);
      }
      // Bot Lists Item
      if (Math.random() > 0.8 && updatedMarket.length < 20) {
           const botNames = ['Trader Joe', 'Merchant Mary', 'Slayer99', 'Bot123'];
           const randomMat = MATERIALS[Math.floor(Math.random() * 3)]; // Low tier stuff
           const newItem: Item = {
               id: `bot_item_${Date.now()}`,
               name: `${randomMat} Dagger`,
               type: ItemType.WEAPON,
               slot: EquipmentSlot.MAIN_HAND,
               rarity: ItemRarity.COMMON,
               power: 5 + Math.floor(Math.random() * 10),
               value: 20 + Math.floor(Math.random() * 30)
           };
           updatedMarket.push({
               id: `listing_${Date.now()}`,
               sellerName: botNames[Math.floor(Math.random() * botNames.length)],
               item: newItem,
               price: newItem.value * 1.5,
               listedAt: Date.now()
           });
      }
      setMarketListings(updatedMarket);
  };

  const generateBotListings = () => {
    const bots = ['Trader Joe', 'Merchant Mary', 'Bot123', 'Slayer99'];
    const items: Item[] = [
      { id: 'm0_1', name: 'Wooden Pickaxe', type: ItemType.TOOL, slot: EquipmentSlot.TOOL, rarity: ItemRarity.COMMON, power: 1, value: 10 },
      { id: 'm0_2', name: 'Wooden Axe', type: ItemType.TOOL, slot: EquipmentSlot.TOOL, rarity: ItemRarity.COMMON, power: 1, value: 10 },
      { id: 'm1', name: 'Iron Sword', type: ItemType.WEAPON, slot: EquipmentSlot.MAIN_HAND, rarity: ItemRarity.COMMON, power: 10, value: 50 },
      { id: 'm2', name: 'Leather Cap', type: ItemType.ARMOR, slot: EquipmentSlot.HEAD, rarity: ItemRarity.UNCOMMON, power: 5, value: 30 },
      { id: 'm3', name: 'Mithril Ore', type: ItemType.MATERIAL, rarity: ItemRarity.RARE, power: 0, value: 100 },
    ];
    
    const listings: MarketListing[] = items.map((item, i) => ({
      id: `bot_${Date.now()}_${i}`,
      sellerName: bots[i % bots.length],
      item,
      price: item.value * 2,
      listedAt: Date.now()
    }));
    setMarketListings(listings);
  };

  // --- AUTHENTICATION ---

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.name || !authForm.pass) return setAuthError("Missing fields");
    if (authForm.pass !== authForm.confirm) return setAuthError("Passwords do not match");

    const dbStr = localStorage.getItem(KEY_DB);
    const db = dbStr ? JSON.parse(dbStr) : { players: {} };
    if (db.players[authForm.name]) return setAuthError("User already exists");

    const newPlayer = { ...INITIAL_PLAYER, name: authForm.name, password: authForm.pass };
    saveDatabase(newPlayer);
    setPlayer(newPlayer);
    setView(GameView.FOREST);
    addLog(`Account created for ${newPlayer.name}.`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const dbStr = localStorage.getItem(KEY_DB);
    const db = dbStr ? JSON.parse(dbStr) : { players: {} };
    const stored = db.players[authForm.name];
    if (!stored || stored.password !== authForm.pass) return setAuthError("Invalid credentials");

    calculateOfflineProgress(stored);
    setView(GameView.FOREST);
    addLog(`Welcome back, ${stored.name}.`);
  };

  // --- GAME LOGIC ---

  const addLog = (msg: string) => {
    setBattleLog(prev => [msg, ...prev].slice(0, 5));
  };

  const spawnFloatingText = (text: string, x: number, y: number, color: string) => {
    const id = Math.random().toString();
    setFloatingTexts(prev => [...prev, { id, text, x, y, color, createdAt: Date.now() }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000);
  };

  // Skill Effects & Buffs
  const triggerActiveSkills = (now: number) => {
    const p = playerRef.current;
    const m = monsterRef.current;
    
    let updatedSkills = [...p.skills];
    let skillChanged = false;
    let damageDealt = 0;
    let hpHealed = 0;

    updatedSkills.forEach(skill => {
      if (skill.equipped && skill.type === 'ACTIVE') {
        const lastUsed = skill.lastUsed || 0;
        if (now - lastUsed >= skill.cooldown * 1000) {
           if (skill.id === 'sk_active_1' && m) { 
              skill.lastUsed = now; skillChanged = true; damageDealt += skill.effectValue; addLog(`${skill.name}! ${skill.effectValue} DMG`);
           } else if (skill.id === 'sk_active_2') { 
              skill.lastUsed = now; skillChanged = true; hpHealed += Math.floor(p.maxHp * skill.effectValue); spawnFloatingText(`+${Math.floor(p.maxHp * skill.effectValue)}`, 30, 50, '#10b981');
           } else if (skill.id === 'sk_active_3' && m) {
              skill.lastUsed = now; skillChanged = true; damageDealt += skill.effectValue; spawnFloatingText(`STUN! ${skill.effectValue}`, 70, 40, '#f97316'); addLog(`Shield Bash hits for ${skill.effectValue}!`);
           } else if (skill.id === 'sk_active_4' && m) {
              skill.lastUsed = now; skillChanged = true; damageDealt += skill.effectValue; if (m && skill.stunDuration) { m.isStunnedUntil = now + skill.stunDuration; spawnFloatingText(`CHARGE!`, 50, 20, '#fde047'); } addLog(`Charge hit for ${skill.effectValue}!`);
           }
        }
      }
    });

    if (skillChanged) {
      if (hpHealed > 0) setPlayer(prev => ({...prev, hp: Math.min(prev.maxHp, prev.hp + hpHealed), skills: updatedSkills}));
      else setPlayer(prev => ({...prev, skills: updatedSkills}));
      
      if (damageDealt > 0 && m) {
        const newHp = m.hp - damageDealt;
        setIsMonsterHit(true);
        spawnFloatingText(`-${damageDealt}`, 70, 50, '#ef4444');
        setTimeout(() => setIsMonsterHit(false), 200);

        const vamp = p.skills.find(s => s.id === 'sk_passive_3' && s.equipped);
        if (vamp) setPlayer(prev => ({...prev, hp: Math.min(prev.maxHp, prev.hp + Math.ceil(damageDealt * vamp.effectValue))}));

        if (newHp <= 0) processKill();
        else setCurrentMonster({...m, hp: newHp});
      }
    }
  };

  const updateBuffs = () => {
     setPlayer(p => {
         const now = Date.now();
         const validBuffs = p.activeBuffs.map(b => {
             if (b.duration === -1) return b; // Permanent
             return { ...b, duration: Math.max(0, b.duration - 1) };
         }).filter(b => b.duration === -1 || b.duration > 0);
         
         if (validBuffs.length !== p.activeBuffs.length || validBuffs.some((b, i) => b.duration !== p.activeBuffs[i].duration)) {
             return { ...p, activeBuffs: validBuffs };
         }
         return p;
     });
  };

  // Main Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLastTick(now);
      const p = playerRef.current;
      const m = monsterRef.current;

      if (now % 5000 < 1000 && p.name) saveDatabase(p);
      if (activeCraft && now >= activeCraft.endTime) completeCrafting();
      if (activeGather && now >= activeGather.endTime) completeGathering();
      if (p.automation.miner && now % 30000 < 1000) {
          const oreGained = 1 + Math.floor(Math.random() * 2);
          setPlayer(curr => ({...curr, resources: {...curr.resources, ore: curr.resources.ore + oreGained}}));
          addLog(`Auto-Miner: +${oreGained} Ore`);
      }

      updateBuffs();
      triggerActiveSkills(now);

      if (castle.ownerName === p.name && view !== GameView.LOGIN && view !== GameView.REGISTER) {
        if (now % 10000 < 1000) {
           setPlayer(curr => ({...curr, gold: curr.gold + 50}));
           addLog("Castle Tribute: +50 Gold");
        }
      }

      if (combatZone) {
        if (!m) {
          spawnMonster(combatZone === GameView.DUNGEON, combatZone === GameView.VOLCANO);
        } else {
          if (m.isStunnedUntil && m.isStunnedUntil > now) { /* Stunned */ } else {
              // Player Attack
              let pDmg = Math.max(1, p.attack + (p.equipped[EquipmentSlot.MAIN_HAND]?.power || 0) - m.level);
              setIsMonsterHit(true);
              setTimeout(() => setIsMonsterHit(false), 200);
              spawnFloatingText(`-${pDmg}`, 70 + (Math.random()*10 - 5), 50 + (Math.random()*10 - 5), '#ffffff');

              const mNewHp = m.hp - pDmg;
              if (mNewHp <= 0) {
                processKill();
              } else {
                // Monster Attack
                let defense = p.defense + (Object.values(p.equipped) as (Item | null)[]).reduce((sum, i) => sum + (i?.power || 0), 0);
                
                // Calculate Active Buff/Skill Defense Bonuses
                const ironSkin = p.skills.find(s => s.id === 'sk_passive_1' && s.equipped);
                if (ironSkin) defense *= (1 + ironSkin.effectValue);
                const tenacity = p.skills.find(s => s.id === 'sk_passive_4' && s.equipped);
                if (tenacity) defense *= (1 + 0.1);

                const mDmgRaw = m.attack - (defense / 2);
                // ALWAYS take at least 1 damage rule
                const mDmg = Math.max(1, mDmgRaw);
                const pNewHp = p.hp - mDmg;

                if (mDmg > 0) {
                    setIsPlayerHit(true);
                    setTimeout(() => setIsPlayerHit(false), 200);
                    spawnFloatingText(`-${Math.floor(mDmg)}`, 30, 50, '#ef4444');
                } else {
                    // Should theoretically not happen with min 1 dmg rule, but kept for logic safety
                    spawnFloatingText(`Block`, 30, 50, '#94a3b8');
                }

                if (pNewHp <= 0) {
                   setCombatZone(null); 
                   setCurrentMonster(null);
                   setPlayer(curr => ({...curr, hp: curr.maxHp}));
                   addLog("You died! Respawning...");
                   setView(GameView.PROFILE);
                } else {
                   setCurrentMonster({...m, hp: mNewHp});
                   setPlayer(curr => ({...curr, hp: pNewHp}));
                }
              }
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [combatZone, view, castle, lastTick, activeCraft, activeGather]);

  const spawnMonster = async (isDungeon: boolean, isVolcano: boolean) => {
    let mobList = FOREST_MOBS;
    if (isDungeon) mobList = DUNGEON_MOBS;
    if (isVolcano) mobList = VOLCANO_MOBS;

    const lvlBonus = isVolcano ? 15 : isDungeon ? 5 : 0;
    const lvlScale = playerRef.current.level + lvlBonus;
    const monsterName = mobList[Math.floor(Math.random() * mobList.length)];
    
    const newMonster: Monster = {
      id: Math.random().toString(),
      name: monsterName,
      level: Math.max(1, lvlScale - 2 + Math.floor(Math.random() * 4)),
      hp: 0, 
      maxHp: 0,
      attack: 0,
      xpReward: 0,
      goldReward: 0,
      isBoss: Math.random() > 0.95,
      flavorText: ''
    };
    
    newMonster.maxHp = 50 + (newMonster.level * 25) + (newMonster.isBoss ? 300 : 0);
    newMonster.hp = newMonster.maxHp;
    newMonster.attack = 8 + (newMonster.level * 3);
    newMonster.xpReward = 20 + (newMonster.level * 10);
    newMonster.goldReward = 10 + (newMonster.level * 5);

    setCurrentMonster(newMonster);
    addLog(`A Lvl ${newMonster.level} ${newMonster.name} appeared!`);

    if (newMonster.isBoss) {
      const flavor = await generateMonsterLore(newMonster.name, isVolcano ? "volcano" : isDungeon ? "dungeon" : "forest");
      setMonsterDescription(flavor);
    } else {
      setMonsterDescription('');
    }
  };

  const processKill = () => {
    const p = playerRef.current;
    const m = monsterRef.current;
    if (!m) return;

    let xpGain = m.xpReward;
    let goldGain = m.goldReward;
    
    const midas = p.skills.find(s => s.id === 'sk_passive_2' && s.equipped);
    if (midas) goldGain = Math.floor(goldGain * (1 + midas.effectValue));

    let drops: Item[] = [];
    if (Math.random() < 0.45) { // Increased drop rate slightly
      const rarityRoll = Math.random();
      let rarity = ItemRarity.COMMON;
      if (rarityRoll > 0.99) rarity = ItemRarity.LEGENDARY;
      else if (rarityRoll > 0.96) rarity = ItemRarity.EPIC;
      else if (rarityRoll > 0.85) rarity = ItemRarity.RARE;
      else if (rarityRoll > 0.60) rarity = ItemRarity.UNCOMMON;

      const typeRoll = Math.random();
      let item: Item | null = null;
      const basePower = m.level * 3.5; // Buffed item power scaling
      const rarityBonus = rarity === ItemRarity.LEGENDARY ? 3 : rarity === ItemRarity.EPIC ? 2 : 1.2;
      const power = Math.floor(basePower * rarityBonus);

      if (typeRoll < 0.4) {
          item = {
              id: Math.random().toString(),
              name: `${rarity} Essence`,
              type: ItemType.MATERIAL,
              rarity,
              power: 0,
              value: m.level * 5
          };
      } else {
          let type = ItemType.WEAPON;
          let slot = EquipmentSlot.MAIN_HAND;
          let name = "Sword";
          if (typeRoll < 0.55) { type = ItemType.ARMOR; slot = EquipmentSlot.HEAD; name = "Helmet"; }
          else if (typeRoll < 0.7) { type = ItemType.ARMOR; slot = EquipmentSlot.BODY; name = "Chestplate"; }
          else if (typeRoll < 0.85) { type = ItemType.ARMOR; slot = EquipmentSlot.LEGS; name = "Leggings"; }
          else { type = ItemType.ARMOR; slot = EquipmentSlot.OFF_HAND; name = "Shield"; }

          item = {
            id: Math.random().toString(),
            name: `${rarity} ${m.name} ${name}`,
            type,
            slot,
            rarity,
            power,
            value: m.level * 20
          };
      }
      if (item) {
          drops.push(item);
          addLog(`Dropped: ${item.name}!`);
      }
    }

    let newXp = p.xp + xpGain;
    let newLvl = p.level;
    let newMaxXp = p.maxXp;
    let points = p.skillPoints;
    
    if (newXp >= p.maxXp) {
      newXp -= p.maxXp;
      newLvl++;
      points++;
      newMaxXp = Math.floor(newMaxXp * 1.25);
      addLog(`Level Up! You gained a skill point.`);
    }

    setPlayer({
      ...p,
      xp: newXp,
      level: newLvl,
      maxXp: newMaxXp,
      skillPoints: points,
      gold: p.gold + goldGain,
      inventory: [...p.inventory, ...drops]
    });
    setCurrentMonster(null);
  };

  // --- ACTIONS ---

  const buyAutoMiner = () => {
      if (player.gold < 500) return addLog("Need 500g!");
      if (player.automation.miner) return addLog("Already owned!");
      setPlayer(p => ({...p, gold: p.gold - 500, automation: {...p.automation, miner: true}}));
      addLog("Auto-Miner purchased!");
  };

  const startGathering = (type: 'wood' | 'ore') => {
      const tool = player.equipped[EquipmentSlot.TOOL];
      if (type === 'wood' && (!tool || !tool.name.toLowerCase().includes('axe'))) return addLog("Need Axe!");
      if (type === 'ore' && (!tool || !tool.name.toLowerCase().includes('pickaxe'))) return addLog("Need Pickaxe!");
      const isWooden = tool?.name.toLowerCase().includes('wooden');
      const delay = isWooden ? 45000 : 3000;
      setActiveGather({ type, endTime: Date.now() + delay });
  };

  const completeGathering = () => {
      if (!activeGather) return;
      const amount = 1 + Math.floor(Math.random() * 3);
      if (activeGather.type === 'wood') {
          setPlayer(p => ({...p, resources: {...p.resources, wood: p.resources.wood + amount}, xp: p.xp + 5}));
          addLog(`+${amount} Wood`);
      } else {
          setPlayer(p => ({...p, resources: {...p.resources, ore: p.resources.ore + amount}, xp: p.xp + 5}));
          addLog(`+${amount} Ore`);
      }
      setActiveGather(null);
  };

  const startCrafting = (recipe: Recipe) => {
      const cost = recipe.cost;
      const p = player;
      if ((cost.wood && p.resources.wood < cost.wood * craftAmount) || 
          (cost.ore && p.resources.ore < cost.ore * craftAmount) ||
          (cost.gold && p.gold < cost.gold * craftAmount)) {
          return addLog("Not enough resources!");
      }

      setPlayer(curr => ({
          ...curr,
          gold: curr.gold - (cost.gold || 0) * craftAmount,
          resources: {
              ...curr.resources,
              wood: curr.resources.wood - (cost.wood || 0) * craftAmount,
              ore: curr.resources.ore - (cost.ore || 0) * craftAmount,
              stone: curr.resources.stone,
              leather: curr.resources.leather
          }
      }));

      setActiveCraft({
          recipeId: recipe.id,
          amount: craftAmount,
          startTime: Date.now(),
          endTime: Date.now() + 25000 
      });
  };

  const completeCrafting = () => {
      if (!activeCraft) return;
      const recipe = RECIPES.find(r => r.id === activeCraft.recipeId);
      if (recipe) {
          const newItems = Array(activeCraft.amount).fill(recipe.result).map(item => ({
              ...item,
              id: Math.random().toString()
          }));
          setPlayer(p => ({...p, inventory: [...p.inventory, ...newItems]}));
          addLog(`Crafted ${activeCraft.amount}x ${recipe.result.name}!`);
      }
      setActiveCraft(null);
  };

  const handleUseItem = (item: Item) => {
      if (item.type !== ItemType.CONSUMABLE) return;

      let used = false;
      if (item.name.includes("Health Potion")) {
          setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 50) }));
          // Apply a "Regen" buff for 10s
          const buff: Buff = {
              id: `buff_${Date.now()}`,
              name: 'Potion Regen',
              duration: 10,
              effect: 'Restoring Health',
              type: 'buff'
          };
          setPlayer(p => ({ ...p, activeBuffs: [...p.activeBuffs, buff] }));
          spawnFloatingText("+50 HP", 50, 50, "#10b981");
          used = true;
      }

      if (used) {
          setPlayer(p => ({ ...p, inventory: p.inventory.filter(i => i.id !== item.id) }));
          addLog(`Used ${item.name}`);
      }
  };

  // --- NEW FEATURES ---

  const autoEquipBest = () => {
      const p = player;
      const newEquipped = { ...p.equipped };
      let newInventory = [...p.inventory];
      let changed = false;

      const slots = [EquipmentSlot.MAIN_HAND, EquipmentSlot.OFF_HAND, EquipmentSlot.HEAD, EquipmentSlot.BODY, EquipmentSlot.LEGS, EquipmentSlot.TOOL];

      slots.forEach(slot => {
          const candidates = newInventory.filter(i => i.slot === slot);
          if (candidates.length === 0) return;

          candidates.sort((a, b) => b.power - a.power);
          const bestCandidate = candidates[0];
          const currentItem = newEquipped[slot];

          if (!currentItem || bestCandidate.power > currentItem.power) {
              newEquipped[slot] = bestCandidate;
              newInventory = newInventory.filter(i => i.id !== bestCandidate.id);
              if (currentItem) newInventory.push(currentItem);
              changed = true;
          }
      });

      if (changed) {
          setPlayer({ ...p, equipped: newEquipped, inventory: newInventory });
          addLog("Auto-Equipped best gear!");
      } else {
          addLog("Best gear already equipped.");
      }
  };

  const sortInventory = () => {
      const sorted = [...player.inventory].sort((a, b) => {
          const rDiff = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
          if (rDiff !== 0) return rDiff;
          return b.power - a.power;
      });
      setPlayer(p => ({ ...p, inventory: sorted }));
      addLog("Inventory sorted by Rarity.");
  };

  const resetSkills = () => {
      if (player.gold < 1000) return addLog("Need 1000g to reset skills.");
      
      let refundedPoints = 0;
      const resetSkillsList = player.skills.map(skill => {
          if (skill.unlocked) {
              refundedPoints += skill.cost;
          }
          return { ...skill, unlocked: false, equipped: false };
      });

      setPlayer(p => ({
          ...p,
          gold: p.gold - 1000,
          skillPoints: p.skillPoints + refundedPoints,
          skills: resetSkillsList
      }));
      addLog("Skills reset. Points refunded.");
  };

  // --- TRADE SYSTEM ---

  const initiateTrade = (partnerName: string) => {
      setTradeModal({
          partner: partnerName,
          myOffer: [],
          theirOffer: [],
          locked: false
      });
  };

  const addToTrade = (item: Item) => {
      if (!tradeModal) return;
      if (tradeModal.myOffer.find(i => i.id === item.id)) return; // Already in trade
      setTradeModal(prev => prev ? ({ ...prev, myOffer: [...prev.myOffer, item] }) : null);
  };

  const removeFromTrade = (itemId: string) => {
      setTradeModal(prev => prev ? ({...prev, myOffer: prev.myOffer.filter(i => i.id !== itemId)}) : null);
  };

  const confirmTrade = () => {
      if (!tradeModal) return;
      // Simulate bot adding random item
      const randomReward: Item = {
          id: `trade_${Date.now()}`,
          name: 'Mysterious Gem',
          rarity: ItemRarity.RARE,
          type: ItemType.MATERIAL,
          value: 100,
          power: 0
      };
      
      const newInventory = player.inventory.filter(i => !tradeModal.myOffer.some(o => o.id === i.id));
      newInventory.push(randomReward);
      
      setPlayer(p => ({...p, inventory: newInventory}));
      addLog(`Traded with ${tradeModal.partner}. Received ${randomReward.name}.`);
      setTradeModal(null);
  };

  // --- HANDLERS (Drag/Drop/Sell) ---
  
  const handleDragStart = (e: React.DragEvent, item: Item) => {
    e.dataTransfer.setData("type", "item");
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragStartSkill = (e: React.DragEvent, skill: Skill) => {
    e.dataTransfer.setData("type", "skill");
    setDraggedSkill(skill);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropEquipment = (slot: EquipmentSlot) => {
    if (!draggedItem || draggedItem.slot !== slot) return;
    const p = player;
    const oldItem = p.equipped[slot];
    setPlayer({
      ...p,
      inventory: p.inventory.filter(i => i.id !== draggedItem.id).concat(oldItem ? [oldItem] : []),
      equipped: { ...p.equipped, [slot]: draggedItem }
    });
    setDraggedItem(null);
  };

  const handleDropSkillSlot = () => {
      if (!draggedSkill) return;
      if (draggedSkill.equipped) { setDraggedSkill(null); return; }
      
      const maxSlots = 3 + (castle.ownerName === player.name ? 1 : 0);
      const equippedCount = player.skills.filter(s => s.equipped).length;

      if (equippedCount >= maxSlots) { addLog(`Max ${maxSlots} skills equipped!`); setDraggedSkill(null); return; }
      
      const newSkills = player.skills.map(s => s.id === draggedSkill.id ? {...s, equipped: true} : s);
      setPlayer(p => ({...p, skills: newSkills}));
      setDraggedSkill(null);
  };

  const handleUnequipSkill = (skillId: string) => {
      const newSkills = player.skills.map(s => s.id === skillId ? {...s, equipped: false} : s);
      setPlayer(p => ({...p, skills: newSkills}));
  }

  const handleDropInventory = () => {
    if (!draggedItem) return;
    const isEquipped = (Object.values(player.equipped) as (Item | null)[]).find(i => i?.id === draggedItem.id);
    if (isEquipped && draggedItem.slot) {
      setPlayer({
        ...player,
        equipped: { ...player.equipped, [draggedItem.slot]: null },
        inventory: [...player.inventory, draggedItem]
      });
    }
    setDraggedItem(null);
  };

  const handleDropSell = () => {
    if (!draggedItem) return;
    const isEquipped = (Object.values(player.equipped) as (Item | null)[]).find(i => i?.id === draggedItem.id);
    if (isEquipped && draggedItem.slot) {
       setPlayer(p => ({ ...p, gold: p.gold + draggedItem.value, equipped: { ...p.equipped, [draggedItem.slot]: null } }));
    } else {
       setPlayer(p => ({ ...p, gold: p.gold + draggedItem.value, inventory: p.inventory.filter(i => i.id !== draggedItem.id) }));
    }
    addLog(`Sold ${draggedItem.name} for ${draggedItem.value}g`);
    setDraggedItem(null);
  };

  const buyMarketItem = (listing: MarketListing) => {
    if (player.gold < listing.price) { addLog("Not enough gold!"); return; }
    if (listing.sellerName === player.name) {
      setPlayer(p => ({...p, inventory: [...p.inventory, listing.item]}));
    } else {
      setPlayer(p => ({ ...p, gold: p.gold - listing.price, inventory: [...p.inventory, listing.item] }));
    }
    const newList = marketListings.filter(l => l.id !== listing.id);
    setMarketListings(newList);
    marketRef.current = newList;
    const dbStr = localStorage.getItem(KEY_DB);
    let db = dbStr ? JSON.parse(dbStr) : { players: {}, market: [], guilds: [] };
    db.market = newList;
    localStorage.setItem(KEY_DB, JSON.stringify(db));
  };

  const unlockSkill = (skillId: string) => {
    const skillIndex = player.skills.findIndex(s => s.id === skillId);
    if (skillIndex === -1) return;
    const skill = player.skills[skillIndex];
    if (player.skillPoints >= skill.cost && !skill.unlocked) {
      const newSkills = [...player.skills];
      newSkills[skillIndex].unlocked = true;
      setPlayer(p => ({...p, skillPoints: p.skillPoints - skill.cost, skills: newSkills}));
    }
  };

  // Guild Actions
  const createGuild = () => {
      if (player.gold < 20000) return addLog("Need 20k Gold!");
      const name = prompt("Guild Name:");
      if (!name) return;
      const newGuild: Guild = { id: `g_${Date.now()}`, name, level: 1, members: 1, power: 100, gold: 0, leaderName: player.name };
      setGuilds([...guilds, newGuild]);
      setPlayer(p => ({...p, gold: p.gold - 20000, guildId: newGuild.id, guildRank: 'Leader'}));
      addLog(`Guild ${name} created!`);
      guildsRef.current = [...guilds, newGuild];
      saveDatabase({...player, gold: player.gold - 20000, guildId: newGuild.id});
  };

  const donateGuild = () => {
      if (!player.guildId) return;
      if (player.gold < 1000) return addLog("Need 1000g");
      const newGuilds = guilds.map(g => {
          if (g.id === player.guildId) { return { ...g, gold: g.gold + 1000, level: Math.floor((g.gold + 1000) / 10000) + 1 }; }
          return g;
      });
      setGuilds(newGuilds);
      setPlayer(p => ({...p, gold: p.gold - 1000}));
      addLog("Donated 1000g to guild.");
      guildsRef.current = newGuilds;
      saveDatabase({...player, gold: player.gold - 1000});
  };

  // --- RENDERERS ---

  if (view === GameView.LOGIN || view === GameView.REGISTER) {
    const isReg = view === GameView.REGISTER;
    return (
      <div className="min-h-screen bg-rpg-900 flex items-center justify-center text-rpg-gold font-serif">
        <div className="bg-rpg-800 p-8 rounded-lg border-2 border-rpg-700 shadow-2xl max-w-md w-full">
            <h1 className="text-4xl font-bold mb-6 text-center tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">TITAN'S REALM</h1>
            <h2 className="text-center text-gray-400 mb-4">{isReg ? 'Create Account' : 'Login'}</h2>
            <form onSubmit={isReg ? handleRegister : handleLogin} className="space-y-4">
                <input className="w-full bg-rpg-900 border border-rpg-700 p-3 rounded text-white" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} placeholder="Username" required />
                <input className="w-full bg-rpg-900 border border-rpg-700 p-3 rounded text-white" type="password" value={authForm.pass} onChange={(e) => setAuthForm({...authForm, pass: e.target.value})} placeholder="Password" required />
                {isReg && <input className="w-full bg-rpg-900 border border-rpg-700 p-3 rounded text-white" type="password" value={authForm.confirm} onChange={(e) => setAuthForm({...authForm, confirm: e.target.value})} placeholder="Confirm Password" required />}
                {authError && <div className="text-red-500 text-sm text-center">{authError}</div>}
                <button className="w-full bg-rpg-gold text-rpg-900 font-bold py-3 rounded hover:bg-yellow-400 uppercase">{isReg ? 'Sign Up' : 'Login'}</button>
            </form>
            <div className="mt-4 text-center text-sm text-gray-500 cursor-pointer hover:text-white" onClick={() => { setView(isReg ? GameView.LOGIN : GameView.REGISTER); setAuthError(''); }}>{isReg ? "Already have an account? Login" : "New here? Create Account"}</div>
        </div>
      </div>
    );
  }

  const renderInventory = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Inventory & Gear</h2>
          <div className="flex gap-2">
              <button onClick={sortInventory} className="bg-rpg-700 hover:bg-rpg-600 px-4 py-2 rounded text-sm text-white font-bold border border-gray-600">Sort Rarity</button>
              <button onClick={autoEquipBest} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded text-sm text-white font-bold border border-yellow-400">Auto Equip</button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Equipment Ragdoll */}
        <div className="bg-rpg-800 p-6 rounded-xl border border-rpg-700 flex flex-col items-center">
           <h3 className="text-xl text-rpg-gold mb-6">Equipped</h3>
           <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              {[
                { id: EquipmentSlot.HEAD, icon: HelmetIcon },
                { id: EquipmentSlot.BODY, icon: ShieldIcon },
                { id: EquipmentSlot.LEGS, icon: BootIcon },
                { id: EquipmentSlot.MAIN_HAND, icon: SwordIcon },
                { id: EquipmentSlot.OFF_HAND, icon: ShieldIcon },
                { id: EquipmentSlot.TOOL, icon: PickaxeIcon },
              ].map(slot => (
                <div key={slot.id} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDropEquipment(slot.id)} className={`aspect-square bg-rpg-900 rounded border-2 flex flex-col items-center justify-center relative p-2 ${player.equipped[slot.id] ? 'border-rpg-gold' : 'border-dashed border-gray-600'}`}>
                  {!player.equipped[slot.id] && <slot.icon className="text-gray-700 w-8 h-8" />}
                  {player.equipped[slot.id] && (
                    <div draggable onDragStart={(e) => handleDragStart(e, player.equipped[slot.id]!)} className="text-center cursor-move w-full">
                      <div className="text-xs text-yellow-400 font-bold break-words">{player.equipped[slot.id]?.name}</div>
                      <div className="text-xs text-gray-400">Pwr: {player.equipped[slot.id]?.power}</div>
                    </div>
                  )}
                  <div className="absolute top-1 left-1 text-[10px] text-gray-500">{slot.id}</div>
                </div>
              ))}
           </div>
           <div className="mt-8 w-full">
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleDropSell} className="w-full h-24 border-2 border-red-500/30 bg-red-900/10 rounded-lg flex items-center justify-center text-red-400 font-bold border-dashed mb-4">Drop here to SELL</div>
           </div>
        </div>
        {/* Inventory Bag */}
        <div className="lg:col-span-2 bg-rpg-800 p-6 rounded-xl border border-rpg-700" onDragOver={(e) => e.preventDefault()} onDrop={handleDropInventory}>
          <h3 className="text-xl text-rpg-gold mb-4">Backpack</h3>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {player.inventory.map((item, idx) => {
              let borderClass = 'border-gray-700';
              if (item.rarity === ItemRarity.LEGENDARY) borderClass = 'border-yellow-500 shadow-lg shadow-yellow-500/20';
              else if (item.rarity === ItemRarity.EPIC) borderClass = 'border-purple-500';
              else if (item.rarity === ItemRarity.RARE) borderClass = 'border-blue-500';
              else if (item.rarity === ItemRarity.UNCOMMON) borderClass = 'border-green-500';

              return (
                <div key={item.id + idx} draggable onDragStart={(e) => handleDragStart(e, item)} className={`bg-rpg-900 p-2 rounded border cursor-move h-28 flex flex-col justify-between hover:border-rpg-gold ${borderClass} relative group`}>
                  <div className="text-xs font-bold text-gray-200 line-clamp-2">{item.name}</div>
                  
                  {item.type === ItemType.CONSUMABLE && (
                      <button onClick={() => handleUseItem(item)} className="absolute top-1 right-1 bg-emerald-600 text-[10px] px-1 rounded text-white hover:bg-emerald-500 z-20">USE</button>
                  )}

                  <div className="flex justify-between items-end mt-1">
                      <span className="text-[10px] text-gray-500">{item.type.slice(0,1)}</span>
                      <span className="text-[10px] text-yellow-500">{item.value}g</span>
                  </div>
                </div>
              );
            })}
            {Array.from({length: Math.max(0, 24 - player.inventory.length)}).map((_, i) => <div key={i} className="bg-rpg-900/50 rounded border border-gray-800 h-24"></div>)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCrafting = () => (
      <div className="p-6">
          <h2 className="text-3xl font-bold text-white mb-6">Starforge Crafting</h2>
          
          <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2">
              {['Weapon', 'Armor', 'Tool', 'Potion'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setCraftingTab(tab as any)}
                    className={`px-4 py-2 font-bold transition-all ${craftingTab === tab ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
                  >
                      {tab}s
                  </button>
              ))}
          </div>

          {activeCraft && (
              <div className="mb-6 bg-rpg-800 p-4 rounded border border-yellow-500/50">
                  <div className="flex justify-between mb-2">
                      <span className="text-yellow-400 font-bold animate-pulse">Crafting {activeCraft.amount}x Items...</span>
                      <span className="text-gray-400">{Math.ceil((activeCraft.endTime - Date.now()) / 1000)}s</span>
                  </div>
                  <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full transition-all duration-1000" style={{ width: `${100 - ((activeCraft.endTime - Date.now()) / 25000) * 100}%` }}></div>
                  </div>
              </div>
          )}

          <div className="flex items-center gap-4 mb-6 bg-rpg-800 p-4 rounded">
              <span className="text-gray-300">Batch Size:</span>
              {[1, 5, 10, 30].map(amt => (
                  <button 
                      key={amt} 
                      onClick={() => setCraftAmount(amt)}
                      className={`px-3 py-1 rounded font-bold ${craftAmount === amt ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}
                  >
                      x{amt}
                  </button>
              ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RECIPES.filter(r => r.category === craftingTab).map(recipe => (
                  <div key={recipe.id} className="bg-rpg-800 p-4 rounded border border-rpg-700 flex flex-col justify-between">
                      <div>
                          <div className={`font-bold text-lg mb-1 ${recipe.result.rarity === ItemRarity.LEGENDARY ? 'text-yellow-500' : 'text-white'}`}>{recipe.result.name}</div>
                          <div className="text-xs text-gray-400 mb-3">{recipe.result.type} - Pwr: {recipe.result.power}</div>
                          <div className="space-y-1 text-sm text-gray-300">
                              {recipe.cost.wood && <div>Wood: {recipe.cost.wood * craftAmount} <span className={player.resources.wood >= recipe.cost.wood * craftAmount ? 'text-green-500' : 'text-red-500'}>({player.resources.wood})</span></div>}
                              {recipe.cost.ore && <div>Ore: {recipe.cost.ore * craftAmount} <span className={player.resources.ore >= recipe.cost.ore * craftAmount ? 'text-green-500' : 'text-red-500'}>({player.resources.ore})</span></div>}
                              {recipe.cost.gold && <div>Gold: {recipe.cost.gold * craftAmount} <span className={player.gold >= recipe.cost.gold * craftAmount ? 'text-green-500' : 'text-red-500'}>({player.gold})</span></div>}
                          </div>
                      </div>
                      <button 
                          onClick={() => startCrafting(recipe)}
                          disabled={!!activeCraft}
                          className="mt-4 w-full bg-rpg-700 hover:bg-rpg-600 disabled:opacity-50 py-2 rounded font-bold text-yellow-400 flex items-center justify-center gap-2"
                      >
                          <HammerIcon className="w-4 h-4"/> Craft
                      </button>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderActiveView = () => {
    switch (view) {
        case GameView.FOREST:
        case GameView.DUNGEON:
        case GameView.VOLCANO:
            if (!combatZone) {
                return (
                    <div className="p-6 text-center">
                        <h2 className="text-3xl font-bold text-white mb-6">
                            {view === GameView.FOREST ? 'Misty Forest' : view === GameView.DUNGEON ? 'Deep Dungeon' : 'Molten Core'}
                        </h2>
                        <p className="text-gray-400 mb-8">Dangerous creatures lurk here. Are you prepared?</p>
                        <button onClick={() => setCombatZone(view)} className="bg-rpg-gold text-rpg-900 font-bold py-4 px-12 rounded-lg text-xl hover:bg-yellow-400 shadow-xl transition-all">Start Exploring</button>
                    </div>
                );
            }
            return (
                <div className="max-w-4xl mx-auto p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-white">
                            {combatZone === GameView.DUNGEON ? 'Deep Dungeon' : combatZone === GameView.VOLCANO ? 'Molten Core' : 'Misty Forest'}
                        </h2>
                        <button onClick={() => setCombatZone(null)} className="px-6 py-2 rounded-full font-bold bg-red-500 hover:bg-red-600 text-white animate-pulse">RETREAT</button>
                    </div>
                    {/* Active Skills Bar */}
                    <div className="flex gap-4 justify-center mb-8">
                        {player.skills.filter(s => s.equipped && s.type === 'ACTIVE').map(s => {
                            const cooldownPct = Math.min(100, Math.max(0, ((Date.now() - (s.lastUsed || 0)) / (s.cooldown * 1000)) * 100));
                            return (
                                <div key={s.id} className="w-12 h-12 bg-rpg-800 rounded-lg border-2 border-rpg-700 relative overflow-hidden group" title={s.name}>
                                    <div className="absolute inset-0 flex items-center justify-center z-10"><ZapIcon className={`w-6 h-6 ${cooldownPct >= 100 ? 'text-yellow-400' : 'text-gray-600'}`} /></div>
                                    <div className="absolute bottom-0 left-0 w-full bg-black/50 transition-all duration-300" style={{ height: `${100 - cooldownPct}%` }}></div>
                                    {/* Tooltip on Hover */}
                                    <div className="hidden group-hover:block absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/90 border border-gray-600 p-2 rounded w-40 text-xs text-white z-50">
                                        <div className="font-bold text-yellow-400">{s.name}</div>
                                        <div>{s.description}</div>
                                        <div>Val: {s.effectValue}</div>
                                        <div>CD: {s.cooldown}s</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {!currentMonster && <div className="text-center py-20 text-gray-400 animate-pulse">Searching for enemies...</div>}
                    {currentMonster && (
                        <div className="bg-rpg-800 rounded-xl p-6 border border-rpg-700 shadow-2xl relative overflow-hidden h-64 flex flex-col justify-center">
                            <div className="absolute inset-0 pointer-events-none z-50">
                                {floatingTexts.map(ft => (<div key={ft.id} className="absolute font-bold text-2xl animate-float" style={{ left: `${ft.x}%`, top: `${ft.y}%`, color: ft.color, textShadow: '2px 2px 0 #000' }}>{ft.text}</div>))}
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-4">
                                <div className={`flex-1 text-center md:text-left transition-transform ${isPlayerHit ? 'animate-shake' : ''}`}>
                                    <div className="text-2xl text-white font-bold mb-2">{player.name}</div>
                                    <div className="text-gray-400 mb-2">HP: {Math.floor(player.hp)} / {player.maxHp}</div>
                                    
                                    {/* BUFF BAR */}
                                    <div className="flex gap-2 mb-2 min-h-[24px]">
                                        {player.activeBuffs.map(buff => (
                                            <div key={buff.id} className="relative group">
                                                <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-[10px] border border-emerald-500 overflow-hidden">
                                                    {buff.type === 'buff' ? '⬆️' : '⬇️'}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 text-[8px] bg-black text-white px-1 rounded-full">{buff.duration > -1 ? buff.duration : '∞'}</div>
                                                {/* Tooltip */}
                                                <div className="hidden group-hover:block absolute bottom-full mb-2 left-0 bg-black/90 text-xs p-2 rounded w-32 border border-gray-600 z-50">
                                                    <div className="font-bold text-emerald-400">{buff.name}</div>
                                                    <div>{buff.effect}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="w-full bg-rpg-900 h-4 rounded-full overflow-hidden border border-rpg-700"><div className="bg-emerald-500 h-full transition-all duration-300" style={{width: `${(player.hp / player.maxHp) * 100}%`}}></div></div>
                                </div>
                                <div className="text-4xl text-gray-600 font-bold">VS</div>
                                <div className={`flex-1 text-center md:text-right transition-transform ${isMonsterHit ? 'animate-shake' : ''}`}>
                                    <div className={`text-2xl font-bold mb-2 ${currentMonster.isBoss ? 'text-red-500' : 'text-orange-300'}`}>{currentMonster.name} <span className="text-sm text-gray-500">Lvl {currentMonster.level}</span></div>
                                    {monsterDescription && <p className="text-xs text-gray-400 italic mb-2 max-w-xs ml-auto">"{monsterDescription}"</p>}
                                    <div className="text-gray-400 mb-2">HP: {currentMonster.hp} / {currentMonster.maxHp}</div>
                                    <div className="w-full bg-rpg-900 h-4 rounded-full overflow-hidden border border-rpg-700"><div className="bg-red-500 h-full transition-all duration-300" style={{width: `${(currentMonster.hp / currentMonster.maxHp) * 100}%`}}></div></div>
                                    {currentMonster.isStunnedUntil && currentMonster.isStunnedUntil > Date.now() && <div className="text-yellow-400 font-bold mt-2 animate-pulse">STUNNED</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        case GameView.INVENTORY: return renderInventory();
        case GameView.MARKET: return (
             <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-6">Global Market</h2>
                <div className="bg-rpg-800 rounded-xl overflow-hidden border border-rpg-700">
                    <table className="w-full text-left">
                    <thead className="bg-rpg-900 text-gray-400 uppercase text-xs">
                        <tr><th className="p-4">Item</th><th className="p-4">Seller</th><th className="p-4 text-right">Price</th><th className="p-4 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                        {marketListings.map(listing => (
                        <tr key={listing.id} className="border-b border-gray-700 hover:bg-rpg-700/50">
                            <td className="p-4"><div className="font-bold text-white">{listing.item.name}</div><div className="text-xs text-gray-500">{listing.item.type}</div></td>
                            <td className="p-4 text-gray-300">{listing.sellerName}</td>
                            <td className="p-4 text-right text-yellow-400 font-mono">{listing.price}g</td>
                            <td className="p-4 text-right"><button onClick={() => buyMarketItem(listing)} className={`px-3 py-1 rounded text-xs font-bold ${listing.sellerName === player.name ? 'bg-red-900 text-red-200' : 'bg-emerald-600 text-white'}`}>{listing.sellerName === player.name ? 'Cancel' : 'Buy'}</button></td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
        );
        case GameView.WORK: return (
            <div className="p-6">
              <h2 className="text-3xl font-bold text-white mb-6">Resource Gathering</h2>
              {activeGather && <div className="mb-4 text-center bg-blue-900/50 p-2 rounded animate-pulse text-blue-200">Gathering {activeGather.type}... {Math.ceil((activeGather.endTime - Date.now())/1000)}s</div>}
              
              {/* Auto Miner Banner */}
              <div className="mb-6 bg-rpg-800 p-4 rounded border border-rpg-700 flex justify-between items-center">
                  <div>
                      <h3 className="text-xl font-bold text-white">Dwarven Auto-Miner</h3>
                      <p className="text-xs text-gray-400">Mines ore automatically every 30s (Even Offline!)</p>
                  </div>
                  {player.automation.miner ? (
                      <div className="text-green-400 font-bold border border-green-500 px-3 py-1 rounded">ACTIVE</div>
                  ) : (
                      <button onClick={buyAutoMiner} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded">Buy (500g)</button>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-rpg-800 p-6 rounded-xl border border-rpg-700">
                  <div className="flex items-center gap-4 mb-4"><TreeIcon className="w-8 h-8 text-emerald-500" /><h3 className="text-xl font-bold text-white">Lumberjack's Camp</h3></div>
                  <div className="flex justify-between items-center bg-rpg-900 p-4 rounded mb-4"><span className="text-gray-300">Wood: {player.resources.wood}</span><button disabled={!!activeGather} onClick={() => startGathering('wood')} className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded font-bold text-white text-sm disabled:opacity-50">Chop Wood</button></div>
                </div>
                <div className="bg-rpg-800 p-6 rounded-xl border border-rpg-700">
                  <div className="flex items-center gap-4 mb-4"><PickaxeIcon className="w-8 h-8 text-gray-400" /><h3 className="text-xl font-bold text-white">Deep Mine</h3></div>
                  <div className="flex justify-between items-center bg-rpg-900 p-4 rounded mb-4"><span className="text-gray-300">Ore: {player.resources.ore}</span><button disabled={!!activeGather} onClick={() => startGathering('ore')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-white text-sm disabled:opacity-50">Mine Ore</button></div>
                </div>
              </div>
            </div>
        );
        case GameView.CRAFTING: return renderCrafting();
        case GameView.SKILLS: {
            const maxSlots = 3 + (castle.ownerName === player.name ? 1 : 0);
            const equippedCount = player.skills.filter(s => s.equipped).length;
            
            return (
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-3xl font-bold text-white">Knight Skill Tree</h2>
                  
                  <div className="flex gap-2">
                     <button onClick={() => setSkillFilter('ALL')} className={`px-3 py-1 rounded text-xs font-bold border ${skillFilter === 'ALL' ? 'bg-white text-black' : 'bg-transparent text-gray-400'}`}>All</button>
                     <button onClick={() => setSkillFilter('ACTIVE')} className={`px-3 py-1 rounded text-xs font-bold border ${skillFilter === 'ACTIVE' ? 'bg-white text-black' : 'bg-transparent text-gray-400'}`}>Active</button>
                     <button onClick={() => setSkillFilter('PASSIVE')} className={`px-3 py-1 rounded text-xs font-bold border ${skillFilter === 'PASSIVE' ? 'bg-white text-black' : 'bg-transparent text-gray-400'}`}>Passive</button>
                  </div>

                  <div className="flex gap-2">
                      <button onClick={resetSkills} className="px-3 py-1 rounded bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500 text-xs font-bold">Reset (1000g)</button>
                      <div className={`text-xl font-bold px-4 py-2 rounded ${player.skills.some(s => !s.unlocked && player.skillPoints >= s.cost) ? 'bg-yellow-900/50 text-yellow-400 animate-pulse border border-yellow-500' : 'text-rpg-gold'}`}>
                          Points: {player.skillPoints}
                      </div>
                  </div>
              </div>

              {/* Equipped Skills Bar */}
              <div 
                className="mb-8 bg-rpg-800 p-6 rounded-xl border border-rpg-700"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropSkillSlot}
              >
                  <h3 className="text-xl text-white mb-4">Equipped Skills ({equippedCount}/{maxSlots})</h3>
                  <div className="flex gap-4 min-h-[80px]">
                      {player.skills.filter(s => s.equipped).map(skill => (
                          <div key={skill.id} className="w-16 h-16 bg-rpg-700 rounded border border-yellow-500 flex items-center justify-center relative group">
                              <ZapIcon className="text-yellow-400 w-8 h-8"/>
                              <button onClick={() => handleUnequipSkill(skill.id)} className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 text-xs text-white hidden group-hover:block">x</button>
                              <div className="absolute bottom-0 text-[10px] bg-black/80 w-full text-center truncate px-1">{skill.name}</div>
                          </div>
                      ))}
                      {Array.from({length: maxSlots - equippedCount}).map((_, i) => (
                          <div key={i} className="w-16 h-16 bg-rpg-900 rounded border border-dashed border-gray-600 flex items-center justify-center text-gray-600 text-xs text-center p-2">
                              Drag Skill Here
                          </div>
                      ))}
                  </div>
                  {castle.ownerName === player.name && <div className="mt-2 text-xs text-yellow-500">Castle Owner Bonus: +1 Skill Slot Active</div>}
              </div>

              {/* Skill List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {player.skills.filter(s => skillFilter === 'ALL' || s.type === skillFilter).map(skill => (
                  <div 
                    key={skill.id} 
                    draggable={skill.unlocked}
                    onDragStart={(e) => handleDragStartSkill(e, skill)}
                    className={`p-4 rounded-lg border-2 relative group ${skill.unlocked ? 'bg-rpg-800 border-emerald-500 cursor-grab active:cursor-grabbing' : 'bg-gray-900 border-gray-700 opacity-70'}`}
                  >
                    <div className="flex justify-between"><div className="font-bold text-lg text-white">{skill.name}</div><div className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{skill.type}</div></div>
                    <p className="text-sm text-gray-400 mt-2 h-10 line-clamp-2">{skill.description}</p>
                    
                    {/* Hover Detail Tooltip */}
                    <div className="absolute top-full left-0 mt-2 bg-black/90 border border-gray-600 p-3 rounded z-20 w-full hidden group-hover:block shadow-xl">
                        <div className="text-xs text-yellow-400 mb-1 font-bold">Effect Details:</div>
                        <div className="text-xs text-gray-300 grid grid-cols-2 gap-2">
                            <div>Power/Val: {skill.effectValue}</div>
                            <div>Cooldown: {skill.cooldown}s</div>
                            <div>Cost: {skill.cost} pts</div>
                            {skill.stunDuration && <div>Stun: {skill.stunDuration/1000}s</div>}
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                       {!skill.unlocked ? (
                         <button onClick={() => unlockSkill(skill.id)} disabled={player.skillPoints < skill.cost} className={`px-4 py-1 rounded text-sm font-bold ${player.skillPoints >= skill.cost ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-400'}`}>Unlock ({skill.cost} pts)</button>
                       ) : (
                         <span className="text-sm text-emerald-400 font-bold">Unlocked (Drag to Equip)</span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
        }
        case GameView.SOCIAL: return (
            <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-6">Nearby Players (Trading)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Slayer99', 'Merchant Mary', 'Titan', 'Ares', 'Noctis'].map(pName => (
                        <div key={pName} className="bg-rpg-800 p-4 rounded border border-gray-700 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-white">{pName}</div>
                                <div className="text-xs text-gray-400">Level {Math.floor(Math.random() * 50) + 1}</div>
                            </div>
                            <button onClick={() => initiateTrade(pName)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-bold text-white">Trade</button>
                        </div>
                    ))}
                </div>
            </div>
        );
        case GameView.GUILD: return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-white mb-6">Guilds & Alliances</h2>
      
      {!player.guildId ? (
          <div className="bg-rpg-800 p-6 rounded border border-rpg-700 text-center mb-8">
              <h3 className="text-xl text-white mb-2">Create your own Guild</h3>
              <p className="text-gray-400 mb-4">Cost: 20,000 Gold</p>
              <button onClick={createGuild} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded">Create Guild</button>
          </div>
      ) : (
          <div className="bg-rpg-800 p-6 rounded border border-yellow-500/30 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><UsersIcon className="w-32 h-32"/></div>
              <h3 className="text-2xl text-yellow-400 font-bold mb-1">{guilds.find(g => g.id === player.guildId)?.name}</h3>
              <div className="text-sm text-gray-400 mb-4">Rank: {player.guildRank}</div>
              
              <div className="flex gap-4">
                  <button onClick={donateGuild} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white font-bold text-sm">Donate 1000g</button>
              </div>
          </div>
      )}

      <div className="bg-rpg-800 rounded-xl p-6 border border-rpg-700">
        <h3 className="text-xl text-white mb-4">Leaderboard</h3>
        <div className="space-y-4">
          {guilds.sort((a,b) => b.power - a.power).map((g, i) => (
            <div key={g.id} className={`flex items-center justify-between bg-rpg-900 p-4 rounded border-l-4 ${g.id === player.guildId ? 'border-green-500 bg-green-900/10' : 'border-rpg-gold'}`}>
               <div className="flex items-center gap-4"><div className="text-2xl font-bold text-gray-600">#{i+1}</div><div><div className="font-bold text-white">{g.name}</div><div className="text-xs text-gray-500">Lvl {g.level} • Led by {g.leaderName}</div></div></div>
               <div className="text-yellow-500 font-mono font-bold">{g.power} Power</div>
            </div>
          ))}
        </div>
      </div>
    </div>
        );
        case GameView.CASTLE: return (
             <div className="p-6 max-w-4xl mx-auto text-center">
                 <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 mb-4">GLOBAL CASTLE</h2>
                 <div className="relative bg-rpg-800 rounded-2xl border-2 border-rpg-gold p-8 shadow-[0_0_50px_rgba(251,191,36,0.1)]">
                     <CastleIcon className="w-16 h-16 text-rpg-gold mx-auto mb-4" />
                     <div className="text-3xl font-bold text-white mb-2">{castle.ownerName}</div>
                     <div className="text-gray-500">of Guild [{castle.ownerGuild}]</div>
                     <div className="mt-8">
                         <button onClick={() => addLog("Coming Soon: Guild vs Guild Castle Siege!")} className="bg-red-600 text-white font-bold py-3 px-8 rounded opacity-50 cursor-not-allowed">Siege (Requires Guild)</button>
                     </div>
                 </div>
             </div>
        );
        default: return (
            <div className="p-6">
                <h2 className="text-3xl font-bold text-white mb-8">Hero Profile</h2>
                <div className="bg-rpg-800 rounded-xl p-8 border border-rpg-700 max-w-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-3xl text-white font-bold mb-2">{player.name}</div>
                            <div className="text-rpg-gold mb-6">Level {player.level} {player.class}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-green-400 font-mono flex items-center gap-2 justify-end"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> {onlinePlayers} Players Online</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-gray-300">
                        <div>Atk: {player.attack} (+{(Object.values(player.equipped) as (Item | null)[]).reduce((a,b)=>a+(b?.power||0),0)})</div>
                        <div>Def: {player.defense}</div>
                        <div>Wood: {player.resources.wood}</div>
                        <div>Ore: {player.resources.ore}</div>
                    </div>
                    {player.guildId && <div className="mt-4 p-4 bg-rpg-900 rounded border border-gray-700">Guild Member of {guilds.find(g=>g.id===player.guildId)?.name}</div>}
                    <div className="mt-8 pt-8 border-t border-gray-700">
                        <button onClick={() => { saveDatabase(player); setPlayer(INITIAL_PLAYER); setView(GameView.LOGIN); setCombatZone(null); }} className="text-red-500 hover:text-red-400">Logout</button>
                    </div>
                </div>
            </div>
        );
    }
  };

  // --- MAIN RENDER ---
  return (
    <div className="flex min-h-screen bg-rpg-900 text-gray-100 font-sans">
      <div className="w-20 md:w-64 bg-rpg-900 border-r border-rpg-800 flex flex-col items-center md:items-stretch py-6 sticky top-0 h-screen overflow-y-auto z-10">
        <div className="mb-8 px-4 hidden md:block">
            <h2 className="text-xl font-bold text-rpg-gold truncate">{player.name}</h2>
            <div className="text-xs text-gray-400">Level {player.level} {player.class}</div>
            <div className="w-full bg-rpg-800 h-2 mt-2 rounded-full overflow-hidden">
                <div className="bg-rpg-gold h-full transition-all" style={{width: `${(player.xp / player.maxXp) * 100}%`}}></div>
            </div>
        </div>

        <nav className="space-y-1 px-2 flex-1 overflow-y-auto">
            {[
                { id: GameView.PROFILE, icon: UsersIcon, label: 'Profile' },
                { id: GameView.INVENTORY, icon: BagIcon, label: 'Inventory (DnD)' },
                { id: GameView.CRAFTING, icon: AnvilIcon, label: 'Crafting' },
                { id: GameView.SKILLS, icon: ZapIcon, label: 'Knight Skills' },
                { id: GameView.WORK, icon: PickaxeIcon, label: 'Work' },
                { id: GameView.MARKET, icon: MarketIcon, label: 'Market' },
                { id: GameView.SOCIAL, icon: UsersIcon, label: 'Social / Trade' },
                { id: GameView.FOREST, icon: TreeIcon, label: 'Forest' },
                { id: GameView.DUNGEON, icon: SkullIcon, label: 'Dungeon' },
                { id: GameView.VOLCANO, icon: FireIcon, label: 'Volcano' },
                { id: GameView.GUILD, icon: ShieldIcon, label: 'Guilds' },
                { id: GameView.CASTLE, icon: CastleIcon, label: 'Castle War' },
            ].map(item => (
                <button 
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center p-3 rounded-lg transition-all ${view === item.id ? 'bg-rpg-800 text-rpg-gold shadow-lg border-l-4 border-rpg-gold' : 'text-gray-400 hover:bg-rpg-800 hover:text-white'}`}
                >
                    <item.icon className="w-5 h-5 md:mr-3" />
                    <span className="hidden md:block font-medium text-sm">{item.label}</span>
                </button>
            ))}
        </nav>
        
        <div className="mt-auto px-4 py-4 text-center border-t border-rpg-800 hidden md:block">
            <div className="text-sm text-gray-500">Gold</div>
            <div className="text-xl text-yellow-400 font-mono">{player.gold.toLocaleString()}</div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto relative bg-gradient-to-br from-rpg-900 to-rpg-800">
        {/* Top Right Controls - Moved buttons further left to accommodate note text if needed */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button onClick={() => setShowUpdateNotes(true)} className="p-2 bg-rpg-800 rounded-full border border-gray-600 hover:bg-rpg-700 text-yellow-400"><ScrollIcon className="w-6 h-6"/></button>
        </div>

        {/* Offline Gains Popup */}
        {offlineGains && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-green-900/90 border border-green-500 text-white p-4 rounded-lg shadow-xl z-50 animate-float">
                <div className="font-bold mb-1">Welcome Back!</div>
                <div>{offlineGains}</div>
            </div>
        )}

        {/* Trade Modal */}
        {tradeModal && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                <div className="bg-rpg-800 w-full max-w-2xl rounded-xl border border-yellow-500 p-6 shadow-2xl">
                    <h3 className="text-2xl font-bold text-white mb-4 text-center">Trading with {tradeModal.partner}</h3>
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div className="bg-rpg-900 p-4 rounded border border-gray-600">
                            <h4 className="font-bold text-emerald-400 mb-2">Your Offer</h4>
                            <div className="h-40 overflow-y-auto space-y-2">
                                {tradeModal.myOffer.length === 0 && <div className="text-gray-500 text-sm">Drag items here or click from bag...</div>}
                                {tradeModal.myOffer.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-rpg-800 p-2 rounded text-xs">
                                        <span>{item.name}</span>
                                        <button onClick={() => removeFromTrade(item.id)} className="text-red-500 hover:text-red-400">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-rpg-900 p-4 rounded border border-gray-600">
                            <h4 className="font-bold text-blue-400 mb-2">{tradeModal.partner}'s Offer</h4>
                            <div className="h-40 flex items-center justify-center text-gray-500 text-sm italic">
                                {tradeModal.partner} is thinking...
                            </div>
                        </div>
                    </div>
                    
                    {/* Simplified inventory selection for trade */}
                    <div className="mb-6">
                        <div className="text-sm text-gray-400 mb-2">Your Bag (Click to Add):</div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {player.inventory.filter(i => !tradeModal.myOffer.some(o => o.id === i.id)).map(item => (
                                <div key={item.id} onClick={() => addToTrade(item)} className="min-w-[80px] h-20 bg-rpg-900 border border-gray-700 hover:border-emerald-500 rounded p-1 cursor-pointer flex flex-col justify-between">
                                     <div className="text-[10px] line-clamp-2">{item.name}</div>
                                     <div className="text-[10px] text-yellow-500">{item.value}g</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setTradeModal(null)} className="px-6 py-2 rounded border border-red-500 text-red-400 hover:bg-red-900/20">Cancel</button>
                        <button onClick={confirmTrade} className="px-6 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500">Confirm Trade</button>
                    </div>
                </div>
            </div>
        )}

        {/* Update Notes Modal */}
        {showUpdateNotes && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-rpg-800 p-8 rounded-xl max-w-lg w-full border border-rpg-gold relative">
                    <button onClick={() => setShowUpdateNotes(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">X</button>
                    <h2 className="text-2xl font-bold text-rpg-gold mb-4">Patch Notes - v1.6</h2>
                    <ul className="list-disc pl-5 space-y-2 text-gray-300">
                        <li><strong className="text-white">Buff System:</strong> Visual indicators for buffs (potions, skills) now appear above the health bar.</li>
                        <li><strong className="text-white">P2P Trading:</strong> You can now trade with other players (Social Tab).</li>
                        <li><strong className="text-white">Combat Balance:</strong> Minimum damage rule enforced (you always take at least 1 damage).</li>
                        <li><strong className="text-white">Consumables:</strong> Health potions can now be used directly from the inventory.</li>
                    </ul>
                </div>
            </div>
        )}

        {/* Mobile Header */}
        <div className="block md:hidden p-4 bg-rpg-900 sticky top-0 z-50 border-b border-rpg-800 flex justify-between items-center">
            <span className="font-bold text-rpg-gold truncate max-w-[150px]">{player.name} (Lvl {player.level})</span>
            <span className="text-yellow-400">{player.gold}g</span>
        </div>

        {/* Combat Status Banner */}
        {combatZone && view !== GameView.FOREST && view !== GameView.DUNGEON && view !== GameView.VOLCANO && (
            <div className="bg-red-900/80 border-b border-red-500 p-2 text-center text-red-200 text-sm font-bold flex justify-between items-center px-4">
                <span className="animate-pulse">⚔️ Fighting in {combatZone}...</span>
                <button onClick={() => setCombatZone(null)} className="bg-red-700 px-2 py-1 rounded text-xs hover:bg-red-600">Stop</button>
            </div>
        )}

        {/* BATTLE LOG OVERLAY */}
        {combatZone && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-20 pointer-events-none">
                <div className="bg-black/60 p-2 rounded text-xs font-mono text-gray-300 space-y-1">
                    {battleLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
        )}
        
        {renderActiveView()}

      </main>
    </div>
  );
}