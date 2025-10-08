import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import './App.css';

// A more robust API request handler
const spotifyApiRequest = async (url, params, accessToken, refreshToken, setAccessToken, setError) => {
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      return response;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) { // Token expired
          try {
            const apiBaseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://menutify-seven.vercel.app/api' 
              : 'http://127.0.0.1:3000';
            const refreshResponse = await axios.get(`${apiBaseUrl}/refresh_token`, { 
              params: { refresh_token: refreshToken } 
            });
            const newAccessToken = refreshResponse.data.access_token;
            setAccessToken(newAccessToken);
            accessToken = newAccessToken; // Update for the retry
            continue; // Retry the request with the new token
          } catch (refreshError) {
            setError('Session expired. Please log in again.');
            return null; // Stop if refresh fails
          }
        }
        if (error.response.status === 429) { // Rate limited
          const retryAfter = (error.response.headers['retry-after'] || 2) * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue; // Retry after waiting
        }
      }
      retries--;
      if (retries === 0) throw error; // Rethrow after final attempt fails
    }
  }
};

function App() {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [dataType, setDataType] = useState('tracks');
  const [timeRange, setTimeRange] = useState('medium_term');
  const [topData, setTopData] = useState(null);
  const [menuGenerated, setMenuGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const menuRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : true;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      window.history.pushState({}, null, '/');
    }
  }, []);

  useEffect(() => {
    setTopData(null); // Clear menu when selections change
    setMenuGenerated(false); // Also clear menuGenerated state
  }, [dataType, timeRange]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogin = () => {
    const apiBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://menutify-seven.vercel.app/api' 
      : 'http://127.0.0.1:3000';
    window.location.href = `${apiBaseUrl}/login`;
  };

  const handleLogout = () => {
    setAccessToken('');
    setRefreshToken('');
    setTopData(null);
    setMenuGenerated(false); // Also clear menuGenerated state on logout
    setError(null);
  };

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTopData(null);
    setMenuGenerated(false); // Reset menuGenerated at the start of generation
    try {
      let dataToSet;
      if (dataType === 'genres') {
        // Fetch top artists to get genres
        const artistsResponse = await spotifyApiRequest(
          `https://api.spotify.com/v1/me/top/artists`,
          { time_range: timeRange, limit: 50 }, // Fetch more artists to get a better genre sample
          accessToken,
          refreshToken,
          setAccessToken,
          setError
        );

        if (!artistsResponse) {
          throw new Error('Failed to fetch top artists for genre calculation.');
        }

        const genresMap = {};
        artistsResponse.data.items.forEach(artist => {
          artist.genres.forEach(genre => {
            genresMap[genre] = (genresMap[genre] || 0) + 1;
          });
        });

        // Convert map to array and sort by count
        dataToSet = Object.entries(genresMap)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 10) // Limit to top 10 genres
          .map(([genre, count]) => ({ id: genre, name: genre, count })); // Format for display

      } else {
        // Existing logic for tracks and artists
        const response = await spotifyApiRequest(
          `https://api.spotify.com/v1/me/top/${dataType}`,
          { time_range: timeRange, limit: 10 },
          accessToken,
          refreshToken,
          setAccessToken,
          setError
        );
        if (!response) {
          throw new Error('Failed to fetch top data from Spotify.');
        }
        dataToSet = response.data.items;
      }

      setTopData(dataToSet);
      setMenuGenerated(true); // Set to true after successful data fetch

    } catch (err) {
      setError('Failed to fetch top data from Spotify.');
      console.error(err);
    }
    setLoading(false);
  }, [dataType, timeRange, accessToken, refreshToken, setAccessToken, setError]);

  const handleDownloadImage = async () => {
    if (!menuRef.current) return;
    const canvas = await html2canvas(menuRef.current);
    const link = document.createElement('a');
    link.download = 'menutify.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <header className="App-header">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="dark-mode-toggle">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <h1>Menutify</h1>

        {!accessToken ? (
          <>
            <h2>👨‍🍳 See who’s cooking ur Spotify 🍳</h2>
            <button onClick={handleLogin} className="spotify-login-button">Login with Spotify</button>
            <p style={{ fontSize: 'small' }}>cooked by <a href="https://github.com/zheyuzy" target="_blank" rel="noopener noreferrer">zheyuzy👨‍🍳</a></p>
          </>
        ) : (
          <>
            <div className="controls">
              <div className="control-group">
                <label>Type:</label>
                <button className={dataType === 'tracks' ? 'active' : ''} onClick={() => setDataType('tracks')}>Dishes</button>
                <button className={dataType === 'artists' ? 'active' : ''} onClick={() => setDataType('artists')}>Chefs</button>
                <button className={dataType === 'genres' ? 'active' : ''} onClick={() => setDataType('genres')}>Cuisines</button>
              </div>
              <div className="control-group">
                <label>Time Range:</label>
                <button className={timeRange === 'short_term' ? 'active' : ''} onClick={() => setTimeRange('short_term')}>1 Month</button>
                <button className={timeRange === 'medium_term' ? 'active' : ''} onClick={() => setTimeRange('medium_term')}>3 Months</button>
                <button className={timeRange === 'long_term' ? 'active' : ''} onClick={() => setTimeRange('long_term')}>All Time</button>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Menu'}
            </button>
            <button onClick={handleLogout}>Logout</button>

            <p style={{ fontSize: 'small' }}>cooked by <a href="https://github.com/zheyuzy" target="_blank" rel="noopener noreferrer">zheyuzy</a></p>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {menuGenerated && ( // Changed from topData &&
              <>
                <div id="menu-container" ref={menuRef} className="menu">
                  <h2>{
                    ((dataType, timeRange) => {
                      const typeName = {
                        tracks: 'Dishes',
                        artists: 'Chefs',
                        genres: 'Cuisines',
                      }[dataType];

                      if (timeRange === 'short_term') {
                        if (dataType === 'artists') {
                          return 'Chefs of the Month';
                        }
                        if (dataType === 'genres') {
                          return 'Cuisines of the Month';
                        }
                      }
                      if (timeRange === 'medium_term') {
                        if (dataType === 'artists') {
                          return 'Chefs of the Season';
                        }
                        if (dataType === 'genres') {
                          return 'Cuisines of the Season';
                        }
                      }
                      return `Your Top ${typeName}`;
                    })(dataType, timeRange)
                  }</h2>
                  <p className="menu-subtitle">{{
                    'short_term': 'Taste of the Month',
                    'medium_term': 'Taste of the Season',
                    'long_term': 'All Time Favourite'
                  }[timeRange]}</p>
                  <div className="menu-items">
                    {topData.map((item, index) => (
                      <div className="menu-item" key={item.id}>
                        <div className="item-details">
                          <span className="item-index">{index + 1}.</span>
                          <span className="item-name">{item.name}</span>
                          {dataType === 'tracks' && item.artists && <span className="item-artist">{item.artists.map(a => a.name).join(', ')}</span>}
                          {dataType === 'genres' && item.count && <span className="item-artist">({item.count} {item.count === 1 ? 'chef' : 'chefs'})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="menu-footer">Thank you for dining with Menutify!</p>
                </div>
                <button onClick={handleDownloadImage}>Download Menu</button>
              </>
            )}
          </>
        )}
      </header>
    </div>
  );
}

export default App;