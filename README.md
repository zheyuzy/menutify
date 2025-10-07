# Menutify

A React application that generates a "menu" of your top Spotify tracks and artists, inspired by Receiptify.

## Features

*   Fetches your top tracks or artists from Spotify for different time periods (1 month, 6 months, all time).
*   Displays the results in a fun, menu-themed image.
*   Allows you to download the generated "menu" as a PNG image.

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
