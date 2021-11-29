import { promises as fs } from 'fs';
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
  templatesStyleFiles.forEach((fileName) => {
    const filePath = join(templatesFolderPath, fileName);
    const styles = scss.renderSync({ file: filePath });
    collectedStyles = collectedStyles.concat(styles.css.toString());
  });

  // partial styles
  const partialsFolderPath = join(__dirname, 'partials');
  const partialsStyleFiles = await collectStyles(partialsFolderPath);
  partialsStyleFiles.forEach((fileName) => {
    const filePath = join(partialsFolderPath, fileName);
    console.log(filePath);
    const styles = scss.renderSync({ file: filePath });
    collectedStyles = collectedStyles.concat(styles.css.toString());
  });

  // output the collected styles
  const stylesPath = join(DIST_FOLDER, 'styles.css');
  await fs.writeFile(stylesPath, collectedStyles);
  console.log(`✔ wrote ${stylesPath}`);
})();

// meant to be used to collect all template styles and compile them and bundle them into the global `styles.css`
async function collectStyles(folderPath: string): Promise<string[]> {
  const dirs = await fs.readdir(folderPath);
  return dirs.filter(dir => extname(dir).endsWith('scss'));
}
