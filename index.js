import express, { json } from "express";
import cors from "cors";
import { MongoClient, objectId } from "mongodb";
import joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(json(), cors());

app.listen(process.env.PORT, () => console.log(`Running on port ${ process.env.PORT }`));