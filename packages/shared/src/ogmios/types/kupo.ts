export interface KupoValue {
  coins: number;
  assets?: Record<string, number>; // { "<policyHex>.<assetNameHex>": qty }
}

export interface KupoMatch {
  transaction_index: number;
  transaction_id: string;
  output_index: number;
  address: string;
  value: KupoValue;
  datum_hash?: string | null;
  datum_type?: string | null;
  script_hash?: string | null;
  created_at: { slot_no: number; header_hash: string };
  spent_at?: { slot_no: number; header_hash: string } | null;
}

export interface KupoHealth {
  connection_status: "connected" | "disconnected";
  most_recent_checkpoint?: number;
  most_recent_node_tip?: number | null;
  version?: string;
}
