
export type Player = {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  skill: string;
};

export type RoleRequirement = {
  id: string;
  role: string;
  count: number;
};

export type TeamDefinition = {
  id:string;
  name: string;
  size: number;
  roleRequirements: RoleRequirement[];
  requireFemale: boolean;
};

export type Team = {
  id: string; // Corresponds to TeamDefinition id
  name: string;
  players: (Player | null)[];
};

export type SelectedPlayer = {
  playerId: string;
  teamId: string;
  slotIndex: number;
};
