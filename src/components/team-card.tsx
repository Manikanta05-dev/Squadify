"use client";

import { useDrop } from 'react-dnd';
import { useMemo } from 'react';
import { Player, Team } from '@/lib/types';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { PlayerCard, ItemTypes, PlayerLocation } from './player-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const { teamDefinitions, movePlayerToTeam, movePlayerToSquad, swapPlayers } = useTeamBuilder();
  const teamDef = teamDefinitions.find((def) => def.id === team.id);

  const validation = useMemo(() => {
    if (!teamDef) return { isValid: false, errors: ['Team definition not found.'] };

    const errors: string[] = [];
    const playerCount = team.players.filter(Boolean).length;
    
    // Check team size
    if (playerCount > teamDef.size) {
      errors.push(`Team is over size limit of ${teamDef.size}.`);
    }

    // Check female requirement
    if (teamDef.requireFemale && !team.players.some(p => p?.gender === 'Female')) {
        errors.push('At least one female player is required.');
    }

    // Check role requirements
    const playerSkills = team.players.filter(Boolean).map(p => p!.skill);
    teamDef.roleRequirements.forEach(req => {
        const count = playerSkills.filter(skill => skill.toLowerCase() === req.role.toLowerCase()).length;
        if (count < req.count) {
            errors.push(`Needs ${req.count} ${req.role}(s), has ${count}.`);
        }
    });

    return {
      isValid: errors.length === 0 && playerCount > 0,
      isComplete: errors.length === 0 && playerCount === teamDef.size,
      errors
    };
  }, [team, teamDef]);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
                {team.name}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                        { validation.isComplete ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : (validation.isValid ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <XCircle className="h-5 w-5 text-destructive" />) }
                        </TooltipTrigger>
                        <TooltipContent>
                        { validation.errors.length > 0 ? (
                            <ul className="list-disc pl-4">
                                {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        ) : ( validation.isComplete ? <p>Team is valid and full!</p> : <p>Team is valid but not full.</p>)
                        }
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardTitle>
            <CardDescription>
                {teamDef?.size} players |{' '}
                {teamDef?.roleRequirements.map(r => `${r.count} ${r.role}`).join(', ')}
                {teamDef?.requireFemale && ', min. 1 Female'}
            </CardDescription>
        </div>
        <Badge variant={validation.isComplete ? 'default' : 'secondary'} className={validation.isComplete ? "bg-green-500" : ""}>
            {team.players.filter(Boolean).length} / {teamDef?.size}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {team.players.map((player, index) => (
            <PlayerDropSlot key={index} teamId={team.id} slotIndex={index} player={player} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerDropSlot({ teamId, slotIndex, player }: { teamId: string, slotIndex: number, player: Player | null }) {
  const { movePlayerToTeam, movePlayerToSquad, swapPlayers } = useTeamBuilder();
  
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAYER,
    drop: (item: { player: Player; location: PlayerLocation }) => {
      // Logic to move or swap players
      const sourcePlayer = item.player;
      const sourceLocation = item.location;
      const targetPlayer = player;

      // Case 1: Drop on an empty slot
      if (!targetPlayer) {
        movePlayerToTeam(sourcePlayer.id, teamId, slotIndex);
        return;
      }
      
      // Case 2: Drop on an occupied slot (swap)
      if (targetPlayer.id !== sourcePlayer.id) {
        if(sourceLocation.type === 'team'){
          swapPlayers(sourcePlayer.id, sourceLocation.teamId, sourceLocation.slotIndex, targetPlayer.id, teamId, slotIndex);
        } else {
          // Player from squad is dropped on an existing player in a team
          // Move target player to squad, move source player to team
          movePlayerToSquad(targetPlayer.id, teamId, slotIndex);
          movePlayerToTeam(sourcePlayer.id, teamId, slotIndex);
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [player, teamId, slotIndex]);

  return (
    <div
      ref={drop}
      className={`p-2 rounded-md transition-colors duration-200 ${
        isOver ? 'bg-primary/20' : ''
      } ${!player ? 'border-2 border-dashed h-[68px]' : ''}`}
    >
      {player ? (
        <PlayerCard player={player} location={{ type: 'team', teamId, slotIndex }} />
      ) : (
        <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Drop player here</span>
        </div>
      )}
    </div>
  );
}
