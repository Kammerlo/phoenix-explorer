import { Router } from 'express';
import {API} from "../config/blockfrost";
import { IDataEpoch } from "@shared/dtos/epoch.dto";
export const epochRoutes = Router();

epochRoutes.get('/', (req, res) => {
  console.log("Fetching all epochs");
  API.epochs(10).then(value => {
    res.json(value);
  })
});
