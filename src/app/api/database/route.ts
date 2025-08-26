import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { Player, TeamDefinition, Team } from '@/lib/types';

class SquadifyDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database('squadify.db');
    this.initDatabase();
  }

  private initDatabase() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        skill TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        role_requirements TEXT,
        require_female BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        definition_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (definition_id) REFERENCES team_definitions (id)
      );

      CREATE TABLE IF NOT EXISTS team_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        slot_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams (id),
        FOREIGN KEY (player_id) REFERENCES players (id)
      );
    `);
  }

  // Player operations
  getAllPlayers(): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players ORDER BY created_at');
    return stmt.all().map(row => ({
      id: row.id,
      name: row.name,
      gender: row.gender as 'Male' | 'Female' | 'Other',
      skill: row.skill
    }));
  }

  addPlayer(player: Player): void {
    const stmt = this.db.prepare('INSERT INTO players (id, name, gender, skill) VALUES (?, ?, ?, ?)');
    stmt.run(player.id, player.name, player.gender, player.skill);
  }

  updatePlayer(player: Player): void {
    const stmt = this.db.prepare('UPDATE players SET name = ?, gender = ?, skill = ? WHERE id = ?');
    stmt.run(player.name, player.gender, player.skill, player.id);
  }

  deletePlayer(playerId: string): void {
    // First remove from team_players
    const deleteTeamPlayerStmt = this.db.prepare('DELETE FROM team_players WHERE player_id = ?');
    deleteTeamPlayerStmt.run(playerId);
    
    // Then delete the player
    const deletePlayerStmt = this.db.prepare('DELETE FROM players WHERE id = ?');
    deletePlayerStmt.run(playerId);
  }

  // Team definition operations
  getAllTeamDefinitions(): TeamDefinition[] {
    const stmt = this.db.prepare('SELECT * FROM team_definitions ORDER BY created_at');
    return stmt.all().map(row => ({
      id: row.id,
      name: row.name,
      size: row.size,
      roleRequirements: row.role_requirements ? JSON.parse(row.role_requirements) : [],
      requireFemale: Boolean(row.require_female)
    }));
  }

  addTeamDefinition(definition: TeamDefinition): void {
    const stmt = this.db.prepare(`
      INSERT INTO team_definitions (id, name, size, role_requirements, require_female) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      definition.id,
      definition.name,
      definition.size,
      JSON.stringify(definition.roleRequirements),
      definition.requireFemale ? 1 : 0
    );
  }

  updateTeamDefinition(definition: TeamDefinition): void {
    const stmt = this.db.prepare(`
      UPDATE team_definitions 
      SET name = ?, size = ?, role_requirements = ?, require_female = ? 
      WHERE id = ?
    `);
    stmt.run(
      definition.name,
      definition.size,
      JSON.stringify(definition.roleRequirements),
      definition.requireFemale ? 1 : 0,
      definition.id
    );
  }

  deleteTeamDefinition(definitionId: string): void {
    // First remove associated teams and team players
    const deleteTeamPlayersStmt = this.db.prepare(`
      DELETE FROM team_players 
      WHERE team_id IN (SELECT id FROM teams WHERE definition_id = ?)
    `);
    deleteTeamPlayersStmt.run(definitionId);

    const deleteTeamsStmt = this.db.prepare('DELETE FROM teams WHERE definition_id = ?');
    deleteTeamsStmt.run(definitionId);

    const deleteDefinitionStmt = this.db.prepare('DELETE FROM team_definitions WHERE id = ?');
    deleteDefinitionStmt.run(definitionId);
  }

  // Team operations
  getAllTeams(): Team[] {
    const teamsStmt = this.db.prepare(`
      SELECT t.*, td.name as definition_name, td.size 
      FROM teams t 
      LEFT JOIN team_definitions td ON t.definition_id = td.id 
      ORDER BY t.created_at
    `);
    const teams = teamsStmt.all();

    const teamPlayersStmt = this.db.prepare(`
      SELECT tp.*, p.name, p.gender, p.skill 
      FROM team_players tp 
      JOIN players p ON tp.player_id = p.id 
      WHERE tp.team_id = ?
    `);

    return teams.map(team => {
      const players = teamPlayersStmt.all(team.id);
      const playerArray = new Array(team.size).fill(null);
      
      players.forEach(player => {
        playerArray[player.slot_index] = {
          id: player.player_id,
          name: player.name,
          gender: player.gender as 'Male' | 'Female' | 'Other',
          skill: player.skill
        };
      });

      return {
        id: team.id,
        name: team.name,
        players: playerArray
      };
    });
  }

  addTeam(team: Team, definitionId: string): void {
    const insertTeamStmt = this.db.prepare('INSERT INTO teams (id, name, definition_id) VALUES (?, ?, ?)');
    insertTeamStmt.run(team.id, team.name, definitionId);

    // Insert team players
    const insertPlayerStmt = this.db.prepare('INSERT INTO team_players (team_id, player_id, slot_index) VALUES (?, ?, ?)');
    
    team.players.forEach((player, index) => {
      if (player) {
        insertPlayerStmt.run(team.id, player.id, index);
      }
    });
  }

  updateTeam(team: Team): void {
    // Update team name
    const updateTeamStmt = this.db.prepare('UPDATE teams SET name = ? WHERE id = ?');
    updateTeamStmt.run(team.name, team.id);

    // Remove existing team players
    const deleteTeamPlayersStmt = this.db.prepare('DELETE FROM team_players WHERE team_id = ?');
    deleteTeamPlayersStmt.run(team.id);

    // Insert new team players
    const insertPlayerStmt = this.db.prepare('INSERT INTO team_players (team_id, player_id, slot_index) VALUES (?, ?, ?)');
    
    team.players.forEach((player, index) => {
      if (player) {
        insertPlayerStmt.run(team.id, player.id, index);
      }
    });
  }

  deleteTeam(teamId: string): void {
    const deleteTeamPlayersStmt = this.db.prepare('DELETE FROM team_players WHERE team_id = ?');
    deleteTeamPlayersStmt.run(teamId);

    const deleteTeamStmt = this.db.prepare('DELETE FROM teams WHERE id = ?');
    deleteTeamStmt.run(teamId);
  }

  // Bulk operations
  saveAllData(squad: Player[], teamDefinitions: TeamDefinition[], teams: Team[]): void {
    console.log('saveAllData called with:', { 
      squadLength: squad?.length, 
      teamDefinitionsLength: teamDefinitions?.length, 
      teamsLength: teams?.length 
    });

    const transaction = this.db.transaction(() => {
      // Clear existing data
      this.db.prepare('DELETE FROM team_players').run();
      this.db.prepare('DELETE FROM teams').run();
      this.db.prepare('DELETE FROM team_definitions').run();
      this.db.prepare('DELETE FROM players').run();

      // Insert new data
      if (squad && squad.length > 0) {
        squad.forEach(player => {
          console.log('Adding player to DB:', player);
          this.addPlayer(player);
        });
      }

      if (teamDefinitions && teamDefinitions.length > 0) {
        teamDefinitions.forEach(def => {
          console.log('Adding team definition to DB:', def);
          this.addTeamDefinition(def);
        });
      }
      
      if (teams && teams.length > 0) {
        teams.forEach(team => {
          const definition = teamDefinitions.find(d => d.id === team.id);
          if (definition) {
            console.log('Adding team to DB:', team);
            this.addTeam(team, definition.id);
          }
        });
      }
    });

    transaction();
  }

  close(): void {
    this.db.close();
  }
}

