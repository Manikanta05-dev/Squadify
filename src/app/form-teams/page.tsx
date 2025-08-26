
"use client";

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { PlayerCard } from '@/components/player-card';
import { TeamCard } from '@/components/team-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/components/player-card';

function SquadDropZone() {
    const { movePlayerToSquad } = useTeamBuilder();
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.PLAYER,
        drop: (item: any) => {
            if (item.location.type === 'team') {
                movePlayerToSquad(item.player.id, item.location.teamId, item.location.slotIndex);
            }
        },
        canDrop: (item: any) => item.location.type === 'team',
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [movePlayerToSquad]);

    return (
        <div 
            ref={drop} 
            className={`flex-grow border-2 border-dashed rounded-md transition-colors duration-200 ${isOver && canDrop ? 'bg-primary/20 border-primary' : 'border-border'}`}
        >
             <div className="text-center text-muted-foreground p-10 h-full flex flex-col items-center justify-center">
                <Users className="h-8 w-8 mb-2" />
                <p>Drop a player here to move them back to the squad.</p>
            </div>
        </div>
    )
}

export default function FormTeamsPage() {
  const { unassignedPlayers, teams } = useTeamBuilder();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // or a loading skeleton
  }

  if (teams.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Card className="text-center p-8">
            <CardTitle className="text-2xl">No Teams Defined</CardTitle>
            <CardContent className="mt-4">
                <p className="text-muted-foreground">You need to define your team structures first.</p>
                <Link href="/organize">
                    <Button className="mt-4">Go to Organize Page</Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-8rem)] p-4 md:p-8 gap-8">
        {/* Squad Column */}
        <div className="w-1/3 flex flex-col">
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <CardTitle>Squad</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col gap-4">
              <ScrollArea className="h-[50%] p-4 border rounded-md">
                {unassignedPlayers.length > 0 ? (
                  <div className="space-y-2">
                    {unassignedPlayers.map((player) => (
                      <PlayerCard key={player.id} player={player} location={{ type: 'squad' }} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10 h-full flex items-center justify-center">
                    All players have been assigned.
                  </div>
                )}
              </ScrollArea>
              <SquadDropZone />
            </CardContent>
          </Card>
        </div>

        {/* Teams Column */}
        <div className="w-2/3 flex flex-col">
           <div className="flex-grow overflow-hidden">
             <ScrollArea className="h-full">
                <div className="space-y-6 p-1">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </ScrollArea>
           </div>
          <div className="mt-4 flex justify-between pt-4 border-t">
              <Link href="/organize">
                  <Button variant="outline" size="lg">
                     <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organize
                  </Button>
                </Link>
              <Link href="/export">
                <Button size="lg">
                  Next: Export Teams <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
        </div>
      </div>
    </DndProvider>
  );
}
