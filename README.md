# bnpm

`bnpm-build build` - применяет npm run build ко всем пакетам в корневой папке
`bnpm-build install` - применяет npm i ко всем пакетам в корневой папке
`bnpm-build pack` - применяет npm pack ко всем пакетам в корневой папке
`bnpm-version` - задает всем пакетам в корневой папке версию из параметров

По умолчанию в качестве корневого каталога используется "./npm". Для иземенения корневого католога вместо исполльзуйте env переменную NPM_PATH.
`Пример:` "npm:install": "cross-env NPM_PATH=custom_dir bnpm-build install"