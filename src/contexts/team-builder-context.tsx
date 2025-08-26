"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Player, TeamDefinition, Team } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface TeamBuilderContextType {
  squad: Player[];
  addPlayer: (player: Omit<Player, 'id'>) => void;
  updatePlayer: (player: Player) => void;
  deletePlayer: (playerId: string) => void;
  teamDefinitions: TeamDefinition[];
  setTeamDefinitions: (definitions: TeamDefinition[]) => void;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  unassignedPlayers: Player[];
  setUnassignedPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  movePlayerToTeam: (playerId: string, teamId: string, slotIndex: number) => void;
  movePlayerToSquad: (playerId: string, fromTeamId: string, fromSlotIndex: number) => void;
  swapPlayers: (
    player1Id: string, team1Id: string, slot1Index: number,
    player2Id: string, team2Id: string, slot2Index: number
  ) => void;
}

const TeamBuilderContext = createContext<TeamBuilderContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new Event('local-storage'));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

export const TeamBuilderProvider = ({ children }: { children: ReactNode }) => {
  const [squad, setSquad] = useLocalStorage<Player[]>('squad', []);
  const [teamDefinitions, setTeamDefinitions] = useLocalStorage<TeamDefinition[]>('teamDefinitions', []);
  const [teams, setTeams] = useLocalStorage<Team[]>('teams', []);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // Function to re-read from localStorage
    const syncFromLocalStorage = () => {
      try {
        const item = window.localStorage.getItem('squad');
        if (item) {
          const latestSquad = JSON.parse(item);
          setSquad(latestSquad);
        }
      } catch (error) {
        console.error("Failed to sync squad from local storage", error);
      }
    };
    
    syncFromLocalStorage(); // Initial sync

    // Listen for changes from other tabs/windows
    window.addEventListener('storage', syncFromLocalStorage);
    // Listen for changes from the same tab
    window.addEventListener('local-storage', syncFromLocalStorage);

    return () => {
      window.removeEventListener('storage', syncFromLocalStorage);
      window.removeEventListener('local-storage', syncFromLocalStorage);
    };
  }, []);

  useEffect(() => {
    // Initialize teams based on definitions
    const newTeams = teamDefinitions.map(def => {
      const existingTeam = teams.find(t => t.id === def.id);
      if (existingTeam) {
        // Adjust player array size if definition changed
        const newPlayers = new Array(def.size).fill(null);
        existingTeam.players.slice(0, def.size).forEach((p, i) => newPlayers[i] = p);
        return { ...existingTeam, name: def.name, players: newPlayers };
      }
      return {
        id: def.id,
        name: def.name,
        players: new Array(def.size).fill(null),
      };
    });
    setTeams(newTeams);
  }, [teamDefinitions]);

  useEffect(() => {
    // Calculate unassigned players
    const assignedPlayerIds = new Set(teams.flatMap(t => t.players).filter(Boolean).map(p => p!.id));
    setUnassignedPlayers(squad.filter(p => !assignedPlayerIds.has(p.id)));
  }, [squad, teams]);

  const addPlayer = (player: Omit<Player, 'id'>) => {
    setSquad(prev => [...prev, { ...player, id: uuidv4() }]);
  };

  const updatePlayer = (updatedPlayer: Player) => {
    setSquad(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    setTeams(prevTeams => prevTeams.map(team => ({
      ...team,
      players: team.players.map(p => p?.id === updatedPlayer.id ? updatedPlayer : p)
    })));
  };

  const deletePlayer = (playerId: string) => {
    setSquad(prev => prev.filter(p => p.id !== playerId));
    setTeams(prevTeams => prevTeams.map(team => ({
      ...team,
      players: team.players.map(p => p?.id === playerId ? null : p)
    })));
  };

  const movePlayerToTeam = (playerId: string, teamId: string, slotIndex: number) => {
    const player = squad.find(p => p.id === playerId);
    if (!player) return;

    setTeams(prevTeams => {
      const newTeams = prevTeams.map(t => ({...t, players: [...t.players]}));
      
      // Remove from old team if exists
      const oldTeam = newTeams.find(t => t.players.some(p => p?.id === playerId));
      if (oldTeam) {
        const oldSlotIndex = oldTeam.players.findIndex(p => p?.id === playerId);
        if (oldSlotIndex !== -1) {
          oldTeam.players[oldSlotIndex] = null;
        }
      }

      // Add to new team
      const targetTeam = newTeams.find(t => t.id === teamId);
      if (targetTeam) {
        if (targetTeam.players[slotIndex]) {
            // If the slot is occupied, we need to handle it.
            // For now, let's assume we can just overwrite, but a better UX might be to swap.
            // Or maybe the logic in `PlayerDropSlot` prevents this.
            // Based on the existing logic, let's just place the player.
            // The existing player in the slot will be handled by another action if needed.
        }
        targetTeam.players[slotIndex] = player;
      }

      return newTeams;
    });
  };

  const movePlayerToSquad = (playerId: string, fromTeamId: string, fromSlotIndex: number) => {
     setTeams(prevTeams => {
        const newTeams = prevTeams.map(t => {
            if (t.id === fromTeamId) {
                const newPlayers = [...t.players];
                if (newPlayers[fromSlotIndex]?.id === playerId) {
                    newPlayers[fromSlotIndex] = null;
                }
                return { ...t, players: newPlayers };
            }
            return t;
        });
        return newTeams;
    });
  };

  const swapPlayers = (
    player1Id: string, team1Id: string, slot1Index: number,
    player2Id: string, team2Id: string, slot2Index: number
  ) => {
      const player1 = squad.find(p => p.id === player1Id);
      const player2 = squad.find(p => p.id === player2Id);
      if (!player1 || !player2) return;

      setTeams(prevTeams => {
        const newTeams = prevTeams.map(t => ({...t, players: [...t.players]}));
        
        const team1 = newTeams.find(t => t.id === team1Id);
        const team2 = newTeams.find(t => t.id === team2Id);

        if(team1 && team2) {
          team1.players[slot1Index] = player2;
          team2.players[slot2Index] = player1;
        }
        
        return newTeams;
      });
  }

  return (
    <TeamBuilderContext.Provider value={{
      squad, addPlayer, updatePlayer, deletePlayer,
      teamDefinitions, setTeamDefinitions,
      teams, setTeams,
      unassignedPlayers, setUnassignedPlayers,
      movePlayerToTeam, movePlayerToSquad, swapPlayers
    }}>
      {children}
    </TeamBuilderContext.Provider>
  );
};

export const useTeamBuilder = () => {
  const context = useContext(TeamBuilderContext);
  if (context === undefined) {
    throw new Error('useTeamBuilder must be used within a TeamBuilderProvider');
  }
  return context;
};
