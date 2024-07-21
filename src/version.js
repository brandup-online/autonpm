#!/usr/bin/env node
'use strict';

const fs = require('fs');
const upath = require('upath');
const { getPackageJson, setPackageJson } = require('./utils');

const buildVersion = process.argv[2];
if (!buildVersion)
    throw 'Not set build version.';
console.log(`build version: ${buildVersion}`);

const relativePackagesPath = process.env.NPM_PATH || 'npm';
const rootDir = process.cwd();
const npmDir = upath.join(rootDir, relativePackagesPath);

const npmPackages = [];
fs.readdirSync(npmDir, { recursive: false }).forEach(file => {
    let packageFile = upath.join(npmDir, file, "package.json");
    let packageJson = getPackageJson(packageFile);
    
    npmPackages.push(packageJson.name);
});

fs.readdirSync(npmDir, { recursive: false }).forEach(file => {
    let packageFile = upath.join(npmDir, file, "package.json");
    let packageJson = getPackageJson(packageFile);
    
    packageJson.version = buildVersion;

    for (let key in packageJson.dependencies) {
        if (!packageJson.dependencies[key].startsWith("file:../"))
            continue;

        if (npmPackages.indexOf(key) === -1)
            throw `Not found package dependency ${key} in ${file}.`;

        packageJson.dependencies[key] = `^${buildVersion}`;
    }

    setPackageJson(packageFile, packageJson);

    console.log(`updated npm package: ${packageFile}`);
});