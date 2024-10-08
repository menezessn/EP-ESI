import 'dotenv/config'
import { Demand } from './Demand.js';

export class DemandService {
    constructor(db) {
        this.db = db;
    }

    async create(file_paths, status, aplicant){
        //create a new demand instance
        const demand = new Demand(file_paths, status, aplicant)
        const newDemand = await this.db.create(demand)
        return newDemand
    }

    async list(user_email){
        const demandsList = await this.db.list(user_email)
        return demandsList
    }

    async update(user_id, demand){
        const demandUpdated = await this.db.update(user_id, demand)
        return demandUpdated
    }


}