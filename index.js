const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    StringSelectMenuBuilder
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

// OpenAI Config
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// CONFIG - EINGESETZTE IDs
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : '',
    HELP_PANEL_CHANNEL_ID: '1527708821320106164',   // Hilfe-Kanal
    TICKET_CATEGORY_ID: '1527708420788977674',     // Kategorie für Support-Tickets
    ADMIN_ROLE_NAME: 'Admin',                      // Name der Admin-Rolle
    HEAD_ADMIN_ROLE_NAME: 'Head Admin'             // Name der Head Admin-Rolle
};

// Express Webserver für Render
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

Hier ist das offizielle VGPL Regelwerk (FC 26 Saison 1), nach dem du alle Fragen beantwortest:

1. [span_0](start_span)KADER & MANAGEMENT[span_0](end_span):
- [span_1](start_span)Jeder Verein benötigt 1 Manager, 1 Co-Manager und mindestens 7 aktive Spieler[span_1](end_span).
- [span_2](start_span)Ein Team darf ein Spiel erst ab 7 Spielern beginnen[span_2](end_span).
- [span_3](start_span)Jeder Spieler darf nur 1 VGPL-Konto haben und pro Saison nur für 1 Verein spielen[span_3](end_span).

2. [span_4](start_span)GRÖSSENLIMITS & FORMATIONEN (§17)[span_4](end_span):
- [span_5](start_span)Innenverteidiger (IV): Maximal 1,87 m[span_5](end_span).
- [span_6](start_span)Alle übrigen Feldspieler: Maximal 1,82 m[span_6](end_span).
- [span_7](start_span)Torhüter (TW): Keine Größenbeschränkung[span_7](end_span).
- [span_8](start_span)Formationsregeln[span_8](end_span):
  * 3er-Kette: max. [span_9](start_span)3 IVs mit 1,87 m[span_9](end_span).
  * 4er-Kette: max. [span_10](start_span)2 IVs mit 1,87 m + zusätzlich darf 1 ZDM 1,87 m groß sein[span_10](end_span).
  * 5er-Kette: max. [span_11](start_span)3 IVs mit 1,87 m[span_11](end_span).

3. [span_12](start_span)STREAMPFLICHT (§19)[span_12](end_span):
- [span_13](start_span)Alle Ligaspiele MÜSSEN live auf Twitch, YouTube oder Kick übertragen werden[span_13](end_span).
- [span_14](start_span)Streamlink spätestens 5 Minuten vor Spielbeginn im Discord posten[span_14](end_span)!
- [span_15](start_span)Das VOD muss mindestens 48 Stunden gespeichert bleiben[span_15](end_span).

4. [span_16](start_span)[span_17](start_span)[span_18](start_span)SPIELBETRIEB & DISCONNECTS (§6, §7, §20)[span_16](end_span)[span_17](end_span)[span_18](end_span):
- [span_19](start_span)Wartezeit bei Verspätung: maximal 10 Minuten[span_19](end_span). [span_20](start_span)Danach ist ein 0:3 Wertungsantrag möglich[span_20](end_span).
- [span_21](start_span)Disconnect vor Minute 10 (kein Tor, keine rote Karte): Spiel wird neu gestartet[span_21](end_span).
- [span_22](start_span)Live-Join Verbot: Nach Anpfiff darf kein Spieler per Live-Join beitreten[span_22](end_span)! [span_23](start_span)Strafe: Sofort 0:3 Wertung gegen das Team[span_23](end_span).

5. [span_24](start_span)[span_25](start_span)[span_26](start_span)PROTESTE & BEWEISE (§10, §21, §22)[span_24](end_span)[span_25](end_span)[span_26](end_span):
- [span_27](start_span)[span_28](start_span)Proteste müssen innerhalb von 24 Stunden nach Spielende mit Video-/Bildbeweisen eingereicht werden[span_27](end_span)[span_28](end_span).
- [span_29](start_span)[span_30](start_span)[span_31](start_span)Endergebnis- und Match-Facts-Screenshots müssen von jedem Verein gesichert werden[span_29](end_span)[span_30](end_span)[span_31](end_span).

6. [span_32](start_span)GESCHLECHTERREGELUNG (§18)[span_32](end_span):
- [span_33](start_span)Das Spielerprofil/Pro muss dem tatsächlichen Geschlecht des echten Spielers entsprechen[span_33](end_span).

