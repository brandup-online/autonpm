'use strict';

const fs = require( 'fs' );
const upath = require( 'upath' );

module.exports = function setPackageJson( cwd = process.cwd(), json ) {
	let pkgJsonPath = cwd;

	if ( !pkgJsonPath.endsWith( 'package.json' ) ) {
		pkgJsonPath = upath.join( cwd, 'package.json' );
	}

	const newPackageJson = JSON.stringify(json, null, "  ");

	return fs.writeFileSync( pkgJsonPath, newPackageJson );
};