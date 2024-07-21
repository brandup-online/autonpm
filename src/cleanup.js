#!/usr/bin/env node
'use strict';

const fs = require('fs');
const upath = require('upath');
const { getPackageJson, setPackageJson } = require('./utils');

const relativePackagesPath = process.env.NPM_PATH || 'npm';
const rootDir = process.cwd();
const npmDir = upath.join(rootDir, relativePackagesPath);

fs.readdirSync(npmDir, { recursive: false }).forEach(file => {
    let packageFile = upath.join(npmDir, file, "package.json");
    let packageJson = getPackageJson(packageFile);
    
    delete packageJson.devDependencies;
    delete packageJson.scripts;

    setPackageJson(packageFile, packageJson);

    console.log(`cleanup npm package: ${packageFile}`);
});