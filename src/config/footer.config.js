// config/footer.config.js
const baseUrl = process.env.BASE_URL || '';

const footerConfig = {
  logo: {
    url: "https://brandynette.xxx/",
    image: "/gif/brandynette.gif", // Changed to use correct path
    alt: "Brandynette.xxx"
  },
  tagline: "Pimp of [bambisleep.chat] at r/BambiSleep for Like Ra with Bellmar",
  primaryLinks: [
    {
      label: "Who is Brandynette?",
      url: "https://brandynette.xxx/brandynette/",
      external: true
    },
    {
      label: "Who is Melkanea?",
      url: "https://github.com/HarleyVader",
      external: true
    },
    {
      label: "brandynette.xxx",
      url: "https://brandynette.xxx",
      external: true
    },
    {
      label: "BambiSleep.Church",
      url: "https://bambisleep.church/",
      external: true
    },
    {
      label: "FickDichSelber.com",
      url: "https://fickdichselber.com/",
      external: true
    },
  ],
  secondaryLinks: [
    { label: "Memberships", url: "https://www.patreon.com/c/bambisleepchat/membership", external: true },
    { label: "Recomendations", url: "https://www.patreon.com/c/bambisleepchat/recommendations", external: true },
    { label: "AIGF Github", url: "https://github.com/HarleyVader/js-bambisleep-chat", external: true },
    { label: "Factorio", url: "https://www.reddit.com/r/factorio/", external: true },
    { label: "Like Ra`s Nauthy PlayGround", url: "https://www.likera.com/forum/mybb/Forum-Bambi-Sleep-Cult", external: true },
    { label: "BambiSleep Reddits", url: "https://www.reddit.com/user/brandynette/m/bambisleep/", external: true },
    { label: "Bimbot", url: "https://www.patreon.com/c/nadekobot/posts", external: true }
  ],
  tertiaryLinks: [
    {
      label: "r/BambiSleep Reddit",
      url: "https://www.reddit.com/r/BambiSleep/",
      external: true
    },
    {
      label: "r/BambiContracts Reddit",
      url: "https://www.reddit.com/r/BambiContracts/",
      external: true
    }
  ],
  quaternaryLinks: [
    {
      label: "Bambi-Trainer Patreon",
      url: "https://www.patreon.com/c/bambi_trainer/posts",
      external: true
    },
    {
      label: "Bellmar`s Bambi Patreon",
      url: "https://www.patreon.com/c/Bellmars_Bambi_files/posts",
      external: true
    },
    {
      label: "bambi4eva Patreon",
      url: "https://www.patreon.com/c/bambi4eva/posts",
      external: true
    },
    {
      label: "PlatinumPuppets Patreon",
      url: "https://www.patreon.com/c/PlatinumPuppets/posts",
      external: true
    },
    {
      label: "Bambi-Trainer Patreon",
      url: "https://www.patreon.com/c/bambi_trainer/posts",
      external: true
    },
    {
      label: "Bambi Cloud Patreon",
      url: "https://www.patreon.com/c/bambicloud/posts",
      external: true
    },
    {
      label: "Bambi Subliminals Patreon",
      url: "https://www.patreon.com/c/BambiSubliminals/posts",
      external: true
    },
    {
      label: "Bambi Beats Patreon",
      url: "https://www.patreon.com/c/BambiBeats/posts",
      external: true
    },
    {
      label: "Sleepy Crown Patreon",
      url: "https://www.patreon.com/c/thesleepycrown/posts",
      external: true
    },
    {
      label: "Tom Tame's Patreon",
      url: "https://www.patreon.com/c/TomTame/posts",
      external: true
    }
  ],
  // Simplified - links removed to reduce complexity
  links: []
};

export default footerConfig;