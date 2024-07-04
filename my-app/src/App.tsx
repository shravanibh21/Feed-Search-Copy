import React, { useState, useEffect, ChangeEvent } from 'react';
import './App.css';
import sanityClient from './client';
import {Tile, searchState} from './types';


const App: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [scoredTiles, setScoredTiles] = useState<Tile[]>([]);
  const [search, setSearch] = useState<searchState>({ searchTerm: '', searchTokens: [] });
  const { removeStopwords } = require('stopword');

  // Initial data fetch: all tiles, no search in the beginning
  useEffect(() => {
    const fetchTiles = async () => {
      try {
        const result = await sanityClient.fetch(`
          *[_type == "tile"]{
            _id,
            slug,
            title,
            summary,
            "emojiUrl": emoji.asset->url,
            "authors" : authors[]->{ name },
            "subtiles" : subtiles[]->{ title, slug },
            liked,
            tags, 
            score,
            updateDate
          }`
        );
        console.log(result);
        const sorted: Tile[] = result.filter((tile: Tile) => !tile._id.includes('drafts')).sort((a: Tile, b: Tile) => {
            return new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime();

        });

        setTiles(sorted);
      } catch (err) {
        console.error('Error fetching tiles:', err);
      }
    };
    fetchTiles();
  }, []);

  useEffect(() => {
    console.log("Entered the useEffect to update feed: " + search.searchTokens);
    const scored = tiles.map(tile => {
      const score = calculateScore(tile, search.searchTokens);
      return { ...tile, score };
    });

    const sorted = scored
    .filter(tile => tile.score > 5)
    .sort((a, b) => {
      // First, sort by the liked property (liked tiles come first)
      if (a.liked && !b.liked) return -1;
      if (!a.liked && b.liked) return 1;
      
      // Then, sort by score (higher scores come first)
      if (b.score !== a.score) return b.score - a.score;

      // Finally, sort by update date (more recent dates come first)
      return new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime();
    });
  
    setScoredTiles(sorted);
  }, [tiles, search.searchTokens]);

  
  // Event handler - handling the like button
  const handleToggle = async (id: string) => {
    const likeVal: boolean = findLikeVal(id);

    // Save to sanity
    if (id) {
      updateLiked(id, likeVal);
    } else {
      console.log('Document not found');
    }

    // Update client side
    setTiles(prevTiles =>
      prevTiles.map(tile =>
        tile._id === id ? { ...tile, liked: !tile.liked } : tile
      )
    );
  };

  const findLikeVal = (id: string): boolean => {
    let likeVal: boolean = false;
    tiles.forEach((tile: Tile) => {
      if (tile._id === id) likeVal = !tile.liked;
    });
    return likeVal;
  }

  const updateLiked = async (docId: string, value: boolean) => {
    try {
      const response = await sanityClient
        .patch(docId)
        .set({ liked: value })
        .commit()
      console.log('Document updated');
    } catch (err) {
      console.error('Update failed:' + err);
    }
  }

  // Event handler
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input: string = event.target.value
    setSearch({ searchTerm: input, searchTokens: search.searchTokens });
  };

  // Event handler
  const handleSearchClick = () => {
    console.log(tiles); //remove this
    const terms: string[] = search.searchTerm.split(/\s+|[,.;:?!]/).filter(word => word.length > 0);
    const uniqueTerms: string[] = Array.from(new Set<string>(terms));
    setSearch({
      searchTokens: uniqueTerms,
      searchTerm: ''
    });
    setTiles(prevTiles => prevTiles.map(tile => ({...tile, score: 0 })));
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchClick();
    }
  };

  const calculateScore = (tile: Tile, searchTokens: string[]): number => {
    console.log("entered search algorithm"); //remove this
    let score: number = 0;
    const filterTokens: string[] = removeStopwords(searchTokens);
    filterTokens.forEach(token => console.log(token)); //remove this
    
    filterTokens.forEach(token => {
      const lowerSearchTerm = token.toLowerCase();

      if (tile.title && tile.title.toLowerCase().includes(lowerSearchTerm)) score += 10; //Instant accept

      if (Array.isArray(tile.authors)) { //Instant accept
        if(tile.authors.some(author => author.name.toLowerCase().includes(lowerSearchTerm))) score += 8;
      } else {
        if(lowerSearchTerm === 'anonymous') score += 8;
      }

      if (tile.slug.current && tile.slug.current.toLowerCase().includes(lowerSearchTerm)) score += 6; //Instant accept

      if (Array.isArray(tile.tags) && tile.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) score += 6; //Instant accept

      if (tile.summary && tile.summary.toLowerCase().includes(lowerSearchTerm)) score += 3;

      //add score for appearance of the word in each subtile's title or slug
      if(Array.isArray(tile.subtiles)) {
        tile.subtiles.forEach((subtile) => {
          if(subtile.title.includes(lowerSearchTerm)) score += 2;
          if(subtile.slug.current.includes(lowerSearchTerm)) score += 2;
        });
      }

    });

    return score;
  };

  const filteredItems = (): Tile[] => {
   return search.searchTokens.length > 0 ? scoredTiles : tiles;

  }

  return (
    <div className="container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search changed"
          value={search.searchTerm}
          onChange={handleSearch}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleSearchClick}>Search</button>
      </div>
      <div className="content">
        <div className="item-list">
          {filteredItems().map(tile => (
            <div key={tile.slug.current} className="item">
              <img src={tile.emojiUrl} alt={tile.title} />
              <div className="item-info">
                <h3>{tile.title}</h3>
                <p>{tile.summary.slice(0, 100)}</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={tile.liked}
                  onChange={() => handleToggle(tile._id)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
        <div className="likes-list">
          <h2>My Likes</h2>
          {tiles.filter(tile => tile.liked).map(tile => (
            <div key={tile.slug.current} className="liked-item">
              <img src={tile.emojiUrl} alt={tile.title} />
              <div className="item-info">
                <h3>{tile.title}</h3>
                <p>{tile.summary.slice(0, 100)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
