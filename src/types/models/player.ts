import { Card } from './card';

export type PersonalityType = 'aggressive' | 'cautious' | 'balanced';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';

export interface Player {
  id: number;
  name: string;
  cards: Card[];
  isComputer: boolean;
  personalityType?: PersonalityType;
  skillLevel?: SkillLevel;
} 