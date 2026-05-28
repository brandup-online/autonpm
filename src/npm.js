#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const path = require('path');
const { listPackages } = require('./utils');

const getArgsList = (startIndex = 3) => process.argv.slice(startIndex).join(' ');

const commands = {
    install: (args) => `npm install ${args}`,
    update: (args) => `npm update ${args}`,
    build: (args) => `npm run build ${args}`,
    watch: (args) => `npm run watch ${args}`,
    version: (args) => `npm version ${args}`,
    pack: (args) => `npm pack ${args}`
}

const relativePackagesPath = process.env.NPM_PATH || 'npm';

if (!process.argv[2])
    throw new Error(`Not set command name. Available commands: ${Object.keys(commands)}`);

const commandName = process.argv[2].toLowerCase();
const command = commands[commandName];
if (!command)
    throw new Error(`Command ${commandName} is not found. Available commands: ${Object.keys(commands)}`);

const commandArgs = getArgsList();
const commandStr = command(commandArgs).trim();
const isWatch = commandName === "watch";

console.info(`-------begin ${commandName}-------`);
console.info('');

console.info(`command name: ${commandName}`);
console.info(`command argumments: ${commandArgs}`);

const packagesPath = path.join(process.cwd(), relativePackagesPath);
console.info(`packages path: ${packagesPath}`);

const packages = listPackages(packagesPath);

if (isWatch)
    runWatch(packages);
else
    runSequential(packages);

function logHeader(pkg) {
    console.info('');
    console.info(`-------${pkg.dirName}-------`);
    console.info('');
    console.info(`${pkg.dir} ${commandStr}`);
    console.info('');
}

// Build commands run in dependency order, so execute sequentially and fail fast.
function runSequential(packages) {
    try {
        packages.forEach(pkg => {
            logHeader(pkg);
            childProcess.execSync(commandStr, {
                cwd: path.resolve(pkg.dir),
                stdio: 'inherit'
            });
        });

        console.info('');
        console.info(`-------end ${commandName}-------`);
        process.exit(0);
    }
    catch (reason) {
        console.error('');
        console.error(`-------error ${commandName}-------`);
        process.exit(1);
    }
}

// Watch tasks are long-running, so run them concurrently.
function runWatch(packages) {
    const children = [];

    const tasks = packages.map(pkg => {
        logHeader(pkg);

        const subprocess = childProcess.exec(commandStr, {
            cwd: path.resolve(pkg.dir),
            encoding: 'utf8'
        });
        children.push(subprocess);

        subprocess.stdout.on('data', (data) => {
            console.log(`stdout ${pkg.dirName} ${commandName}: ${data}`);
        });

        subprocess.stderr.on('data', (data) => {
            console.error(`stderr ${pkg.dirName} ${commandName}: ${data}`);
        });

        return new Promise((resolve, reject) => {
            subprocess.on('close', (code) => {
                console.log(`${pkg.dirName} ${commandName} exited with code ${code}`);
                if (code === 0)
                    resolve(null);
                else
                    reject(new Error(`${pkg.dirName} ${commandName} exited with code ${code}`));
            });
            subprocess.on('error', reject);
        });
    });

    process.on('SIGINT', () => {
        children.forEach(child => child.kill('SIGINT'));
    });

    Promise.all(tasks)
        .then(() => {
            console.info('');
            console.info(`-------end ${commandName}-------`);
            process.exit(0);
        })
        .catch(reason => {
            console.error('');
            console.error(`-------error ${commandName}-------`);
            process.exit(1);
        });
}
