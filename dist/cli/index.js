#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const pkg = require('../../package.json');
process.title = 'flyway';
commander_1.default
    .version(pkg.version)
    .option('-c, --configfile <file>', 'A javascript or json file containing configuration.')
    .on('--help', function () {
    console.log('  See Flyway\'s configuration options at https://flywaydb.org/documentation/commandline/');
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=index.js.map