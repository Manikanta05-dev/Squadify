
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
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
  
  const isSaving = useRef(false);
  const isLoaded = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      if (user && !isLoaded.current) {
        setLoadingData(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSquad(data.squad || []);
            const loadedDefs = data.teamDefinitions || [];
            const loadedTeams = data.teams || [];
            setTeamDefinitions(loadedDefs);

            // Reconcile loaded teams with definitions
            const reconciledTeams = loadedDefs.map((def: TeamDefinition) => {
              const existingTeam = loadedTeams.find((t: Team) => t.id === def.id);
              const players = new Array(def.size).fill(null);
              if (existingTeam) {
                existingTeam.players.slice(0, def.size).forEach((p: Player | null, i: number) => {
                  players[i] = p;
                });
              }
              return {
                id: def.id,
                name: def.name,
                players: players,
              };
            });
            setTeams(reconciledTeams);
          } else {
            console.log("No such document! Will be created on first save.");
          }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setLoadingData(false);
            isLoaded.current = true;
        }
      } else if (!user && !authLoading) {
        // User logged out, reset state
        setSquad([]);
        setTeamDefinitions([]);
        setTeams([]);
        setLoadingData(true); // Reset loading state for next user
        isLoaded.current = false;
      }
    };
    loadData();
  }, [user, authLoading]);

  // Unified save effect
  useEffect(() => {
    const saveData = async () => {
        if (!user || authLoading || !isLoaded.current || isSaving.current) return;
        
        isSaving.current = true;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { squad, teamDefinitions, teams }, { merge: true });
        } catch (error) {
            console.error("Failed to save data:", error);
        } finally {
            setTimeout(() => { isSaving.current = false; }, 500); // debounce saving
        }
    };
    
    saveData();
  }, [squad, teamDefinitions, teams, user, authLoading]);


  const handleSetTeamDefinitions = (definitions: TeamDefinition[]) => {
    setTeamDefinitions(definitions);
    
    const reconciledTeams = definitions.map(def => {
        const existingTeam = teams.find(t => t.id === def.id);
        const players = new Array(def.size).fill(null);
        
        if (existingTeam) {
            // Copy existing players, respecting the new size
            existingTeam.players.slice(0, def.size).forEach((p, i) => {
                players[i] = p;
            });
        }
        
        return {
            id: def.id,
            name: def.name,
            players: players,
        };
    });
    
    setTeams(reconciledTeams);
  };

  // Effect to derive unassigned players
  useEffect(() => {
    if (loadingData) return;
    const assignedPlayerIds = new Set(teams.flatMap(t => t.players).filter(Boolean).map(p => p!.id));
    setUnassignedPlayers(squad.filter(p => !assignedPlayerIds.has(p.id)));
  }, [squad, teams, loadingData]);

  
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

  const movePlayerToTeam = (playerId: string, teamId: string, slotIndex: number) => {
    const player = squad.find(p => p.id === playerId) || teams.flatMap(t => t.players).find(p => p?.id === playerId);
    if (!player) return;

    setTeams(currentTeams => {
        const newTeams = JSON.parse(JSON.stringify(currentTeams));
        let playerRemoved = false;

        // Remove from old position
        for (const team of newTeams) {
            const oldIndex = team.players.findIndex((p: Player | null) => p?.id === playerId);
            if (oldIndex !== -1) {
                team.players[oldIndex] = null;
                playerRemoved = true;
                break;
            }
        }
        
        // Place in new position
        const targetTeam = newTeams.find((t:Team) => t.id === teamId);
        if (targetTeam && targetTeam.players[slotIndex] === null) {
            targetTeam.players[slotIndex] = player;
        } else {
           // If something is wrong (e.g. slot taken), revert if we removed the player
           if(playerRemoved) return currentTeams;
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
    setTeams(currentTeams => {
        const newTeams = JSON.parse(JSON.stringify(currentTeams)); // Deep copy
        const team1 = newTeams.find((t: Team) => t.id === team1Id);
        const team2 = newTeams.find((t: Team) => t.id === team2Id);

        if (team1 && team2) {
          const player1 = team1.players[slot1Index];
          const player2 = team2.players[slot2Index];
          
          if(player1?.id === player1Id && player2?.id === player2Id) {
            team1.players[slot1Index] = player2;
            team2.players[slot2Index] = player1;
          }
        }
        return newTeams;
    });
  };

  return (
    <TeamBuilderContext.Provider value={{
      squad, addPlayer, updatePlayer, deletePlayer,
      teamDefinitions, setTeamDefinitions: handleSetTeamDefinitions,
      teams, setTeams,
      unassignedPlayers,
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
