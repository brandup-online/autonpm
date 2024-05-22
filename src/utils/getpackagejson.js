'use strict';

const fs = require( 'fs' );
const upath = require( 'upath' );

module.exports = function getPackageJson( cwd = process.cwd() ) {
	let pkgJsonPath = cwd;

	if ( !pkgJsonPath.endsWith( 'package.json' ) ) {
		pkgJsonPath = upath.join( cwd, 'package.json' );
	}

	return JSON.parse( fs.readFileSync( pkgJsonPath, 'utf-8' ) );
};