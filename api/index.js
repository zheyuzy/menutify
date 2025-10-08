const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const app = express();

// Use environment variables for security
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || 'https://menutify-seven.vercel.app/api/callback';
const frontend_url = process.env.FRONTEND_URL || 'https://menutify-seven.vercel.app';

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
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scope = 'user-read-private user-read-email user-library-read playlist-modify-public playlist-modify-private user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', async function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(frontend_url + '/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
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
  }
});

app.get('/refresh_token', async function(req, res) {
  // requesting access token from refresh token
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

// Export the app for Vercel serverless functions
module.exports = app;