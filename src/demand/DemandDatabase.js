import { sql } from "../db.js";

export class DemandDatabase {
    // Create a new user
    async create(demand) {
        const result = await sql`INSERT INTO Demand (file_paths, status, aplicant) VALUES (${demand.file_paths}, ${demand.status}, ${demand.aplicant}) RETURNING *;`;
        return result[0]; //Return the demand
    }

    // List Demands for the user type
    async list(user_email) {
        let demands;
        const result = await sql`
            SELECT user_type FROM users 
            WHERE email = ${user_email};`;
        const user_type = result[0].user_type;

        if (user_type === "secretaria" || user_type === "coordenador" || user_type === "membro_comissao" ) {
            demands = await sql`SELECT * FROM Demand`;
        } else if (user_type === "aluno") {
            demands = await sql`
            SELECT * FROM Demand
            WHERE aplicant = ${user_email}`;
        } else if (user_type === "funcionario") {
            demands = await sql`
                SELECT * FROM Demand
                WHERE aplicant = ${user_email} 
                OR responsible_opinion = ${user_email}
                OR reviewer = ${user_email}`
                ;
        } else {
            throw new Error("unknown user type");
        }

        return demands;
    }

    async update(user_id, demand) {
        // Verifica o tipo de usuário
        const result = await sql`
            SELECT user_type FROM users 
            WHERE id = ${user_id};`;
        const user_type = result[0].user_type;
    
        // Verifica se o usuário tem permissão para atualizar
        if (user_type !== "secretaria" && user_type !== "funcionario" && user_type !== "coordenador" && user_type !== "membro_comissao") {
            throw new Error("Unauthorized: user does not have permission to update demands");
        }
    
        // Monta a query para atualização com base no tipo de usuário
        const id = demand.id
        const status = demand.status
        const responsible_opinion = demand.responsible_opinion
        const reviewer = demand.reviewer
        let updatedDemand

        if (!status && !responsible_opinion) {
            throw new Error("No valid fields to update");
        }
    
        // Atualiza os campos permitidos com base no tipo de usuário
        if (user_type === "funcionario")
            updatedDemand = await sql`UPDATE Demand SET status = ${status} WHERE id = ${id} RETURNING *;`
        // Atualiza os campos permitidos com base no tipo de usuário
        if (user_type === "secretaria" || user_type === "membro_comissao")
            updatedDemand = await sql`UPDATE Demand SET status = ${status}, reviewer = ${reviewer} WHERE id = ${id} RETURNING *;`
    
        if (user_type === "coordenador") updatedDemand = await sql`UPDATE Demand SET status = ${status}, responsible_opinion = ${responsible_opinion}, reviewer = ${reviewer} WHERE id = ${id} RETURNING *;`
    
        // Se não houver campos para atualizar, lança um erro
        
        
        // Executa a atualização da demanda
        
        return updatedDemand[0]; // Retorna a demanda atualizada
    }

}