# Proje Sunum Rehberi: Bellek Yönetimi ve Çalışma Zamanı Mimarisi

Bu belge, geliştirdiğimiz "Bellek Yönetimi Simülatörü" uygulamasını hocanıza (öğretmeninize) sunarken kullanabileceğiniz bir **konuşma ve anlatım rehberidir**. Projedeki her bir özelliğin, ödevdeki hangi maddeyi karşıladığını adım adım anlatır.

---

## 1. Giriş ve Projenin Amacı
**Hocaya Söylenecek:**
"Hocam merhaba, grubumuzla birlikte ödevdeki tüm teorik bellek ve altprogram kavramlarını sadece kağıt üzerinde yazmak yerine, **canlı ve interaktif bir Bellek Simülatörü** geliştirerek kanıtlamaya karar verdik. Bu proje, fonksiyon çağrılarının, yığının (Stack) ve dinamik belleğin (Heap) arka planda nasıl çalıştığını mikro saniye seviyesinde görselleştiriyor."

---

## 2. Arayüzün Tanıtımı
Sunuma başlarken uygulamanın ana bölümlerini hızlıca tanıtın:
- **Görsel Bellek (Stack):** Sol taraftaki büyük panel. Fonksiyonlar çağrıldıkça burada "Aktivasyon Kayıtları (Activation Records)" oluşur. Ayrıca hocanın ödevde özellikle istediği şematik çizimi yansıtmak için **"Kağıt (Paper)"** modumuz da bulunmaktadır.
- **Dinamik Bellek (Heap):** Alt kısımdaki panel. Referans tiplerinin ve objelerin nerede saklandığını gösterir.
- **Canlı Analiz Paneli:** Sağ alttaki panel. CPU'nun anlık durumunu, çalışan kodun teorik analizini ve o dilin mimari özetini sunar.

---

## 3. Ödev Maddelerinin Gösterimi (Alt Başlıklar)

Arayüz üzerinden kodları adım adım çalıştırırken (Adım At butonu ile) şu kavramları hocaya gösterebilirsiniz:

1. **Aktivasyon Kaydı (Activation Record):** Ekranda oluşan her kare bir aktivasyon kaydıdır. İçinde dönüş adresi (`Return Addr`), dinamik bağ (`Dynamic Link`) ve yerel değişkenleri hocaya gösterin.
2. **Çağrı Yığını ve Stack Pointer (SP):** Ekrandaki `SP` değerinin (`0x7FFF` vb.) her değişken eklendiğinde nasıl güncellendiğini gösterin. Yığının yukarıdan aşağıya büyüdüğünü (ok işareti ile) vurgulayın.
3. **Çerçeve İşaretçisi (FP) ve Göreli Adresleme:** Her bir aktivasyon kaydının sağ üstünde `FP` (Frame Pointer) yazar. Değişkenlerin yanındaki `[0x...]` adreslerinin FP'ye göre nasıl yerleştiğini gösterin.
4. **Statik Zincir (Static Chain):** Ekranda yer alan `Static Link` alanı, iç içe fonksiyonların dış kapsama nasıl eriştiğini belirten adrestir.
5. **Statik Derinlik ve Zincir Ötelemesi:** Karelerin içinde özel olarak eklediğimiz `Depth` (Derinlik) ve `Offset` (Öteleme) etiketlerini hocaya gösterip, "Dış kapsamlara erişim için bu offset değerlerini hesaplıyoruz" diyebilirsiniz.
6. **Blokların, Deep ve Shallow Access Yönetimi:** Farklı dilleri (Python, Java vb.) seçtiğinizde, sağ alttaki **Canlı Analiz Paneli'nde** bu kavramların o dile özgü nasıl çalıştığının teorik olarak açıklandığını gösterin.

---

## 4. Pratik Uygulamaların (Demoların) Sunumu

Hocanın ödev kağıdında istediği "Uygulama" kısımlarını şu şekilde sunacaksınız:

### Demo 1: Hesap Makinesi (Lambda / Delegate)
* **Nasıl Gösterilir:** Sağ üstten **C#** dilini seçin ve menüden **"Hesap Mak. (Delegate)"** senaryosunu seçip çalıştırın.
* **Hocaya Söylenecek:** "Hocam, modern dillerde iç içe fonksiyonlar doğrudan desteklenmediği için burada `Delegate` ve `Lambda` kullandık. Gördüğünüz gibi `add` fonksiyonunu bir parametre gibi `Calc` fonksiyonunun içine gönderdik (Higher-order function)."

### Demo 2: Değer mi Yoksa Referans mı?
* **Nasıl Gösterilir:** C# dilini seçip **"Değer vs Referans"** senaryosunu çalıştırın.
* **Hocaya Söylenecek:** "Bu senaryoda Listeyi (List) fonksiyona gönderiyoruz. Stack'te yeni bir değişken oluşsa da, değerine baktığınızda `[Heap@...]` adresini gösteriyor. Yani değer değil, 'Referans' kopyalandığı için fonksiyon içindeki değişiklikler doğrudan Heap'teki asıl listeyi etkiliyor."

### Demo 3: Özyineleme (Recursion) ve Faktöriyel
* **Nasıl Gösterilir:** Üst menüden **"Kağıt"** modunu açın (hocanın kağıt şematize etme şartı için). Sonra `C# -> Faktöriyel (Çalışır)` senaryosunu adım adım çalıştırın.
* **Hocaya Söylenecek:** "Faktöriyel fonksiyonu kendini çağırdıkça (Recursion), bağımsız yeni Aktivasyon Kayıtlarının yığına (Stack) nasıl eklendiğini kağıt şeması üzerinde görebiliyoruz."

### Demo 4: StackOverflow (Bellek Taşması)
* **Nasıl Gösterilir:** `C# -> Faktöriyel (StackOverflow)` senaryosunu seçip direkt çalıştırın.
* **Hocaya Söylenecek:** "Normalde küçük sayılarda çalışan özyinelemeye çok büyük bir sayı (örn: 100000) verdiğimizde, çağrı yığını kapasitesini aşıyor. Simülatörümüz bunu algılayıp sistemi durduruyor ve **'STACK OVERFLOW EXCEPTION'** hatasını kırmızı ekran animasyonuyla bize gösteriyor."

---
*Tebrikler! Bu sunumla projenizin tüm teknik detaylarını ve ödevin her bir satırını başarıyla açıklamış olacaksınız.*
