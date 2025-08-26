
"use client";

import { useRef, createRef } from 'react';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TeamsPage() {
  const { teams, teamDefinitions } = useTeamBuilder();
  const cardRefs = useRef(teams.map(() => createRef<HTMLDivElement>()));

  const handleExport = (index: number, teamName: string) => {
    const cardElement = cardRefs.current[index].current;
    if (cardElement) {
      toJpeg(cardElement, { quality: 0.95, backgroundColor: 'white' })
        .then((dataUrl) => {
          saveAs(dataUrl, `${teamName.replace(/\s+/g, '_')}_card.jpg`);
        })
        .catch((error) => {
          console.error('oops, something went wrong!', error);
        });
    }
  };
  
  if (teams.length === 0 || teamDefinitions.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Card className="text-center p-8">
            <CardTitle className="text-2xl">No Teams Formed</CardTitle>
            <CardContent className="mt-4">
                <p className="text-muted-foreground">You haven't created and formed any teams yet.</p>
                <Link href="/organize">
                    <Button className="mt-4">Start Organizing</Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">Review your teams and export them if needed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teams.map((team, index) => {
          const teamDef = teamDefinitions.find(def => def.id === team.id);
          const hasPlayers = team.players.some(p => p !== null);
          if (!teamDef || !hasPlayers) return null;

          return (
            <div key={team.id}>
              <Card ref={cardRefs.current[index]} className="bg-card">
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>
                    {team.players.filter(p => p).length} / {teamDef?.size} players
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.players.map((player, pIndex) => (
                    <div key={pIndex} className={`p-3 rounded-md border ${player ? 'bg-background' : 'bg-muted/50'}`}>
                      {player ? (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-sm text-muted-foreground">{player.gender}</p>
                          </div>
                          <p className="text-sm font-medium text-primary">{player.skill}</p>
                        </div>
                      ) : (
                        <p className="text-center text-sm text-muted-foreground">Empty Slot</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Button onClick={() => handleExport(index, team.name)} className="w-full mt-4">
                <Download className="mr-2 h-4 w-4" /> Export as JPG
              </Button>
            </div>
          );
        })}
      </div>
       <div className="mt-8 flex justify-start">
          <Link href="/form-teams">
              <Button variant="outline" size="lg">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Back to Forming Teams
              </Button>
            </Link>
        </div>
    </div>
  );
}
