const express = require('express');
const server = express();

// Basic HTML template for the status page
const getStatusHTML = () => `
<!DOCTYPE html>
<html>
<head>
    <title>Indie Games Bot - Status</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1c2e, #2c2f33);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 800px;
            margin: 2rem;
            background: rgba(35, 39, 42, 0.8);
            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .header h1 {
            color: #7289da;
            font-size: 2.5rem;
            margin: 0;
            padding: 0;
            font-weight: 600;
        }
        .header p {
            color: #99aab5;
            margin: 0.5rem 0;
            font-size: 1.1rem;
        }
        .status {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 2rem 0;
            padding: 1.5rem;
            background: rgba(114, 137, 218, 0.2);
            border-radius: 15px;
            border: 1px solid rgba(114, 137, 218, 0.3);
        }
        .status-dot {
            width: 12px;
            height: 12px;
            background: #43b581;
            border-radius: 50%;
            margin-right: 12px;
            box-shadow: 0 0 10px rgba(67, 181, 129, 0.5);
            animation: pulse 2s infinite;
        }
        .status-text {
            font-size: 1.2rem;
            font-weight: 500;
            color: #ffffff;
        }
        .commands {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .command-card {
            background: rgba(44, 47, 51, 0.5);
            padding: 1.5rem;
            border-radius: 15px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: transform 0.3s ease;
        }
        .command-card:hover {
            transform: translateY(-5px);
        }
        .command-icon {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        .command-name {
            color: #7289da;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        .command-desc {
            color: #99aab5;
            font-size: 0.9rem;
        }
        .footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .footer p {
            color: #99aab5;
            font-size: 0.9rem;
            margin: 0.5rem 0;
        }
        .join-server {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.8rem 2rem;
            background: #7289da;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 500;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        .join-server:hover {
            background: #5b6eae;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(114, 137, 218, 0.4);
        }
        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(67, 181, 129, 0.4);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(67, 181, 129, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(67, 181, 129, 0);
            }
        }
        @media (max-width: 600px) {
            .container {
                margin: 1rem;
                padding: 1rem;
            }
            .header h1 {
                font-size: 2rem;
            }
            .commands {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Indie Games Bot</h1>
            <p>Your Gateway to Gaming & Anime Discovery</p>
        </div>
        
        <div class="status">
            <div class="status-dot"></div>
            <div class="status-text">Bot is Online and Running</div>
        </div>

        <div class="commands">
            <div class="command-card">
                <div class="command-icon">🎲</div>
                <div class="command-name">/game</div>
                <div class="command-desc">Get a random indie game recommendation</div>
            </div>
            <div class="command-card">
                <div class="command-icon">📺</div>
                <div class="command-name">/anime</div>
                <div class="command-desc">Get an anime recommendation</div>
            </div>
            <div class="command-card">
                <div class="command-icon">🔍</div>
                <div class="command-name">/search</div>
                <div class="command-desc">Search for specific games</div>
            </div>
        </div>

        <div class="footer">
            <p>Last Updated: ${new Date().toLocaleString()}</p>
            <p>🤖 Indie Games Bot - Bringing you the best indie games and anime!</p>
            <p>Running on Render</p>
            <a href="https://discord.gg/kbesv7EF" class="join-server">Join Our Discord Server</a>
        </div>
    </div>
</body>
</html>
`;

// Main route handler
server.get('/', (req, res) => {
    res.send(getStatusHTML());
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Status page is running on port ${port}`);
});
