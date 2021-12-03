import fsCb, { promises as fs } from 'fs';
import { join } from 'path';
import { createClient, Entry } from 'contentful';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import Handlebars from 'handlebars';
import { DIST_FOLDER } from './constants';

const isProduction = process.env.CONTENTFUL_ENV !== 'preview';

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
  order?: number;
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

interface Imprint {
  title: string;
  content: any;
}

interface PrivacyStatement {
  title: string;
  content: any;
}

(async function() {
  await registerPartial('site-header');
  await registerPartial('head');

  if (!fsCb.existsSync(DIST_FOLDER)) {
    await fs.mkdir(DIST_FOLDER);
  }

  const client = createClient({
    space: process.env.CONTENTFUL_SPACE,
    accessToken: isProduction ? process.env.CONTENTFUL_ACCESS_TOKEN : process.env.CONTENTFUL_PREVIEW_TOKEN,
    host: isProduction ? undefined : 'preview.contentful.com'
  });
  const entries = await client.getEntries<Story | Contact | Imprint | PrivacyStatement>();

  const storyItems = entries.items.filter(entryIsStory).sort((story, otherStory) => {
    return (otherStory.fields.order ?? 0) - (story.fields.order ?? 0);
  });
  const stories = storyItems.map(item => {
    const title = item.fields.title;
    const description = renderRichText(item.fields.description);
    const images = item.fields.images.map(image => {
      return {
        title: image.fields.title,
        url: image.fields.file.url,
        caption: image.fields.description
      };
    });
    const thumbnailUrl = item.fields.thumbnail.fields.file.url;
    const path = title.toLowerCase().replace(/ /g, '_');
    return {
      id: item.sys.id,
      title,
      description,
      images,
      path,
      thumbnailUrl
    };
  });

  stories.forEach(async story => {
    applyTemplate({ templateName: 'story', context: story, destinationFolder: story.path });
    applyTemplate({ templateName: 'story-redirect', context: story, destinationFolder: story.id });
  });

  // index page
  applyTemplate({ templateName: 'index', context: { stories }, destinationFolder: '.' });

  // contact page
  const contact = entries.items.find(entryIsContact);
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
  applyTemplate({ templateName: 'contact', context: { title: contact.fields.title, columns: [column1, column2, column3] }, destinationFolder: 'kontakt' });

  // imprint page
  const imprint = entries.items.find(entryIsImprint);
  const imprintContext = {
    title: imprint.fields.title,
    content: renderRichText(imprint.fields.content)
  }
  applyTemplate({ templateName: 'imprint', context: imprintContext, destinationFolder: 'impressum' });

  // privacy statement page
  const privateStatement = entries.items.find(entryIsPrivacyStatement);
  const privacyStatementContext = {
    title: privateStatement.fields.title,
    content: renderRichText(privateStatement.fields.content)
  };
  applyTemplate({ templateName: 'privacy-statement', context: privacyStatementContext, destinationFolder: 'datenschutzerklaerung' });
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

function entryIsImprint(entry: Entry<any>): entry is Entry<Imprint> {
  return entry.sys.contentType.sys.id === 'imprint';
}

function entryIsPrivacyStatement(entry: Entry<any>): entry is Entry<PrivacyStatement> {
  return entry.sys.contentType.sys.id === 'privacyStatement';
}

function renderRichText(richText: any): string {
  return documentToHtmlString(richText).replace(/\n/g, `</br>`);
}
