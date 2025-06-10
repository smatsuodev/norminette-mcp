export interface NorminetteError {
  file: string;
  line: number;
  column: number;
  error_type: string;
  error_code: string;
  description: string;
}

export interface NorminetteResult {
  status: "OK" | "Error";
  files_checked: number;
  errors: NorminetteError[];
  summary: string;
}

export interface FixResult {
  original_errors: number;
  fixes_applied: any[];
  remaining_errors: NorminetteError[];
  final_error_count: number;
  status: string;
}

