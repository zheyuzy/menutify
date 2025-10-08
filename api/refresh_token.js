const axios = require('axios');
const querystring = require('querystring');

// Use environment variables for security
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

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

  const refresh_token = req.query.refresh_token;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  try {
    const authResponse = await axios.post('https://accounts.spotify.com/api/token', 
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }), {
        headers: { 
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

    const { access_token } = authResponse.data;
    res.json({
      'access_token': access_token
    });
  } catch (error) {
    console.error('Refresh token error:', error.response?.data || error.message);
    res.status(400).json({ error: 'Failed to refresh token' });
  }
};
