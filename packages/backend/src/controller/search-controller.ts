import {Router} from "express";
import {tokenController} from "./token-controller";
import {API} from "../config/blockfrost";
import {SearchType} from "@shared/dtos/seach.dto";
import app from "../app";


export const searchController = Router();

searchController.get(':searchPhrase', async (req, res) => {
  const searchPhrase = req.params.searchPhrase;

  const searchResults : SearchType[] = [];
  const block = await API.blocks(searchPhrase);
  if(block) {
    searchResults.push(SearchType.BLOCK);
  }
  if(isNaN(Number.parseInt(searchPhrase))) {
    const asset = await API.assetsById(searchPhrase);
    if(asset) {
      searchResults.push(SearchType.ASSET);
    }
    const tx = await API.txs(searchPhrase);
    if(tx) {
      searchResults.push(SearchType.TRANSACTION);
    }
  } else {
    const epoch = await API.epochs(Number.parseInt(searchPhrase));
    if(epoch) {
      searchResults.push(SearchType.EPOCH);
    }
  }
});
