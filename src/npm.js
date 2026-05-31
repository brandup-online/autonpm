#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const path = require('path');
const { listPackages } = require('./utils');

const commands = {
    install: (args) => `npm install ${args}`,
    update: (args) => `npm update ${args}`,
    build: (args) => `npm run build ${args}`,
    watch: (args) => `npm run watch ${args}`,
    version: (args) => `npm version ${args}`,
    pack: (args) => `npm pack ${args}`,
    audit: (args) => `npm audit ${args}`
}

const relativePackagesPath = process.env.NPM_PATH || 'npm';

if (!process.argv[2])
    throw new Error(`Not set command name. Available commands: ${Object.keys(commands)}`);

const commandName = process.argv[2].toLowerCase();
const command = commands[commandName];
if (!command)
    throw new Error(`Command ${commandName} is not found. Available commands: ${Object.keys(commands)}`);

const isWatch = commandName === "watch";
const isInstall = commandName === "install";

const rawArgs = process.argv.slice(3);
const noFix = isInstall && rawArgs.includes('--nofix');
const commandArgs = (isInstall ? rawArgs.filter(a => a !== '--nofix') : rawArgs).join(' ');
const commandStr = command(commandArgs).trim();

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

function runAudit(pkg) {
    try {
        const output = childProcess.execSync('npm audit --json', {
            cwd: path.resolve(pkg.dir),
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return JSON.parse(output);
    } catch (e) {
        if (e.stdout) {
            try { return JSON.parse(e.stdout); } catch {}
        }
        return null;
    }
}

function getFixLevel(audit) {
    let fixable = false;
    let forceNeeded = false;
    Object.values(audit?.vulnerabilities || {}).forEach(v => {
        if (v.fixAvailable === true) {
            fixable = true;
        } else if (v.fixAvailable && typeof v.fixAvailable === 'object') {
            if (v.fixAvailable.isSemVerMajor) forceNeeded = true;
            else fixable = true;
        }
    });
    if (forceNeeded) return 'force';
    if (fixable) return 'fix';
    return null;
}

function showAuditSummary(auditResults) {
    console.info('');
    console.info('-------audit summary-------');
    console.info('');

    let anyFixable = false;
    let anyForceRequired = false;
    let hasVulns = false;

    auditResults.forEach(({ name, audit }) => {
        if (!audit) {
            console.info(`  ${name}: audit unavailable`);
            return;
        }

        const vulns = audit.metadata?.vulnerabilities;
        if (!vulns || vulns.total === 0) {
            console.info(`  ${name}: no vulnerabilities`);
            return;
        }

        hasVulns = true;

        const severities = ['critical', 'high', 'moderate', 'low', 'info']
            .filter(s => vulns[s] > 0)
            .map(s => `${vulns[s]} ${s}`);

        const level = getFixLevel(audit);
        if (level === 'force') anyForceRequired = true;
        else if (level === 'fix') anyFixable = true;

        const fixNote = level === 'force' ? ' [requires --force]' : level === 'fix' ? ' [fixable]' : ' [no fix available]';
        console.info(`  ${name}: ${severities.join(', ')}${fixNote}`);
    });

    console.info('');

    return { hasVulns, anyFixable, anyForceRequired };
}

function runAutoFix(auditResults) {
    const { hasVulns, anyFixable, anyForceRequired } = showAuditSummary(auditResults);

    if (!hasVulns) {
        console.info('No vulnerabilities found.');
        console.info('');
        return;
    }

    if (noFix) {
        if (anyForceRequired)
            console.info('Recommendation: run `autonpm audit fix --force`');
        else if (anyFixable)
            console.info('Recommendation: run `autonpm audit fix`');
        else
            console.info('No automatic fixes available. Review vulnerabilities manually.');
        console.info('');
        return;
    }

    const toFix = auditResults.filter(({ audit }) => getFixLevel(audit) !== null);

    if (toFix.length === 0) return;

    console.info('-------auto audit fix-------');
    console.info('');

    try {
        toFix.forEach(({ name, dir, audit }) => {
            const fixCmd = getFixLevel(audit) === 'force' ? 'npm audit fix --force' : 'npm audit fix';
            console.info(`  ${name}: ${fixCmd}`);
            console.info('');
            childProcess.execSync(fixCmd, {
                cwd: path.resolve(dir),
                stdio: 'inherit'
            });
        });
    } catch {
        console.error('');
        console.error('-------error audit fix-------');
        process.exit(1);
    }

    console.info('');
}

// Build commands run in dependency order, so execute sequentially and fail fast.
function runSequential(packages) {
    const auditResults = [];

    try {
        packages.forEach(pkg => {
            logHeader(pkg);
            childProcess.execSync(commandStr, {
                cwd: path.resolve(pkg.dir),
                stdio: 'inherit'
            });

            if (isInstall) {
                const audit = runAudit(pkg);
                auditResults.push({ name: pkg.dirName, dir: pkg.dir, audit });
            }
        });

        if (isInstall && auditResults.length > 0)
            runAutoFix(auditResults);

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
