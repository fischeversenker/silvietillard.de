import fsCb, { promises as fs } from 'fs';
import { extname, join } from 'path';
import scss from 'sass';
import { DIST_FOLDER } from './constants';

(async function buildStyles() {
  let collectedStyles = '';

  // global styles
  const globalStylesPath = join(__dirname, 'styles.scss');
  const globalStyles = scss.renderSync({ file: globalStylesPath });
  collectedStyles = collectedStyles.concat(globalStyles.css.toString());

  // template styles
  const templatesFolderPath = join(__dirname, 'templates');
  const templatesStyleFiles = await collectStyles(templatesFolderPath);
  templatesStyleFiles.forEach((filePath) => {
    const styles = scss.renderSync({ file: filePath });
    collectedStyles = collectedStyles.concat(styles.css.toString());
  });

  // partial styles
  const partialsFolderPath = join(__dirname, 'partials');
  const partialsStyleFiles = await collectStyles(partialsFolderPath);
  partialsStyleFiles.forEach((filePath) => {
    const styles = scss.renderSync({ file: filePath });
    collectedStyles = collectedStyles.concat(styles.css.toString());
  });

  // output the collected styles
  const stylesPath = join(DIST_FOLDER, 'styles.css');
  await fs.writeFile(stylesPath, collectedStyles);
  console.log(`✔ wrote ${stylesPath}`);
})();

// meant to be used to collect all template styles and compile them and bundle them into the global `styles.css`
function collectStyles(folderPath: string): string[] {
  const dirs = fsCb.readdirSync(folderPath);
  const stylesFiles: string[] = [];
  dirs.forEach(dir => {
    const stats = fsCb.statSync(join(folderPath, dir));
    if (stats.isDirectory()) {
      stylesFiles.push(...(collectStyles(join(folderPath, dir))));
    } else if (extname(dir).endsWith('scss')) {
      stylesFiles.push(join(folderPath, dir));
    }
  });
  return stylesFiles;
}
