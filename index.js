const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const OpenAI = require('openai');

console.log("==================================================");
console.log("VGPL Support-System wird gestartet...");
console.log("==================================================");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// OpenAI Config (prüft ob Key vorhanden)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// CONFIG - EINGESETZTE IDs
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : '',
    HELP_PANEL_CHANNEL_ID: '1527708821320106164',   // Hilfe-Kanal ID
    TICKET_CATEGORY_ID: '1527708420788977674',     // Kategorie für Support-Tickets ID
    ADMIN_ROLE_NAME: 'Admin',                      // Name der Admin-Rolle
    HEAD_ADMIN_ROLE_NAME: 'Head Admin'             // Name der Head Admin-Rolle
};

// Express Webserver für Render Keep-Alive
const http = require('http');
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VGPL Support Bot laeuft online!\n');
}).listen(port, () => {
    console.log(`[WEBSERVER] Aktiv auf Port ${port}`);
});

// SYSTEM PROMPT MIT DEM OFFIZIELLEN REGELWERK
const SYSTEM_RULESET = `
Du bist der offizielle Support-Assistent der 'VGPL Germany' (virtual Gaming Premier League - EA SPORTS FC Pro Clubs).
Antworte immer höflich, präzise, übersichtlich und hilfsbereit auf Deutsch. Stell dich NICHT als Roboter oder KI vor, sondern antworte direkt, professionell und wie ein echtes Support-Teammitglied.

Hier ist das offizielle VGPL Regelwerk (FC 26 Saison 1):
- Innenverteidiger (IV): Max. 1,87 m. Übrige Feldspieler: Max. 1,82 m. TW: keine Grenze.
- Formationen: 3er-Kette max. 3 IV (1,87 m); 4er-Kette max. 2 IV + 1 ZDM (1,87 m); 5er-Kette max. 3 IV.
- Mindestspielerzahl: 7 Spieler pro Spiel.
- Streampflicht: Alle Ligaspiele live (Twitch/YouTube/Kick). Link 5 Min. vorher in Discord. VOD 48h speichern.
- Wartezeit: Max. 10 Min.
- Disconnects: Vor Min. 10 ohne Tor/Karte -> Neustart. Nach Min. 10 -> Entscheidung der Ligaleitung.
- Live-Join Verbot: Nach Anpfiff kein Beitreten per Live-Join erlaubt (Sofort 0:3).
- Proteste: Innerhalb von 24 Stunden mit Beweisen einreichen.
- Spielverschiebung: Termine müssen rechtzeitig abgesprochen und über das System beantragt werden.
`;

