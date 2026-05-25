export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url: string;
  source_url: string;
  source_name: string;
  category: string;
  comuna: string;
  tags: string[];
  is_featured: boolean;
  is_breaking: boolean;
  is_approved: boolean;
  is_published: boolean;
  ai_generated: boolean;
  published_at: string;
  created_at: string;
  views: number;
  slug: string;
}

export interface PhotoItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  photographer: string;
  comuna: string;
  category: string;
  likes: number;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Comuna {
  id: string;
  name: string;
  slug: string;
  region: string;
}

export interface AdSpace {
  id: string;
  name: string;
  location: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
}

export interface UserSubmission {
  id: string;
  type: 'photo' | 'news_tip' | 'error_report';
  content: string;
  image_url?: string;
  user_name: string;
  user_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
