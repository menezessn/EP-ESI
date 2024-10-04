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

}