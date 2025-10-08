# Menutify
Live Demo: https://menutify-seven.vercel.app/

A React website that generates a "menu" of your top Spotify tracks and artists.

## Features

*   Fetches your top tracks or artists from Spotify for different time periods (1 month, 6 months, all time).
*   Displays the results in a fun, menu-themed image.
*   Allows you to download the generated "menu" as a PNG image.

## How It Works

1.  **Login:** Click "Login with Spotify" to grant the app read-only access to your Spotify listening history.
2.  **Generate:** Choose your preferred menu type and time range.
3.  **Download & Share:** Click "Generate Menu" and then download the resulting image.

**Note:** This is a single-user experience. Each person who visits the site must log in with their own Spotify account to generate a menu based on their own data. You cannot view someone else's menu by sharing a link.

## Local Development

To run this project locally, you will need to have Node.js and npm installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/zheyuzy/menutify.git
    cd menutify
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    The `server.js` file requires your Spotify API credentials. For local development, you can modify the `server.js` file directly with your credentials.

    **Important:** For deployment, these should be set as environment variables.

4.  **Run the application:**
    You need to run both the backend server and the frontend React app.
    ```bash
    # In one terminal, start the backend server:
    node server.js

    # In another terminal, start the React app:
    npm start
    ```

5.  Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Deployment

This project is configured for deployment on [Vercel](https://vercel.com). Please refer to the deployment instructions provided previously.
