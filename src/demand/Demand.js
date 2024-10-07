export class Demand {
    constructor(file_paths, status, aplicant, id, responsible_opinion, reviewer){
        this.id = id ?? null
        this.responsible_opinion = responsible_opinion ?? null
        this.reviewer = reviewer ?? null
        this.file_paths = file_paths
        this.status = status
        this.aplicant = aplicant
    }
}