Anweisungen:
- Antworte auf Fragen direkt, freundlich und auf den Punkt.
- Wenn du eine Frage nicht beantworten kannst oder der User ein spezielles Anliegen hat, weise ihn höflich auf den Button "Admin rufen 🔔" hin.
`;

client.once('ready', async () => {
    console.log(`🎉 VGPL Support-Bot ERFOLGREICH EINGELOGGT als ${client.user.tag}`);

    try {
        const helpChannel = await client.channels.fetch(CONFIG.HELP_PANEL_CHANNEL_ID).catch(() => null);
        if (helpChannel) {
            const messages = await helpChannel.messages.fetch({ limit: 10 });
            const hasPanel = messages.some(msg => msg.embeds.length > 0 && msg.components.length > 0);

            if (!hasPanel) {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ VGPL Germany — Support & Hilfe')
                    .setDescription(
                        'Willkommen beim offiziellen Support-System der VGPL Germany!\n\n' +
                        'Wähle unten im Dropdown-Menü die passende Kategorie aus, um ein privates Ticket zu erstellen. Unser Team hilft dir umgehend bei deinen Fragen weiter.'
                    )
                    .setColor('#0099FF')
                    .setFooter({ text: 'VGPL Germany • Official Support' });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_help_category')
                    .setPlaceholder('📂 Kategorie auswählen...')
                    .addOptions([
                        { label: 'Allgemeine Fragen', value: 'cat_allgemein', description: 'Fragen zu Terminen, Ligaroutinen oder Ablauf', emoji: '❓' },
                        { label: 'Regelwerk & Größenlimits', value: 'cat_regeln', description: 'Fragen zu IV-Größen, Streams, Disconnects', emoji: '📜' },
                        { label: 'Technik & Discord/Website', value: 'cat_technik', description: 'Probleme mit der Website, Discord oder Rängen', emoji: '🛠️' },
                        { label: 'Ligaleitung / Admin-Kontakt', value: 'cat_admin', description: 'Direktes Anliegen an das Admin-Team', emoji: '📩' }
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

        // 1. TICKET ERSTELLEN
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_help_category') {
            await interaction.deferReply({ ephemeral: true });

            const member = interaction.member;
            const selectedValue = interaction.values[0];
            let categoryName = 'Support';

            if (selectedValue === 'cat_allgemein') categoryName = 'Allgemein';
            if (selectedValue === 'cat_regeln') categoryName = 'Regelwerk';
            if (selectedValue === 'cat_technik') categoryName = 'Technik';
            if (selectedValue === 'cat_admin') categoryName = 'Admin';

            const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase());
            const headAdminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.HEAD_ADMIN_ROLE_NAME.toLowerCase());

            const permissionOverwrites = [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageChannels] }
            ];

            if (adminRole) permissionOverwrites.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] });
            if (headAdminRole) permissionOverwrites.push({ id: headAdminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] });

            const ticketChannel = await guild.channels.create({
                name: `ticket-${categoryName.toLowerCase()}-${member.user.username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: CONFIG.TICKET_CATEGORY_ID,
                permissionOverwrites: permissionOverwrites
            });

            // SCHÖNES, SAUBERES EMBED OHNE KI-ASSISTENT TEXT
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`📩 Ticket eröffnet: ${categoryName}`)
                .setDescription(
                    `Hallo ${member}!\n\n` +
                    `Vielen Dank für deine Anfrage. Bitte schildere dein Anliegen so genau wie möglich.\n\n` +
                    `• **Kategorie:** ${categoryName}\n` +
                    `• **Status:** Offen\n\n` +
                    `Falls du direkt ein Teammitglied hinzurufen möchtest, klicke einfach auf den Button **"Admin rufen 🔔"**.`
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

            await ticketChannel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [row] });

            // Ephemerale Bestätigung an den User senden
            await interaction.editReply({ content: `✅ Dein Support-Ticket wurde erstellt: ${ticketChannel}` });
        }

        // 2. ADMIN RUFEN BUTTON
        if (interaction.isButton() && interaction.customId === 'btn_call_admin') {
            const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase());
            const headAdminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.HEAD_ADMIN_ROLE_NAME.toLowerCase());

            let pingMessage = `🔔 **ADMIN ANFORDERUNG!** ${interaction.user} benötigt Unterstützung von einem Admin!`;
            const mentions = [];
            if (adminRole) { pingMessage += ` ${adminRole}`; mentions.push(adminRole.id); }
            if (headAdminRole) { pingMessage += ` ${headAdminRole}`; mentions.push(headAdminRole.id); }

            await interaction.reply({
                content: pingMessage,
                allowedMentions: { roles: mentions }
            });
        }

        // 3. TICKET SCHLIESSEN
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await interaction.reply({ content: '🔒 Ticket wird in 5 Sekunden geschlossen...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    } catch (err) {
        console.error("Fehler bei Interaktion:", err);
    }
});

// 4. SUPPORTEINGABE & KI ANTWORT IM TICKET
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.channel.name.startsWith('ticket-')) return;

    await message.channel.sendTyping();

    try {
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
        await message.reply("⚠️ Bitte nutze den **'Admin rufen 🔔'** Button, um direkt Hilfe von einem Teammitglied zu erhalten.");
    }
});

client.login(CONFIG.TOKEN);
