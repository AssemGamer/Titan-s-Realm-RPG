export enum ItemRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
  MYTHIC = 'Mythic',
  GODLY = 'Godly'
}

export enum ItemType {
  WEAPON = 'Weapon',
  ARMOR = 'Armor',
  TOOL = 'Tool',
  MATERIAL = 'Material',
  CONSUMABLE = 'Consumable',
}

export enum EquipmentSlot {
  HEAD = 'Head',
  BODY = 'Body',
  LEGS = 'Legs',
  MAIN_HAND = 'Main Hand',
  OFF_HAND = 'Off Hand',
  TOOL = 'Tool'
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot?: EquipmentSlot; // If equippable
  rarity: ItemRarity;
  power: number; // For weapons/armor/tools
  value: number; // Gold value
  description?: string;
  image?: string; // Icon identifier
}

export interface Buff {
  id: string;
  name: string;
  duration: number; // Seconds remaining, -1 for permanent
  effect: string; // Description
  type: 'buff' | 'debuff';
}

export interface Skill {
  id: string;
  name: string;
  type: 'ACTIVE' | 'PASSIVE';
  description: string;
  cooldown: number; // in seconds
  lastUsed?: number;
  effectValue: number; // Dmg or Shield amount
  cost: number; // Skill points to unlock
  unlocked: boolean;
  equipped: boolean;
  stunDuration?: number; // New: For Charge skill
}

export interface FloatingText {
  id: string;
  text: string;
  x: number; // Percentage or relative unit
  y: number;
  color: string;
  createdAt: number;
}

export interface MarketListing {
  id: string;
  sellerName: string;
  item: Item;
  price: number;
  listedAt: number;
}

export interface Guild {
  id: string;
  name: string;
  level: number;
  members: number;
  power: number;
  gold: number; // Guild bank
  leaderName: string;
}

export interface Player {
  name: string;
  password?: string;
  class: 'Knight' | 'Mage' | 'Rogue';
  level: number;
  xp: number;
  maxXp: number;
  hp: number;
  maxHp: number;
  gold: number;
  attack: number;
  defense: number;
  skillPoints: number;
  inventory: Item[];
  equipped: {
    [key in EquipmentSlot]?: Item | null;
  };
  skills: Skill[];
  activeBuffs: Buff[];
  resources: {
    wood: number;
    ore: number;
    stone: number;
    leather: number;
  };
  castleKeys: number;
  guildId?: string;
  guildRank?: 'Leader' | 'Member';
  lastSaveTime: number;
  automation: {
    miner: boolean; // unlocked?
    lumberjack: boolean; // unlocked?
  };
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
  isBoss: boolean;
  flavorText?: string;
  isStunnedUntil?: number; // Timestamp
}

export interface CastleState {
  ownerName: string;
  ownerGuild: string;
  ownerPower: number;
  occupiedSince: number; // timestamp
}

export interface Recipe {
  id: string;
  result: Item;
  category: 'Weapon' | 'Armor' | 'Tool' | 'Potion';
  cost: {
    wood?: number;
    ore?: number;
    stone?: number;
    gold?: number;
  };
  craftTime: number; // Seconds
}

export interface CraftingProcess {
  recipeId: string;
  startTime: number;
  endTime: number;
  amount: number;
}

export interface GatheringProcess {
  type: 'wood' | 'ore';
  endTime: number;
}

export enum GameView {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  FOREST = 'FOREST',
  DUNGEON = 'DUNGEON',
  VOLCANO = 'VOLCANO',
  INVENTORY = 'INVENTORY',
  SKILLS = 'SKILLS',
  WORK = 'WORK',
  CRAFTING = 'CRAFTING',
  GUILD = 'GUILD',
  MARKET = 'MARKET',
  CASTLE = 'CASTLE',
  PROFILE = 'PROFILE',
  SOCIAL = 'SOCIAL',
}
