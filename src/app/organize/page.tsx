
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTeamBuilder } from '@/contexts/team-builder-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const roleRequirementSchema = z.object({
  id: z.string(),
  role: z.string().min(1, "Role name is required."),
  count: z.coerce.number().min(1, "Count must be at least 1."),
});

const teamDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Team name must be at least 2 characters."),
  size: z.coerce.number().min(1, "Team size must be at least 1."),
  roleRequirements: z.array(roleRequirementSchema),
  requireFemale: z.boolean(),
});

const formSchema = z.object({
  teams: z.array(teamDefinitionSchema).refine((teams) => {
    const names = teams.map(team => team.name.toLowerCase().trim());
    return new Set(names).size === names.length;
  }, {
    message: "Team names must be unique.",
  }),
});


export default function OrganizePage() {
  const { setTeamDefinitions, teamDefinitions } = useTeamBuilder();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teams: teamDefinitions.length > 0 ? teamDefinitions.map(def => ({...def, size: Number(def.size)})) : [{
        id: uuidv4(),
        name: 'Team 1',
        size: 5,
        roleRequirements: [],
        requireFemale: false,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'teams',
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setTeamDefinitions(data.teams);
    toast({ title: 'Team Rules Saved!', description: 'Your team structures have been defined.' });
    router.push('/form-teams');
  };
  
  const addNewTeam = () => {
    append({
        id: uuidv4(),
        name: `Team ${fields.length + 1}`,
        size: 5,
        roleRequirements: [],
        requireFemale: false,
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Organize Your Teams</CardTitle>
          <CardDescription>Define the structure and rules for each team you want to create.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {fields.map((field, index) => (
                <TeamDefinitionForm key={field.id} form={form} teamIndex={index} removeTeam={() => remove(index)} />
              ))}

              {form.formState.errors.teams && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.teams.message}
                </p>
              )}
              
              <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={addNewTeam}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Team
                </Button>
                <Button type="submit" size="lg">
                  Save & Proceed <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamDefinitionForm({ form, teamIndex, removeTeam }: { form: any, teamIndex: number, removeTeam: () => void }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `teams.${teamIndex}.roleRequirements`
  });

  const addRoleRequirement = () => {
    append({ id: uuidv4(), role: '', count: 1 });
  }

  return (
    <Card className="p-6 border-l-4 border-primary">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">Team {teamIndex + 1} Setup</h3>
        <Button type="button" variant="ghost" size="icon" onClick={removeTeam}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`teams.${teamIndex}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl><Input placeholder="e.g. The Avengers" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`teams.${teamIndex}.size`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Size</FormLabel>
              <FormControl><Input type="number" placeholder="e.g. 5" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="mt-6">
        <FormLabel>Role Requirements</FormLabel>
        <div className="space-y-2 mt-2">
          {fields.map((field, roleIndex) => (
            <div key={field.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <FormField
                    control={form.control}
                    name={`teams.${teamIndex}.roleRequirements.${roleIndex}.role`}
                    render={({ field }) => (
                        <FormItem className="flex-grow"><FormControl><Input placeholder="Role name" {...field} /></FormControl></FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`teams.${teamIndex}.roleRequirements.${roleIndex}.count`}
                    render={({ field }) => (
                        <FormItem><FormControl><Input type="number" className="w-20" {...field} /></FormControl></FormItem>
                    )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(roleIndex)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addRoleRequirement}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>
      <div className="mt-6">
        <FormField
          control={form.control}
          name={`teams.${teamIndex}.requireFemale`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Conditions</FormLabel>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Ensure team has at least one female player.
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </Card>
  );
}
