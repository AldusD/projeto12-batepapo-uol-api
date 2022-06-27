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

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
})


const app = express();
app.use(cors(), json());

app.post("/participants", async (req, res) => {
    const user = req.body;
    const valid = await userSchema.validate(user);
    const users = db.collection("usersT");
    const messages = db.collection("messagesT");

    if(valid.error) {
        console.log("errou")
        res.sendStatus(422);
    }
        const inUse = await users.findOne({ name: user.name });
        console.log("valid", valid)
            if(!inUse) {
                users.insertOne({ name: user.name, lastStatus: Date.now()});
                messages.insertOne({from: user.name, to: 'Todos', text: 'entra na sala...',
                                type: 'status', time: dayjs().format('HH:MM:ss') });
                res.sendStatus(200);
            } else res.sendStatus(409);
})

app.get("/participants", async (_, res) => {
    const users = await db.collection("usersT").find().toArray();
    if(users.length === 0) res.send(200);
    const usersNames = users.map(u => { name: u.name });
    res.status(200).send(usersNames);
})

app.post("/messages", async (req, res) => {
    const user = req.headers.user;
    const message = req.body;
    const valid = await messageSchema.validate(message);
    const messages = await db.collection("messagesT");
    const validUser = await db.collection("usersT").findOne({ name: user });
    console.log("log: ", validUser, req.headers)
    if(!validUser) res.sendStatus(422); 

    if(!valid.error) {
        messages.insertOne({
            from: user, to: message.to, text: message.text,
            type: messages.type, time: dayjs().format('HH:MM:ss') });
        res.sendStatus(201);
    } else res.sendStatus(422);
})

app.get("/messages", async (req, res) => {
    let maxMessages = req.query.limit;
    const user = req.headers.user;
    const messages = await db.collection("messagesT").find().toArray();
    
    const filteredMessages = messages.filter(m => (m.to === user || m.to === "Todos" || m.from === user));
    maxMessages = (maxMessages) ? maxMessages : filteredMessages.length;
    res.send(filteredMessages.slice(-maxMessages));
})

app.post("/status", async (req, res) => {
    const user = req.headers.user;
    const validUser = await db.collection("usersT").findOne({ name: user });

    if(!validUser) res.sendStatus(404);
    db.collection("usersT").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
})

// Removing inactive users

const removeUsers = async () => {
    console.log("time")
    const users = await db.collection("usersT").find().toArray();
    users.forEach( async (u) => {
        if(Date.now() - u.lastStatus > 10) {
            await db.collection("usersT").deleteOne({ name: u.name });
            await messages.insertOne({from: user.name, to: 'Todos', text: 'sai da sala...',
                                type: 'status', time: dayjs().format('HH:MM:ss') });
            console.log("removed: ", u.name)
        }
    });
}

setInterval(removeUsers, 15000);

app.listen(5000, () => {
    console.log("Running on port 5000");
});