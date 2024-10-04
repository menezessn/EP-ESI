import {User} from './User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import 'dotenv/config'

class AuthService {
    constructor(db) {
        this.db = db;
    }

    // Helper function to validate CPF
    isValidCPF(cpf) {
        // Implement CPF validation logic here
        return true; // Replace with actual validation logic
    }

    // Helper function to validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Helper function to validate password
    isValidPassword(password) {
        return password.length >= 6; // Example: at least 6 characters
    }

    // Register a new user
    async register(cpf, email, password, name, userType) {
        // Validate inputs
        if (!name || !cpf || !email || !password || !userType) {
            throw new Error('All fields are required')
        }
        if (!this.isValidCPF(cpf)) {
            throw new Error('Invalid CPF')
        }
        if (!this.isValidEmail(email)) {
            throw new Error('Invalid email format')
        }
        if (!this.isValidPassword(password)) {
            throw new Error('Password must be at least 6 characters long')
        }
        const existingUser = await this.db.getByCPF(cpf)
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Create a new user instance
        const user = new User(cpf, email, password, name, userType);
        user.password = bcrypt.hashSync(user.password, 10)
        const newUser = await this.db.create(user);
        return newUser; // Return the newly created user

    }

    // Login a user
    async login(cpf, password) {
        // Validate inputs
        if (!cpf || !password) {
            throw new Error('Both CPF and password are required');
        }
        if (!this.isValidCPF(cpf)) {
            throw new Error('Invalid CPF');
        }

        const user = await this.db.getByCPF(cpf); 
        if (!user) {
            throw new Error('User not found');
        }
        const isSamePassword = bcrypt.compareSync(password, user.password)
        if (!isSamePassword) { 
            throw new Error("Invalid password");
        }
        
        const token = jwt.sign({id: user.id, cpf: user.cpf}, process.env.JWT_KEY, {expiresIn: "1d"})
        return {token:token}

    }

    async verifyToken(token){
        const decodedToken = jwt.verify(token, process.env.JWT_KEY)
        const user = await this.db.getByCPF(decodedToken.cpf)
        return user;
    }
}

export default AuthService; 
