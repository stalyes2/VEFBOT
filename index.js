const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    InteractionType, 
    ActivityType 
} = require('discord.js');
require('dotenv').config();
const express = require('express');

// Initialize the client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Initialize Express app
const app = express();
const port = 3000;
app.get('/', (req, res) => {
    res.send('Bot is running and status updated!');
});
app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});

// Initialize REST API for command registration
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

// Define team roles
const teamRoles = {
    '1264252659376849060': 'AC Milan',
    '1264242077768880238': 'Atalanta',
    '1264252671767089193': 'Arsenal',
    '1264253762063564830': 'AS Roma',
    '1264244562290020434': 'Brighton',
    '1264252662271180974': 'Fiorentina',
    '1264252664959602699': 'Chelsea',
    '1264252976759836714': 'Inter Milan',
    '1264252674581332010': 'Manchester City',
    '1264252443118534710': 'Manchester United',
    '1264252653177671793': 'Liverpool',
    '1275090669085655071': 'Napoli',
    '1275090673309061141': 'Bolonga',
    '1275090659870638141': 'Juventus',
    '1264252668449132635': 'Tottenham',
    '1279921859340533864': 'Newcastle'
};

// Define commands
const commands = [
    {
        name: 'offer',
        description: 'Offer a contract to a user',
        options: [
            { name: 'user', type: 6, description: 'User to offer the contract to', required: true },
            { name: 'role', type: 3, description: 'Role to offer', required: true },
            { name: 'position', type: 3, description: 'Position for the contract', required: true }
        ]
    },
    {
        name: 'release',
        description: 'Release a user from their team',
        options: [
            { name: 'user', type: 6, description: 'User to release', required: true }
        ]
    },
    {
        name: 'promote',
        description: 'Promote a user to Assistant Manager',
        options: [
            { name: 'user', type: 6, description: 'User to promote', required: true }
        ]
    },
    {
        name: 'demote',
        description: 'Demote a user from Assistant Manager',
        options: [
            { name: 'user', type: 6, description: 'User to demote', required: true }
        ]
    },
    {
        name: 'roster_view',
        description: 'View roster for a specific role',
        options: [
            { name: 'role', type: 8, description: 'Role to view roster for', required: true }
        ]
    },
    {
        name: 'say',
        description: 'Make the bot say something in the channel',
        options: [
            { name: 'text', type: 3, description: 'Text to say', required: true }
        ]
    }
];

// Register commands
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();

// Update bot status
const statusMessages = ["[VEF]MP", "[VEF]MP"];
let currentIndex = 0;

function updateStatus() {
    const currentStatus = statusMessages[currentIndex];
    client.user.setPresence({
        activities: [{ name: currentStatus, type: ActivityType.Playing }],
        status: 'idle',
    });
    currentIndex = (currentIndex + 1) % statusMessages.length;
}

// Contract storage and expiration
const contracts = new Map();

