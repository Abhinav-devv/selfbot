Readme file
Overview
This is a bot script that can be used to forward messages between Discord and an Inworld scene. When a message is sent to the bot on Discord, it will forward it to the Inworld scene, and vice versa. The script uses the Inworld SDK and the Discord.js library to interface with the two platforms.

How to use
To use the bot, you need to first set the required environment variables:

INWORLD_KEY: the API key for the Inworld SDK
INWORLD_SECRET: the API secret for the Inworld SDK
INWORLD_SCENE: the name of the Inworld scene to connect to
DISCORD_BOT_TOKEN: the token for your Discord bot
After setting the environment variables, you can run the bot by executing the run() function at the end of the script. You can then chat with the bot on Discord to send and receive messages from the Inworld scene.

The bot listens for messages sent to it on Discord and sends them to the Inworld scene. It also listens for messages sent from the Inworld scene and sends them to the Discord channel where the bot was activated.

To toggle whether the bot should respond without prompt, use the !toggle command on the Discord channel where the bot is active.

Variables
The script has two variables that can be toggled through chatting with the bot. They are:

respondWithoutPrompt: a boolean variable that determines whether the bot should respond without a prompt.
commandPrefix: a string variable that defines the prefix for bot commands on Discord. By default, the prefix is set to !.
To toggle respondWithoutPrompt, use the: 
!toggle 
command on the Discord channel where the bot is active. This will toggle the variable and respond with a message indicating whether the variable is enabled or disabled.