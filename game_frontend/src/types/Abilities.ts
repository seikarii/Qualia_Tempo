export interface Ability {
  id: string;
  color: string;
  damage: number;
  type: 'utility' | 'offensive' | 'defensive';
  cooldown: number;
}

export interface AbilitiesData {
  [key: string]: Ability;
}