// Create a singleton instance
const database = new SquadifyDatabase();

export async function GET() {
  try {
    const players = database.getAllPlayers();
    const teamDefinitions = database.getAllTeamDefinitions();
    const teams = database.getAllTeams();

    return NextResponse.json({
      players,
      teamDefinitions,
      teams
    });
  } catch (error) {
    console.error('Database GET error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.log('Database POST request:', { action, data });

    switch (action) {
      case 'saveAll':
        console.log('Saving all data:', { 
          squadLength: data.squad?.length, 
          teamDefinitionsLength: data.teamDefinitions?.length, 
          teamsLength: data.teams?.length 
        });
        database.saveAllData(data.squad, data.teamDefinitions, data.teams);
        break;
      case 'addPlayer':
        console.log('Adding player:', data.player);
        database.addPlayer(data.player);
        break;
      case 'updatePlayer':
        console.log('Updating player:', data.player);
        database.updatePlayer(data.player);
        break;
      case 'deletePlayer':
        console.log('Deleting player:', data.playerId);
        database.deletePlayer(data.playerId);
        break;
      case 'addTeamDefinition':
        console.log('Adding team definition:', data.definition);
        database.addTeamDefinition(data.definition);
        break;
      case 'updateTeamDefinition':
        console.log('Updating team definition:', data.definition);
        database.updateTeamDefinition(data.definition);
        break;
      case 'deleteTeamDefinition':
        console.log('Deleting team definition:', data.definitionId);
        database.deleteTeamDefinition(data.definitionId);
        break;
      case 'updateTeam':
        console.log('Updating team:', data.team);
        database.updateTeam(data.team);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database POST error:', error);
    return NextResponse.json({ error: 'Failed to save data', details: error.message }, { status: 500 });
  }
}
