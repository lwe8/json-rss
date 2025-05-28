export interface JsonFeedItem {
  content_html?: string;
  id?: string;
  summary?: string;
  title?: string;
  url?: string;
  date_published?: string | Date;
}
export interface JsonFeed {
  description?: string;
  home_page_url?: string;
  title?: string;
  items?: JsonFeedItem[];
  feed_url?: string;
}
export interface JsonFeedOptions {
  feed_url?: string;
  language?: string;
}
export interface Options {
  siteInfo: {
    title: string;
    description: string;
    url: string;
  };
  posts: [
    {
      title: string;
      body: string;
      date: string;
      slug: string;
    }
  ];
}
// RSS wants dates in RFC-822.
function toRFC822Date(date: Date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = days[date.getUTCDay()];
  const dayOfMonth = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${day}, ${dayOfMonth} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
}
// Escape XML entities for in the text.
function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemRss(jsonFeedItem: JsonFeedItem): string {
  const { content_html, id, summary, title, url } = jsonFeedItem;
  let { date_published } = jsonFeedItem;
  if (typeof date_published === "string") {
    // Parse as ISO 8601 date.
    date_published = new Date(date_published);
  }
  const date =
    date_published instanceof Date
      ? toRFC822Date(date_published)
      : date_published;

  const dateElement = date ? `      <pubDate>${date}</pubDate>\n` : "";
  const isPermaLink =
    id !== undefined && !URL.canParse(id) ? ` isPermaLink="false"` : "";
  const guidElement = id ? `      <guid${isPermaLink}>${id}</guid>\n` : "";
  const descriptionElement = summary
    ? `      <description>${escapeXml(summary)}</description>\n`
    : "";
  const contentElement = content_html
    ? `      <content:encoded><![CDATA[${content_html}]]></content:encoded>\n`
    : "";
  const titleElement = title
    ? `      <title>${escapeXml(title)}</title>\n`
    : "";
  const linkElement = url ? `      <link>${url}</link>\n` : "";

  return `    <item>
${dateElement}${titleElement}${linkElement}${guidElement}${descriptionElement}${contentElement}    </item>
`;
}

export function json2Rss(jsonFeed: JsonFeed, options: JsonFeedOptions = {}) {
  const { description, home_page_url, items, title } = jsonFeed;

  let { feed_url, language } = options;
  if (!feed_url && jsonFeed.feed_url) {
    // Presume that the RSS feed lives in same location as feed_url
    // but with a .xml extension.
    feed_url = jsonFeed.feed_url;
    if (feed_url.endsWith(".json")) {
      feed_url = feed_url.replace(".json", ".xml");
    }
  }

  const itemsRss = items?.map((story) => itemRss(story)).join("") ?? [];

  const titleElement = title ? `    <title>${escapeXml(title)}</title>\n` : "";
  const descriptionElement = description
    ? `    <description>${escapeXml(description)}</description>\n`
    : "";
  const linkElement = home_page_url
    ? `    <link>${home_page_url}</link>\n`
    : "";
  const languageElement = language
    ? `    <language>${language}</language>\n`
    : "";
  const feedLinkElement = `    <atom:link href="${feed_url}" rel="self" type="application/rss+xml"/>\n`;

  return `<?xml version="1.0" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
${titleElement}${descriptionElement}${linkElement}${languageElement}${feedLinkElement}${itemsRss}  </channel>
</rss>`;
}

export function jsonFeed({ siteInfo, posts }: Options) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: siteInfo.title,
    description: siteInfo.description,
    feed_url: `${siteInfo.url}/feed.json`,
    home_page_url: siteInfo.url,

    // Map the post data to JSON Feed items
    items: Object.entries(posts).map(([slug, post]) => ({
      // Patch image URLs to be absolute
      content_html: post.body.replace(/src="\//g, `src="${siteInfo.url}/`),
      date_published: post.date,
      id: `${siteInfo.url}/posts/${slug}`,
      title: post.title,
      url: `${siteInfo.url}/posts/${slug}`,
    })),
  };
}
