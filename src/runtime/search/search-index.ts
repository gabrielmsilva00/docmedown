import MiniSearch from 'minisearch';
import { DocFileItem, SearchResultItem } from '../types';

export class DocSearchIndex {
  private miniSearch: MiniSearch;
  private indexedDocs: Map<string, DocFileItem> = new Map();

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['title', 'category', 'headingsText', 'content'],
      storeFields: ['title', 'slug', 'category', 'headingsText', 'snippet'],
      searchOptions: {
        boost: { title: 3, headingsText: 2, category: 1.5, content: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  public addDoc(doc: DocFileItem) {
    if (this.indexedDocs.has(doc.slug)) return;
    this.indexedDocs.set(doc.slug, doc);

    const headingsText = (doc.headings || []).map((h) => h.text).join(' ');
    const snippet = (doc.content || '').substring(0, 160).replace(/[#*`_>]/g, '').trim();

    try {
      this.miniSearch.add({
        id: doc.slug,
        slug: doc.slug,
        title: doc.title,
        category: doc.category || '',
        headingsText,
        content: doc.content || '',
        snippet,
      });
    } catch {
      // ignore duplicates
    }
  }

  public addDocs(docs: DocFileItem[]) {
    for (const doc of docs) {
      this.addDoc(doc);
    }
  }

  public search(query: string, limit: number = 10): SearchResultItem[] {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      const results = this.miniSearch.search(cleanQuery);
      return results.slice(0, limit).map((res) => ({
        id: res.id,
        slug: res.slug || res.id,
        title: res.title || 'Untitled',
        category: res.category,
        snippet: res.snippet,
        score: res.score,
      }));
    } catch (err) {
      console.warn('[DocMeDown] Search error:', err);
      return [];
    }
  }
}