client.once('ready', async () => {
    console.log(`🎉 VGPL Support-Bot ERFOLGREICH EINGELOGGT als ${client.user.tag}`);

    try {
        const helpChannel = await client.channels.fetch(CONFIG.HELP_PANEL_CHANNEL_ID).catch(() => null);
        if (helpChannel) {
            const messages = await helpChannel.messages.fetch({ limit: 10 }).catch(() => null);
            const hasPanel = messages && messages.some(msg => msg.embeds.length > 0 && msg.components.length > 0);

            if (!hasPanel) {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ VGPL Germany — Support & Anfragen')
                    .setDescription(
                        'Willkommen beim offiziellen Support-System der VGPL Germany!\n\n' +
                        'Wähle unten im Dropdown-Menü die passende Kategorie aus. Es öffnet sich ein kurzes **Formular**, um dein Anliegen zu erfassen.'
                    )
                    .setColor('#0099FF')
                    .setFooter({ text: 'VGPL Germany • Official Support' });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_help_category')
                    .setPlaceholder('📂 Kategorie auswählen...')
                    .addOptions([
                        { label: 'Allgemeines und Fragen', value: 'cat_allgemein', description: 'Fragen zu Ligaroutinen oder allgemeinem Ablauf', emoji: '❓' },
                        { label: 'Regelwerk und Größenlimits', value: 'cat_regeln', description: 'Fragen zum Regelwerk, Größen & Formationen', emoji: '📜' },
                        { label: 'Spielbetrieb und Disconnects', value: 'cat_spielbetrieb', description: 'Wartezeit, Abbruch vor/nach Min. 10, Live-Join', emoji: '⚽' },
                        { label: 'Streampflicht und VOD', value: 'cat_stream', description: 'Streamlinks, Aufnahmepflicht & VOD-Speicherung', emoji: '🎥' },
                        { label: 'Proteste und Wertungen', value: 'cat_protest', description: 'Protest einreichen, Match-Facts & Beweise', emoji: '⚖️' },
                        { label: 'Spielverschiebung und Termine', value: 'cat_termine', description: 'Terminabsprachen & Spielverschiebungen', emoji: '📅' },
                        { label: 'Technik, Webseite und Ränge', value: 'cat_technik', description: 'Probleme mit der Website, Rängen oder Discord', emoji: '🛠️' }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);
                await helpChannel.send({ embeds: [embed], components: [row] });
                console.log('Support-Panel erfolgreich gesendet!');
            }
        }
    } catch (err) {
        console.error('Fehler beim Senden des Hilfe-Panels:', err);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        const guild = interaction.guild;
        if (!guild) return;

        // 1. DROPDOWN AUSWAHL -> FORMULAR (MODAL) ÖFFNEN
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_help_category') {
            const selectedValue = interaction.values[0];

            let title = 'Support-Anfrage';
            if (selectedValue === 'cat_allgemein') title = 'Allgemeines & Fragen';
            if (selectedValue === 'cat_regeln') title = 'Regelwerk & Größenlimits';
            if (selectedValue === 'cat_spielbetrieb') title = 'Spielbetrieb & Disconnects';
            if (selectedValue === 'cat_stream') title = 'Streampflicht & VOD';
            if (selectedValue === 'cat_protest') title = 'Protest & Wertung';
            if (selectedValue === 'cat_termine') title = 'Spielverschiebung & Termine';
            if (selectedValue === 'cat_technik') title = 'Technik, Webseite & Ränge';

            const modal = new ModalBuilder()
                .setCustomId(`modal_ticket_${selectedValue}`)
                .setTitle(title);

            const teamInput = new TextInputBuilder()
                .setCustomId('ticket_teamname')
                .setLabel('Dein Team- / Vereinsname (falls vorhanden)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z. B. FC Musterstadt')
                .setRequired(false);

            const detailsInput = new TextInputBuilder()
                .setCustomId('ticket_details')
                .setLabel('Beschreibe dein Anliegen')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Bitte schildere deine Frage oder das Problem so genau wie möglich...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(teamInput),
                new ActionRowBuilder().addComponents(detailsInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // 2. FORMULAR ABGESENDET -> TICKET ERSTELLEN
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
            // Unverzüglich deklarieren, um Timeout abzufangen
            await interaction.deferReply({ ephemeral: true });

            const categoryType = interaction.customId.replace('modal_ticket_', '');
            const teamName = interaction.fields.getTextInputValue('ticket_teamname') || 'Keine Angabe';
            const details = interaction.fields.getTextInputValue('ticket_details');
            const member = interaction.member;

            let categoryName = 'Support';
            if (categoryType === 'cat_allgemein') categoryName = 'Allgemeines';
            if (categoryType === 'cat_regeln') categoryName = 'Regelwerk';
            if (categoryType === 'cat_spielbetrieb') categoryName = 'Spielbetrieb';
            if (categoryType === 'cat_stream') categoryName = 'Streampflicht';
            if (categoryType === 'cat_protest') categoryName = 'Protest';
            if (categoryType === 'cat_termine') categoryName = 'Spielverschiebung';
            if (categoryType === 'cat_technik') categoryName = 'Technik';

            const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase());
            const headAdminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.HEAD_ADMIN_ROLE_NAME.toLowerCase());

            const permissionOverwrites = [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ];

            if (adminRole) {
                permissionOverwrites.push({
                    id: adminRole.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
                });
            }
            if (headAdminRole) {
                permissionOverwrites.push({
                    id: headAdminRole.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
                });
            }

            // Ticket Kanal anlegen
            let ticketChannel;
            try {
                ticketChannel = await guild.channels.create({
                    name: `ticket-${categoryName.toLowerCase()}-${member.user.username.toLowerCase()}`,
                    type: ChannelType.GuildText,
                    parent: CONFIG.TICKET_CATEGORY_ID,
                    permissionOverwrites: permissionOverwrites
                });
            } catch (err) {
                console.error("Kanal-Erstellung fehlgeschlagen:", err);
                await interaction.editReply({ content: "❌ Der Ticket-Kanal konnte nicht erstellt werden." });
                return;
            }

            // Embed & Buttons definieren
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`📩 Support-Ticket: ${categoryName}`)
                .setDescription(
                    `Hallo ${member}!\n\n` +
                    `Deine Angaben wurden erfasst:\n\n` +
                    `• **Verein / Team:** ${teamName}\n` +
                    `• **Anliegen:**\n> ${details}\n\n` +
                    `Ein Support-Mitarbeiter wird sich in Kürze bei dir melden. Falls du dringend einen Admin brauchst, klicke auf **"Admin rufen 🔔"**.`
                )
                .setColor('#0099FF')
                .setTimestamp();

            const callAdminBtn = new ButtonBuilder()
                .setCustomId('btn_call_admin')
                .setLabel('Admin rufen 🔔')
                .setStyle(ButtonStyle.Warning);

            const closeBtn = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen 🔒')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(callAdminBtn, closeBtn);

            // ERST DIE NACHRICHT SCHREIBEN (Garantierte Zustellung)
            await ticketChannel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [row] });
           
            // Ephemerale Bestätigung an den ersteller
            await interaction.editReply({ content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}` });

            // JETZT ERST OPTIONAL DIE KI FRAGEN (stürzt nie den Kanal ab)
            if (openai) {
                try {
                    await ticketChannel.sendTyping();
                    const aiResponse = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: SYSTEM_RULESET },
                            { role: "user", content: `Kategorie: ${categoryName}. Verein: ${teamName}. Anliegen: ${details}` }
                        ],
                        max_tokens: 400
                    });
                    const aiAnswer = aiResponse.choices[0].message.content;
                    await ticketChannel.send(`💬 **Erste Einschätzung:**\n${aiAnswer}`);
                } catch (err) {
                    console.error("OpenAI Fehler:", err);
                }
            }
            return;
        }

        // 3. ADMIN RUFEN BUTTON
        if (interaction.isButton() && interaction.customId === 'btn_call_admin') {
            const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase());
            const headAdminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.HEAD_ADMIN_ROLE_NAME.toLowerCase());

            let pingMessage = `🔔 **ADMIN ANFORDERUNG!** ${interaction.user} benötigt Unterstützung!`;
            const mentions = [];
            if (adminRole) { pingMessage += ` ${adminRole}`; mentions.push(adminRole.id); }
            if (headAdminRole) { pingMessage += ` ${headAdminRole}`; mentions.push(headAdminRole.id); }

            await interaction.reply({
                content: pingMessage,
                allowedMentions: { roles: mentions }
            });
            return;
        }

        // 4. TICKET SCHLIESSEN BUTTON
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: '🔒 Ticket wird in 5 Sekunden gelöscht...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            return;
        }
    } catch (err) {
        console.error("Fehler bei Interaktion:", err);
    }
});

// 5. FOLGENACHRICHTEN IM TICKET
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.channel.name.startsWith('ticket-')) return;
    if (!openai) return;

    try {
        await message.channel.sendTyping();
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: SYSTEM_RULESET },
                { role: "user", content: message.content }
            ],
            max_tokens: 500
        });

        const aiAnswer = response.choices[0].message.content;
        await message.reply(aiAnswer);

    } catch (err) {
        console.error("OpenAI API Fehler:", err);
    }
});

client.login(CONFIG.TOKEN);
