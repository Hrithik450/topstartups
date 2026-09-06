export interface IndustryCategory {
  id: string;
  name: string;
  icon: string;
  isSpecial?: boolean;
  keywords?: string[];
}

export const MAIN_CATEGORIES: IndustryCategory[] = [
  { id: "agencies-studios-services", name: "Agencies, Studios & Services", icon: "🏢", keywords: ["agency", "studio", "consulting", "services", "freelance"] },
  { id: "ai-agents-infrastructure", name: "AI Agents & Infrastructure", icon: "🤖", keywords: ["ai", "agents", "llm", "gpt", "bot", "infrastructure", "machine learning"] },
  { id: "ai-media-generation", name: "AI Media Generation", icon: "✨", keywords: ["ai", "video", "image", "generation", "generative", "voice", "avatar"] },
  { id: "audio-voice-podcasting", name: "Audio, Voice & Podcasting", icon: "🎙", keywords: ["audio", "voice", "podcast", "speech", "sound", "music"] },
  { id: "business-finance-legal", name: "Business, Finance & Legal", icon: "💼", keywords: ["fintech", "finance", "legal", "law", "banking", "payments", "invoicing", "accounting", "tax", "investing"] },
  { id: "crypto-web3-investing", name: "Crypto, Web3 & Investing", icon: "₿", keywords: ["crypto", "web3", "defi", "blockchain", "nft", "token", "investing", "wallet"] },
  { id: "design-creative", name: "Design & Creative", icon: "🎨", keywords: ["design", "creative", "ui", "ux", "figma", "graphic", "branding"] },
  { id: "developer-tools", name: "Developer Tools", icon: ">_", keywords: ["saas", "api", "infra", "devtools", "coding", "software", "cloud", "backend", "git", "cli"] },
  { id: "directories-launch-discovery", name: "Directories, Launch & Discovery", icon: "🚀", keywords: ["launch", "directory", "discovery", "product hunt", "tools"] },
  { id: "domains-web-assets", name: "Domains & Web Assets", icon: "🌐", keywords: ["domain", "dns", "hosting", "web", "assets", "tld"] },
  { id: "ecommerce-retail", name: "Ecommerce & Retail", icon: "🛍️", keywords: ["ecommerce", "e-commerce", "d2c", "retail", "shop", "store", "cart", "checkout"] },
  { id: "education-learning", name: "Education & Learning", icon: "🎓", keywords: ["edtech", "education", "learning", "courses", "school", "students", "teaching", "academy"] },
  { id: "games-entertainment", name: "Games & Entertainment", icon: "🎮", keywords: ["gaming", "games", "esports", "entertainment", "stream", "video games"] },
  { id: "health-fitness-wellness", name: "Health, Fitness & Wellness", icon: "🏋️", keywords: ["healthtech", "health", "fitness", "wellness", "medical", "medtech", "mental health", "gym"] },
  { id: "hiring-jobs-careers", name: "Hiring, Jobs & Careers", icon: "🤝", keywords: ["hr", "recruiting", "talent", "staffing", "jobs", "hiring", "careers", "employment"] },
  { id: "leaderboards-attention-markets", name: "Leaderboards & Attention Markets", icon: "🏆", keywords: ["leaderboard", "ranking", "rank", "attention", "competition"] },
  { id: "marketing-advertising", name: "Marketing & Advertising", icon: "📢", keywords: ["marketing", "ads", "advertising", "growth", "campaign", "pr", "affiliate"] },
  { id: "media-news", name: "Media & News", icon: "📰", keywords: ["media", "news", "journalism", "newsletter", "press"] },
  { id: "people-profiles", name: "People & Profiles", icon: "👤", keywords: ["people", "profile", "bio", "portfolio", "personal"] },
  { id: "productivity-personal-tools", name: "Productivity & Personal Tools", icon: "⚡", keywords: ["productivity", "notes", "calendar", "task", "todo", "workflow", "automation"] },
  { id: "real-estate-property", name: "Real Estate & Property", icon: "🏠", keywords: ["proptech", "real estate", "property", "housing", "mortgage", "rental", "leasing"] },
  { id: "sales-lead-generation", name: "Sales & Lead Generation", icon: "🎯", keywords: ["sales", "leads", "crm", "prospecting", "b2b", "outreach", "cold email"] },
  { id: "security-privacy-compliance", name: "Security, Privacy & Compliance", icon: "🛡️", keywords: ["security", "cybersecurity", "privacy", "compliance", "gdpr", "soc2", "auth"] },
  { id: "seo-ai-visibility", name: "SEO & AI Visibility", icon: "🔍", keywords: ["seo", "search", "google", "keywords", "backlinks", "visibility"] },
  { id: "social-media-creator-tools", name: "Social Media & Creator Tools", icon: "📱", keywords: ["social media", "creators", "youtube", "tiktok", "instagram", "twitter", "x"] },
  { id: "travel-local-lifestyle", name: "Travel, Local & Lifestyle", icon: "✈️", keywords: ["travel", "hospitality", "lifestyle", "hotels", "flights", "local"] },
  { id: "writing-content", name: "Writing & Content", icon: "✍️", keywords: ["writing", "content", "copywriting", "blog", "articles", "author"] },
];

export const SPECIAL_OPTIONS: IndustryCategory[] = [
  { id: "other", name: "Other", icon: "💡", isSpecial: true },
  { id: "help-later", name: "I don’t know, help me out later", icon: "🤝", isSpecial: true },
];
