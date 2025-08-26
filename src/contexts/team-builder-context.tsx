
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Player, TeamDefinition, Team, SelectedPlayer } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';


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
  selectedPlayer: SelectedPlayer[] | null;
  selectPlayerForSwap: (player: SelectedPlayer) => void;
  swapSelectedPlayers: () => void;
  clearSelection: () => void;
}

const TeamBuilderContext = createContext<TeamBuilderContextType | undefined>(undefined);

export const TeamBuilderProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [squad, setSquad] = useState<Player[]>([]);
  const [teamDefinitions, setTeamDefinitions] = useState<TeamDefinition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer[] | null>(null);

  const { toast } = useToast();
  
  const isLoaded = useRef(false);
  const dataToSave = useRef<{ squad: Player[]; teamDefinitions: TeamDefinition[]; teams: Team[] } | null>(null);
  const isSaving = useRef(false);


  // Load data from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (user && !isLoaded.current) {
        setLoadingData(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const loadedSquad = data.squad || [];
            const loadedDefs = data.teamDefinitions || [];
            
            setSquad(loadedSquad);
            setTeamDefinitions(loadedDefs);

            // Reconcile teams from DB with definitions
            const loadedTeams = data.teams || [];
            const reconciledTeams = loadedDefs.map((def: TeamDefinition) => {
              const existingTeam = loadedTeams.find((t: Team) => t.id === def.id);
              if (existingTeam) {
                 const newPlayers = new Array(def.size).fill(null);
                 existingTeam.players.slice(0, def.size).forEach((p: Player | null, i: number) => {
                   if(p) newPlayers[i] = p;
                 });
                 return { ...existingTeam, players: newPlayers, size: def.size, name: def.name };
              }
              return {
                id: def.id,
                name: def.name,
                players: new Array(def.size).fill(null),
              };
            });
            setTeams(reconciledTeams);

          }
        } catch (error) {
            console.error("Failed to load data:", error);
            toast({ title: "Error Loading Data", description: "Could not load your saved data.", variant: "destructive" });
        } finally {
            setLoadingData(false);
            isLoaded.current = true;
        }
      } else if (!user && !authLoading) {
        // Reset state when user logs out
        setSquad([]);
        setTeamDefinitions([]);
        setTeams([]);
        isLoaded.current = false;
        setLoadingData(true);
      }
    };
    loadData();
  }, [user, authLoading, toast]);


  // Unified save effect
  useEffect(() => {
    // Only save if data has been loaded and user is logged in.
    if (authLoading || !isLoaded.current || !user) {
        return;
    }

    const saveData = async () => {
        if (isSaving.current) return;
        isSaving.current = true;
        
        const data = { squad, teamDefinitions, teams };

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, data, { merge: true });
        } catch (error) {
            console.error("Failed to save data:", error);
            toast({ title: "Save Error", description: "Failed to save your changes.", variant: "destructive" });
        } finally {
            isSaving.current = false;
        }
    };

    // Debounce saving
    const handler = setTimeout(saveData, 1000);
    return () => clearTimeout(handler);

  }, [squad, teamDefinitions, teams, user, authLoading, toast]);

  const handleSetTeamDefinitions = (newDefinitions: TeamDefinition[]) => {
    setTeamDefinitions(newDefinitions);

    const reconciledTeams = newDefinitions.map(def => {
        const existingTeam = teams.find(t => t.id === def.id);
        const newPlayers = new Array(def.size).fill(null);

        if (existingTeam) {
            existingTeam.players.slice(0, def.size).forEach((player, i) => {
                if (player) {
                    newPlayers[i] = player;
                }
            });
        }
        
        return {
            id: def.id,
            name: def.name,
            players: newPlayers,
        };
    });

    setTeams(reconciledTeams);
  };

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
    const playerToMove = squad.find(p => p.id === playerId) || teams.flatMap(t => t.players).find(p => p?.id === playerId);
    if (!playerToMove) return;

    setTeams(currentTeams => {
        const newTeams = JSON.parse(JSON.stringify(currentTeams));
        let alreadyInPlace = false;

        // Remove from old position
        for (const team of newTeams) {
            const oldIndex = team.players.findIndex((p: Player | null) => p?.id === playerId);
            if (oldIndex !== -1) {
                if(team.id === teamId && oldIndex === slotIndex) {
                    alreadyInPlace = true;
                } else {
                    team.players[oldIndex] = null;
                }
            }
        }
        if(alreadyInPlace) return currentTeams;
        
        // Place in new position
        const targetTeam = newTeams.find((t:Team) => t.id === teamId);
        if (targetTeam && targetTeam.players[slotIndex] === null) {
            targetTeam.players[slotIndex] = playerToMove;
        } else {
            // This case should ideally not happen if logic is sound, maybe log an error
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
        const newTeams = JSON.parse(JSON.stringify(currentTeams));
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

  const selectPlayerForSwap = (player: SelectedPlayer) => {
    setSelectedPlayer(prev => {
        if (!prev) return [player];
        if (prev.length === 1) {
            if (prev[0].playerId === player.playerId) return null; // Deselect
            return [...prev, player]; // Select second player
        }
        return [player]; // Start new selection
    });
  };

  const swapSelectedPlayers = () => {
    if (selectedPlayer && selectedPlayer.length === 2) {
        const [p1, p2] = selectedPlayer;
        swapPlayers(p1.playerId, p1.teamId, p1.slotIndex, p2.playerId, p2.teamId, p2.slotIndex);
        setSelectedPlayer(null); // Clear selection after swap
        toast({ title: "Players Swapped!", description: "The selected players have been swapped."});
    } else {
        toast({ title: "Selection Error", description: "You must select exactly two players to swap.", variant: "destructive" });
    }
  }

  const clearSelection = () => {
    setSelectedPlayer(null);
  };

  return (
    <TeamBuilderContext.Provider value={{
      squad, addPlayer, updatePlayer, deletePlayer,
      teamDefinitions, setTeamDefinitions: handleSetTeamDefinitions,
      teams, setTeams,
      unassignedPlayers,
      movePlayerToTeam, movePlayerToSquad, swapPlayers,
      loadingData,
      selectedPlayer, selectPlayerForSwap, swapSelectedPlayers, clearSelection
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
