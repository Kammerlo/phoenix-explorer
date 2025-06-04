import express from "express";
import cors from "cors";
import {epochRoutes} from "./routes/epochRoutes";

const app = express();

app.use(cors()); // Adjust for your frontend origin if needed
app.use(express.json());

app.use("/api/epochs", epochRoutes);

export default app;
