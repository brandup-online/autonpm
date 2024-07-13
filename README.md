# autonpm

`autonpm install` - runs ***nmp i*** to all packages in the root directory.

`autonpm update` - runs ***nmp update*** to all packages in the root directory.

`autonpm build` - runs ***nmp run build*** to all packages in the root directory.

`autonpm watch` - runs ***nmp run watch*** to all packages in the root directory.

`autonpm version` - runs ***nmp version*** to all packages in the root directory.

`autonpm pack` - runs ***nmp pack*** to all packages in the root directory.

By default, `./npm` is used as the root directory. To change the root directory, use the env variable `NPM_PATH`.

Example: `"npm:install": "cross-env NPM_PATH=custom_dir autonpm install"`