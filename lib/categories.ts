export interface IndustryCategory {
  id: string;
  name: string;
  icon: string;
  isSpecial?: boolean;
}

export const MAIN_CATEGORIES: IndustryCategory[] = [
  { id: "agencies-studios-services", name: "Agencies, Studios & Services", icon: "🏢" },
  { id: "ai-agents-infrastructure", name: "AI Agents & Infrastructure", icon: "🤖" },
  { id: "ai-media-generation", name: "AI Media Generation", icon: "✨" },
  { id: "audio-voice-podcasting", name: "Audio, Voice & Podcasting", icon: "🎙" },
  { id: "business-finance-legal", name: "Business, Finance & Legal", icon: "💼" },
  { id: "crypto-web3-investing", name: "Crypto, Web3 & Investing", icon: "₿" },
  { id: "design-creative", name: "Design & Creative", icon: "🎨" },
  { id: "developer-tools", name: "Developer Tools", icon: ">_" },
  { id: "directories-launch-discovery", name: "Directories, Launch & Discovery", icon: "🚀" },
  { id: "domains-web-assets", name: "Domains & Web Assets", icon: "🌐" },
  { id: "ecommerce-retail", name: "Ecommerce & Retail", icon: "🛍️" },
  { id: "education-learning", name: "Education & Learning", icon: "🎓" },
  { id: "games-entertainment", name: "Games & Entertainment", icon: "🎮" },
  { id: "health-fitness-wellness", name: "Health, Fitness & Wellness", icon: "🏋️" },
  { id: "hiring-jobs-careers", name: "Hiring, Jobs & Careers", icon: "🤝" },
  { id: "leaderboards-attention-markets", name: "Leaderboards & Attention Markets", icon: "🏆" },
  { id: "marketing-advertising", name: "Marketing & Advertising", icon: "📢" },
  { id: "media-news", name: "Media & News", icon: "📰" },
  { id: "people-profiles", name: "People & Profiles", icon: "👤" },
  { id: "productivity-personal-tools", name: "Productivity & Personal Tools", icon: "⚡" },
  { id: "real-estate-property", name: "Real Estate & Property", icon: "🏠" },
  { id: "sales-lead-generation", name: "Sales & Lead Generation", icon: "🎯" },
  { id: "security-privacy-compliance", name: "Security, Privacy & Compliance", icon: "🛡️" },
  { id: "seo-ai-visibility", name: "SEO & AI Visibility", icon: "🔍" },
  { id: "social-media-creator-tools", name: "Social Media & Creator Tools", icon: "📱" },
  { id: "travel-local-lifestyle", name: "Travel, Local & Lifestyle", icon: "✈️" },
  { id: "writing-content", name: "Writing & Content", icon: "✍️" },
];

export const SPECIAL_OPTIONS: IndustryCategory[] = [
  { id: "other", name: "Other", icon: "💡", isSpecial: true },
  { id: "help-later", name: "I don’t know, help me out later", icon: "🤝", isSpecial: true },
];
