"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, Edit, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { generatePlayers } from '@/ai/flows/generate-players-flow';

const playerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  gender: z.enum(['Male', 'Female', 'Other']),
  skill: z.string().min(1, 'Skill/Role is required.'),
});

type PlayerFormData = z.infer<typeof playerSchema>;

export default function SquadPage() {
  const { squad, addPlayer, updatePlayer, deletePlayer, saveData, loadingData } = useTeamBuilder();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: '',
      gender: 'Male',
      skill: '',
    },
  });

  const handleGeneratePlayers = async () => {
    setIsGenerating(true);
    try {
        const result = await generatePlayers({
            count: 10,
            existingSkills: squad.map(p => p.skill)
        });
        result.players.forEach(player => addPlayer(player));
        toast({
            title: 'Players Generated!',
            description: `${result.players.length} new players have been added to your squad.`,
        });
    } catch (error) {
        console.error("Failed to generate players:", error);
        toast({
            title: 'Generation Failed',
            description: 'Could not generate new players at this time.',
            variant: 'destructive',
        });
    } finally {
        setIsGenerating(false);
    }
  };


  const onSubmit = (data: PlayerFormData) => {
    if (editingPlayer) {
      updatePlayer({ ...editingPlayer, ...data });
      toast({ title: 'Player Updated', description: `${data.name} has been updated.` });
      setEditingPlayer(null);
    } else {
      addPlayer(data);
      toast({ title: 'Player Added', description: `${data.name} has been added to the squad.` });
    }
    form.reset();
    setIsDialogOpen(false);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    form.reset(player);
    setIsDialogOpen(true);
  };
  
  const handleDelete = (playerId: string) => {
    const player = squad.find(p => p.id === playerId);
    if (player) {
      deletePlayer(playerId);
      toast({ title: 'Player Deleted', description: `${player.name} has been removed from the squad.`, variant: 'destructive' });
    }
  };

  const openNewPlayerDialog = () => {
    setEditingPlayer(null);
    form.reset({ name: '', gender: 'Male', skill: '' });
    setIsDialogOpen(true);
  }
  
  if (loading || !user) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  if (loadingData) {
    return <div className="flex justify-center items-center h-screen"><p>Loading your squad data...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Manage Your Squad</CardTitle>
          <CardDescription>Add, edit, or remove players from your squad list.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewPlayerDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Player
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPlayer ? 'Edit Player' : 'Add a New Player'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Player Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="skill"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill / Role</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Bowler, Keeper, Attacker" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">{editingPlayer ? 'Update Player' : 'Add Player'}</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
                         <Button 
               onClick={async () => {
                 console.log('Manual save triggered');
                 console.log('Current squad:', squad);
                 await saveData(true);
               }} 
               variant="outline"
               disabled={loadingData}
             >
               {loadingData ? 'Loading...' : 'Save Data'}
             </Button>
            <Button onClick={handleGeneratePlayers} disabled={isGenerating} variant="outline">
                <Sparkles className="mr-2 h-4 w-4" /> 
                {isGenerating ? 'Generating...' : 'Generate Players'}
            </Button>
          </div>

          <Card>
            <CardHeader>
                <CardTitle>Squad List</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Skill/Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {squad.length > 0 ? (
                        squad.map((player) => (
                            <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>{player.gender}</TableCell>
                            <TableCell>{player.skill}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(player)}>
                                <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete {player.name} from your squad.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(player.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">
                            Your squad is empty. Add some players to get started!
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
          
          <div className="mt-8 flex justify-end">
            <Link href="/organize">
              <Button variant="outline" size="lg" disabled={squad.length === 0}>
                Next: Organize Teams <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
