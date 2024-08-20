const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionType, ActivityType } = require('discord.js');
require('dotenv').config();
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const app = express();
const port = 3000;
app.get('/', (req, res) => {
  res.send('Bot is running and status updated!');
});
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const statusMessages = ["WATCHING VEF", "WATCHING VEF"];
let currentIndex = 0;

const teamRoles = {
    '1275093298389712914': 'AC Milan',
    '1275093298389712913': 'Ajax',
    '1275093298389712912': 'Arsenal',
    '1275093298389712911': 'AS Roma',
    '1275093298389712910': 'Bayern Munich',
    '1275093298389712909': 'Dortmund',
    '1275093298389712908': 'FC Barcelona',
    '1275093298389712907': 'Inter Milan',
    '1275093298389712906': 'Manchester City',
    '1275093298356420831': 'Real Madrid',
    '1275093298356420830': 'Paris Saint-Germain'
};

function updateStatus() {
    const currentStatus = statusMessages[currentIndex];

    client.user.setPresence({
        activities: [{ name: currentStatus, type: ActivityType.Custom }],
        status: 'dnd',
    });

    currentIndex = (currentIndex + 1) % statusMessages.length;
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

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
            description: 'Release a user from a team',
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
            description: 'View members with a specific role',
            options: [
                { name: 'role', type: 8, description: 'Role to view members of', required: true }
            ]
        }
    ];

    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }

    updateStatus();
    setInterval(updateStatus, 10000);  // Update every 10 seconds
});

client.on('interactionCreate', async interaction => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const { commandName, options, member } = interaction;

    try {
        const hasManagerRole = member.roles.cache.has(process.env.MANAGER_ROLE_ID);

        if (commandName === 'offer') {
            if (!hasManagerRole) {
                return interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
            }

            const teamRole = member.roles.cache.find(role => Object.keys(teamRoles).includes(role.id));

            if (!teamRole) {
                return interaction.reply({ content: 'You must have a valid Team role to use this command.', ephemeral: true });
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

            await interaction.reply({ content: `Offering contract to ${user.tag}...`, ephemeral: true });

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
            } catch (err) {
                console.error('Error sending contract offer:', err);
            }

        } else if (commandName === 'release') {
            if (!hasManagerRole) {
                return interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
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
                return interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
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
                return interaction.reply({ content: 'You must have the Manager role to use this command.', ephemeral: true });
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
                return interaction.reply({ content: 'Role not found.', ephemeral: true });
            }

            const membersWithRole = interaction.guild.members.cache.filter(member => member.roles.cache.has(role.id));

            if (membersWithRole.size === 0) {
                return interaction.reply({ content: `No members found with the role ${role.name}.`, ephemeral: true });
            }

            const memberList = membersWithRole.map(member => member.user.tag).join('\n');
            const embed = new EmbedBuilder()
                .setTitle(`Members with the role ${role.name}`)
                .setDescription(memberList);

            await interaction.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
    }
});

client.login(process.env.BOT_TOKEN);
