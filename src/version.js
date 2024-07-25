#!/usr/bin/env node
'use strict';

const upath = require('upath');
const { listPackages, getPackageJson, setPackageJson } = require('./utils');

const buildVersion = process.argv[2];
if (!buildVersion)
    throw 'Not set build version.';
console.log(`build version: ${buildVersion}`);

const rootDir = process.cwd();
const relativePackagesPath = process.env.NPM_PATH || 'npm';
const packagesPath = upath.join(rootDir, relativePackagesPath);

const packages = listPackages(packagesPath);
packages.forEach(pkg => {
    let json = getPackageJson(pkg.jsonFile);
    
    json.version = buildVersion;

    const depNames = [];
    pkg.deps.forEach(dep => {
        json.dependencies[dep.name] = `^${buildVersion}`;
        depNames.push(dep.name);
    });

    setPackageJson(pkg.jsonFile, json);

    console.log(`set version to ${pkg.name} with deps ${depNames.join(", ")}`);
});