import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

// Config
dotenv.config();
const { PORT, MONGOURI, MONGOPASSWORD, MONGOUSERNAME } = process.env;

const app = express();
app.use(json(), cors());

const client = new MongoClient(MONGOURI, { auth: { username: MONGOUSERNAME, password: MONGOPASSWORD } });
let db;
client.connect().then(() => db = client.db("Project12"));

// Joi's Schemas
const userSchema = joi.object({
    name: joi.string().required()
})

//Paths
app.get("/test", async (req, res) => {
    try {
        const insert = await db.collection("test").insertOne({dios: "mio"});
        console.log(insert);
        res.sendStatus(200)
    } catch (error) {
        console.log(error.message);
        res.send("Internal issue, please try again later").status(500);
    }   
})

app.post("/participants", async (req, res) => {
    const username = req.body;

    const validateUser = userSchema.validate(username);
    
    if( validateUser.error ) return res.status(422).send("Invalid username.");
    try {
        const conflict = await db.collection("users").findOne({ name: username.name });
        console.log(conflict)
        if(conflict) return res.status(409).send("Username already taken");

        const promise = await db.collection("users").insertOne({ name: username.name });
        console.log(promise);
        return res.status(201).send("User registered successfully");
    
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Internal issue, please try again later");
    }
})


app.listen(PORT, () => console.log(`Running on port ${ PORT }`));