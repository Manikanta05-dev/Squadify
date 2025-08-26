
"use client";

import { useDrag } from 'react-dnd';
import { Player } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Edit, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Input } from './ui/input';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { cn } from '@/lib/utils';


export const ItemTypes = {
  PLAYER: 'player',
};

export type PlayerLocation =
  | { type: 'squad' }
  | { type: 'team'; teamId: string; slotIndex: number };

interface PlayerCardProps {
  player: Player;
  location: PlayerLocation;
}

export function PlayerCard({ player, location }: PlayerCardProps) {
  const { updatePlayer, movePlayerToSquad, selectPlayerForSwap, selectedPlayer } = useTeamBuilder();
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [role, setRole] = useState(player.skill);

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player, location },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const handleRoleBlur = () => {
    if (role !== player.skill) {
      updatePlayer({ ...player, skill: role });
    }
    setIsEditingRole(false);
  };

  const handleRoleChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRoleBlur();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setRole(player.skill);
      setIsEditingRole(false);
    }
  };

  const handleRemoveFromTeam = () => {
    if (location.type === 'team') {
      movePlayerToSquad(player.id, location.teamId, location.slotIndex);
    }
  };

  const handleCardClick = () => {
    if (location.type === 'team') {
      selectPlayerForSwap({
        playerId: player.id,
        teamId: location.teamId,
        slotIndex: location.slotIndex,
      });
    }
  };

  const isSelected = location.type === 'team' && selectedPlayer?.some(p => p.playerId === player.id);

  return (
    <div ref={preview} onClick={handleCardClick} className="cursor-pointer">
      <Card
        ref={drag}
        className={cn(
          'p-2 transition-all duration-200',
          isDragging ? 'opacity-50 ring-2 ring-primary' : 'opacity-100',
          location.type === 'team' ? 'bg-card' : 'bg-muted/50',
          isSelected && 'ring-2 ring-offset-background ring-offset-2 ring-primary'
        )}
      >
        <CardContent className="p-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <div>
              <p className="font-semibold">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.gender}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {location.type === 'team' && isEditingRole ? (
                 <Input 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    onKeyDown={handleRoleChange}
                    onBlur={handleRoleBlur}
                    autoFocus
                    className="h-7 text-xs w-24"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <Badge variant="secondary">{player.skill}</Badge>
            )}

            {location.type === 'team' && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingRole(!isEditingRole); }} className="p-1 hover:bg-accent rounded-md">
                        <Edit className="h-3 w-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(); }} className="p-1 hover:bg-accent rounded-md text-destructive">
                        <MinusCircle className="h-4 w-4" />
                    </button>
                </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
