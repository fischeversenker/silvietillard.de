import fsCb, { promises as fs } from 'fs';
import { join } from 'path';
import { createClient } from 'contentful';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import Handlebars from 'handlebars';

interface Image {
  fields: {
    description: string;
    file: {
      url: string;
    },
    title: string;
  }
}

interface Entry {
  title: string;
  description: any;
  images: Image[];
}

const staticPages = ['kontakt'];
const DIST_FOLDER = 'dist';

(async function() {
  await registerPartial('site-header');
  await registerPartial('head');

  const client = createClient({
    space: process.env.CONTENTFUL_SPACE,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });
  const entries = await client.getEntries<Entry>();

  const rawStoryTemplate = await readFile(join('templates', 'story.hbs'));
  const storyTemplate = Handlebars.compile(rawStoryTemplate);

  const stories = entries.items.map(item => {
    const title = item.fields.title;
    const description = documentToHtmlString(item.fields.description);
    const images = item.fields.images.map(image => ({
      title: image.fields.title,
      url: image.fields.file.url
    }));
    const path = title.toLowerCase();
    return {
      title,
      description,
      images,
      path
    };
  });

  stories.forEach(async story => {
    const storyFolderPath = join(DIST_FOLDER, story.path);
    const storyFilePath = join(storyFolderPath, 'index.html');
    if (!fsCb.existsSync(storyFolderPath)) {
      await fs.mkdir(storyFolderPath);
    }
    await fs.writeFile(storyFilePath, storyTemplate(story), 'utf-8');
    console.log(`✔ wrote ${storyFilePath}`);
  });

  // index page

  const rawIndexTemplate = await readFile(join('templates', 'index.hbs'));
  const indexTemplate = Handlebars.compile(rawIndexTemplate);

  const indexFilePath = join(DIST_FOLDER, 'index.html');
  await fs.writeFile(indexFilePath, indexTemplate({ stories }));
  console.log(`✔ wrote ${indexFilePath}`);

  // static pages

  staticPages.forEach(async staticPage => {
    const rawTemplate = await readFile(join('templates', `${staticPage}.hbs`));
    const staticPageTemplate = Handlebars.compile(rawTemplate);
    const staticPageFolderPath = join(DIST_FOLDER, staticPage);
    const staticPageFilePath = join(staticPageFolderPath, 'index.html');
    if (!fsCb.existsSync(staticPageFolderPath)) {
      await fs.mkdir(staticPageFolderPath);
    }
    await fs.writeFile(staticPageFilePath, staticPageTemplate({ stories }));
    console.log(`✔ wrote ${staticPageFilePath}`);
  });
})();

async function readFile(path: string): Promise<string> {
  return fs.readFile(join(__dirname, path)).then(buffer => buffer.toString());
}

async function registerPartial(name: string): Promise<void> {
  Handlebars.registerPartial(name, await readFile(join('partials', `${name}.hbs`)));
}
