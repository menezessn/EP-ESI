export class Demand {
    constructor(file_paths, status, aplicant, id, responsible_opinion){
        this.id = id ?? null
        this.responsible_opinion = responsible_opinion ?? null
        this.file_paths = file_paths
        this.status = status
        this.aplicant = aplicant
    }
}
