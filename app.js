import "dotenv/config";
import express from "express";
import cors from "cors";
import router from "./src/routes/index.js";
import connectDatabase from "./src/database/database.js";

const app = express();

connectDatabase();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);

export default app;
