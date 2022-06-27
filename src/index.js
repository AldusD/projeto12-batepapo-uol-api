import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';

const client = new MongoClient("mongodb://localhost:27017", { auth: { username: 'root', password: 'undostres' } });
let db;

client.connect().then(() => {
    db = client.db("projeto12")
});

const userSchema = joi.object({
    name: joi.string().required()
});


const app = express();
app.use(cors(), json());

app.post("/participants", async (req, res) => {
    const user = req.body;
    const valid = userSchema.validate(user);
    const users = db.collection("usersT");
    const messages = db.collection("messagesT");

    if(valid) {
        try {
            const inUse = await users.findOne({ name: user.name });
            console.log(valid, inUse)
            if(!inUse) {
                users.insertOne({ name: user.name, lastStatus: Date.now()});
                messages.insertOne({from: user.name, to: 'Todos', text: 'entra na sala...',
                                type: 'status', time: dayjs().format('HH:MM:ss') });
                res.sendStatus(200);
            } else res.sendStatus(409);
        } catch (error) {
            res.sendStatus(422);
            console.log(error)
        }
    }
})

app.listen(5000, () => {
    console.log("Running on port 5000");
});