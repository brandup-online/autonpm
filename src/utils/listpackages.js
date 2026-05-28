'use strict';

const fs = require( 'fs' );
const upath = require( 'upath' );
const getPackageJson = require( './getpackagejson.js' );
const LocationPackage = "file:../";

const sort = function(source, result) {
    const visiting = new Set();
    for (let i = 0; i < source.length; i++) {
        paste(source, result, source[i].name, visiting);
    }
};

const paste = function(source, result, name, visiting) {
    const depPkg = source.find((pkg) => pkg.name === name);
    if (!depPkg)
        throw new Error(`Not found dep package ${name}`);

    if (result.find((pkg) => pkg.name === depPkg.name))
        return;

    if (visiting.has(name))
        throw new Error(`Circular dependency detected involving package ${name}`);
    visiting.add(name);

    if (depPkg.deps && depPkg.deps.length) {
        depPkg.deps.forEach(dep => {
            paste(source, result, dep.name, visiting);
        });
    }

    visiting.delete(name);
    result.push(depPkg);
}

module.exports = function(packagesDir) {
    if (!fs.existsSync(packagesDir))
        throw new Error(`Packages directory not found: ${packagesDir}. Set NPM_PATH to the directory containing your packages.`);

    const packages = [];

    fs.readdirSync(packagesDir, { recursive: false }).forEach(dirName => {
        const dirPath = upath.join(packagesDir, dirName);
        if (!fs.lstatSync(dirPath).isDirectory())
            return;
    
        const packageFile = upath.join(dirPath, "package.json");
        if(!fs.existsSync(packageFile))
            return;

        const packageJson = getPackageJson(packageFile);

        const pkg = { 
            name: packageJson.name, 
            dir: dirPath,
            dirName: dirName,
            jsonFile: packageFile,
            deps: []
        };
        packages.push(pkg);
        
        for (let key in packageJson.dependencies) {
            if (!packageJson.dependencies[key].startsWith(LocationPackage))
                continue;

            pkg.deps.push({
                name: key,
                location: packageJson.dependencies[key].substring(LocationPackage.length)
            });
        }
    });

    const sortedPackages = [];
    sort(packages, sortedPackages);

    return sortedPackages;
};