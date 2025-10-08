const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: '.env.local' });

const app = express();

// Use environment variables for security
const client_id = process.env.SPOTIFY_CLIENT_ID?.trim();
const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
const redirect_uri = process.env.REDIRECT_URI?.trim() || 'http://127.0.0.1:3000/callback';
const frontend_url = process.env.FRONTEND_URL?.trim() || 'http://localhost:3000';

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

const stateKey = 'spotify_auth_state';

app.use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {
  console.log('=== LOCAL LOGIN DEBUG ===');
  console.log('Client ID:', client_id);
  console.log('Client Secret:', client_secret);
  console.log('Redirect URI:', redirect_uri);
  console.log('Frontend URL:', frontend_url);
  
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

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
  
  console.log('Auth URL:', authUrl);
  console.log('==================');
  
  res.redirect(authUrl);
});

app.get('/callback', async function(req, res) {
  console.log('=== LOCAL CALLBACK DEBUG ===');
  console.log('Query params:', req.query);
  
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  console.log('Code:', code);
  console.log('State:', state);
  console.log('Stored State:', storedState);

  if (state === null || state !== storedState) {
    console.log('State mismatch!');
    res.redirect(frontend_url + '/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    try {
      console.log('Exchanging code for token...');
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
      console.log('Token exchange successful!');

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
  }
});

app.get('/refresh_token', async function(req, res) {
  console.log('=== LOCAL REFRESH TOKEN DEBUG ===');
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
});

// For local development, start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Local server running on http://127.0.0.1:${PORT}`);
  console.log(`Login URL: http://127.0.0.1:${PORT}/login`);
  console.log(`Callback URL: http://127.0.0.1:${PORT}/callback`);
});
