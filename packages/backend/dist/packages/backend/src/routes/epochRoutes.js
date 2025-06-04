"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.epochRoutes = void 0;
const express_1 = require("express");
const blockfrost_1 = require("../config/blockfrost");
exports.epochRoutes = (0, express_1.Router)();
exports.epochRoutes.get('/', (req, res) => {
    console.log("Fetching all epochs");
    let a = {};
    blockfrost_1.API.epochs(10).then(value => {
        res.json(value);
    });
});
