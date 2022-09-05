import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
// 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A
// Config
dotenv.config();
const { PORT, MONGOURI, MONGOPASSWORD, MONGOUSERNAME } = process.env;

const app = express();
app.use(json(), cors());

const client = new MongoClient(MONGOURI, { auth: { username: MONGOUSERNAME, password: MONGOPASSWORD } });
let db;
client.connect().then(() => db = client.db("Project12"));

// AMN
const DEFAULTLIMIT = 100;
const UPDATETIME = 15000;
const INACTIVITYTIME = 10000;

// Joi's Schemas
const userSchema = joi.object({
    name: joi.string().required()
})

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
})

// Automatic removing users
const removeInactives = async () => {
    try {
        const users = await db.collection("users").find().toArray();
        const toDeleteUsers = users.filter(u => { return ((Date.now() - u.lastStatus) > INACTIVITYTIME)});
        
        for(let i = 0; i < toDeleteUsers.length; i++) {
            const user = toDeleteUsers[i];
            const deleted = await db.collection("users").deleteOne({ _id: ObjectId(user._id) });
            const leftMessage = await db.collection("messages").insertOne({ from: user.name, to: "all", type: "status", text: "Left the room", time: dayjs().format('HH:MM:ss') });
            console.log("status", deleted, leftMessage);
        }
    } catch (error) {
        console.log("error", error.message);
        return 500;
    }
}
setInterval(removeInactives, UPDATETIME);

//Paths

app.post("/participants", async (req, res) => {
    const username = req.body;

    const validateUser = userSchema.validate(username);
    if( validateUser.error ) return res.status(422).send("Invalid username.");
    
    try {
        const conflict = await db.collection("users").findOne({ name: username.name });
        if(conflict) return res.status(409).send("Username already taken");

        const newUser = await db.collection("users").insertOne({ name: username.name, lastStatus: Date.now() });
        console.log(newUser);
        const enterMessage = await db.collection("messages").insertOne({ from: username.name, to: "all", type: "status", text: "Enter the room", time: dayjs().format('HH:MM:ss') }) 
        return res.status(201).send("User registered successfully");
    
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Internal issue, please try again later");
    }
})

app.get("/participants", async (_, res) => {
    try {
        const users = await db.collection("users").find().toArray();
        res.status(200).send(users);
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal issue, please try again later");
    }
})

app.post("/messages", async (req, res) => {
    const from = req.headers.user;
    const { to, text, type } = req.body;

    const validateMessage = messageSchema.validate({ to, text, type });
    if( validateMessage.error ) return res.status(422).send("Invalid Message");
    
    try {
        console.log(from)
        const realUser = await db.collection('users').findOne({ name: from }); 
        if( !realUser ) return res.status(422).send("Log in first");

        const message = await db.collection("messages").insertOne({ to, text, type, from, time: dayjs().format('HH:MM:ss') });
        console.log(message);
        res.sendStatus(201);
    
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Internal issue, please try again later.");
    }
})

app.get("/messages", async (req, res) => {
    
    const { user } = req.headers;

    try {
        const messages = await db.collection("messages").find().toArray();
        const filteredMessages = messages.filter(m => (m.from === user || m.to === user || m.type === "message" || m.type === "status"));
        const length = filteredMessages.length;

        const limit = (req.query.limit) ? 
        (length < req.query.limit)? length : req.query.limit // querylimit can not be larger than the amount of messages 
        : 
         (length < DEFAULTLIMIT) ? length : DEFAULTLIMIT; // limit will be the messages amount if there is less than 100 messages and there is no querylimit
        console.log(limit);
        
        const toSendMessages = new Array;
        for(let i = 0; i < limit; i++) {
            toSendMessages.push(filteredMessages[length - 1 - i]);
        }
        return res.status(200).send(toSendMessages.reverse());
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal issue, please try again later");
    }
})

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    
    try {
        const realUser = await db.collection("users").findOne({ name: user });
        if( !realUser ) return res.sendStatus(404);
        
        const update = await db.collection("users").updateOne({ _id: ObjectId(realUser._id) }, { $set: { lastStatus: Date.now() } })
        console.log(update);
        return res.sendStatus(200);

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal issue, please try again later");
    }
})

app.listen(PORT, () => console.log(`Running on port ${ PORT }`));