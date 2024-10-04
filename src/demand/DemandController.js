export class DemandController {
    constructor(service){
        this.service = service
    }

    async create (request){
        const {file_paths, status} = request.body
        const user = request.user
        try{
            const demand = await this.service.create(file_paths, status, user.id)
            return {code:201, body: demand}
        }catch(error){
            return {code: 400, body: {message: error.message}}
        }
    }
}