// Periodically clean up expired contracts
setInterval(() => {
    const now = Date.now();
    for (const [contractId, contract] of contracts) {
        if (now > contract.expiration) {
            contracts.delete(contractId);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// Event handler when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    updateStatus();
    setInterval(updateStatus, 10000); // Update every 10 seconds
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const { commandName, options, member } = interaction;

    try {
        if (!member) {
            await interaction.reply({ content: 'Unable to fetch member data.', ephemeral: true });
            return;
        }

        const hasManagerRole = member.roles.cache.has(process.env.MANAGER_ROLE_ID);

        if (commandName === 'offer') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const teamRole = member.roles.cache.find(role => Object.keys(teamRoles).includes(role.id));
            if (!teamRole) {
                await interaction.reply({ content: 'You must have a valid Team role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const role = options.getString('role');
            const position = options.getString('position');
            const contractId = Math.floor(Math.random() * 1000000).toString();

            const roleToSign = interaction.guild.roles.cache.get(role);
            const rosterSize = roleToSign ? roleToSign.members.size : 0;

            const embed = new EmbedBuilder()
                .setColor(roleToSign ? roleToSign.color : '#0099ff')
                .setTitle(`[VEF] Contract Offer`)
                .setThumbnail('https://i.imgur.com/0tZwpyf.png')
                .addFields(
                    { name: 'Team', value: teamRoles[teamRole.id], inline: true },
                    { name: 'Contractor', value: member.user.tag, inline: true },
                    { name: 'Signee', value: user.tag, inline: true },
                    { name: 'Role', value: role, inline: true },
                    { name: 'Position', value: position, inline: true },
                    { name: 'Contract ID', value: contractId, inline: true },
                    { name: 'Coach', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Roster Size', value: rosterSize.toString(), inline: true }
                )
                .setFooter({ text: 'Contract System', iconURL: 'https://i.imgur.com/0tZwpyf.png' })
                .setTimestamp();

            const acceptButton = new ButtonBuilder()
                .setCustomId(`accept_contract_${contractId}`)
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(acceptButton);

            await interaction.deferReply({ ephemeral: true });

            try {
                await user.send({ embeds: [embed], components: [row] });

                // Store the contract
                contracts.set(contractId, {
                    userId: user.id,
                    roleId: role,
                    expiration: Date.now() + 10 * 60 * 60 * 1000 // 10 hours from now
                });

                await interaction.editReply({ content: `Contract offer sent to ${user.tag}.` });
            } catch (err) {
                console.error('Error sending contract offer:', err);
                await interaction.editReply({ content: 'Failed to send the contract offer. The user may have privacy settings preventing direct messages.' });
            }
        } else if (commandName === 'release') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);
            const teamRole = member.roles.cache.find(role => Object.keys(teamRoles).includes(role.id));

            if (teamRole) {
                await member.roles.remove(teamRole);
                await interaction.reply({ content: `${user.tag} has been released from their team.` });
            } else {
                await interaction.reply({ content: `${user.tag} does not have a team role.` });
            }
        } else if (commandName === 'promote') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);

            if (member) {
                await member.roles.add(process.env.ASSISTANT_MANAGER_ROLE_ID);
                await interaction.reply({ content: `${user.tag} has been promoted to Assistant Manager.` });
            } else {
                await interaction.reply({ content: 'User not found.' });
            }
        } else if (commandName === 'demote') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);

            if (member) {
                await member.roles.remove(process.env.ASSISTANT_MANAGER_ROLE_ID);
                await interaction.reply({ content: `${user.tag} has been demoted from Assistant Manager.` });
            } else {
                await interaction.reply({ content: 'User not found.' });
            }
        } else if (commandName === 'roster_view') {
            const roleId = options.getRole('role').id;
            const role = interaction.guild.roles.cache.get(roleId);

            if (role) {
                const members = role.members.map(member => member.user.tag).join('\n');
                const embed = new EmbedBuilder()
                    .setTitle(`Roster for ${role.name}`)
                    .setDescription(members || 'No members found')
                    .setColor(role.color || '#0099ff')
                    .setFooter({ text: 'Roster System', iconURL: 'https://i.imgur.com/0tZwpyf.png' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: 'Role not found.' });
            }
        } else if (commandName === 'say') {
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                return;
            }

            const text = options.getString('text');
            await interaction.reply({ content: text });
        }
    } catch (err) {
        console.error('Error handling interaction:', err);
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
    }
});

// Handle button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId, user } = interaction;

    if (customId.startsWith('accept_contract_')) {
        const contractId = customId.replace('accept_contract_', '');
        const contract = contracts.get(contractId);

        if (contract && contract.userId === user.id) {
            try {
                await interaction.reply({ content: 'Contract accepted!', ephemeral: true });

                // Notify the channel about the accepted contract
                const channel = client.channels.cache.get(process.env.CONTRACT_CHANNEL_ID);
                const contractRole = interaction.guild.roles.cache.get(contract.roleId);
                const embed = new EmbedBuilder()
                    .setColor(contractRole ? contractRole.color : '#0099ff')
                    .setTitle(`[VEF] Contract Accepted`)
                    .addFields(
                        { name: 'Team', value: teamRoles[contract.roleId], inline: true },
                        { name: 'Contractor', value: interaction.user.tag, inline: true },
                        { name: 'Signee', value: user.tag, inline: true },
                        { name: 'Role', value: contract.roleId, inline: true },
                        { name: 'Contract ID', value: contractId, inline: true }
                    )
                    .setFooter({ text: 'Contract System', iconURL: 'https://i.imgur.com/0tZwpyf.png' })
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
                contracts.delete(contractId);
            } catch (err) {
                console.error('Error processing contract acceptance:', err);
            }
        } else {
            await interaction.reply({ content: 'Invalid contract or user.', ephemeral: true });
        }
    }
});

client.login(process.env.BOT_TOKEN);
