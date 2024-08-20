const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionType, ActivityType } = require('discord.js');
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

// Define commands
const commands = [
    {
        name: 'offer',
        description: 'Offer a contract to a user',
        options: [
            {
                type: 6, // USER
                name: 'user',
                description: 'User to offer the contract to',
                required: true
            },
            {
                type: 3, // STRING
                name: 'role',
                description: 'Role for the user',
                required: true
            },
            {
                type: 3, // STRING
                name: 'position',
                description: 'Position for the user',
                required: true
            }
        ]
    },
    {
        name: 'release',
        description: 'Release a user from their team',
        options: [
            {
                type: 6, // USER
                name: 'user',
                description: 'User to release',
                required: true
            }
        ]
    },
    {
        name: 'promote',
        description: 'Promote a user to Assistant Manager',
        options: [
            {
                type: 6, // USER
                name: 'user',
                description: 'User to promote',
                required: true
            }
        ]
    },
    {
        name: 'demote',
        description: 'Demote a user from Assistant Manager',
        options: [
            {
                type: 6, // USER
                name: 'user',
                description: 'User to demote',
                required: true
            }
        ]
    },
    {
        name: 'roster_view',
        description: 'View roster for a specific role',
        options: [
            {
                type: 8, // ROLE
                name: 'role',
                description: 'Role to view roster for',
                required: true
            }
        ]
    }
];

// Register commands
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();

// Update bot status
const statusMessages = ["WATCHING VEF", "WATCHING VEF"];
let currentIndex = 0;

function updateStatus() {
    const currentStatus = statusMessages[currentIndex];

    client.user.setPresence({
        activities: [{ name: currentStatus, type: ActivityType.Custom }],
        status: 'dnd',
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

            const embed = new EmbedBuilder()
                .setTitle('CONTRACT OFFER')
                .addFields(
                    { name: 'Team', value: teamRoles[teamRole.id] },
                    { name: 'Contractor', value: member.user.tag },
                    { name: 'Signee', value: user.tag },
                    { name: 'Role', value: role },
                    { name: 'Position', value: position },
                    { name: 'Contract ID', value: contractId }
                );

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
                        await i.update({ content: 'Contract accepted.', embeds: [embed], components: [] });

                        const channel = client.channels.cache.get(process.env.CONTRACT_CHANNEL_ID);
                        if (channel) {
                            await channel.send({ embeds: [embed] });
                        }
                    }
                });

                await interaction.editReply({ content: `Offering contract to ${user.tag}...` });
            } catch (err) {
                console.error('Error sending contract offer:', err);
                await interaction.editReply({ content: 'There was an error sending the contract offer.', ephemeral: true });
            }
        } else if (commandName === 'release') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');

            const embed = new EmbedBuilder()
                .setTitle('RELEASED')
                .setDescription(`${user.tag} has been released from their team.`)
                .addFields({ name: 'Manager', value: member.user.tag });

            const channel = client.channels.cache.get(process.env.RELEASE_CHANNEL_ID);
            if (channel) {
                await channel.send({ embeds: [embed] });
            }

            await interaction.reply({ content: `Released ${user.tag}.`, ephemeral: true });
        } else if (commandName === 'promote') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const memberToPromote = await interaction.guild.members.fetch(user.id);

            if (memberToPromote) {
                await memberToPromote.roles.add(process.env.ASSISTANT_MANAGER_ROLE_ID);
                await interaction.reply({ content: `Promoted ${user.tag} to Assistant Manager.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `User ${user.tag} not found.`, ephemeral: true });
            }
        } else if (commandName === 'demote') {
            if (!hasManagerRole) {
                await interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
                return;
            }

            const user = options.getUser('user');
            const memberToDemote = await interaction.guild.members.fetch(user.id);

            if (memberToDemote) {
                await memberToDemote.roles.remove(process.env.ASSISTANT_MANAGER_ROLE_ID);
                await interaction.reply({ content: `Demoted ${user.tag} from Assistant Manager.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `User ${user.tag} not found.`, ephemeral: true });
            }
        } else if (commandName === 'roster_view') {
            const role = options.getRole('role');

            if (!role) {
                await interaction.reply({ content: 'Role not found.', ephemeral: true });
                return;
            }

            const membersWithRole = role.members.map(member => member.user.tag).join('\n') || 'No members with this role.';

            const embed = new EmbedBuilder()
                .setTitle('ROSTER VIEW')
                .setDescription(membersWithRole)
                .setFooter({ text: `Role ID: ${role.id}` });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: 'There was an error while executing this command.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
        }
    }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);
