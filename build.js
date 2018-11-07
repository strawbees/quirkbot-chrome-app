const path = require('path')
const fs = require('fs').promises
const cpdir = require('./utils/cpdir')
const rimraf = require('./utils/rimraf')
const zipdir = require('./utils/zipdir')

const init = async () => {
	/**
	 * Load manifest and package
	 */
	const pkg = JSON.parse((await fs.readFile('package.json')).toString())
	const manifest = JSON.parse(
		(await fs.readFile('manifest.template.json')).toString()
		.split('{{VERSION}}').join(pkg.version)
	)
	await fs.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'))

	/**
	 * Constants
	 */
	const TMP_DIR = path.resolve('.tmp')
	const VERSION_ZIP_FILE = path.resolve(`build-${pkg.version}.zip`)

	/**
	 * Create the zipped version of the release
	 */
	await rimraf(TMP_DIR)
	await fs.mkdir(TMP_DIR)
	await cpdir('_locales', path.resolve(TMP_DIR, '_locales'))
	await cpdir('icons', path.resolve(TMP_DIR, 'icons'))
	await cpdir('src', path.resolve(TMP_DIR, 'src'))
	await cpdir('manifest.json', path.resolve(TMP_DIR, 'manifest.json'))
	await rimraf(VERSION_ZIP_FILE)
	await zipdir(TMP_DIR, VERSION_ZIP_FILE, false)
	await rimraf(TMP_DIR)
}
init()
