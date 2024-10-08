export class AuthController {
    constructor(service){
        this.service = service
    }

    async register(request){
        const {cpf, email, password, name, user_type} = request.body
        try{
            const user = await this.service.register(cpf, email, password, name, user_type)
            return {code:201, body: user}
        }catch(error){
            return {code: 400, body: {message: error.message}}
        }
    }

    async login(request){
        const {cpf, password} = request.body
        if(!cpf || !password){
            return { code: 400, body: {message: "email and password are required"}}
        }

        try{
            const body = await this.service.login(cpf, password);
            return{code: 200, body: body}
        }catch(error){
            return {code: 400, body: {message: error.message}}
        }

    }

    async update(request){
        const {cpf, email, password, name, user_type, id} = request.body
        try{
            const body = await this.service.update(cpf, email, password, name, user_type, id);
            return{code: 200, body: body}
        }catch(error){
            return {code: 400, body: {message: error.message}}
        }
    }

}