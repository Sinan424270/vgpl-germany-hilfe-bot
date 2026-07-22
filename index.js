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
console.log("VGPL KI-Hilfe-Bot wird gestartet...");
console.log("==================================================");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// OpenAI Config (ChatGPT)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// CONFIG - EINGESETZTE KANAL- & KATEGORIE-IDs
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : '',
    HELP_PANEL_CHANNEL_ID: '1527708821320106164',   // Hilfe-Kanal
    TICKET_CATEGORY_ID: '1527708420788977674',     // Kategorie für Support-Tickets
    ADMIN_ROLE_NAME: 'Admin',                      // Name der Admin-Rolle
    HEAD_ADMIN_ROLE_NAME: 'Head Admin'             // Name der Head Admin-Rolle
};

// Express Webserver für Render (damit der Bot online bleibt)
const http = require('http');
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('VGPL Germany KI Support Bot laeuft online!\n');
}).listen(port, () => {
    console.log(`[WEBSERVER] Aktiv auf Port ${port}`);
});

// SYSTEM PROMPT MIT DEM OFFIZIELLEN REGELWERK (FC 26)
const SYSTEM_RULESET = `
Du bist der offizielle KI-Support-Assistent der 'VGPL Germany' (virtual Gaming Premier League - EA SPORTS FC Pro Clubs).
Antworte immer höflich, präzise, übersichtlich und hilfsbereit auf Deutsch.

Hier ist das offizielle VGPL Regelwerk (FC 26 Saison 1), nach dem du alle Fragen beantwortest:

1. KADER & MANAGEMENT:
- Jeder Verein benötigt 1 Manager, 1 Co-Manager und mindestens 7 aktive Spieler.
- Ein Team darf ein Spiel erst ab 7 Spielern beginnen.
- Jeder Spieler darf nur 1 VGPL-Konto haben und pro Saison nur für 1 Verein spielen.

2. GRÖSSENLIMITS & FORMATIONEN (§17):
- Innenverteidiger (IV): Maximal 1,87 m.
- Alle übrigen Feldspieler: Maximal 1,82 m.
- Torhüter (TW): Keine Größenbeschränkung.
- Formationsregeln:
  * 3er-Kette: max. 3 IVs mit 1,87 m.
  * 4er-Kette: max. 2 IVs mit 1,87 m + zusätzlich darf 1 ZDM 1,87 m groß sein.
  * 5er-Kette: max. 3 IVs mit 1,87 m.

3. STREAMPFLICHT (§19):
- Alle Ligaspiele MÜSSEN live auf Twitch, YouTube oder Kick übertragen werden.
- Streamlink spätestens 5 Minuten vor Spielbeginn im Discord posten!
- Das VOD muss mindestens 48 Stunden gespeichert bleiben.

4. SPIELBETRIEB & DISCONNECTS (§6, §7, §20):
- Wartezeit bei Verspätung: maximal 10 Minuten. Danach ist ein 0:3 Wertungsantrag möglich.
- Disconnect vor Minute 10 (kein Tor, keine rote Karte): Spiel wird neu gestartet.
- Live-Join Verbot: Nach Anpfiff darf kein Spieler per Live-Join beitreten! Strafe: Sofort 0:3 Wertung gegen das Team.

5. PROTESTE & BEWEISE (§10, §21, §22):
- Proteste müssen innerhalb von 24 Stunden nach Spielende mit Video-/Bildbeweisen eingereicht werden.
- Endergebnis- und Match-Facts-Screenshots müssen von jedem Verein gesichert werden.

6. GESCHLECHTERREGELUNG (§18):
- Das Spielerprofil/Pro muss dem tatsächlichen Geschlecht des echten Spielers entsprechen.

Anweisungen an dich:
- Wenn du eine Frage anhand des Regelwerks beantworten kannst, antworte direkt, klar und höflich.
- Falls der User ein komplexes Problem hat oder nach einem Admin fragt, weise ihn freundlich darauf hin, auf den Button "Admin rufen 🔔" zu klicken.
`;

client.once('ready', async () => {
    console.log("==================================================");
    console.log(`🎉 KI-Hilfe-Bot ERFOLGREICH EINGELOGGT als ${client.user.tag}`);
    console.log("==================================================");

    try {
        const helpChannel = await client.channels.fetch(CONFIG.HELP_PANEL_CHANNEL_ID).catch(() => null);
        if (helpChannel) {
            const messages = await helpChannel.messages.fetch({ limit: 10 });
            const hasPanel = messages.some(msg => msg.embeds.length > 0 && msg.components.length > 0);

            if (!hasPanel) {
                const embed = new EmbedBuilder()
                    .setTitle('❓ VGPL Germany - Hilfe & Support')
                    .setDescription('Wähle unten im Menü die passende Kategorie, um ein Support-Ticket zu öffnen.\n\nUnser **KI-Assistent** antwortet dir direkt im Ticket auf Basis des offiziellen Regelwerks!')
                    .setColor('#00AAFF')
                    .setFooter({ text: 'VGPL Germany Support System' });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_help_category')
                    .setPlaceholder('Wähle eine Support-Kategorie...')
                    .addOptions([
                        { label: 'Allgemeine Fragen', value: 'cat_allgemein', description: 'Fragen zu Ligaroutinen, Terminen oder Ablauf', emoji: '❓' },
                        { label: 'Regelwerk & Größenlimits', value: 'cat_regeln', description: 'Fragen zu IV-Größen, Streams, Disconnects etc.', emoji: '📜' },
                        { label: 'Technik & Discord/Website', value: 'cat_technik', description: 'Probleme mit der Website oder Rängen', emoji: '🛠️' },
                        { label: 'Sonstiges / Admin-Kontakt', value: 'cat_admin', description: 'Direkter Kontakt zur Ligaleitung', emoji: '📩' }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);
                await helpChannel.send({ embeds: [embed], components: [row] });
                console.log('Hilfe-Panel erfolgreich gesendet!');
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
            if (selectedValue === 'cat_admin') categoryName = 'Admin-Hilfe';

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

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`❓ Support-Ticket: ${categoryName}`)
                .setDescription(`Hallo ${member}! Ich bin der **VGPL KI-Support-Assistent** 🤖.\n\nSchreib mir einfach deine Frage. Ich kenne das komplette **VGPL Regelwerk FC 26** und helfe dir sofort!\n\n*Falls du mit einem Admin sprechen möchtest, klicke unten auf **"Admin rufen 🔔"**.*`)
                .setColor('#00AAFF')
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

            await interaction.editReply({ content: `Dein Support-Ticket wurde erstellt: ${ticketChannel}`, ephemeral: true });
        }

        // 2. ADMIN RUFEN BUTTON
        if (interaction.isButton() && interaction.customId === 'btn_call_admin') {
            const adminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase());
            const headAdminRole = guild.roles.cache.find(r => r.name.toLowerCase() === CONFIG.HEAD_ADMIN_ROLE_NAME.toLowerCase());

            let pingMessage = `🔔 **ADMIN ANFORDERUNG!** ${interaction.user} benötigt Unterstützung von der Ligaleitung!`;
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
            await interaction.reply({ content: '🔒 Dieses Ticket wird in 5 Sekunden gelöscht...' });
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    } catch (err) {
        console.error("Fehler bei der Interaktion:", err);
    }
});

// 4. KI ANTWORTET IM TICKET
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
        await message.reply("⚠️ Ich konnte deine Anfrage gerade nicht verarbeiten. Bitte klicke auf **'Admin rufen 🔔'**, um direkt Hilfe zu bekommen!");
    }
});

client.login(CONFIG.TOKEN);
