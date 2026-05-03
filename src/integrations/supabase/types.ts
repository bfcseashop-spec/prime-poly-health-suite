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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount_usd: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_cards: {
        Row: {
          card_no: string
          coverage_amount_usd: number
          created_at: string
          created_by: string | null
          discount_percent: number
          id: string
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          provider: string | null
          status: string
          tier: Database["public"]["Enums"]["insurance_tier"]
          updated_at: string
          used_amount_usd: number
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          card_no: string
          coverage_amount_usd?: number
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          provider?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["insurance_tier"]
          updated_at?: string
          used_amount_usd?: number
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          card_no?: string
          coverage_amount_usd?: number
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          provider?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["insurance_tier"]
          updated_at?: string
          used_amount_usd?: number
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      invoice_payments: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_on: string
          payment_method: string
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          reference?: string | null
          sale_id?: string
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          lab_name: string | null
          notes: string | null
          ordered_by: string | null
          ordered_by_name: string | null
          patient_id: string
          reference_range: string | null
          report_date: string | null
          results: string | null
          status: string
          test_date: string
          test_name: string
          test_type: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          lab_name?: string | null
          notes?: string | null
          ordered_by?: string | null
          ordered_by_name?: string | null
          patient_id: string
          reference_range?: string | null
          report_date?: string | null
          results?: string | null
          status?: string
          test_date?: string
          test_name: string
          test_type?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          lab_name?: string | null
          notes?: string | null
          ordered_by?: string | null
          ordered_by_name?: string | null
          patient_id?: string
          reference_range?: string | null
          report_date?: string | null
          results?: string | null
          status?: string
          test_date?: string
          test_name?: string
          test_type?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          advice: string | null
          attachments: string[] | null
          chief_complaint: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          doctor_id: string | null
          doctor_name: string | null
          examination: string | null
          follow_up_date: string | null
          id: string
          patient_id: string
          record_date: string
          symptoms: string | null
          treatment_plan: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          advice?: string | null
          attachments?: string[] | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          examination?: string | null
          follow_up_date?: string | null
          id?: string
          patient_id: string
          record_date?: string
          symptoms?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          advice?: string | null
          attachments?: string[] | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          examination?: string | null
          follow_up_date?: string | null
          id?: string
          patient_id?: string
          record_date?: string
          symptoms?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      medicine_sale_items: {
        Row: {
          description: string | null
          id: string
          item_type: string
          medicine_id: string | null
          name: string
          price_usd: number
          quantity: number
          ref_id: string | null
          sale_id: string
          total_usd: number
        }
        Insert: {
          description?: string | null
          id?: string
          item_type?: string
          medicine_id?: string | null
          name: string
          price_usd: number
          quantity: number
          ref_id?: string | null
          sale_id: string
          total_usd: number
        }
        Update: {
          description?: string | null
          id?: string
          item_type?: string
          medicine_id?: string | null
          name?: string
          price_usd?: number
          quantity?: number
          ref_id?: string | null
          sale_id?: string
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicine_sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "medicine_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_sales: {
        Row: {
          amount_paid_usd: number
          cashier_id: string | null
          created_at: string
          discount_usd: number
          due_usd: number
          id: string
          insurance_card_id: string | null
          insurance_discount_usd: number
          invoice_no: string
          notes: string | null
          patient_id: string | null
          payment_method: string
          prescription_id: string | null
          sale_type: string
          status: string
          subtotal_usd: number
          tax_usd: number
          total_usd: number
        }
        Insert: {
          amount_paid_usd?: number
          cashier_id?: string | null
          created_at?: string
          discount_usd?: number
          due_usd?: number
          id?: string
          insurance_card_id?: string | null
          insurance_discount_usd?: number
          invoice_no: string
          notes?: string | null
          patient_id?: string | null
          payment_method?: string
          prescription_id?: string | null
          sale_type?: string
          status?: string
          subtotal_usd?: number
          tax_usd?: number
          total_usd?: number
        }
        Update: {
          amount_paid_usd?: number
          cashier_id?: string | null
          created_at?: string
          discount_usd?: number
          due_usd?: number
          id?: string
          insurance_card_id?: string | null
          insurance_discount_usd?: number
          invoice_no?: string
          notes?: string | null
          patient_id?: string | null
          payment_method?: string
          prescription_id?: string | null
          sale_type?: string
          status?: string
          subtotal_usd?: number
          tax_usd?: number
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicine_sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_sales_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          low_stock_threshold: number
          name: string
          price_usd: number
          stock: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          low_stock_threshold?: number
          name: string
          price_usd?: number
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          low_stock_threshold?: number
          name?: string
          price_usd?: number
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      opd_visits: {
        Row: {
          bp: string | null
          chief_complaint: string | null
          created_at: string
          doctor_id: string | null
          height: number | null
          id: string
          notes: string | null
          patient_id: string
          pulse: number | null
          spo2: number | null
          status: string
          temperature: number | null
          token_number: number | null
          updated_at: string
          visit_date: string
          weight: number | null
        }
        Insert: {
          bp?: string | null
          chief_complaint?: string | null
          created_at?: string
          doctor_id?: string | null
          height?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          pulse?: number | null
          spo2?: number | null
          status?: string
          temperature?: number | null
          token_number?: number | null
          updated_at?: string
          visit_date?: string
          weight?: number | null
        }
        Update: {
          bp?: string | null
          chief_complaint?: string | null
          created_at?: string
          doctor_id?: string | null
          height?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          pulse?: number | null
          spo2?: number | null
          status?: string
          temperature?: number | null
          token_number?: number | null
          updated_at?: string
          visit_date?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opd_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_url: string
          id: string
          patient_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_url: string
          id?: string
          patient_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_url?: string
          id?: string
          patient_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          blood_group: string | null
          created_at: string
          created_by: string | null
          dob: string | null
          full_name: string
          gender: string | null
          id: string
          insurance_policy: string | null
          insurance_provider: string | null
          notes: string | null
          patient_code: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blood_group?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          full_name: string
          gender?: string | null
          id?: string
          insurance_policy?: string | null
          insurance_provider?: string | null
          notes?: string | null
          patient_code: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blood_group?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          insurance_policy?: string | null
          insurance_provider?: string | null
          notes?: string | null
          patient_code?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          dose: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          item_type: string
          name: string
          prescription_id: string
          route: string | null
        }
        Insert: {
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          item_type: string
          name: string
          prescription_id: string
          route?: string | null
        }
        Update: {
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          item_type?: string
          name?: string
          prescription_id?: string
          route?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          advice: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string | null
          id: string
          patient_id: string
          visit_id: string | null
        }
        Insert: {
          advice?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          patient_id: string
          visit_id?: string | null
        }
        Update: {
          advice?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "opd_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          price_usd: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_usd?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_salaries: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_on: string
          pay_period_month: string
          payment_method: string
          role: string | null
          staff_id: string | null
          staff_name: string
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          pay_period_month?: string
          payment_method?: string
          role?: string | null
          staff_id?: string | null
          staff_name: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          pay_period_month?: string
          payment_method?: string
          role?: string | null
          staff_id?: string | null
          staff_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_insurance_card_no: {
        Args: { _tier: Database["public"]["Enums"]["insurance_tier"] }
        Returns: string
      }
      generate_invoice_no: { Args: never; Returns: string }
      generate_patient_code: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "doctor"
        | "nurse"
        | "pharmacist"
        | "lab_tech"
        | "accountant"
        | "receptionist"
      insurance_tier: "normal" | "silver" | "gold" | "vip"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "admin",
        "doctor",
        "nurse",
        "pharmacist",
        "lab_tech",
        "accountant",
        "receptionist",
      ],
      insurance_tier: ["normal", "silver", "gold", "vip"],
    },
  },
} as const
