import { useLanguage } from "@/contexts/LanguageContext";

const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center rounded-full border border-border bg-card overflow-hidden text-xs font-medium">
      <button
        onClick={() => setLang("uz")}
        className={`px-2.5 py-1.5 transition-colors ${
          lang === "uz" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        🇺🇿 UZ
      </button>
      <button
        onClick={() => setLang("ru")}
        className={`px-2.5 py-1.5 transition-colors ${
          lang === "ru" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        🇷🇺 RU
      </button>
    </div>
  );
};

export default LanguageSwitcher;
