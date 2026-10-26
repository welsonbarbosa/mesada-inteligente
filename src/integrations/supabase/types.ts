export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      families: {
        Row: {
          allowance_active: boolean
          allowance_cents: number
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          allowance_active?: boolean
          allowance_cents?: number
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          allowance_active?: boolean
          allowance_cents?: number
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          child_code: string
          family_id: string
          parent_code: string
        }
        Insert: {
          child_code: string
          family_id: string
          parent_code: string
        }
        Update: {
          child_code?: string
          family_id?: string
          parent_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          display_name: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          family_id: string
          id?: string
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          child_id: string
          family_id: string
          target_cents: number
          title: string
          updated_at: string
        }
        Insert: {
          child_id: string
          family_id: string
          target_cents: number
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          family_id?: string
          target_cents?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          child_id: string
          created_at: string
          created_by: string
          family_id: string
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
          occurred_on: string
          ref_id: string | null
        }
        Insert: {
          amount_cents: number
          child_id: string
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          occurred_on?: string
          ref_id?: string | null
        }
        Update: {
          amount_cents?: number
          child_id?: string
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          occurred_on?: string
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          child_id: string
          child_note: string | null
          created_at: string
          family_id: string
          id: string
          period_key: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_cents: number
          status: Database["public"]["Enums"]["submission_status"]
          task_id: string
        }
        Insert: {
          child_id: string
          child_note?: string | null
          created_at?: string
          family_id: string
          id?: string
          period_key: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_cents: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id: string
        }
        Update: {
          child_id?: string
          child_note?: string | null
          created_at?: string
          family_id?: string
          id?: string
          period_key?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_cents?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          family_id: string
          frequency: Database["public"]["Enums"]["task_frequency"]
          id: string
          reward_cents: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          family_id: string
          frequency: Database["public"]["Enums"]["task_frequency"]
          id?: string
          reward_cents: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          family_id?: string
          frequency?: Database["public"]["Enums"]["task_frequency"]
          id?: string
          reward_cents?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      week_closures: {
        Row: {
          amount_cents: number
          child_id: string
          closed_by: string
          created_at: string
          family_id: string
          id: string
          week_start: string
        }
        Insert: {
          amount_cents: number
          child_id: string
          closed_by: string
          created_at?: string
          family_id: string
          id?: string
          week_start: string
        }
        Update: {
          amount_cents?: number
          child_id?: string
          closed_by?: string
          created_at?: string
          family_id?: string
          id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_closures_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _gen_code: { Args: never; Returns: string }
      _require_child_in_family: {
        Args: { _child: string; _family: string }
        Returns: undefined
      }
      _require_parent: { Args: never; Returns: string }
      child_balance: {
        Args: { _child: string }
        Returns: {
          available: number
          earned: number
          owed: number
          paid: number
          reserved: number
        }[]
      }
      close_week: {
        Args: { _child: string; _week_start: string }
        Returns: undefined
      }
      create_family: {
        Args: { _display_name: string; _family_name: string }
        Returns: string
      }
      join_family: {
        Args: { _code: string; _display_name: string }
        Returns: Database["public"]["Enums"]["family_role"]
      }
      move_reserve: {
        Args: {
          _add: boolean
          _amount_cents: number
          _child: string
          _idem: string
          _note: string
        }
        Returns: undefined
      }
      my_family_id: { Args: never; Returns: string }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["family_role"]
      }
      record_payment: {
        Args: {
          _amount_cents: number
          _child: string
          _idem: string
          _note: string
          _paid_on: string
        }
        Returns: undefined
      }
      regenerate_invites: { Args: never; Returns: undefined }
      review_submission: {
        Args: { _approve: boolean; _comment: string; _id: string }
        Returns: undefined
      }
      set_allowance: {
        Args: { _active: boolean; _cents: number }
        Returns: undefined
      }
      set_goal: {
        Args: { _child: string; _target_cents: number; _title: string }
        Returns: undefined
      }
      submit_task: {
        Args: { _note: string; _task_id: string }
        Returns: string
      }
      upsert_task: {
        Args: {
          _active: boolean
          _description: string
          _frequency: Database["public"]["Enums"]["task_frequency"]
          _id: string
          _reward_cents: number
          _title: string
        }
        Returns: string
      }
    }
    Enums: {
      family_role: "parent" | "child"
      ledger_kind:
        | "allowance"
        | "task_reward"
        | "payment"
        | "reserve_add"
        | "reserve_remove"
      submission_status: "pending" | "approved" | "rejected"
      task_frequency: "daily" | "weekly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      family_role: ["parent", "child"],
      ledger_kind: [
        "allowance",
        "task_reward",
        "payment",
        "reserve_add",
        "reserve_remove",
      ],
      submission_status: ["pending", "approved", "rejected"],
      task_frequency: ["daily", "weekly"],
    },
  },
} as const
