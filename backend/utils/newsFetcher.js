import Parser from 'rss-parser';

const parser = new Parser();

// RSS Feeds (Use reliable, free sources)
const FEEDS = [
    { name: 'MoneyControl', url: 'https://www.moneycontrol.com/rss/MCtopnews.xml' },
    { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
    // { name: 'LiveMint', url: 'https://www.livemint.com/rss/markets' } // Sometimes unstable
];

export const getMarketNews = async () => {
    let allNews = [];

    // Fetch from all feeds in parallel
    const promises = FEEDS.map(async (feed) => {
        try {
            const feedData = await parser.parseURL(feed.url);
            return feedData.items.map(item => {
                // Try to find an image
                let image = null;
                if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image')) {
                    image = item.enclosure.url;
                } else if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
                    image = item['media:content'].$.url;
                } else if (item.content) {
                    // Very basic checks for img tag in content
                    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) image = imgMatch[1];
                }

                return {
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: feed.name,
                    summary: item.contentSnippet || item.content || '',
                    image: image
                };
            });
        } catch (error) {
            console.error(`Error fetching RSS from ${feed.name}:`, error.message);
            return [];
        }
    });

    const results = await Promise.all(promises);
    results.forEach(newsItems => {
        allNews = [...allNews, ...newsItems];
    });

    // Sort by date (newest first)
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return allNews.slice(0, 20); // Return top 20 news items
};
