
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
            setTeamDefinitions(data.teamDefinitions || []);
            setTeams(data.teams || []);
          } else {
            console.log("No such document! Creating one for new user.");
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
        setLoadingData(false);
        isLoaded.current = false;
      }
    };
    loadData();
  }, [user, authLoading]);

  // Unified save effect
  useEffect(() => {
    const saveData = async () => {
        if (!user || loadingData || authLoading || !isLoaded.current || isSaving.current) return;
        
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
  }, [squad, teamDefinitions, teams, user, loadingData, authLoading]);


  // Effect to derive teams from team definitions
  useEffect(() => {
    if (loadingData) return;

    setTeams(currentTeams => {
        const newTeams = teamDefinitions.map(def => {
            const existingTeam = currentTeams.find(t => t.id === def.id);
            const playerArraySize = Math.max(existingTeam?.players.length || 0, def.size);
            const newPlayers = new Array(def.size).fill(null);
            
            if (existingTeam) {
                // Copy existing players up to the new size limit
                existingTeam.players.slice(0, def.size).forEach((p, i) => {
                    newPlayers[i] = p;
                });
            }

            return {
                id: def.id,
                name: def.name,
                players: newPlayers,
            };
        });

        // Filter out teams that no longer have a definition
        const finalTeams = newTeams.filter(t => teamDefinitions.some(def => def.id === t.id));
        
        // Only update state if there's a meaningful change
        if (JSON.stringify(finalTeams) !== JSON.stringify(currentTeams)) {
            return finalTeams;
        }
        return currentTeams;
    });
  }, [teamDefinitions, loadingData]);

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
    const player = squad.find(p => p.id === playerId);
    if (!player) return;

    setTeams(currentTeams => {
        let playerFoundAndMoved = false;
        const newTeams = currentTeams.map(t => {
            const teamPlayers = [...t.players];
            let modified = false;

            // Remove from old position if exists in any team
            const oldSlotIndex = teamPlayers.findIndex(p => p?.id === playerId);
            if (oldSlotIndex !== -1) {
                teamPlayers[oldSlotIndex] = null;
                modified = true;
            }

            // Place in new position
            if (t.id === teamId) {
                // If the target slot is occupied, we handle it as a swap, not a simple move.
                // This function should only handle moves to empty slots.
                if (teamPlayers[slotIndex] === null) {
                    teamPlayers[slotIndex] = player;
                    playerFoundAndMoved = true;
                    modified = true;
                }
            }
            return modified ? { ...t, players: teamPlayers } : t;
        });

        // This ensures that if the player was not moved (e.g. target slot was occupied),
        // we don't return a state where the player was just removed from their old team.
        return playerFoundAndMoved ? newTeams : currentTeams;
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
      teamDefinitions, setTeamDefinitions,
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
