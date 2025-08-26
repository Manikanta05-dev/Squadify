"use client";

import { useDrag } from 'react-dnd';
import { Player } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player, location },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

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
          <Badge variant="secondary">{player.skill}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
