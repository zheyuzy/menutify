module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return environment variable status (without exposing actual values)
  res.json({
    client_id_set: !!process.env.SPOTIFY_CLIENT_ID,
    client_secret_set: !!process.env.SPOTIFY_CLIENT_SECRET,
    redirect_uri_set: !!process.env.REDIRECT_URI,
    frontend_url_set: !!process.env.FRONTEND_URL,
    redirect_uri_value: process.env.REDIRECT_URI,
    frontend_url_value: process.env.FRONTEND_URL,
    client_id_length: process.env.SPOTIFY_CLIENT_ID?.length,
    client_secret_length: process.env.SPOTIFY_CLIENT_SECRET?.length,
    client_id_first_chars: process.env.SPOTIFY_CLIENT_ID?.substring(0, 8),
    client_secret_first_chars: process.env.SPOTIFY_CLIENT_SECRET?.substring(0, 8)
  });
};
