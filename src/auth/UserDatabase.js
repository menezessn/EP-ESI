import {sql} from '../db.js'

export class UserDatabase {

    // List Usuários with optional search
    async list(search) {
        let Users;
        if (search) {
            Users = await sql`SELECT * FROM Users WHERE name ILIKE ${'%' + search + '%'}`;
        } else {
            Users = await sql`SELECT * FROM User`;
        }
        return Users;
    }

    // Create a new user
    async create(user) {
        const result = await sql`INSERT INTO Users (name, cpf, email, password, user_type) VALUES (${user.name}, ${user.cpf}, ${user.email}, ${user.password}, ${user.user_type}) RETURNING *;`;
        return result[0]; //Return the user
    }

     // Update an existing user
    async update(user) {
        const result = await sql`
            UPDATE user 
            SET name = ${user.name}, 
                cpf = ${user.cpf}, 
                email = ${user.email}, 
                password = ${user.password}, 
                user_type = ${user.user_type} 
            WHERE id = ${user.id} 
            RETURNING *;`;
        return result[0]; // Return the updated user
    }

    // Delete a user
    async delete(id) {
        const result = await sql`
            DELETE FROM users 
            WHERE id = ${id} 
            RETURNING *;`;
        return result[0]; // Returns the deleted user
    }

    // Obtains a user by CPF
    async getByCPF(CPF) {
        const result = await sql`
            SELECT * FROM users 
            WHERE cpf = ${CPF};`;
        return result[0]; // Returns the found user or undefined
    }

     // Obtains a user by CPF
    async getByID(id) {
        const result = await sql`
            SELECT * FROM users 
            WHERE id = ${id};`;
        return result[0]; // Returns the found user or undefined
    }
}