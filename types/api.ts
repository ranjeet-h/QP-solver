// Types based on backend schemas (backend-fast-api/backend/app/schemas/history.py)

export interface HistoryListItem {
  id: number;
  pdf_name: string;
  title: string;
  created_at: string; // Assuming ISO string format from backend
}

export interface HistoryListResponse {
  history: HistoryListItem[];
}

export interface HistoryDetail extends HistoryListItem {
  result: string; // The full markdown result
}

// Add other API response types here as needed 