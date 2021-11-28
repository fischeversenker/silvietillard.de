import fsCb, { promises as fs } from 'fs';
import { extname, join } from 'path';
import { createClient, Entry } from 'contentful';
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

interface Story {
  title: string;
  description: any;
  images: Image[];
  thumbnail: Image;
}

interface ContactColumn {
  fields: {
    title: string;
    content: any;
    footer?: any;
  }
}

interface Contact {
  title: string;
  column1: ContactColumn;
  column2: ContactColumn;
  column3: ContactColumn;
}

const DIST_FOLDER = 'dist';

(async function() {
  await registerPartial('site-header');
  await registerPartial('head');

  const client = createClient({
    space: process.env.CONTENTFUL_SPACE,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });
  const entries = await client.getEntries<Story | Contact>();

  const storyItems = entries.items.filter(entryIsStory);
  const stories = storyItems.map(item => {
    const title = item.fields.title;
    const description = renderRichText(item.fields.description);
    const images = item.fields.images.map(image => ({
      title: image.fields.title,
      url: image.fields.file.url
    }));
    const thumbnailUrl = item.fields.thumbnail.fields.file.url;
    const path = title.toLowerCase();
    return {
      title,
      description,
      images,
      path,
      thumbnailUrl
    };
  });

  stories.forEach(async story => {
    applyTemplate({ templateName: 'story', context: story, destinationFolder: story.path });
  });

  // index page
  applyTemplate({ templateName: 'index', context: { stories }, destinationFolder: '.' });

  // contact page
  const contact = entries.items.filter(entryIsContact)[0];
  const column1 = {
    title: contact.fields.column1.fields.title,
    content: renderRichText(contact.fields.column1.fields.content),
    footer: renderRichText(contact.fields.column1.fields.footer)
  };
  const column2 = {
    title: contact.fields.column2.fields.title,
    content: renderRichText(contact.fields.column2.fields.content),
    footer: renderRichText(contact.fields.column2.fields.footer)
  };
  const column3 = {
    title: contact.fields.column3.fields.title,
    content: renderRichText(contact.fields.column3.fields.content),
    footer: renderRichText(contact.fields.column3.fields.footer)
  };
  applyTemplate({ templateName: 'kontakt', context: { title: contact.fields.title, columns: [column1, column2, column3] } });
})();

async function readFile(path: string): Promise<string> {
  return fs.readFile(join(__dirname, path)).then(buffer => buffer.toString());
}

async function registerPartial(name: string): Promise<void> {
  Handlebars.registerPartial(name, await readFile(join('partials', `${name}.hbs`)));
}

async function applyTemplate({ templateName, context = {}, destinationFolder = templateName }: { templateName: string, context?: any, destinationFolder?: string }): Promise<void> {
  const rawTemplate = await readFile(join('templates', `${templateName}.hbs`));
  const template = Handlebars.compile(rawTemplate);
  const folderPath = join(DIST_FOLDER, destinationFolder);
  const filePath = join(folderPath, 'index.html');
  if (!fsCb.existsSync(folderPath)) {
    await fs.mkdir(folderPath);
  }
  await fs.writeFile(filePath, template(context));
  console.log(`✔ wrote ${filePath}`);
}

function entryIsStory(entry: Entry<any>): entry is Entry<Story> {
  return entry.sys.contentType.sys.id === 'story';
}

function entryIsContact(entry: Entry<any>): entry is Entry<Contact> {
  return entry.sys.contentType.sys.id === 'contact';
}

function renderRichText(richText: any): string {
  return documentToHtmlString(richText).replace(/\n/g, `</br>`);
}

// meant to be used to collect all template styles and compile them and bundle them into the global `styles.css`
async function collectStyles(): Promise<string[]> {
  const dirs = await fs.readdir(join(__dirname, 'templates'));
  return dirs.filter(dir => extname(dir) === '.scss');
}
