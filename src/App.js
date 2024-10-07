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
const app = fastify()
app.register(cors, {
    origin: 'http://localhost:5173', // Permitir apenas esse domínio
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
});
app.register(multipart)

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

// --------- Demands -------------------
app.post("/create/demand", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.create(request)
    reply.code(code).send(body)
})

app.get("/demands", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.list(request)
    reply.code(code).send(body)
})

app.put("/update/demand", authenticatedRouteOptions,async(request, reply) => {
    const {code, body} = await demandController.update(request)
    reply.code(code).send(body)
})

// ---------- files ------
app.post("/upload", authenticatedRouteOptions, async (request, reply) => {
    try {
        
        // Obtém todos os arquivos e campos do multipart
        const parts = await request.parts();

        let file_paths;
        const files = [];


        // Itera sobre as partes da requisição multipart (arquivos e campos)
        for await (const part of parts) {
            let x = 0
            console.log(part.fieldname)
            if (part.file) {
                // Se for um arquivo, adicione à lista de arquivos para upload posterior
                files.push(part);
                console.log(files[0].filename)
            } else if (part.fieldname === 'file_paths') {
                // Se for o campo file_paths, capture o valor
                file_paths = part.value;
                console.log("after text")
            }
            console.log(x)
            x++
        }
        console.log("await after")

        // Agora que temos o file_paths, criamos a pasta para armazenar os arquivos
        if (file_paths) {
            const directoryPath =  `./demands/${file_paths}`;
            console.log("Entrei")

            // Crie o diretório se ele não existir
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true });
            }

            // Agora podemos salvar os arquivos na pasta criada
            for (const file of files) {
                console.log("Entrei")
                console.log(file.filename)
                await pump(file.file, fs.createWriteStream(`${directoryPath}/${file.filename}`));
            }

            console.log('Arquivos salvos com sucesso em:', directoryPath);
        }

        reply.code(200).send({ message: 'Upload realizado com sucesso!' });
    } catch (error) {
        console.error('Erro durante o upload:', error);
        reply.code(500).send({ error: 'Erro ao processar o upload' });
    }
});

app.get('/download', authenticatedRouteOptions, async (request, reply) => {
    try {
        console.log("entrei");
        const file_paths = request.query.file_paths;
        console.log(file_paths);

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