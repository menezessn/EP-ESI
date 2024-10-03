import {fastify} from "fastify"
import { DatabasePostgres } from "../database-postgres.js"

const database = new DatabasePostgres

const server = fastify()

server.post('/documents', async (request, response) => {
    const {nome} = request.body

    await database.create({
        nome
    })

    return response.status(201).send()
})

server.get('/documents', async (request, response) => {
    const search = request.query.search

    const documents = await database.list(search)
    return documents
})

server.put('/documents/:id', async (request, response) => {
    const documentId = request.params.id
    const {nome} = request.body

    await database.update(
        documentId, 
        {nome}
    )

    return response.status(204).send()
})

server.delete('/documents/:id', async (request, response) => {
    const documentId = request.params.id

    await database.delete(
        documentId
    )

    return response.status(204).send()
})





server.listen({
    port: 3333
})