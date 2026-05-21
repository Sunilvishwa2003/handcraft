export type LanguageCode = "en" | "hi" | "fr" | "de" | "es";

export const LANGUAGE_STORAGE_KEY = "commerceLanguage";

export const languageOptions: { value: LanguageCode; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "hi", label: "HI" },
  { value: "fr", label: "FR" },
  { value: "de", label: "DE" },
  { value: "es", label: "ES" },
];

const copy = {
  en: {
    navbar: {
      searchPlaceholder: "Search products, brands, materials, or occasions",
      visualSearch: "Visual Search",
      visualSearching: "Analyzing image...",
      visualSearchReady: "Searching similar products for",
      visualSearchFallback: "We used the uploaded image to search similar handcrafted items.",
      visualSearchFailed: "Could not read that image. Please try another one.",
      orders: "Orders",
      admin: "Admin",
      cart: "Cart",
      login: "Login",
      greeting: "Hi",
      language: "Language",
      categories: {
        stone: "Stone",
        metal: "Metal",
        wood: "Wood",
        homeDecor: "Home Decor",
      },
    },
    home: {
      shopProducts: "Shop products",
      trackOrders: "Track orders",
      browseTrending: "Browse trending",
      exploreMaterials: "Explore materials",
      slides: [
        {
          eyebrow: "Featured craft drop",
          title: "Sliding stories for products people actually want to explore.",
          description: "Turn the hero into a rotating showcase for new arrivals, material-led collections, and seasonal handcrafted highlights.",
        },
        {
          eyebrow: "Trending this week",
          title: "Put fast-moving products in motion instead of hiding them below the fold.",
          description: "Promote what is already getting attention and let shoppers jump straight into discovery from the first screen.",
        },
        {
          eyebrow: "AI shopping journey",
          title: "Search, compare, and track beautiful artisan pieces in one brighter storefront.",
          description: "Keep the craft aesthetic warm while the storefront feels faster, clearer, and more interactive.",
        },
      ],
      materialsTitle: "Shop by material mood",
      materialsDescription: "Move shoppers into curated category pages with one tap.",
      trendingTitle: "Trending products",
      trendingDescription: "A rotating row of the products people are looking at most right now.",
      recommendedTitle: "Recommended for you",
      recommendedDescription: "Products shaped by activity, popular tags, and your browsing flow.",
      bestSellerTitle: "Customers keep buying",
      bestSellerDescription: "Reliable best sellers with strong repeat demand and gifting appeal.",
      newestTitle: "Newest arrivals",
      newestDescription: "Fresh additions that deserve visibility while they are still new.",
      viewAll: "View all",
      loading: "Loading products...",
      empty: "Add products from the admin dashboard to populate this section.",
      metrics: [
        "Sliding ad hero",
        "Trending product rail",
        "Visual search entry",
      ],
    },
  },
  hi: {
    navbar: {
      searchPlaceholder: "उत्पाद, ब्रांड, सामग्री या अवसर खोजें",
      visualSearch: "विजुअल सर्च",
      visualSearching: "इमेज का विश्लेषण हो रहा है...",
      visualSearchReady: "इन जैसे उत्पाद खोजे जा रहे हैं",
      visualSearchFallback: "अपलोड की गई इमेज के आधार पर मिलते-जुलते हस्तशिल्प खोजे गए।",
      visualSearchFailed: "इमेज पढ़ी नहीं जा सकी। कृपया दूसरी इमेज आज़माएँ।",
      orders: "ऑर्डर",
      admin: "एडमिन",
      cart: "कार्ट",
      login: "लॉगिन",
      greeting: "नमस्ते",
      language: "भाषा",
      categories: {
        stone: "पत्थर",
        metal: "धातु",
        wood: "लकड़ी",
        homeDecor: "गृह सजावट",
      },
    },
    home: {
      shopProducts: "उत्पाद देखें",
      trackOrders: "ऑर्डर ट्रैक करें",
      browseTrending: "ट्रेंडिंग देखें",
      exploreMaterials: "सामग्री देखें",
      slides: [
        {
          eyebrow: "खास हस्तशिल्प चयन",
          title: "ऐसे स्लाइडिंग स्टोरी सेक्शन जो ग्राहकों को पहले स्क्रीन से ही जोड़ें।",
          description: "नए आगमन, विशेष संग्रह और मौसमी हस्तशिल्प को घूमते हुए हीरो में दिखाएँ।",
        },
        {
          eyebrow: "इस सप्ताह ट्रेंडिंग",
          title: "सबसे ज्यादा देखे जा रहे उत्पादों को ऊपर ही जीवंत तरीके से दिखाएँ।",
          description: "जो उत्पाद पहले से ध्यान खींच रहे हैं, उन्हें पहली स्क्रीन पर ही आगे रखें।",
        },
        {
          eyebrow: "AI शॉपिंग अनुभव",
          title: "सुंदर हस्तनिर्मित वस्तुओं के लिए खोज, तुलना और ट्रैकिंग एक ही जगह।",
          description: "स्टोरफ्रंट को गर्मजोशी भरा रखें लेकिन अनुभव को तेज और इंटरैक्टिव बनाएं।",
        },
      ],
      materialsTitle: "सामग्री के अनुसार खरीदें",
      materialsDescription: "एक टैप में चुनी हुई श्रेणियों तक पहुँचें।",
      trendingTitle: "ट्रेंडिंग उत्पाद",
      trendingDescription: "वे उत्पाद जिन्हें ग्राहक अभी सबसे अधिक देख रहे हैं।",
      recommendedTitle: "आपके लिए सुझाए गए",
      recommendedDescription: "आपकी गतिविधि और लोकप्रिय टैग के आधार पर चुने गए उत्पाद।",
      bestSellerTitle: "सबसे अधिक खरीदे गए",
      bestSellerDescription: "भरोसेमंद बेस्ट सेलर जिनकी मांग लगातार बनी रहती है।",
      newestTitle: "नए आगमन",
      newestDescription: "नए जोड़े गए उत्पाद जिन्हें अभी ज्यादा दृश्यता चाहिए।",
      viewAll: "सभी देखें",
      loading: "उत्पाद लोड हो रहे हैं...",
      empty: "इस सेक्शन को भरने के लिए एडमिन डैशबोर्ड से उत्पाद जोड़ें।",
      metrics: [
        "स्लाइडिंग ऐड हीरो",
        "ट्रेंडिंग प्रोडक्ट रेल",
        "विजुअल सर्च",
      ],
    },
  },
  fr: {
    navbar: {
      searchPlaceholder: "Rechercher des produits, marques, matieres ou occasions",
      visualSearch: "Recherche visuelle",
      visualSearching: "Analyse de l'image...",
      visualSearchReady: "Recherche de produits similaires pour",
      visualSearchFallback: "Nous avons utilise l'image pour trouver des articles artisanaux similaires.",
      visualSearchFailed: "Impossible de lire cette image. Essayez-en une autre.",
      orders: "Commandes",
      admin: "Admin",
      cart: "Panier",
      login: "Connexion",
      greeting: "Bonjour",
      language: "Langue",
      categories: {
        stone: "Pierre",
        metal: "Metal",
        wood: "Bois",
        homeDecor: "Deco Maison",
      },
    },
    home: {
      shopProducts: "Voir les produits",
      trackOrders: "Suivre les commandes",
      browseTrending: "Voir les tendances",
      exploreMaterials: "Explorer les matieres",
      slides: [
        {
          eyebrow: "Collection artisanale",
          title: "Des histoires glissantes qui mettent en scene les produits a forte intention.",
          description: "Faites tourner les nouveautes, les collections matieres et les campagnes saisonnieres dans le hero.",
        },
        {
          eyebrow: "Tendance de la semaine",
          title: "Mettez les produits les plus consultes en avant des le premier ecran.",
          description: "Transformez l'attention existante en visites produit plus rapides.",
        },
        {
          eyebrow: "Parcours AI",
          title: "Recherche, comparaison et suivi pour une vitrine artisanale plus claire.",
          description: "Gardez la chaleur du fait main tout en modernisant l'experience d'achat.",
        },
      ],
      materialsTitle: "Acheter par matiere",
      materialsDescription: "Accedez en un geste aux categories les plus demandees.",
      trendingTitle: "Produits tendance",
      trendingDescription: "Une rangee rotative des produits qui attirent le plus l'attention.",
      recommendedTitle: "Recommande pour vous",
      recommendedDescription: "Suggestions basees sur votre comportement et les signaux populaires.",
      bestSellerTitle: "Meilleures ventes",
      bestSellerDescription: "Des pieces fiables qui se vendent encore et encore.",
      newestTitle: "Nouveautes",
      newestDescription: "Les dernieres pieces a mettre en avant tant qu'elles sont fraiches.",
      viewAll: "Tout voir",
      loading: "Chargement des produits...",
      empty: "Ajoutez des produits depuis l'admin pour remplir cette section.",
      metrics: [
        "Hero publicitaire",
        "Rail tendance",
        "Recherche visuelle",
      ],
    },
  },
  de: {
    navbar: {
      searchPlaceholder: "Produkte, Marken, Materialien oder Anlasse suchen",
      visualSearch: "Visuelle Suche",
      visualSearching: "Bild wird analysiert...",
      visualSearchReady: "Ahnliche Produkte werden gesucht fur",
      visualSearchFallback: "Wir haben das Bild fur eine ahnliche Handwerks-Suche verwendet.",
      visualSearchFailed: "Dieses Bild konnte nicht gelesen werden. Bitte erneut versuchen.",
      orders: "Bestellungen",
      admin: "Admin",
      cart: "Warenkorb",
      login: "Login",
      greeting: "Hallo",
      language: "Sprache",
      categories: {
        stone: "Stein",
        metal: "Metall",
        wood: "Holz",
        homeDecor: "Wohnstil",
      },
    },
    home: {
      shopProducts: "Produkte ansehen",
      trackOrders: "Bestellungen verfolgen",
      browseTrending: "Trends ansehen",
      exploreMaterials: "Materialien entdecken",
      slides: [
        {
          eyebrow: "Handwerks-Highlight",
          title: "Ein Slider-Format, das starke Produkte direkt im Hero verkauft.",
          description: "Zeigen Sie Neuheiten, Materialkollektionen und saisonale Kampagnen in Bewegung.",
        },
        {
          eyebrow: "Diese Woche im Trend",
          title: "Setzen Sie Produkte mit hoher Aufmerksamkeit an die sichtbarste Stelle.",
          description: "Lenken Sie Besucher sofort von der Startseite in starke Produktdetailseiten.",
        },
        {
          eyebrow: "AI Einkauf",
          title: "Suche, Vergleich und Tracking fur einen helleren, klareren Shop.",
          description: "Die Seite bleibt warm und handwerklich, wirkt aber moderner und aktiver.",
        },
      ],
      materialsTitle: "Nach Material einkaufen",
      materialsDescription: "Direkt in kuratierte Materialwelten springen.",
      trendingTitle: "Trendprodukte",
      trendingDescription: "Rotierende Auswahl der Produkte mit der starksten aktuellen Nachfrage.",
      recommendedTitle: "Fur Sie empfohlen",
      recommendedDescription: "Empfehlungen aus Verhalten, Tags und Nachfrage-Signalen.",
      bestSellerTitle: "Meistgekauft",
      bestSellerDescription: "Bewahrte Bestseller mit stabiler Nachfrage.",
      newestTitle: "Neu eingetroffen",
      newestDescription: "Frische Produkte, die jetzt Sichtbarkeit brauchen.",
      viewAll: "Alle ansehen",
      loading: "Produkte werden geladen...",
      empty: "Fugen Sie Produkte im Admin-Bereich hinzu, um diesen Abschnitt zu fullen.",
      metrics: [
        "Slider Hero",
        "Trend Rail",
        "Visuelle Suche",
      ],
    },
  },
  es: {
    navbar: {
      searchPlaceholder: "Buscar productos, marcas, materiales u ocasiones",
      visualSearch: "Busqueda visual",
      visualSearching: "Analizando imagen...",
      visualSearchReady: "Buscando productos similares para",
      visualSearchFallback: "Usamos la imagen para encontrar artesanias similares.",
      visualSearchFailed: "No se pudo leer esa imagen. Intenta con otra.",
      orders: "Pedidos",
      admin: "Admin",
      cart: "Carrito",
      login: "Ingresar",
      greeting: "Hola",
      language: "Idioma",
      categories: {
        stone: "Piedra",
        metal: "Metal",
        wood: "Madera",
        homeDecor: "Decor Hogar",
      },
    },
    home: {
      shopProducts: "Ver productos",
      trackOrders: "Rastrear pedidos",
      browseTrending: "Ver tendencias",
      exploreMaterials: "Explorar materiales",
      slides: [
        {
          eyebrow: "Coleccion artesanal",
          title: "Un hero deslizante que promociona productos con verdadera intencion de compra.",
          description: "Muestra novedades, colecciones por material y campanas de temporada en rotacion.",
        },
        {
          eyebrow: "Tendencia de la semana",
          title: "Lleva los productos mas vistos al lugar mas importante de la pagina.",
          description: "Convierte el interes actual en descubrimiento mas rapido desde el primer scroll.",
        },
        {
          eyebrow: "Compra con AI",
          title: "Busqueda, comparacion y seguimiento en una vitrina artesanal mas clara.",
          description: "Mantiene el tono calido del oficio, pero con una experiencia mas activa y moderna.",
        },
      ],
      materialsTitle: "Comprar por material",
      materialsDescription: "Entra a categorias curadas con un solo toque.",
      trendingTitle: "Productos en tendencia",
      trendingDescription: "Una fila rotativa con los productos que mas interes despiertan ahora.",
      recommendedTitle: "Recomendado para ti",
      recommendedDescription: "Selecciones guiadas por actividad, etiquetas y senales de demanda.",
      bestSellerTitle: "Los mas vendidos",
      bestSellerDescription: "Piezas confiables con demanda repetida y valor de regalo.",
      newestTitle: "Recien llegados",
      newestDescription: "Nuevas piezas que necesitan visibilidad mientras son frescas.",
      viewAll: "Ver todo",
      loading: "Cargando productos...",
      empty: "Agrega productos desde el panel admin para llenar esta seccion.",
      metrics: [
        "Hero deslizante",
        "Carril de tendencia",
        "Busqueda visual",
      ],
    },
  },
} as const;

export type AppCopy = (typeof copy)["en"];

const isLanguageCode = (value: string | null): value is LanguageCode =>
  value === "en" || value === "hi" || value === "fr" || value === "de" || value === "es";

export const getStoredLanguageSnapshot = () => {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";
};

export const getStoredLanguage = (): LanguageCode => {
  const value = getStoredLanguageSnapshot();
  return isLanguageCode(value) ? value : "en";
};

export const setStoredLanguage = (language: LanguageCode) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.dispatchEvent(new Event("language:changed"));
};

export const subscribeLanguage = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("language:changed", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("language:changed", callback);
    window.removeEventListener("storage", callback);
  };
};

export const getLanguageCopy = (language: LanguageCode): AppCopy => copy[language] as AppCopy || copy.en;
