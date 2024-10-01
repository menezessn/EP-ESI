import {sql} from "./db.js"

sql`
    CREATE TABLE documento (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL
    );
`.then(() => {
    console.log("table created!")
})