
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Player, TeamDefinition, Team } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  loadingData: boolean;
}

const TeamBuilderContext = createContext<TeamBuilderContextType | undefined>(undefined);

export const TeamBuilderProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [squad, setSquad] = useState<Player[]>([]);
  const [teamDefinitions, setTeamDefinitions] = useState<TeamDefinition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Effect to load data from Firestore when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setLoadingData(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSquad(data.squad || []);
            setTeamDefinitions(data.teamDefinitions || []);
            setTeams(data.teams || []);
          }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoadingData(false);
            setInitialDataLoaded(true);
        }
      } else if (!authLoading) {
        // No user, clear all data
        setSquad([]);
        setTeamDefinitions([]);
        setTeams([]);
        setUnassignedPlayers([]);
        setLoadingData(false);
        setInitialDataLoaded(false);
      }
    };
    loadData();
  }, [user, authLoading]);

  // Effect to save data to Firestore whenever it changes
  useEffect(() => {
    const saveData = async () => {
      if (user && initialDataLoaded) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { squad, teamDefinitions, teams }, { merge: true });
        } catch (error) {
            console.error("Failed to save data:", error);
        }
      }
    };
    saveData();
  }, [user, squad, teamDefinitions, teams, initialDataLoaded]);
  
  // Effect to derive teams from team definitions
  useEffect(() => {
    if (!initialDataLoaded) return;

    const newTeams = teamDefinitions.map(def => {
      const existingTeam = teams.find(t => t.id === def.id);
      if (existingTeam) {
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

    // Only update if there's an actual change to prevent infinite loops
    if (JSON.stringify(newTeams) !== JSON.stringify(teams)) {
        setTeams(newTeams);
    }
  }, [teamDefinitions, initialDataLoaded]); // Removed `teams` dependency


  // Effect to derive unassigned players
  useEffect(() => {
    if (!initialDataLoaded) return;
    const assignedPlayerIds = new Set(teams.flatMap(t => t.players).filter(Boolean).map(p => p!.id));
    setUnassignedPlayers(squad.filter(p => !assignedPlayerIds.has(p.id)));
  }, [squad, teams, initialDataLoaded]);

  
  const addPlayer = (player: Omit<Player, 'id'>) => {
    setSquad(s => [...s, { ...player, id: uuidv4() }]);
  };

  const updatePlayer = (updatedPlayer: Player) => {
     setSquad(s => s.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
     setTeams(currentTeams => currentTeams.map(team => ({
         ...team,
         players: team.players.map(p => p?.id === updatedPlayer.id ? updatedPlayer : p)
     })));
  };

  const deletePlayer = (playerId: string) => {
    setSquad(s => s.filter(p => p.id !== playerId));
    setTeams(currentTeams => currentTeams.map(team => ({
        ...team,
        players: team.players.map(p => p?.id === playerId ? null : p)
    })));
  };
  
  const handleSetTeamDefinitions = (definitions: TeamDefinition[]) => {
      setTeamDefinitions(definitions);
  }

  const handleSetTeams = (newTeams: Team[] | ((prevTeams: Team[]) => Team[])) => {
    setTeams(newTeams);
  };

  const movePlayerToTeam = (playerId: string, teamId: string, slotIndex: number) => {
    const player = squad.find(p => p.id === playerId);
    if (!player) return;

    setTeams(currentTeams => {
        const newTeams = currentTeams.map(t => ({ ...t, players: [...t.players] }));

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
        if (targetTeam && targetTeam.players[slotIndex] === null) { // Check if slot is empty
            targetTeam.players[slotIndex] = player;
        }
        
        return newTeams;
    });
  };

  const movePlayerToSquad = (playerId: string, fromTeamId: string, fromSlotIndex: number) => {
    setTeams(currentTeams => currentTeams.map(t => {
      if (t.id === fromTeamId) {
        const newPlayers = [...t.players];
        if (newPlayers[fromSlotIndex]?.id === playerId) {
          newPlayers[fromSlotIndex] = null;
        }
        return { ...t, players: newPlayers };
      }
      return t;
    }));
  };

  const swapPlayers = (
    player1Id: string, team1Id: string, slot1Index: number,
    player2Id: string, team2Id: string, slot2Index: number
  ) => {
    const player1 = squad.find(p => p.id === player1Id);
    const player2 = squad.find(p => p.id === player2Id);
    if (!player1 || !player2) return;

    setTeams(currentTeams => {
        const newTeams = currentTeams.map(t => ({ ...t, players: [...t.players] }));
        const team1 = newTeams.find(t => t.id === team1Id);
        const team2 = newTeams.find(t => t.id === team2Id);

        if (team1 && team2) {
          // Simple swap
          const temp = team1.players[slot1Index];
          team1.players[slot1Index] = team2.players[slot2Index];
          team2.players[slot2Index] = temp;
        }

        return newTeams;
    });
  };

  return (
    <TeamBuilderContext.Provider value={{
      squad, addPlayer, updatePlayer, deletePlayer,
      teamDefinitions, setTeamDefinitions: handleSetTeamDefinitions,
      teams, setTeams: handleSetTeams,
      unassignedPlayers, setUnassignedPlayers,
      movePlayerToTeam, movePlayerToSquad, swapPlayers,
      loadingData
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
