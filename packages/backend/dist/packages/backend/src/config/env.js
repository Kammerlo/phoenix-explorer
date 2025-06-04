"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    API_KEY: process.env.API_KEY,
    PORT: parseInt(process.env.PORT ?? "4000", 10),
    NETWORK: (process.env.NETWORK ?? "mainnet"),
};
