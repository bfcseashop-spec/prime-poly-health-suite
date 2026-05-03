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
      admission_transfers: {
        Row: {
          admission_id: string
          created_at: string
          from_bed_no: string | null
          from_doctor_name: string | null
          from_room_id: string | null
          from_room_no: string | null
          id: string
          patient_id: string
          reason: string | null
          to_bed_no: string | null
          to_doctor_name: string | null
          to_room_id: string | null
          to_room_no: string | null
          transferred_at: string
          transferred_by: string | null
        }
        Insert: {
          admission_id: string
          created_at?: string
          from_bed_no?: string | null
          from_doctor_name?: string | null
          from_room_id?: string | null
          from_room_no?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          to_bed_no?: string | null
          to_doctor_name?: string | null
          to_room_id?: string | null
          to_room_no?: string | null
          transferred_at?: string
          transferred_by?: string | null
        }
        Update: {
          admission_id?: string
          created_at?: string
          from_bed_no?: string | null
          from_doctor_name?: string | null
          from_room_id?: string | null
          from_room_no?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          to_bed_no?: string | null
          to_doctor_name?: string | null
          to_room_id?: string | null
          to_room_no?: string | null
          transferred_at?: string
          transferred_by?: string | null
        }
        Relationships: []
      }
      admissions: {
        Row: {
          admission_no: string
          admission_type: string
          admitted_at: string
          bed_no: string | null
          created_at: string
          created_by: string | null
          daily_rate_usd: number
          diagnosis: string | null
          discharge_notes: string | null
          discharged_at: string | null
          doctor_id: string | null
          doctor_name: string | null
          expected_discharge: string | null
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          room_id: string | null
          status: string
          total_charges_usd: number
          updated_at: string
        }
        Insert: {
          admission_no?: string
          admission_type?: string
          admitted_at?: string
          bed_no?: string | null
          created_at?: string
          created_by?: string | null
          daily_rate_usd?: number
          diagnosis?: string | null
          discharge_notes?: string | null
          discharged_at?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          expected_discharge?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          room_id?: string | null
          status?: string
          total_charges_usd?: number
          updated_at?: string
        }
        Update: {
          admission_no?: string
          admission_type?: string
          admitted_at?: string
          bed_no?: string | null
          created_at?: string
          created_by?: string | null
          daily_rate_usd?: number
          diagnosis?: string | null
          discharge_notes?: string | null
          discharged_at?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          expected_discharge?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          room_id?: string | null
          status?: string
          total_charges_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          account_number: string | null
          amount_usd: number
          bank_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          receipt_url: string | null
          reference_no: string | null
          txn_date: string
          txn_type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          amount_usd?: number
          bank_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          reference_no?: string | null
          txn_date?: string
          txn_type?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          amount_usd?: number
          bank_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          reference_no?: string | null
          txn_date?: string
          txn_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          available_days: string | null
          available_hours: string | null
          bio: string | null
          consultation_fee_usd: number
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          experience_years: number | null
          full_name: string
          gender: string | null
          id: string
          joining_date: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          qualification: string | null
          registration_no: string | null
          room_no: string | null
          specialization: string | null
          status: string
          updated_at: string
        }
        Insert: {
          available_days?: string | null
          available_hours?: string | null
          bio?: string | null
          consultation_fee_usd?: number
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          experience_years?: number | null
          full_name: string
          gender?: string | null
          id?: string
          joining_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          registration_no?: string | null
          room_no?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          available_days?: string | null
          available_hours?: string | null
          bio?: string | null
          consultation_fee_usd?: number
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string
          gender?: string | null
          id?: string
          joining_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          registration_no?: string | null
          room_no?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      health_package_items: {
        Row: {
          created_at: string
          id: string
          item_type: string
          name: string
          package_id: string
          price_usd: number
          quantity: number
          ref_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          name: string
          package_id: string
          price_usd?: number
          quantity?: number
          ref_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          name?: string
          package_id?: string
          price_usd?: number
          quantity?: number
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "health_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      health_packages: {
        Row: {
          active: boolean
          category: string | null
          code: string | null
          created_at: string
          description: string | null
          discount_percent: number
          final_price_usd: number
          id: string
          name: string
          total_price_usd: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          final_price_usd?: number
          id?: string
          name: string
          total_price_usd?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          final_price_usd?: number
          id?: string
          name?: string
          total_price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      injections: {
        Row: {
          active: boolean
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          dose: string | null
          id: string
          name: string
          price_usd: number
          route: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          dose?: string | null
          id?: string
          name: string
          price_usd?: number
          route?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          dose?: string | null
          id?: string
          name?: string
          price_usd?: number
          route?: string | null
          stock?: number
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
      investment_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          total_amount_usd: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          total_amount_usd?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          total_amount_usd?: number
          updated_at?: string
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
      lab_order_items: {
        Row: {
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          flag: string | null
          id: string
          order_id: string
          price_usd: number
          reference_range: string | null
          result_file_url: string | null
          result_notes: string | null
          result_unit: string | null
          result_value: string | null
          sample_type: string | null
          status: string
          test_id: string | null
          test_name: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          flag?: string | null
          id?: string
          order_id: string
          price_usd?: number
          reference_range?: string | null
          result_file_url?: string | null
          result_notes?: string | null
          result_unit?: string | null
          result_value?: string | null
          sample_type?: string | null
          status?: string
          test_id?: string | null
          test_name: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          flag?: string | null
          id?: string
          order_id?: string
          price_usd?: number
          reference_range?: string | null
          result_file_url?: string | null
          result_notes?: string | null
          result_unit?: string | null
          result_value?: string | null
          sample_type?: string | null
          status?: string
          test_id?: string | null
          test_name?: string
        }
        Relationships: []
      }
      lab_orders: {
        Row: {
          created_at: string
          created_by: string | null
          doctor_id: string | null
          doctor_name: string | null
          id: string
          notes: string | null
          order_no: string
          ordered_on: string
          patient_id: string
          priority: string
          sample_collected_at: string | null
          sample_collected_by: string | null
          sample_notes: string | null
          sample_status: string
          status: string
          total_usd: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          order_no?: string
          ordered_on?: string
          patient_id: string
          priority?: string
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          sample_notes?: string | null
          sample_status?: string
          status?: string
          total_usd?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          order_no?: string
          ordered_on?: string
          patient_id?: string
          priority?: string
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          sample_notes?: string | null
          sample_status?: string
          status?: string
          total_usd?: number
          updated_at?: string
          visit_id?: string | null
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
      lab_tests: {
        Row: {
          active: boolean
          category: string
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price_usd: number
          reference_range: string | null
          sample_type: string | null
          turnaround_hours: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_usd?: number
          reference_range?: string | null
          sample_type?: string | null
          turnaround_hours?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_usd?: number
          reference_range?: string | null
          sample_type?: string | null
          turnaround_hours?: number | null
          unit?: string | null
          updated_at?: string
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
      medicine_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
      medicine_stock_history: {
        Row: {
          change_type: string
          cost_price_usd: number | null
          created_at: string
          created_by: string | null
          id: string
          medicine_id: string
          notes: string | null
          quantity_change: number
          stock_after: number
          stock_before: number
        }
        Insert: {
          change_type: string
          cost_price_usd?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id: string
          notes?: string | null
          quantity_change: number
          stock_after: number
          stock_before: number
        }
        Update: {
          change_type?: string
          cost_price_usd?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          medicine_id?: string
          notes?: string | null
          quantity_change?: number
          stock_after?: number
          stock_before?: number
        }
        Relationships: []
      }
      medicine_units: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          barcode: string | null
          box_barcode: string | null
          box_cost_usd: number | null
          box_price_usd: number | null
          brand: string | null
          category: string | null
          cost_price_usd: number
          created_at: string
          expiry_date: string | null
          generic_name: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          packet_barcode: string | null
          packet_cost_usd: number | null
          packet_price_usd: number | null
          price_usd: number
          stock: number
          strip_barcode: string | null
          strip_cost_usd: number | null
          strip_price_usd: number | null
          supplier: string | null
          unit: string | null
          units_per_box: number | null
          units_per_packet: number | null
          units_per_strip: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          box_barcode?: string | null
          box_cost_usd?: number | null
          box_price_usd?: number | null
          brand?: string | null
          category?: string | null
          cost_price_usd?: number
          created_at?: string
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          packet_barcode?: string | null
          packet_cost_usd?: number | null
          packet_price_usd?: number | null
          price_usd?: number
          stock?: number
          strip_barcode?: string | null
          strip_cost_usd?: number | null
          strip_price_usd?: number | null
          supplier?: string | null
          unit?: string | null
          units_per_box?: number | null
          units_per_packet?: number | null
          units_per_strip?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          box_barcode?: string | null
          box_cost_usd?: number | null
          box_price_usd?: number | null
          brand?: string | null
          category?: string | null
          cost_price_usd?: number
          created_at?: string
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          packet_barcode?: string | null
          packet_cost_usd?: number | null
          packet_price_usd?: number | null
          price_usd?: number
          stock?: number
          strip_barcode?: string | null
          strip_cost_usd?: number | null
          strip_price_usd?: number | null
          supplier?: string | null
          unit?: string | null
          units_per_box?: number | null
          units_per_packet?: number | null
          units_per_strip?: number | null
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
      ot_bookings: {
        Row: {
          anesthesia_type: string | null
          anesthetist_name: string | null
          charges_usd: number
          completed_at: string | null
          complications: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          patient_id: string | null
          patient_name: string
          post_op_notes: string | null
          pre_op_notes: string | null
          priority: string
          procedure_id: string | null
          procedure_name: string
          scheduled_at: string
          started_at: string | null
          status: string
          surgeon_id: string | null
          surgeon_name: string | null
          theater_room: string | null
          updated_at: string
        }
        Insert: {
          anesthesia_type?: string | null
          anesthetist_name?: string | null
          charges_usd?: number
          completed_at?: string | null
          complications?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          patient_id?: string | null
          patient_name: string
          post_op_notes?: string | null
          pre_op_notes?: string | null
          priority?: string
          procedure_id?: string | null
          procedure_name: string
          scheduled_at: string
          started_at?: string | null
          status?: string
          surgeon_id?: string | null
          surgeon_name?: string | null
          theater_room?: string | null
          updated_at?: string
        }
        Update: {
          anesthesia_type?: string | null
          anesthetist_name?: string | null
          charges_usd?: number
          completed_at?: string | null
          complications?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          patient_id?: string | null
          patient_name?: string
          post_op_notes?: string | null
          pre_op_notes?: string | null
          priority?: string
          procedure_id?: string | null
          procedure_name?: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          surgeon_id?: string | null
          surgeon_name?: string | null
          theater_room?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ot_procedures: {
        Row: {
          active: boolean
          category: string | null
          code: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          price_usd: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          price_usd?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
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
      rooms: {
        Row: {
          active: boolean
          bed_count: number
          created_at: string
          daily_rate_usd: number
          floor: string | null
          id: string
          notes: string | null
          room_no: string
          room_type: string
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bed_count?: number
          created_at?: string
          daily_rate_usd?: number
          floor?: string | null
          id?: string
          notes?: string | null
          room_no: string
          room_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bed_count?: number
          created_at?: string
          daily_rate_usd?: number
          floor?: string | null
          id?: string
          notes?: string | null
          room_no?: string
          room_type?: string
          status?: string
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
      shareholder_contributions: {
        Row: {
          amount_usd: number
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          investment_name: string | null
          notes: string | null
          paid_on: string
          payment_method: string
          reference: string | null
          shareholder_id: string
          slip_url: string | null
        }
        Insert: {
          amount_usd?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_name?: string | null
          notes?: string | null
          paid_on?: string
          payment_method?: string
          reference?: string | null
          shareholder_id: string
          slip_url?: string | null
        }
        Update: {
          amount_usd?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_name?: string | null
          notes?: string | null
          paid_on?: string
          payment_method?: string
          reference?: string | null
          shareholder_id?: string
          slip_url?: string | null
        }
        Relationships: []
      }
      shareholders: {
        Row: {
          active: boolean
          committed_capital_usd: number
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          joined_on: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          share_percent: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          committed_capital_usd?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          joined_on?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          share_percent?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          committed_capital_usd?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          joined_on?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          share_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          address: string | null
          age: number | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          joining_date: string | null
          monthly_salary_usd: number
          notes: string | null
          phone: string | null
          photo_url: string | null
          position: string
          qualification: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          joining_date?: string | null
          monthly_salary_usd?: number
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position: string
          qualification?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          joining_date?: string | null
          monthly_salary_usd?: number
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string
          qualification?: string | null
          status?: string
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
      xray_order_items: {
        Row: {
          body_part: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          findings: string | null
          id: string
          image_urls: string[] | null
          impression: string | null
          modality: string | null
          order_id: string
          price_usd: number
          radiologist_name: string | null
          report_file_url: string | null
          status: string
          test_id: string | null
          test_name: string
        }
        Insert: {
          body_part?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          image_urls?: string[] | null
          impression?: string | null
          modality?: string | null
          order_id: string
          price_usd?: number
          radiologist_name?: string | null
          report_file_url?: string | null
          status?: string
          test_id?: string | null
          test_name: string
        }
        Update: {
          body_part?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          image_urls?: string[] | null
          impression?: string | null
          modality?: string | null
          order_id?: string
          price_usd?: number
          radiologist_name?: string | null
          report_file_url?: string | null
          status?: string
          test_id?: string | null
          test_name?: string
        }
        Relationships: []
      }
      xray_orders: {
        Row: {
          clinical_notes: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          doctor_name: string | null
          id: string
          notes: string | null
          order_no: string
          ordered_on: string
          patient_id: string
          priority: string
          status: string
          total_usd: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          clinical_notes?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          order_no?: string
          ordered_on?: string
          patient_id: string
          priority?: string
          status?: string
          total_usd?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          clinical_notes?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          order_no?: string
          ordered_on?: string
          patient_id?: string
          priority?: string
          status?: string
          total_usd?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      xray_tests: {
        Row: {
          active: boolean
          body_part: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          modality: string
          name: string
          price_usd: number
          turnaround_hours: number | null
          updated_at: string
          view_type: string | null
        }
        Insert: {
          active?: boolean
          body_part?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          modality?: string
          name: string
          price_usd?: number
          turnaround_hours?: number | null
          updated_at?: string
          view_type?: string | null
        }
        Update: {
          active?: boolean
          body_part?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          modality?: string
          name?: string
          price_usd?: number
          turnaround_hours?: number | null
          updated_at?: string
          view_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_admission_no: { Args: never; Returns: string }
      generate_insurance_card_no: {
        Args: { _tier: Database["public"]["Enums"]["insurance_tier"] }
        Returns: string
      }
      generate_invoice_no: { Args: never; Returns: string }
      generate_lab_order_no: { Args: never; Returns: string }
      generate_patient_code: { Args: never; Returns: string }
      generate_xray_order_no: { Args: never; Returns: string }
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
