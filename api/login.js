const axios = require('axios');
const querystring = require('querystring');

// Use environment variables for security
const client_id = process.env.SPOTIFY_CLIENT_ID?.trim();
const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
const redirect_uri = process.env.REDIRECT_URI?.trim() || 'https://menutify-seven.vercel.app/api/callback';
const frontend_url = process.env.FRONTEND_URL?.trim() || 'https://menutify-seven.vercel.app';

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234987654321';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Debug: Check if environment variables are loaded
  console.log('Client ID:', client_id ? 'SET' : 'NOT SET');
  console.log('Client Secret:', client_secret ? 'SET' : 'NOT SET');
  console.log('Redirect URI:', redirect_uri);
  console.log('Client ID length:', client_id?.length);
  console.log('Client Secret length:', client_secret?.length);
  
  if (!client_id || !client_secret) {
    console.error('Missing Spotify credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const state = generateRandomString(16);
  
  // Set cookie
  res.setHeader('Set-Cookie', `spotify_auth_state=${state}; Path=/; HttpOnly; SameSite=Lax`);

  // your application requests authorization
  const scope = 'user-read-private user-read-email user-library-read playlist-modify-public playlist-modify-private user-top-read';
  const authUrl = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    });

  res.redirect(authUrl);
};
