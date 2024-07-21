# autonpm

`autonpm install` - runs ***nmp i*** of all packages in the root directory.

`autonpm update` - runs ***nmp update*** of all packages in the root directory.

`autonpm build` - runs ***nmp run build*** of all packages in the root directory.

`autonpm watch` - runs ***nmp run watch*** of all packages in the root directory.

`autonpm-version 1.1.1` - set version and dependency versions of all package.json file in the root directory.

`autonpm-cleanup` - demove devDependencies and scripts of all package.json file in the root directory.

`autonpm pack` - runs ***nmp pack*** to all packages in the root directory.

By default, `./npm` is used as the root directory. To change the root directory, use the env variable `NPM_PATH`.

Example: `"npm:install": "cross-env NPM_PATH=custom_dir autonpm install"`