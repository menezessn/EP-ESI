import {fastify} from "fastify"
import { AuthController } from "./auth/AuthController.js"
import { UserDatabase } from "./auth/UserDatabase.js"
import AuthService from "./auth/AuthService.js"

const userDatabase = new UserDatabase()
const authService = new  AuthService(userDatabase)
const authController = new AuthController(authService)

const app = fastify()

app.post("/auth/register", async(request, reply) => {
    const {code, body} = await authController.register(request)
    reply.code(code).send(body)
})

app.post("/auth/login", async(request, reply) => {
    const {code, body} = await authController.login(request)
    reply.code(code).send(body)
})

app.listen({
    port: 3333
})