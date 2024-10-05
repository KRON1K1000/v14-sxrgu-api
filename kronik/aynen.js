const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aynen')
        .setDescription('xxx'),

    async execute(interaction) {
        const userId = interaction.user.id; // Kullanıcının ID'sini al

        // İzin verilen kullanıcıları yükle
        const allowedUsersPath = path.join(__dirname, 'allowed_users.json');
        let allowedUsers = [];

        try {
            const data = fs.readFileSync(allowedUsersPath, 'utf8');
            allowedUsers = JSON.parse(data).allowedIds;
        } catch (error) {
            console.error('Allowed users JSON dosyası okunurken hata:', error);
            await interaction.reply({ content: 'İzinli kullanıcı verileri yüklenemedi.', ephemeral: true });
            return;
        }

        // Kullanıcının ID'sinin izinli olup olmadığını kontrol et
        if (!allowedUsers.includes(userId)) {
            await interaction.reply({ content: 'Bu komutu kullanma izniniz yok.', ephemeral: true });
            return;
        }

        // Komut klasörlerini tanımla
        const commandFolders = ['kronik'];
        const commands = new Set(); // Tekil komutları saklamak için Set kullan

        // Komut açıklamalarını tanımla
        const commandNotes = {
            'as': 'TC DEN GÜNCEL ADRES SORGU.',
            'aydın': 'TC DEN AİLEV2 SORGU.',
            'haylen': 'TC DEN GÜNCEL HANE SORGU',
            'evliyimkardes':'MEDENİ HAL YANİ EVLİLİK SORGU',
            'vodafone':'TC SORGU v2',
            'adana':'ad soyad il ilçe sorgu tüm tr'
            // Buraya diğer komutların açıklamalarını ekleyebilirsiniz.
        };

        // Her klasörü dolaşarak komutları yükle
        commandFolders.forEach(folder => {
            const commandPath = path.join(__dirname, `../${folder}`); // Klasör yolunu tanımla
            const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js')); // .js dosyalarını filtrele

            for (const file of commandFiles) {
                const command = require(`${commandPath}/${file}`); // Komut dosyasını yükle
                commands.add(command.data.name); // Komut adını Set'e ekle
            }
        });

        // Select menü oluştur
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('command_select')
            .setPlaceholder('Kronik sorgu komutları')
            .addOptions([
                {
                    label: 'Kronik Komutları',
                    value: 'kronik',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // Yanıt oluştur
        await interaction.reply({ content: 'Komut grubunu seçin:', components: [row], ephemeral: true });

        // Seçim yapıldığında ne olacağını dinle
        const filter = i => i.customId === 'command_select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            const selectedGroup = i.values[0]; // Seçilen grup

            // Seçilen gruba göre komutları filtrele
            const selectedCommands = [];
            const commandPath = path.join(__dirname, `../${selectedGroup}`); // Seçilen grup için klasör yolunu tanımla
            const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js')); // .js dosyalarını filtrele

            for (const file of commandFiles) {
                const command = require(`${commandPath}/${file}`); // Komut dosyasını yükle
                selectedCommands.push(command.data.name); // Komut adını diziye ekle
            }

            // Yanıt oluştur
            const response = `${selectedGroup.charAt(0).toUpperCase() + selectedGroup.slice(1)} komutları:\n` + 
                selectedCommands.map(cmd => `\`${cmd}\`: ${commandNotes[cmd] || 'Açıklama yok.'}`).join('\n'); // Notları ekle

            // Seçim yapıldığında yanıtı güncelle
            await interaction.followUp({ content: response, ephemeral: true }); // Komutları kullanıcıya özel olarak göster
            await i.update({ content: 'Seçiminiz alındı.', components: [], ephemeral: true }); // Kullanıcıya özel yanıt
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: 'Zaman aşımına uğradı. Lütfen tekrar deneyin.', ephemeral: true });
            }
        });
    },
};
