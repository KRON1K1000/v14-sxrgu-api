const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aydın')
        .setDescription('xxx')
        .addStringOption(option =>
            option.setName('no')
                .setDescription('xxx')
                .setRequired(true)),
    async execute(interaction) {
        const tc_no = interaction.options.getString('no');
        const userId = interaction.user.id; // Kullanıcı ID'si
        const username = interaction.user.username; // Kullanıcı adı

        // İzin verilen kullanıcıları yükle
        const allowedUsersPath = path.join(__dirname, 'allowed_users.json');
        let allowedUsers = [];

        try {
            const data = fs.readFileSync(allowedUsersPath, 'utf8');
            allowedUsers = JSON.parse(data).allowedIds;
        } catch (error) {
            //console.error('Allowed users JSON dosyası okunurken hata:', error);
            await interaction.reply({ content: 'İzinli kullanıcı verileri yüklenemedi. <a:loading:1291997421106233414>', ephemeral: true });
            return;
        }

        // Kullanıcının ID'sinin izinli olup olmadığını kontrol et
        if (!allowedUsers.includes(userId)) {
            await interaction.reply({ content: 'Bu komutu kullanma izniniz yok.', ephemeral: true });
            return;
        }

 // İlk etapta hemen bir yanıt gönderip beklemeyi sağlıyoruz
 await interaction.deferReply({ ephemeral: true });
 await interaction.editReply({ content: 'GÜNCEL AİLEV2 SORGU VERİSİ ÇEKİLİYOR LÜTFEN BEKLEYİNİZ. <a:loading:1291997421106233414>', ephemeral: true });

        // Klasör adı ve dosya yolu
        const klasorAdi = 'ailesorguv2';
        const filePath = path.join(__dirname, klasorAdi, `${tc_no}_ailesorguv2.txt`);

        // Klasör yoksa oluştur
        if (!fs.existsSync(klasorAdi)) {
            fs.mkdirSync(klasorAdi);
        }

        // Chrome tarayıcısını başlat
        const chromeOptions = new chrome.Options();
        chromeOptions.addArguments('--headless'); // Tarayıcıyı headless modda başlat
chromeOptions.addArguments('--no-sandbox'); // Sandbox'ı devre dışı bırak
chromeOptions.addArguments('--disable-dev-shm-usage'); // Paylaşılan bellek kullanımını devre dışı bırak
        let driver = new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

        try {
            // Giriş yapacağımız sayfaya git
            await driver.get('https://ezik.store/login/');

            // Email ve şifre alanlarını doldur
            const email = "deneme34xq@gmail.com";  // Buraya kendi giriş bilgilerinizi yazın
            const password = "deneme34xq";        // Buraya kendi şifrenizi yazın

            await driver.findElement(By.name('email')).sendKeys(email);
            await driver.findElement(By.name('password')).sendKeys(password);

            // Giriş butonuna tıkla
            await driver.findElement(By.id('kt_sign_up_submit')).click();

            // Girişin başarılı olduğunu kontrol et
            let attempts = 0;
            while (attempts < 25) { // Sayfayı 25 kez yenile
                await driver.sleep(3000); // Her yenileme arasında 3 saniye bekle
                const currentUrl = await driver.getCurrentUrl();
                if (currentUrl.includes('/home')) {
                    //console.log('Giriş başarılı, ailesorguv2 sorgulama sayfasına gidiliyor...');
                    break; // Giriş başarılıysa döngüden çık
                } else {
                    //console.log(`Error 1015 tespit edildi, sayfa yenileniyor... (${attempts + 1}/25)`);
                    await driver.navigate().refresh(); // Sayfayı yenile

                    // Sayfanın geri ve ileri işlemleri
                    await driver.navigate().back();
                    await driver.sleep(3000); // Geri yön butonuna bastıktan sonra biraz bekle
                    await driver.navigate().forward();
                    await driver.sleep(3000); // İleri yön butonuna bastıktan sonra biraz bekle
                    attempts++;
                }
            }

            // Deneme limitine ulaşıldıysa hata ver
            if (attempts === 25) {
                await interaction.editReply({
                    content: `Bir hata oluştu. Rate limitine ulaştınız ve 25 yenileme yapıldı. Lütfen bir süre sonra tekrar deneyin.`,
                    ephemeral: true
                });
                return;
            }

            // ailesorguv2 sorgulama sayfasına git
            await driver.get('https://ezik.store/ailesorguv2');

            // TC kimlik numarasını kutucuğa yaz
            await driver.findElement(By.name('tc')).sendKeys(tc_no);

            // Sorgula butonuna tıkla
            await driver.findElement(By.id('sorgula')).click();

            // Sonuçların yüklenmesini bekle
            await driver.wait(until.elementLocated(By.id('kt_datatable_dom_positioning')), 10000);

            // Verileri al
            const data = await driver.findElement(By.id('kt_datatable_dom_positioning')).getText();

            // Kullanıcı bilgilerini dosyaya kaydet
            const userInfo = `Kullanıcı ID: ${userId}\nKullanıcı Adı: ${username}\n\nGÜNCEL AİLEV2 SORGU:\n${data}`;
            fs.writeFileSync(filePath, userInfo, 'utf8');

            // Dosyadaki veriyi kullanıcıya gönder
            await interaction.editReply({
                content: `GÜNCEL AİLEV2 SORGU:\n\`\`\`\n${userInfo}\n\`\`\``,
                ephemeral: true
            });

        } catch (error) {
            //console.error(error);

            // Hata mesajı gönder
            await interaction.editReply({
                content: `Bir hata oluştu, giriş yapamadım veya veriyi sorgulamada problem yaşadım. Lütfen tekrar deneyin.`,
                ephemeral: true
            });

        } finally {
            // Tarayıcıyı kapat
            await driver.quit();
        }
    },
};
