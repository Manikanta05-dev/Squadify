
"use client";

import { useRef, createRef, useState } from 'react';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Download, ArrowLeft, Edit, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const teamNameSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters.'),
});

type TeamNameFormData = z.infer<typeof teamNameSchema>;

export default function TeamsPage() {
  const { teams, teamDefinitions, updateTeams, saveData, loadingData } = useTeamBuilder();
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const cardRefs = useRef(teams.map(() => createRef<HTMLDivElement>()));

  const form = useForm<TeamNameFormData>({
    resolver: zodResolver(teamNameSchema),
    defaultValues: {
      name: '',
    },
  });

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

  const handleEditTeam = (team: any) => {
    setEditingTeam(team.id);
    form.reset({ name: team.name });
    setIsDialogOpen(true);
  };

  const handleSaveTeam = (data: TeamNameFormData) => {
    if (editingTeam) {
      updateTeams(currentTeams => 
        currentTeams.map(team => 
          team.id === editingTeam 
            ? { ...team, name: data.name }
            : team
        )
      );
      toast({ title: 'Team Updated', description: `Team name has been updated to "${data.name}".` });
      setEditingTeam(null);
      setIsDialogOpen(false);
    }
  };

  const handleSaveData = async () => {
    console.log('Saving teams data...');
    await saveData(true);
  };
  
  const displayableTeams = teams.filter(team => {
      const hasPlayers = team.players.some(p => p !== null);
      const teamDefExists = teamDefinitions.some(def => def.id === team.id);
      return hasPlayers && teamDefExists;
  });

  if (displayableTeams.length === 0) {
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
      <div className="flex justify-between items-center mb-8">
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Review, edit, and export your teams.</p>
        </div>
        <Button 
          onClick={handleSaveData} 
          disabled={loadingData}
          className="ml-4"
        >
          <Save className="mr-2 h-4 w-4" />
          {loadingData ? 'Saving...' : 'Save Teams'}
        </Button>
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Name</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTeam)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter team name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teams.map((team, index) => {
          const teamDef = teamDefinitions.find(def => def.id === team.id);
          const hasPlayers = team.players.some(p => p !== null);
          if (!teamDef || !hasPlayers) return null;

          return (
            <div key={team.id}>
              <Card ref={cardRefs.current[index]} className="bg-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription>
                        {team.players.filter(p => p).length} / {teamDef?.size} players
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditTeam(team)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
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
