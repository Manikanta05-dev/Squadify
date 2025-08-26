'use server';
/**
 * @fileOverview A flow for generating a list of players.
 *
 * - generatePlayers - A function that creates a specified number of players with names, genders, and skills.
 * - GeneratePlayersInput - The input type for the generatePlayers function.
 * - GeneratePlayersOutput - The return type for the generatePlayers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PlayerSchema = z.object({
    name: z.string().describe('The full name of the player.'),
    gender: z.enum(['Male', 'Female', 'Other']).describe('The gender of the player.'),
    skill: z.string().describe('The primary skill or role of the player (e.g., Attacker, Defender, Goalie).'),
});

const GeneratePlayersInputSchema = z.object({
  count: z.number().int().positive().describe('The number of players to generate.'),
  existingSkills: z.array(z.string()).describe('A list of skills already present in the squad to ensure variety.'),
});
export type GeneratePlayersInput = z.infer<typeof GeneratePlayersInputSchema>;

const GeneratePlayersInternalInputSchema = GeneratePlayersInputSchema.extend({
    existingSkillsString: z.string(),
});

const GeneratePlayersOutputSchema = z.object({
  players: z.array(PlayerSchema),
});
export type GeneratePlayersOutput = z.infer<typeof GeneratePlayersOutputSchema>;

export async function generatePlayers(input: GeneratePlayersInput): Promise<GeneratePlayersOutput> {
  return generatePlayersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePlayersPrompt',
  input: { schema: GeneratePlayersInternalInputSchema },
  output: { schema: GeneratePlayersOutputSchema },
  prompt: `You are a sports team manager assistant. Your task is to generate a list of fictional players.

Generate a list of {{{count}}} players.
Ensure the skills are diverse and interesting for a generic sports context.
Avoid duplicating skills from this list of existing skills if possible: {{{existingSkillsString}}}

Provide a diverse set of names and genders for the players.
`,
});

const generatePlayersFlow = ai.defineFlow(
  {
    name: 'generatePlayersFlow',
    inputSchema: GeneratePlayersInputSchema,
    outputSchema: GeneratePlayersOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
        ...input,
        existingSkillsString: JSON.stringify(input.existingSkills),
    });
    return output!;
  }
);
