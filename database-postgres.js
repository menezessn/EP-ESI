import {sql} from './db.js'

export class DatabasePostgres {

    // List documents with optional search
    async list(search) {
        let documents;
        if (search) {
            documents = await sql`SELECT * FROM documento WHERE nome ILIKE ${'%' + search + '%'}`;
        } else {
            documents = await sql`SELECT * FROM documento`;
        }
        return documents;
    }

    // Create a new document
    async create(document) {
        const { nome } = document;
        const result = await sql`INSERT INTO documento (nome) VALUES (${nome}) RETURNING *;`;
        return result[0]; //Return the document
    }

    // Update an existing document
    async update(id, document) {
        const { nome } = document;
        const result = await sql`
            UPDATE documento 
            SET nome = ${nome}
            WHERE id = ${id}
            RETURNING *`;
        return result[0]; // Return the updated document
    }

    // Delete a document
    async delete(id) {
        const result = await sql`
            DELETE FROM documento 
            WHERE id = ${id}
            RETURNING *`;
        return result[0]; // Returns the deleted document
    }

    //Obtains a document
    // async getById(id) {
    //     const result = await sql`
    //         SELECT * FROM documento 
    //         WHERE id = ${id}`;
    //     return result[0]; // Retorna o documento encontrado, ou undefined
    // }
}