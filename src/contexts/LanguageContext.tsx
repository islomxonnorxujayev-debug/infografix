import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "uz" | "ru";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  uz: {
    // Navbar / Header
    "nav.features": "Imkoniyatlar",
    "nav.howItWorks": "Qanday ishlaydi",
    "nav.pricing": "Narxlar",
    "nav.roadmap": "Yo'l xaritasi",
    "nav.login": "Kirish",
    "nav.getStarted": "Boshlash",
    "nav.logout": "Chiqish",

    // Dashboard
    "dash.title": "Boshqaruv paneli",
    "dash.subtitle": "Mahsulot rasmlaringizni yarating va boshqaring",
    "dash.createNew": "Yangi rasm yaratish",
    "dash.noImages": "Hali rasmlar yo'q",
    "dash.noImagesDesc": "Birinchi professional mahsulot rasmingizni yarating",

    // Generate
    "gen.newImage": "Yangi rasm",
    "gen.back": "Ortga",
    "gen.step.upload": "Yuklash",
    "gen.step.settings": "Sozlash",
    "gen.step.result": "Natija",
    "gen.uploadTitle": "Mahsulot rasmini yuklang",
    "gen.uploadDesc": "JPG, PNG yoki WEBP — 5MB gacha",
    "gen.uploadBtn": "Bosing yoki rasmni tashlang",
    "gen.uploadLabel": "Mahsulot surati",
    "gen.fileTooLarge": "Fayl hajmi 5MB dan kichik bo'lishi kerak",
    "gen.continue": "Davom etish",
    "gen.settingsTitle": "Sozlamalarni tanlang",
    "gen.settingsDesc": "AI tanlangan sozlamalarga qarab premium rasm yaratadi",
    "gen.modelType": "👤 Model turi",
    "gen.withModel": "Modelli",
    "gen.withModelDesc": "Inson model bilan",
    "gen.withoutModel": "Modelsiz",
    "gen.withoutModelDesc": "Faqat mahsulot",
    "gen.scene": "🎬 Holat / Fon",
    "gen.nature": "Tabiat",
    "gen.natureDesc": "Tabiat fonida",
    "gen.lifestyle": "Lifestyle",
    "gen.lifestyleDesc": "Hayotiy muhit",
    "gen.studio": "Studia",
    "gen.studioDesc": "Professional studia",
    "gen.minimalist": "Minimalist",
    "gen.minimalistDesc": "Oddiy va toza",
    "gen.infographic": "Infografika",
    "gen.infographicDesc": "Ma'lumotli dizayn",
    "gen.yourImage": "Sizning rasmingiz",
    "gen.generate": "AI bilan tayyorlash",
    "gen.sizeInfo": "📐 1080×1440 • ⚡ Professional sifat",
    "gen.processing": "AI rasmni tayyorlamoqda...",
    "gen.processingDesc": "Premium marketplace rasm tayyorlanmoqda. 20-40 soniya kuting.",
    "gen.analyzing": "Mahsulot tahlil qilinmoqda",
    "gen.creatingBg": "foni yaratilmoqda",
    "gen.addingModel": "Model qo'shilmoqda",
    "gen.proComposition": "Professional kompozitsiya",
    "gen.resizing": "1080×1440 o'lchamga moslashtirilmoqda",
    "gen.done": "Tayyor! 🎉",
    "gen.download": "Yuklab olish",
    "gen.newImageBtn": "Yangi rasm",
    "gen.original": "Asl rasm",
    "gen.aiResult": "AI natijasi",
    "gen.error": "Xatolik yuz berdi. Qayta urinib ko'ring.",
    "gen.restart": "Qayta boshlash",
    "gen.success": "Rasm muvaffaqiyatli tayyorlandi!",
    "gen.uploadError": "Yuklashda xatolik",
    "gen.downloadError": "Yuklashda xatolik",
    "gen.downloaded": "Rasm yuklandi!",
    "gen.processError": "Rasmni qayta ishlashda xatolik",
  },
  ru: {
    // Navbar / Header
    "nav.features": "Возможности",
    "nav.howItWorks": "Как работает",
    "nav.pricing": "Цены",
    "nav.roadmap": "Дорожная карта",
    "nav.login": "Войти",
    "nav.getStarted": "Начать",
    "nav.logout": "Выйти",

    // Dashboard
    "dash.title": "Панель управления",
    "dash.subtitle": "Создавайте и управляйте изображениями товаров",
    "dash.createNew": "Создать новое",
    "dash.noImages": "Пока нет изображений",
    "dash.noImagesDesc": "Создайте первое профессиональное изображение товара",

    // Generate
    "gen.newImage": "Новое изображение",
    "gen.back": "Назад",
    "gen.step.upload": "Загрузка",
    "gen.step.settings": "Настройки",
    "gen.step.result": "Результат",
    "gen.uploadTitle": "Загрузите фото товара",
    "gen.uploadDesc": "JPG, PNG или WEBP — до 5МБ",
    "gen.uploadBtn": "Нажмите или перетащите фото",
    "gen.uploadLabel": "Фото товара",
    "gen.fileTooLarge": "Размер файла должен быть менее 5МБ",
    "gen.continue": "Продолжить",
    "gen.settingsTitle": "Выберите настройки",
    "gen.settingsDesc": "AI создаст премиум изображение на основе выбранных настроек",
    "gen.modelType": "👤 Тип модели",
    "gen.withModel": "С моделью",
    "gen.withModelDesc": "С человеком-моделью",
    "gen.withoutModel": "Без модели",
    "gen.withoutModelDesc": "Только товар",
    "gen.scene": "🎬 Сцена / Фон",
    "gen.nature": "Природа",
    "gen.natureDesc": "На фоне природы",
    "gen.lifestyle": "Лайфстайл",
    "gen.lifestyleDesc": "Жизненная среда",
    "gen.studio": "Студия",
    "gen.studioDesc": "Профессиональная студия",
    "gen.minimalist": "Минимализм",
    "gen.minimalistDesc": "Просто и чисто",
    "gen.infographic": "Инфографика",
    "gen.infographicDesc": "Информативный дизайн",
    "gen.yourImage": "Ваше изображение",
    "gen.generate": "Создать с AI",
    "gen.sizeInfo": "📐 1080×1440 • ⚡ Профессиональное качество",
    "gen.processing": "AI создаёт изображение...",
    "gen.processingDesc": "Создаётся премиум маркетплейс-изображение. Подождите 20-40 сек.",
    "gen.analyzing": "Анализ товара",
    "gen.creatingBg": "фон создаётся",
    "gen.addingModel": "Добавляется модель",
    "gen.proComposition": "Профессиональная композиция",
    "gen.resizing": "Адаптация к 1080×1440",
    "gen.done": "Готово! 🎉",
    "gen.download": "Скачать",
    "gen.newImageBtn": "Новое изображение",
    "gen.original": "Оригинал",
    "gen.aiResult": "Результат AI",
    "gen.error": "Произошла ошибка. Попробуйте снова.",
    "gen.restart": "Начать заново",
    "gen.success": "Изображение успешно создано!",
    "gen.uploadError": "Ошибка загрузки",
    "gen.downloadError": "Ошибка скачивания",
    "gen.downloaded": "Изображение скачано!",
    "gen.processError": "Ошибка обработки изображения",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "uz",
  setLang: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang");
    return (saved === "ru" || saved === "uz") ? saved : "uz";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("app-lang", l);
  };

  const t = (key: string) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
