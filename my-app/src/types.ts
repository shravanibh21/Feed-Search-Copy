export interface Tile {
    _id: string;
    slug: { current: string };
    title: string;
    summary: string;
    emojiUrl: string;
    authors: { name: string }[];
    subtiles: {title: string, slug: {current: string}};
    liked: boolean;
    tags: string[];
    score: number;
    updateDate: string;
  }
  
export interface searchState {
    searchTerm: string;
    searchTokens: string[];
  }