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
            // Check if the member has the Manager role
            const hasManagerRole = member.roles.cache.has(process.env.MANAGER_ROLE_ID);
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            // Check for a valid team role
            const teamRole = member.roles.cache.find(role => Object.keys(process.env.TEAM_ROLES).includes(role.id));
            if (!teamRole) {
                await interaction.reply({ content: 'You must have a valid Team role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const roleId = options.getString('role');
            const position = options.getString('position');
            const contractId = Math.floor(Math.random() * 1000000).toString();

            const roleToSign = interaction.guild.roles.cache.get(roleId);

            // Check if the role exists in the guild
            if (!roleToSign) {
                await interaction.reply({ content: 'Invalid role ID.', ephemeral: true });
                return;
            }

            const rosterSize = roleToSign.members.size;

            const embed = new EmbedBuilder()
                .setColor(roleToSign.color || '#0099ff')
                .setTitle(`[VEF] Contract Offer`)
                .setThumbnail('https://i.imgur.com/0tZwpyf.png') // Replace with your team logo URL
                .addFields(
                    { name: 'Team', value: process.env.TEAM_ROLES[teamRole.id] || 'Unknown', inline: true },
                    { name: 'Contractor', value: member.user.tag, inline: true },
                    { name: 'Signee', value: user.tag, inline: true },
                    { name: 'Role', value: roleId, inline: true },
                    { name: 'Position', value: position, inline: true },
                    { name: 'Contract ID', value: contractId, inline: true },
                    { name: '\u200B', value: '\u200B' }, // Empty field for spacing
                    { name: 'Coach', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Roster Size', value: rosterSize.toString(), inline: true }
                )
                .setFooter({ text: 'Contract System', iconURL: 'https://i.imgur.com/0tZwpyf.png' })
                .setTimestamp();

            const acceptButton = new ButtonBuilder()
                .setCustomId('accept_contract')
                .setLabel('✅ Accept')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(acceptButton);

            await interaction.deferReply({ ephemeral: true });

            try {
                const message = await user.send({ embeds: [embed], components: [row] });

                const filter = i => i.customId === 'accept_contract' && i.user.id === user.id;
                const collector = message.createMessageComponentCollector({ filter, time: 60000 });

                collector.on('collect', async i => {
                    if (i.customId === 'accept_contract') {
                        await i.update({ content: '✅ Contract accepted!', embeds: [embed], components: [] });

                        const guildMember = interaction.guild.members.cache.get(user.id);
                        if (guildMember) {
                            await guildMember.roles.add(teamRole);
                        }

                        const channel = client.channels.cache.get(process.env.CONTRACT_CHANNEL_ID);
                        if (channel) {
                            await channel.send({ embeds: [embed] });
                        }
                    }
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await interaction.editReply({ content: 'No response from the signee. Contract offer expired.', ephemeral: true });
                    }
                });

                await interaction.editReply({ content: `Contract offer sent to ${user.tag}.`, ephemeral: true });
            } catch (err) {
                console.error('Error sending contract offer:', err);
                await interaction.editReply({ content: 'There was an error sending the contract offer.', ephemeral: true });
            }
        } else if (commandName === 'demote') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const member = interaction.guild.members.cache.get(user.id);
            const roleToRemove = interaction.guild.roles.cache.get(process.env.DEMOTE_ROLE_ID); // Replace with the specific role ID you want to remove

            if (member && roleToRemove) {
                await member.roles.remove(roleToRemove);

                const embed = new EmbedBuilder()
                    .setTitle('🔻 Player Demoted')
                    .setColor('#ffff00')
                    .addField('Player:', user.tag)
                    .setFooter({ text: 'Contract System' });

                const channel = client.channels.cache.get(process.env.DEMOTE_CHANNEL_ID);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                }

                await interaction.reply({ content: `Player ${user.tag} has been demoted.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Unable to find the user or role.', ephemeral: true });
            }
        } else if (commandName === 'roster_view') {
            const role = options.getRole('role');
            if (!role) {
                await interaction.reply({ content: 'Role not found.', ephemeral: true });
                return;
            }

            const members = role.members.map(member => member.nickname ? `<@${member.id}> (${member.nickname})` : `<@${member.id}>`).join('\n') || 'No members found.';

            const embed = new EmbedBuilder()
                .setTitle(`Roster for ${role.name}`)
                .setDescription(members)
                .setColor(role.color)
                .setFooter({ text: 'Roster System' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (commandName === 'say') {
            if (!member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ content: 'You must have admin permissions to use this command.', ephemeral: true });
                return;
            }

            const text = options.getString('text');
            await interaction.reply({ content: text });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        await interaction.reply({ content: 'There was an error processing your command.', ephemeral: true });
    }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);
