
"use client";

import { useDrag } from 'react-dnd';
import { Player } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Input } from './ui/input';
import { useTeamBuilder } from '@/contexts/team-builder-context';

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
  const { updatePlayer } = useTeamBuilder();
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [role, setRole] = useState(player.skill);

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player, location },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const handleRoleChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updatePlayer({ ...player, skill: role });
      setIsEditingRole(false);
    }
    if (e.key === 'Escape') {
      setRole(player.skill);
      setIsEditingRole(false);
    }
  };

  return (
    <div ref={preview}>
      <Card
        ref={drag}
        className={`p-2 transition-all duration-200 ${
          isDragging ? 'opacity-50 ring-2 ring-primary' : 'opacity-100'
        } ${location.type === 'team' ? 'bg-card' : 'bg-muted/50'}`}
      >
        <CardContent className="p-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <div>
              <p className="font-semibold">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.gender}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {location.type === 'team' && isEditingRole ? (
                 <Input 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    onKeyDown={handleRoleChange}
                    onBlur={() => {
                        updatePlayer({ ...player, skill: role });
                        setIsEditingRole(false);
                    }}
                    autoFocus
                    className="h-7 text-xs"
                />
            ) : (
                <Badge variant="secondary">{player.skill}</Badge>
            )}

            {location.type === 'team' && (
                <button onClick={() => setIsEditingRole(!isEditingRole)} className="p-1 hover:bg-accent rounded">
                    <Edit className="h-3 w-3" />
                </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
