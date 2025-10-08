const axios = require('axios');
const querystring = require('querystring');

// Use environment variables for security
const client_id = process.env.SPOTIFY_CLIENT_ID?.trim();
const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
const redirect_uri = process.env.REDIRECT_URI?.trim() || 'https://menutify-seven.vercel.app/api/callback';
const frontend_url = process.env.FRONTEND_URL?.trim() || 'https://menutify-seven.vercel.app';

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

  const code = req.query.code || null;
  const state = req.query.state || null;
  
  // Get cookie value
  const cookies = req.headers.cookie || '';
  const stateCookie = cookies.split(';').find(c => c.trim().startsWith('spotify_auth_state='));
  const storedState = stateCookie ? stateCookie.split('=')[1] : null;

  if (state === null || state !== storedState) {
    res.redirect(frontend_url + '/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
    return;
  }

  // Debug: Check if environment variables are loaded
  console.log('Callback - Client ID:', client_id ? 'SET' : 'NOT SET');
  console.log('Callback - Client Secret:', client_secret ? 'SET' : 'NOT SET');
  console.log('Callback - Redirect URI:', redirect_uri);
  
  if (!client_id || !client_secret) {
    console.error('Missing Spotify credentials in callback');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const authResponse = await axios.post('https://accounts.spotify.com/api/token', 
      querystring.stringify({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      }), {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

    const { access_token, refresh_token } = authResponse.data;

    // Optional: Get user info to verify token
    try {
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': 'Bearer ' + access_token }
      });
      console.log('User info:', userResponse.data);
    } catch (userError) {
      console.log('Could not fetch user info:', userError.message);
    }

    // Redirect to frontend with tokens
    res.redirect(frontend_url + '/#' +
      querystring.stringify({
        access_token: access_token,
        refresh_token: refresh_token
      }));
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.redirect(frontend_url + '/#' +
      querystring.stringify({
        error: 'invalid_token'
      }));
  }
};
