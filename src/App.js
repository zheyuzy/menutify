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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const menuRef = useRef(null);

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
    if (accessToken) {
      handleGenerate();
    }
  }, [accessToken, handleGenerate]);

  useEffect(() => {
    setTopData(null); // Clear menu when selections change
  }, [dataType, timeRange]);

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
    setError(null);
  };

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTopData(null);
    try {
      const response = await spotifyApiRequest(
        `https://api.spotify.com/v1/me/top/${dataType}`,
        { time_range: timeRange, limit: 10 },
        accessToken,
        refreshToken,
        setAccessToken,
        setError
      );
      if (response) {
        setTopData(response.data.items);
      }
    } catch (err) {
      setError('Failed to fetch top data from Spotify.');
      console.error(err);
    }
    setLoading(false);
  }, [dataType, timeRange, accessToken, refreshToken]);

  const handleDownloadImage = async () => {
    if (!menuRef.current) return;
    const canvas = await html2canvas(menuRef.current);
    const link = document.createElement('a');
    link.download = 'menutify.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Menutify</h1>
        {!accessToken ? (
          <button onClick={handleLogin}>Login with Spotify</button>
        ) : (
          <>
            <div className="controls">
              <div className="control-group">
                <label>Type:</label>
                <button className={dataType === 'tracks' ? 'active' : ''} onClick={() => setDataType('tracks')}>Dishes</button>
                <button className={dataType === 'artists' ? 'active' : ''} onClick={() => setDataType('artists')}>Chefs</button>
              </div>
              <div className="control-group">
                <label>Time Range:</label>
                <button className={timeRange === 'short_term' ? 'active' : ''} onClick={() => setTimeRange('short_term')}>1 Month</button>
                <button className={timeRange === 'medium_term' ? 'active' : ''} onClick={() => setTimeRange('medium_term')}>6 Months</button>
                <button className={timeRange === 'long_term' ? 'active' : ''} onClick={() => setTimeRange('long_term')}>All Time</button>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Menu'}
            </button>
            <button onClick={handleLogout}>Logout</button>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {topData && (
              <>
                <div id="menu-container" ref={menuRef} className="menu">
                  <h2>Your Top {dataType === 'tracks' ? 'Dishes' : 'Chefs'}</h2>
                  <p className="menu-subtitle">For the {timeRange.replace('_term','').replace('short', 'last month').replace('medium', 'last 6 months').replace('long', 'all time')}</p>
                  <div className="menu-items">
                    {topData.map((item, index) => (
                      <div className="menu-item" key={item.id}>
                        <div className="item-details">
                          <span className="item-index">{index + 1}.</span>
                          <span className="item-name">{item.name}</span>
                          {dataType === 'tracks' && item.artists && <span className="item-artist">{item.artists.map(a => a.name).join(', ')}</span>}
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
