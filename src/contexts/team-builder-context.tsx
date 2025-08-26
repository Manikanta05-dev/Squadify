
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
  const { user } = useAuth();
  const [squad, setSquad] = useState<Player[]>([]);
  const [teamDefinitions, setTeamDefinitions] = useState<TeamDefinition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const saveData = useCallback(async (data: { squad: Player[], teamDefinitions: TeamDefinition[], teams: Team[] }) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, data, { merge: true });
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setLoadingData(true);
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSquad(data.squad || []);
          setTeamDefinitions(data.teamDefinitions || []);
          setTeams(data.teams || []);
        } else {
          // New user, initialize with empty data
          setSquad([]);
          setTeamDefinitions([]);
          setTeams([]);
        }
        setLoadingData(false);
      } else {
        // No user, clear all data
        setSquad([]);
        setTeamDefinitions([]);
        setTeams([]);
        setLoadingData(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
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

    const hasChanged = JSON.stringify(newTeams) !== JSON.stringify(teams);
    if(hasChanged){
        setTeams(newTeams);
    }
  }, [teamDefinitions, teams]);


  useEffect(() => {
    const assignedPlayerIds = new Set(teams.flatMap(t => t.players).filter(Boolean).map(p => p!.id));
    setUnassignedPlayers(squad.filter(p => !assignedPlayerIds.has(p.id)));
  }, [squad, teams]);

  const handleDataChange = (updater: (prev: { squad: Player[], teamDefinitions: TeamDefinition[], teams: Team[] }) => { squad: Player[], teamDefinitions: TeamDefinition[], teams: Team[] }) => {
    const newState = updater({ squad, teamDefinitions, teams });
    setSquad(newState.squad);
    setTeamDefinitions(newState.teamDefinitions);
    setTeams(newState.teams);
    saveData(newState);
  };
  
  const addPlayer = (player: Omit<Player, 'id'>) => {
    handleDataChange(prev => ({
        ...prev,
        squad: [...prev.squad, { ...player, id: uuidv4() }]
    }));
  };

  const updatePlayer = (updatedPlayer: Player) => {
     handleDataChange(prev => ({
        ...prev,
        squad: prev.squad.map(p => p.id === updatedPlayer.id ? updatedPlayer : p),
        teams: prev.teams.map(team => ({
            ...team,
            players: team.players.map(p => p?.id === updatedPlayer.id ? updatedPlayer : p)
        }))
    }));
  };

  const deletePlayer = (playerId: string) => {
    handleDataChange(prev => ({
        ...prev,
        squad: prev.squad.filter(p => p.id !== playerId),
        teams: prev.teams.map(team => ({
            ...team,
            players: team.players.map(p => p?.id === playerId ? null : p)
        }))
    }));
  };
  
  const handleSetTeamDefinitions = (definitions: TeamDefinition[]) => {
      setTeamDefinitions(definitions);
      saveData({ squad, teamDefinitions: definitions, teams });
  }

  const handleSetTeams = (newTeams: Team[] | ((prevTeams: Team[]) => Team[])) => {
    const updatedTeams = typeof newTeams === 'function' ? newTeams(teams) : newTeams;
    setTeams(updatedTeams);
    saveData({ squad, teamDefinitions, teams: updatedTeams });
  };

  const movePlayerToTeam = (playerId: string, teamId: string, slotIndex: number) => {
    const player = squad.find(p => p.id === playerId);
    if (!player) return;

    const newTeams = teams.map(t => ({ ...t, players: [...t.players] }));

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
        targetTeam.players[slotIndex] = player;
    }
    
    handleSetTeams(newTeams);
  };

  const movePlayerToSquad = (playerId: string, fromTeamId: string, fromSlotIndex: number) => {
    const newTeams = teams.map(t => {
      if (t.id === fromTeamId) {
        const newPlayers = [...t.players];
        if (newPlayers[fromSlotIndex]?.id === playerId) {
          newPlayers[fromSlotIndex] = null;
        }
        return { ...t, players: newPlayers };
      }
      return t;
    });
    handleSetTeams(newTeams);
  };

  const swapPlayers = (
    player1Id: string, team1Id: string, slot1Index: number,
    player2Id: string, team2Id: string, slot2Index: number
  ) => {
    const player1 = squad.find(p => p.id === player1Id);
    const player2 = squad.find(p => p.id === player2Id);
    if (!player1 || !player2) return;

    const newTeams = teams.map(t => ({ ...t, players: [...t.players] }));
    const team1 = newTeams.find(t => t.id === team1Id);
    const team2 = newTeams.find(t => t.id === team2Id);

    if (team1 && team2) {
      team1.players[slot1Index] = player2;
      team2.players[slot2Index] = player1;
    }

    handleSetTeams(newTeams);
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
