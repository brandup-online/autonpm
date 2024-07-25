#!/usr/bin/env node
'use strict';

const upath = require('upath');
const { listPackages, getPackageJson, setPackageJson } = require('./utils');

const rootDir = process.cwd();
const relativePackagesPath = process.env.NPM_PATH || 'npm';
const packagesPath = upath.join(rootDir, relativePackagesPath);

const packages = listPackages(packagesPath);
packages.forEach(pkg => {
    let packageJson = getPackageJson(pkg.jsonFile);
    
    delete packageJson.devDependencies;
    delete packageJson.scripts;

    setPackageJson(pkg.jsonFile, packageJson);

    console.log(`cleanup package ${pkg.name}`);
});