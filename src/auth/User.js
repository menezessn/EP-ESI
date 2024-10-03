export class User {
    constructor(cpf, email, password, name, user_type, id){
        this.id = id ?? null
        this.name = name
        this.cpf = cpf
        this.email = email
        this.password = password
        this.user_type = user_type
    }
}
