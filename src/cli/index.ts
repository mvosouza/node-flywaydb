#!/usr/bin/env node

import program from "commander";
const pkg = require('../../package.json');

process.title = 'flyway';

program
    .version(pkg.version)
    .option('-c, --configfile <file>', 'A javascript or json file containing configuration.')
    .on('--help', function() {
        console.log('  See Flyway\'s configuration options at https://flywaydb.org/documentation/commandline/');
    });

program.parse(process.argv);
