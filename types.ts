export interface ClusterConfig {
  id: string;
  name: string;
  ip: string;
  username: string;
  password: string;
  isVerified: boolean;
  type: 'PE' | 'PC'; // Prism Element or Prism Central
  apiVersion: 'v2.0' | 'v4.0';
}

export type Category = 'VM' | 'Hardware' | 'Performance' | 'Resources';

export interface ColumnDefinition {
  key: string;
  label: string;
}

export interface DataRow {
  [key: string]: string | number | boolean;
}

export interface ApiError {
  message: string;
  status?: number;
}
