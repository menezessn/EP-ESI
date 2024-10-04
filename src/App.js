import {fastify} from "fastify"
import cors from '@fastify/cors';
import { AuthController } from "./auth/AuthController.js"
import { UserDatabase } from "./auth/UserDatabase.js"
import AuthService from "./auth/AuthService.js"
import { DemandDatabase } from "./demand/DemandDatabase.js"
import { DemandController } from "./demand/DemandController.js"
import { DemandService } from "./demand/DemandService.js"

const userDatabase = new UserDatabase()
const authService = new  AuthService(userDatabase)
const authController = new AuthController(authService)

const demandDatabase = new DemandDatabase()
const demandService = new DemandService(demandDatabase)
const demandController = new DemandController(demandService)

const authenticatedRouteOptions = {
    preHandler: async(request, reply, done) => {
        const token = request.headers.authorization?.replace(/^Bearer /, "")
        if(!token) reply.code(401).send({message: "Unauthorized: token missing"})
        
        const user = await authService.verifyToken(token);
        if(!user) reply.code(404).send({message: "Unathorized: invalid token"})
        request.user = user; //use this to verify in the function called in the controller
    }
}

//configure cors
const app = fastify()
app.register(cors, {
    origin: 'http://localhost:5173', // Permitir apenas esse domínio
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
});

// ----- Authentication -------------

app.post("/auth/register", async(request, reply) => {
    const {code, body} = await authController.register(request)
    reply.code(code).send(body)
})

app.post("/auth/login", async(request, reply) => {
    const {code, body} = await authController.login(request)
    // front end needs to save the token 
    reply.code(code).send(body)
})

// --------- Demands -------------------
app.post("/create/demand", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.create(request)
    reply.code(code).send(body)
})

app.get("/demands", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.list(request)
    reply.code(code).send(body)
})

app.put("/update/demand", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.update(request)
    reply.code(code).send(body)
})

app.listen({
    port: 3333
})