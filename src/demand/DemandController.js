export class DemandController {
    constructor(service){
        this.service = service
    }

    async create (request){
        const {file_paths, status, aplicant} = request.body
        const user = request.user
        try{
            const demand = await this.service.create(file_paths, status, aplicant)
            return {code:201, body: demand}
        }catch(error){
            return {code: 400, body: {message: error.message}}
        }
    }

    async list(request){
        const user = request.user
        try {
            const demandsList = await this.service.list(user.id)
            return {code: 200, body: demandsList}
        } catch (error) {
            return {code: 400, body: {message: error.message}}
        }
    }

    async update(request){
        const demand = request.body
        const user = request.user
        try {
            const updatedDemand = await this.service.update(user.id, demand)
            return {code: 200, body: updatedDemand}
        } catch (error) {
            return {code: 400, body: {message: error.message}}
        }
    }

}