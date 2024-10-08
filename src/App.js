import {fastify} from "fastify"
import cors from '@fastify/cors';
import { AuthController } from "./auth/AuthController.js"
import { UserDatabase } from "./auth/UserDatabase.js"
import AuthService from "./auth/AuthService.js"
import { DemandDatabase } from "./demand/DemandDatabase.js"
import { DemandController } from "./demand/DemandController.js"
import { DemandService } from "./demand/DemandService.js"
import multipart from '@fastify/multipart'
import archiver from 'archiver';
import fs from 'fs'
import util from 'util'
import { pipeline } from 'stream'
import path from "path";
import admZip from "adm-zip";
import nodemailer from 'nodemailer'
import 'dotenv/config'
import { sql } from "./db.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',  // Aqui você usa 'gmail' como service
    auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD_EMAIL,
    },
});

const pump = util.promisify(pipeline)

const userDatabase = new UserDatabase()
const authService = new  AuthService(userDatabase)
const authController = new AuthController(authService)

const demandDatabase = new DemandDatabase()
const demandService = new DemandService(demandDatabase)
const demandController = new DemandController(demandService)

const authenticatedRouteOptions = {
    preHandler: async(request, reply, done) => {
        const token = request.headers.authorization?.replace(/^Bearer /, "")
        if(!token) reply.code(401).send({message: "Unauthorized: token missing"})
        
        const user = await authService.verifyToken(token);
        if(!user) reply.code(404).send({message: "Unathorized: invalid token"})
        request.user = user; //use this to verify in the function called in the controller
    }
}

//configure cors
const app = fastify({
    bodyLimit: 10485760 // Define o limite do corpo da requisição para 10MB (10 * 1024 * 1024 bytes)
})
app.register(cors, {
    origin: 'http://localhost:5173', // Permitir apenas esse domínio
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
});
app.register(multipart, {
    limits:{
        fileSize: 104857600
    }
})

// ----- Authentication -------------

app.post("/auth/register", async(request, reply) => {
    const {code, body} = await authController.register(request)
    reply.code(code).send(body)
})

app.post("/auth/login", async(request, reply) => {
    const {code, body} = await authController.login(request)
    // front end needs to save the token 
    reply.code(code).send(body)
})

app.put("/auth/update", authenticatedRouteOptions, async(request, reply) => {
    const {code, body} = await authController.update(request)
    reply.code(code).send(body)
})

// --------- Demands -------------------
app.post("/create/demand", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.create(request)
    const user = request.user
    try {
        // Consulta para buscar todas as secretárias
        const result = await sql`
        SELECT email FROM users 
        WHERE user_type = 'secretaria'`;
    
        // Iterar sobre cada secretária e enviar o email
        result.forEach((secretaria) => {
        const mailOptions = {
            from: process.env.EMAIL,
            to: secretaria.email,  // Envia o email para o email da secretária
            subject: 'Nova demanda',
            text: `O usuário ${user.email} criou uma nova demanda.`,
        };
    
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
            console.log(`Erro ao enviar email para ${secretaria.email}:`, error);
            } else {
            console.log(`Email enviado para ${secretaria.email}: ` + info.response);
            }
        });
        });
    
        reply.code(code).send(body);
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        reply.code(500).send({ error: 'Erro ao enviar email' });
    }
})

app.get("/demands", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.list(request)
    reply.code(code).send(body)
})

app.put("/update/demand", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.update(request)
    const demand = request.body;
    const user = request.user;
    const { id, status, responsible_opinion, reviewer, aplicant } = demand;

    try {
        // Consulta para buscar todas as secretárias
        const secretarias = await sql`
        SELECT email FROM users 
        WHERE user_type = 'secretaria' OR user_type = 'coordenador'`;

        // Função para enviar email
        const sendEmail = (recipient, subject, text) => {
        const mailOptions = {
            from: process.env.EMAIL,
            to: recipient,
            subject: subject,
            text: text,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
            console.log(`Erro ao enviar email para ${recipient}:`, error);
            } else {
            console.log(`Email enviado para ${recipient}: ` + info.response);
            }
        });
        };

        // 1. Enviar email para o responsável pelo parecer, se não estiver vazio
        if(user.user_type === "coordenador"){
            if (responsible_opinion) {
                sendEmail(responsible_opinion, `Mudança na demanda ${id}`, 
                    `A demanda ${id} teve seu status alterado para: ${status}. 
                    Verifique as mudanças.`);
                }
        }


        // 2. Enviar email para o revisor, se não estiver vazio
        if (reviewer) {
            sendEmail(reviewer, `Mudança na demanda ${id}`, 
                `A demanda ${id} teve uma nova atualização.
                Status: ${status}. Por favor, revise as mudanças.`);
        }

        // 3. Enviar email para o aplicante, se não estiver vazio
        if (aplicant) {
            sendEmail(aplicant, `Mudança na sua demanda ${id}`, 
                `Sua demanda ${id} teve o status atualizado para: ${status}. 
                Verifique as mudanças no sistema.`);
        }

        // 4. Enviar email para todas as secretárias
        secretarias.forEach((secretaria) => {
        sendEmail(secretaria.email, `Mudança na demanda ${id}`, 
            `A demanda ${id} teve o status alterado para: ${status}.
            Atualizado pelo usuário ${user.name}.`);
        });

        // Enviar resposta de sucesso
        reply.code(code).send(body);
    } catch (error) {
        console.error('Erro ao enviar emails:', error);
        reply.code(500).send({ error: 'Erro ao enviar emails' });
    }
})

