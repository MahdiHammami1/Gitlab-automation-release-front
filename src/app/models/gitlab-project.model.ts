export interface Namespace {
  id: number;
  name: string;
  path: string;
  kind: string; // "group" | "user" | ...
  full_path: string;
  web_url: string;
  avatar_url?: string | null;
  parent_id?: number | null;
}

export type Visibility = 'public' | 'private' | 'internal';

export interface Project {
  id: number;
  description?: string | null;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: string; // ISO date
  last_activity_at: string; // ISO date
  visibility: Visibility;
  star_count: number;
  topics: string[]; // GitLab "topics"
  tag_list: string[]; // alternative tag list
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  web_url: string;
  avatar_url?: string | null;
  namespace: Namespace;
}