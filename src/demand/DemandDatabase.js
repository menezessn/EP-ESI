import { sql } from "../db.js";

export class DemandDatabase {
        // Create a new user
        async create(demand) {
            const result = await sql`INSERT INTO Demand (file_paths, status, aplicant) VALUES (${demand.file_paths}, ${demand.status}, ${demand.aplicant}) RETURNING *;`;
            return result[0]; //Return the demand
        }
}