// ---------- files ------
app.post("/upload", authenticatedRouteOptions, async (request, reply) => {
    try {
        // Obtém todos os arquivos e campos do multipart
        const parts = await request.parts();

        let file_paths;
        const files = [];

        let x = 0
        // Itera sobre as partes da requisição multipart (arquivos e campos)
        for await (const part of parts) {
            if (part.file) {
                if (file_paths) {
                    const directoryPath =  `./demands/${file_paths}`;
                    // Crie o diretório se ele não existir
                    if (!fs.existsSync(directoryPath)) {
                        fs.mkdirSync(directoryPath, { recursive: true });
                    }
                    const fileStream = fs.createWriteStream(`./demands/${file_paths}/${part.filename}`);
                    console.log(`Salvando arquivo: ${part.filename}`);
                    await pump(part.file, fileStream);  // Salvando o arquivo em partes
                    console.log('Arquivos salvos com sucesso em:', directoryPath);
                } 
            } else {
                if (part.fieldname === 'file_paths') {
                    file_paths = part.value;
                }
            }
        }
        reply.code(200).send({ message: 'Upload realizado com sucesso!' });
    } catch (error) {
        console.error('Erro durante o upload:', error);
        reply.code(500).send({ error: 'Erro ao processar o upload' });
    }
});

app.get('/download', authenticatedRouteOptions, async (request, reply) => {
    try {
        const file_paths = request.query.file_paths;

        if (!file_paths) {
            return reply.code(400).send({ error: 'O parâmetro file_paths é obrigatório' });
        }

        const directoryPath = `demands/${file_paths}`;

        // Verifica se a pasta existe
        const fsPromises = fs.promises;
        try {
            await fsPromises.access(directoryPath);
        } catch (err) {
            return reply.code(404).send({ error: 'Pasta não encontrada' });
        }

        const zip = new admZip()
        // Cria o arquivo zip dinamicamente
        const zipFileName = `${file_paths}.zip`;
        const zipFilePath = path.join("tmp", zipFileName);

        zip.addLocalFolder(directoryPath)
        //fs.writeFileSync(zipFilePath, zip.toBuffer())

        // Enviar o arquivo ZIP para o cliente
        reply.header('Content-Disposition', `attachment; filename="${zipFileName}"`);
        const zipBuffer = zip.toBuffer()

        reply.send(zipBuffer).type('application/zip').code(200);
        

    } catch (error) {
        console.error('Erro durante o download:', error);
        reply.code(500).send({ error: 'Erro ao processar o download' });
    }
});

app.post('/update/files', authenticatedRouteOptions, async (request, reply) => {
    try {
        // Obtém as partes da requisição (arquivos e campos multipart)
        const parts = request.parts();
        let file_paths;
        const files = [];

        // Itera sobre as partes da requisição multipart
        for await (const part of parts) {
            if (part.file) {
                // Se for um arquivo, adiciona à lista de arquivos
                files.push(part);
            } else if (part.fieldname === 'file_paths') {
                // Captura o valor do campo file_paths
                file_paths = part.value;
            }
        }

        if (!file_paths) {
            return reply.code(400).send({ error: 'O campo file_paths é obrigatório' });
        }

        const directoryPath = `./demands/${file_paths}`;

        // Verifica se a pasta existe
        if (!fs.existsSync(directoryPath)) {
            return reply.code(404).send({ error: 'Pasta não encontrada' });
        }

        // Apaga todos os arquivos existentes na pasta
        fs.readdirSync(directoryPath).forEach(file => {
            const filePath = path.join(directoryPath, file);
            fs.unlinkSync(filePath); // Apaga o arquivo
        });

        // Agora, vamos salvar os novos arquivos na pasta
        for (const file of files) {
            const filePath = `${directoryPath}/${file.filename}`;
            await pump(file.file, fs.createWriteStream(filePath));
        }

        console.log('Arquivos atualizados com sucesso em:', directoryPath);
        reply.code(200).send({ message: 'Arquivos atualizados com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar os arquivos:', error);
        reply.code(500).send({ error: 'Erro ao atualizar os arquivos' });
    }
});



app.listen({
    port: 3333
})