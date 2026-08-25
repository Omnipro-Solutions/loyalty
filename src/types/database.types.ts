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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          creado_en: string
          id: string
          nombre: string
          org_id: string
          parent_id: string | null
          taxonomia: string
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
          org_id: string
          parent_id?: string | null
          taxonomia?: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
          org_id?: string
          parent_id?: string | null
          taxonomia?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          actualizado_en: string
          creado_en: string
          definicion: Json
          estado: string
          id: string
          member_id: string
          meta: number
          nombre: string
          org_id: string
          premio: Json
          progreso: number
          workflow_run_id: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          definicion?: Json
          estado?: string
          id?: string
          member_id: string
          meta: number
          nombre: string
          org_id: string
          premio?: Json
          progreso?: number
          workflow_run_id?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          definicion?: Json
          estado?: string
          id?: string
          member_id?: string
          meta?: number
          nombre?: string
          org_id?: string
          premio?: Json
          progreso?: number
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon: {
        Row: {
          assigned_at: string | null
          batch_id: string
          bearer: boolean
          cancel_reason_code: string | null
          cancel_reason_note: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          code: string
          created_at: string
          currency: string
          discount_cap: number | null
          discount_type: string
          discount_value: number
          id: string
          issued_at: string | null
          max_uses: number
          member_id: string | null
          min_purchase_amount: number | null
          org_id: string
          points_charged_at: string | null
          points_cost: number | null
          points_refunded: boolean
          print_count: number
          printed_at: string | null
          qr_value: string
          redeemed_at: string | null
          sequence: number
          status: string
          updated_at: string
          uses_count: number
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          assigned_at?: string | null
          batch_id: string
          bearer?: boolean
          cancel_reason_code?: string | null
          cancel_reason_note?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          code: string
          created_at?: string
          currency?: string
          discount_cap?: number | null
          discount_type: string
          discount_value?: number
          id?: string
          issued_at?: string | null
          max_uses?: number
          member_id?: string | null
          min_purchase_amount?: number | null
          org_id: string
          points_charged_at?: string | null
          points_cost?: number | null
          points_refunded?: boolean
          print_count?: number
          printed_at?: string | null
          qr_value: string
          redeemed_at?: string | null
          sequence: number
          status?: string
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          assigned_at?: string | null
          batch_id?: string
          bearer?: boolean
          cancel_reason_code?: string | null
          cancel_reason_note?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          code?: string
          created_at?: string
          currency?: string
          discount_cap?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          issued_at?: string | null
          max_uses?: number
          member_id?: string | null
          min_purchase_amount?: number | null
          org_id?: string
          points_charged_at?: string | null
          points_cost?: number | null
          points_refunded?: boolean
          print_count?: number
          printed_at?: string | null
          qr_value?: string
          redeemed_at?: string | null
          sequence?: number
          status?: string
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_assignment: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          coupon_id: string
          id: string
          is_active: boolean
          member_id: string
          org_id: string
          role: string
          source: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          coupon_id: string
          id?: string
          is_active?: boolean
          member_id: string
          org_id: string
          role: string
          source: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          coupon_id?: string
          id?: string
          is_active?: boolean
          member_id?: string
          org_id?: string
          role?: string
          source?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_assignment_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_assignment_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_assignment_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_assignment_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_approval: {
        Row: {
          approver_id: string | null
          batch_id: string
          decided_at: string | null
          id: string
          note: string | null
          org_id: string
          requested_at: string
          requested_by: string | null
          status: string
          threshold_reasons: string[]
        }
        Insert: {
          approver_id?: string | null
          batch_id: string
          decided_at?: string | null
          id?: string
          note?: string | null
          org_id: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          threshold_reasons?: string[]
        }
        Update: {
          approver_id?: string | null
          batch_id?: string
          decided_at?: string | null
          id?: string
          note?: string | null
          org_id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          threshold_reasons?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "coupon_approval_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_approval_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_approval_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_approval_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_batch: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_count: number
          audience_mode: string | null
          audience_name: string | null
          audience_resolved_at: string | null
          audience_segment_id: string | null
          audience_size_at_issue: number | null
          authorization_ip: unknown
          authorized_at: string | null
          authorized_by: string | null
          cancelled_count: number
          category_ids: string[]
          code_pattern: string
          code_prefix: string | null
          created_at: string
          created_by: string | null
          csv_file_id: string | null
          currency: string
          delivery_channels: string[]
          discount_cap: number | null
          discount_type: string
          discount_value: number
          free_product_id: string | null
          generated_count: number
          generation_completed_at: string | null
          generation_started_at: string | null
          id: string
          internal_reference: string | null
          issue_reason: string | null
          max_coupons_per_person: number
          max_uses_per_coupon: number
          min_purchase_amount: number | null
          name: string
          org_id: string
          origin: string
          points_charge_timing: string | null
          points_cost: number | null
          points_rate: number | null
          promotion_id: string | null
          redeemed_count: number
          reference: string
          requested_quantity: number
          requires_approval: boolean
          status: string
          store_ids: string[]
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_count?: number
          audience_mode?: string | null
          audience_name?: string | null
          audience_resolved_at?: string | null
          audience_segment_id?: string | null
          audience_size_at_issue?: number | null
          authorization_ip?: unknown
          authorized_at?: string | null
          authorized_by?: string | null
          cancelled_count?: number
          category_ids?: string[]
          code_pattern?: string
          code_prefix?: string | null
          created_at?: string
          created_by?: string | null
          csv_file_id?: string | null
          currency?: string
          delivery_channels?: string[]
          discount_cap?: number | null
          discount_type: string
          discount_value?: number
          free_product_id?: string | null
          generated_count?: number
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          internal_reference?: string | null
          issue_reason?: string | null
          max_coupons_per_person?: number
          max_uses_per_coupon?: number
          min_purchase_amount?: number | null
          name: string
          org_id: string
          origin: string
          points_charge_timing?: string | null
          points_cost?: number | null
          points_rate?: number | null
          promotion_id?: string | null
          redeemed_count?: number
          reference?: string
          requested_quantity?: number
          requires_approval?: boolean
          status?: string
          store_ids?: string[]
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_count?: number
          audience_mode?: string | null
          audience_name?: string | null
          audience_resolved_at?: string | null
          audience_segment_id?: string | null
          audience_size_at_issue?: number | null
          authorization_ip?: unknown
          authorized_at?: string | null
          authorized_by?: string | null
          cancelled_count?: number
          category_ids?: string[]
          code_pattern?: string
          code_prefix?: string | null
          created_at?: string
          created_by?: string | null
          csv_file_id?: string | null
          currency?: string
          delivery_channels?: string[]
          discount_cap?: number | null
          discount_type?: string
          discount_value?: number
          free_product_id?: string | null
          generated_count?: number
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          internal_reference?: string | null
          issue_reason?: string | null
          max_coupons_per_person?: number
          max_uses_per_coupon?: number
          min_purchase_amount?: number | null
          name?: string
          org_id?: string
          origin?: string
          points_charge_timing?: string | null
          points_cost?: number | null
          points_rate?: number | null
          promotion_id?: string | null
          redeemed_count?: number
          reference?: string
          requested_quantity?: number
          requires_approval?: boolean
          status?: string
          store_ids?: string[]
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_batch_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_audience_segment_id_fkey"
            columns: ["audience_segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_csv_file_id_fkey"
            columns: ["csv_file_id"]
            isOneToOne: false
            referencedRelation: "coupon_import_file"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_free_product_id_fkey"
            columns: ["free_product_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_batch_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_event: {
        Row: {
          actor_id: string | null
          actor_label: string
          actor_type: string
          batch_id: string | null
          coupon_id: string | null
          detail: string | null
          id: string
          ip: unknown
          metadata: Json
          occurred_at: string
          org_id: string
          reason_code: string | null
          reason_note: string | null
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_label: string
          actor_type: string
          batch_id?: string | null
          coupon_id?: string | null
          detail?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          occurred_at?: string
          org_id: string
          reason_code?: string | null
          reason_note?: string | null
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string
          actor_type?: string
          batch_id?: string | null
          coupon_id?: string | null
          detail?: string | null
          id?: string
          ip?: unknown
          metadata?: Json
          occurred_at?: string
          org_id?: string
          reason_code?: string | null
          reason_note?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_event_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_event_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_event_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_import_file: {
        Row: {
          column_mapping: Json
          filename: string
          id: string
          matched_count: number
          org_id: string
          row_count: number
          unmatched_count: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          column_mapping?: Json
          filename: string
          id?: string
          matched_count?: number
          org_id: string
          row_count?: number
          unmatched_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          column_mapping?: Json
          filename?: string
          id?: string
          matched_count?: number
          org_id?: string
          row_count?: number
          unmatched_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_import_file_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_import_file_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_print_job: {
        Row: {
          batch_id: string | null
          coupon_ids: string[]
          created_at: string
          file_url: string | null
          id: string
          layout: string
          org_id: string
          page_count: number | null
          requested_by: string | null
          sequence_from: number | null
          sequence_to: number | null
          status: string
        }
        Insert: {
          batch_id?: string | null
          coupon_ids?: string[]
          created_at?: string
          file_url?: string | null
          id?: string
          layout?: string
          org_id: string
          page_count?: number | null
          requested_by?: string | null
          sequence_from?: number | null
          sequence_to?: number | null
          status?: string
        }
        Update: {
          batch_id?: string | null
          coupon_ids?: string[]
          created_at?: string
          file_url?: string | null
          id?: string
          layout?: string
          org_id?: string
          page_count?: number | null
          requested_by?: string | null
          sequence_from?: number | null
          sequence_to?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_print_job_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_batch"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_print_job_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_print_job_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemption: {
        Row: {
          channel: string
          coupon_id: string
          discount_applied: number | null
          id: string
          member_id: string | null
          occurred_at: string
          order_amount: number | null
          org_id: string
          pedido_id: string | null
          points_charged: number | null
          rejection_code: string | null
          result: string
          tienda_id: string | null
        }
        Insert: {
          channel: string
          coupon_id: string
          discount_applied?: number | null
          id?: string
          member_id?: string | null
          occurred_at?: string
          order_amount?: number | null
          org_id: string
          pedido_id?: string | null
          points_charged?: number | null
          rejection_code?: string | null
          result: string
          tienda_id?: string | null
        }
        Update: {
          channel?: string
          coupon_id?: string
          discount_applied?: number | null
          id?: string
          member_id?: string | null
          occurred_at?: string
          order_amount?: number | null
          org_id?: string
          pedido_id?: string | null
          points_charged?: number | null
          rejection_code?: string | null
          result?: string
          tienda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemption_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemption_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemption_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemption_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemption_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          aceptada_en: string | null
          creado_en: string
          email: string
          estado: string
          expira_en: string
          id: string
          invitado_por: string
          org_id: string
          role_id: string
          tienda_id: string | null
        }
        Insert: {
          aceptada_en?: string | null
          creado_en?: string
          email: string
          estado?: string
          expira_en?: string
          id?: string
          invitado_por: string
          org_id: string
          role_id: string
          tienda_id?: string | null
        }
        Update: {
          aceptada_en?: string | null
          creado_en?: string
          email?: string
          estado?: string
          expira_en?: string
          id?: string
          invitado_por?: string
          org_id?: string
          role_id?: string
          tienda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_invitado_por_fkey"
            columns: ["invitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      member_consentimientos: {
        Row: {
          actualizado_en: string
          canal: string
          fuente: string | null
          id: string
          member_id: string
          org_id: string
          otorgado: boolean
        }
        Insert: {
          actualizado_en?: string
          canal: string
          fuente?: string | null
          id?: string
          member_id: string
          org_id: string
          otorgado?: boolean
        }
        Update: {
          actualizado_en?: string
          canal?: string
          fuente?: string | null
          id?: string
          member_id?: string
          org_id?: string
          otorgado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "member_consentimientos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_consentimientos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_promociones: {
        Row: {
          asignado_en: string
          asignado_por: string | null
          id: string
          member_id: string
          nota: string | null
          org_id: string
          promocion_id: string
        }
        Insert: {
          asignado_en?: string
          asignado_por?: string | null
          id?: string
          member_id: string
          nota?: string | null
          org_id: string
          promocion_id: string
        }
        Update: {
          asignado_en?: string
          asignado_por?: string | null
          id?: string
          member_id?: string
          nota?: string | null
          org_id?: string
          promocion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_promociones_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_promociones_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_promociones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_promociones_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          actualizado_en: string
          apellido: string
          canal_adquisicion: string | null
          codigo_socio: string
          consentimiento_marketing: boolean
          creado_en: string
          email: string
          estado_civil: string | null
          estado_cuenta: string
          fecha_alta: string
          fecha_nacimiento: string | null
          genero: string | null
          id: string
          idioma: string
          nombre: string
          numero_documento: string | null
          org_id: string
          preferencia_compra: string | null
          provincia: string | null
          saldo_puntos: number
          telefono: string | null
          tienda_inscripcion_id: string | null
          tiene_hijos: boolean | null
          tiene_mascotas: boolean | null
          tier_id: string | null
          tipo_documento: string | null
        }
        Insert: {
          actualizado_en?: string
          apellido?: string
          canal_adquisicion?: string | null
          codigo_socio?: string
          consentimiento_marketing?: boolean
          creado_en?: string
          email: string
          estado_civil?: string | null
          estado_cuenta?: string
          fecha_alta?: string
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          idioma?: string
          nombre: string
          numero_documento?: string | null
          org_id: string
          preferencia_compra?: string | null
          provincia?: string | null
          saldo_puntos?: number
          telefono?: string | null
          tienda_inscripcion_id?: string | null
          tiene_hijos?: boolean | null
          tiene_mascotas?: boolean | null
          tier_id?: string | null
          tipo_documento?: string | null
        }
        Update: {
          actualizado_en?: string
          apellido?: string
          canal_adquisicion?: string | null
          codigo_socio?: string
          consentimiento_marketing?: boolean
          creado_en?: string
          email?: string
          estado_civil?: string | null
          estado_cuenta?: string
          fecha_alta?: string
          fecha_nacimiento?: string | null
          genero?: string | null
          id?: string
          idioma?: string
          nombre?: string
          numero_documento?: string | null
          org_id?: string
          preferencia_compra?: string | null
          provincia?: string | null
          saldo_puntos?: number
          telefono?: string | null
          tienda_inscripcion_id?: string | null
          tiene_hijos?: boolean | null
          tiene_mascotas?: boolean | null
          tier_id?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_tienda_inscripcion_id_fkey"
            columns: ["tienda_inscripcion_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          creado_en: string
          id: string
          profile_id: string
          usado_en: string | null
        }
        Insert: {
          code_hash: string
          creado_en?: string
          id?: string
          profile_id: string
          usado_en?: string | null
        }
        Update: {
          code_hash?: string
          creado_en?: string
          id?: string
          profile_id?: string
          usado_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_backup_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          actualizado_en: string
          creado_en: string
          dominio_correo: string
          id: string
          nombre: string
          slug: string
          tenant_idp: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          dominio_correo: string
          id?: string
          nombre: string
          slug: string
          tenant_idp?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          dominio_correo?: string
          id?: string
          nombre?: string
          slug?: string
          tenant_idp?: string | null
        }
        Relationships: []
      }
      pedido_items: {
        Row: {
          cantidad: number
          costo_unitario: number
          id: string
          pedido_id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad: number
          costo_unitario?: number
          id?: string
          pedido_id: string
          precio_unitario: number
          producto_id: string
          subtotal?: number
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          id?: string
          pedido_id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          canal: string
          costo_total: number
          creado_en: string
          estado: string
          id: string
          member_id: string
          numero_pedido: string
          org_id: string
          tienda_id: string | null
          total: number
        }
        Insert: {
          canal: string
          costo_total?: number
          creado_en?: string
          estado?: string
          id?: string
          member_id: string
          numero_pedido: string
          org_id: string
          tienda_id?: string | null
          total?: number
        }
        Update: {
          canal?: string
          costo_total?: number
          creado_en?: string
          estado?: string
          id?: string
          member_id?: string
          numero_pedido?: string
          org_id?: string
          tienda_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          aplicado_por: string | null
          canal: string | null
          creado_en: string
          expira_en: string | null
          id: string
          member_id: string
          org_id: string
          origen: string | null
          puntos: number
          tipo: string
          workflow_run_id: string | null
        }
        Insert: {
          aplicado_por?: string | null
          canal?: string | null
          creado_en?: string
          expira_en?: string | null
          id?: string
          member_id: string
          org_id: string
          origen?: string | null
          puntos: number
          tipo: string
          workflow_run_id?: string | null
        }
        Update: {
          aplicado_por?: string | null
          canal?: string | null
          creado_en?: string
          expira_en?: string | null
          id?: string
          member_id?: string
          org_id?: string
          origen?: string | null
          puntos?: number
          tipo?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_aplicado_por_fkey"
            columns: ["aplicado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_categorias: {
        Row: {
          categoria_id: string
          es_principal: boolean
          producto_id: string
        }
        Insert: {
          categoria_id: string
          es_principal?: boolean
          producto_id: string
        }
        Update: {
          categoria_id?: string
          es_principal?: boolean
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_categorias_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_eventos: {
        Row: {
          autor_nombre: string
          campo: string | null
          categoria: string
          creado_en: string
          descripcion: string | null
          es_automatico: boolean
          id: string
          org_id: string
          producto_id: string
          titulo: string
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          autor_nombre: string
          campo?: string | null
          categoria: string
          creado_en?: string
          descripcion?: string | null
          es_automatico?: boolean
          id?: string
          org_id: string
          producto_id: string
          titulo: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          autor_nombre?: string
          campo?: string | null
          categoria?: string
          creado_en?: string
          descripcion?: string | null
          es_automatico?: boolean
          id?: string
          org_id?: string
          producto_id?: string
          titulo?: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_eventos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_eventos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_precios: {
        Row: {
          canal: string
          creado_en: string
          es_base: boolean
          id: string
          nombre_lista: string
          precio: number
          producto_id: string
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          canal: string
          creado_en?: string
          es_base?: boolean
          id?: string
          nombre_lista: string
          precio: number
          producto_id: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          canal?: string
          creado_en?: string
          es_base?: boolean
          id?: string
          nombre_lista?: string
          precio?: number
          producto_id?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_precios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          actualizado_en: string
          codigo_barras: string | null
          codigo_producto: string
          completitud_pct: number
          costo_unitario: number | null
          creado_en: string
          estado: string
          id: string
          imagen_url: string | null
          marca: string | null
          nombre: string
          org_id: string
          precio: number
          precio_minimo_legal: number | null
          presentacion: string | null
          proveedor: string | null
          puntos: number
          sku: string
          tipo_producto: string | null
        }
        Insert: {
          actualizado_en?: string
          codigo_barras?: string | null
          codigo_producto: string
          completitud_pct?: number
          costo_unitario?: number | null
          creado_en?: string
          estado?: string
          id?: string
          imagen_url?: string | null
          marca?: string | null
          nombre: string
          org_id: string
          precio?: number
          precio_minimo_legal?: number | null
          presentacion?: string | null
          proveedor?: string | null
          puntos?: number
          sku: string
          tipo_producto?: string | null
        }
        Update: {
          actualizado_en?: string
          codigo_barras?: string | null
          codigo_producto?: string
          completitud_pct?: number
          costo_unitario?: number | null
          creado_en?: string
          estado?: string
          id?: string
          imagen_url?: string | null
          marca?: string | null
          nombre?: string
          org_id?: string
          precio?: number
          precio_minimo_legal?: number | null
          presentacion?: string | null
          proveedor?: string | null
          puntos?: number
          sku?: string
          tipo_producto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actualizado_en: string
          color_avatar: string | null
          creado_en: string
          email: string
          estado: string
          id: string
          nombre: string
          org_id: string
          role_id: string
          tienda_id: string | null
        }
        Insert: {
          actualizado_en?: string
          color_avatar?: string | null
          creado_en?: string
          email: string
          estado?: string
          id: string
          nombre: string
          org_id: string
          role_id: string
          tienda_id?: string | null
        }
        Update: {
          actualizado_en?: string
          color_avatar?: string | null
          creado_en?: string
          email?: string
          estado?: string
          id?: string
          nombre?: string
          org_id?: string
          role_id?: string
          tienda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_parametros: {
        Row: {
          actualizado_en: string
          breakage_estimado_pct: number
          creado_en: string
          exclusiones_reglamento: string[]
          id: string
          org_id: string
          redencion_cashback_pct: number
          techo_descuento_apilado_pct: number
          topes_catalogo: Json
          valor_punto: number
          vigencia_puntos_dias: number | null
        }
        Insert: {
          actualizado_en?: string
          breakage_estimado_pct?: number
          creado_en?: string
          exclusiones_reglamento?: string[]
          id?: string
          org_id: string
          redencion_cashback_pct?: number
          techo_descuento_apilado_pct?: number
          topes_catalogo?: Json
          valor_punto?: number
          vigencia_puntos_dias?: number | null
        }
        Update: {
          actualizado_en?: string
          breakage_estimado_pct?: number
          creado_en?: string
          exclusiones_reglamento?: string[]
          id?: string
          org_id?: string
          redencion_cashback_pct?: number
          techo_descuento_apilado_pct?: number
          topes_catalogo?: Json
          valor_punto?: number
          vigencia_puntos_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programa_parametros_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promociones: {
        Row: {
          actualizado_en: string
          acumulable: boolean
          alcance_piezas: string | null
          aplica_a_rx: string
          aplica_sobre_precio: string
          aplicar_sobre: string
          aprobacion_regulatoria: boolean
          autorizacion_venta_bajo_costo: boolean
          beneficio_sobre_regalo_pct: number | null
          bono_puntos: number | null
          canal_aplicacion: string
          canjes: number
          cantidad_minima_comprada: number | null
          cantidad_regalo: number | null
          codigo: string
          compra_cantidad: number | null
          condiciones: Json
          contrato_id: string | null
          coupon_batch_id: string | null
          creado_en: string
          cupo_disponible: number | null
          descuento_acumula_puntos: boolean
          descuento_unidad_extra_pct: number | null
          devolucion_si_vence: boolean
          dias_semana: string[] | null
          disponibilidad_dias: number | null
          duracion_cupon_dias: number | null
          elegible_en_inactividad: boolean
          escalones: Json | null
          estado_inicial: string
          estado_publicacion: string
          evento_gatillo: string | null
          financiador: string
          frecuencia_disparo: string | null
          grupo_exclusion: string | null
          hasta_agotar_existencias: boolean
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          limites: Json
          mezcla_en_universo: boolean
          modo_calculo: string | null
          modo_multiple: string
          modo_resolucion_multiplicador: string | null
          momento_acreditacion: string
          momento_debito_puntos: string | null
          momento_resolucion: string | null
          monto_minimo_canje: number | null
          monto_minimo_disparo: number | null
          motivo_emision: string | null
          multiplicador_puntos: number | null
          naturaleza_costo: string
          nivel_aplicacion: string
          niveles_requeridos: string[] | null
          nombre: string
          org_id: string
          paga_cantidad: number | null
          periodo_liquidacion: string | null
          porcentaje_costo_proveedor: number | null
          precio_promocional: number | null
          precio_referencia: number | null
          presupuesto_asignado: number
          presupuesto_consumido: number
          prioridad: number
          producto_comprado_id: string | null
          producto_regalo_id: string | null
          productos_bundle_ids: string[] | null
          proveedor: string | null
          registra_uso: boolean
          requisito_alta: string | null
          respeta_precio_minimo_legal: boolean
          roi: number | null
          simulacion_ejecutada: boolean
          tipo: string
          tipo_beneficio: string
          tipo_beneficio_no_transaccional: string
          tipo_monedero: string
          tipo_saldo: string
          tope_maximo: number | null
          umbral_alerta_presupuesto_pct: number | null
          umbral_puntos: number | null
          umbral_tipo: string | null
          validacion_requerida: string | null
          valor_beneficio: number | null
          vigencia_saldo_dias: number | null
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          actualizado_en?: string
          acumulable?: boolean
          alcance_piezas?: string | null
          aplica_a_rx?: string
          aplica_sobre_precio?: string
          aplicar_sobre?: string
          aprobacion_regulatoria?: boolean
          autorizacion_venta_bajo_costo?: boolean
          beneficio_sobre_regalo_pct?: number | null
          bono_puntos?: number | null
          canal_aplicacion?: string
          canjes?: number
          cantidad_minima_comprada?: number | null
          cantidad_regalo?: number | null
          codigo: string
          compra_cantidad?: number | null
          condiciones?: Json
          contrato_id?: string | null
          coupon_batch_id?: string | null
          creado_en?: string
          cupo_disponible?: number | null
          descuento_acumula_puntos?: boolean
          descuento_unidad_extra_pct?: number | null
          devolucion_si_vence?: boolean
          dias_semana?: string[] | null
          disponibilidad_dias?: number | null
          duracion_cupon_dias?: number | null
          elegible_en_inactividad?: boolean
          escalones?: Json | null
          estado_inicial?: string
          estado_publicacion?: string
          evento_gatillo?: string | null
          financiador?: string
          frecuencia_disparo?: string | null
          grupo_exclusion?: string | null
          hasta_agotar_existencias?: boolean
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          limites?: Json
          mezcla_en_universo?: boolean
          modo_calculo?: string | null
          modo_multiple?: string
          modo_resolucion_multiplicador?: string | null
          momento_acreditacion?: string
          momento_debito_puntos?: string | null
          momento_resolucion?: string | null
          monto_minimo_canje?: number | null
          monto_minimo_disparo?: number | null
          motivo_emision?: string | null
          multiplicador_puntos?: number | null
          naturaleza_costo?: string
          nivel_aplicacion?: string
          niveles_requeridos?: string[] | null
          nombre: string
          org_id: string
          paga_cantidad?: number | null
          periodo_liquidacion?: string | null
          porcentaje_costo_proveedor?: number | null
          precio_promocional?: number | null
          precio_referencia?: number | null
          presupuesto_asignado?: number
          presupuesto_consumido?: number
          prioridad?: number
          producto_comprado_id?: string | null
          producto_regalo_id?: string | null
          productos_bundle_ids?: string[] | null
          proveedor?: string | null
          registra_uso?: boolean
          requisito_alta?: string | null
          respeta_precio_minimo_legal?: boolean
          roi?: number | null
          simulacion_ejecutada?: boolean
          tipo: string
          tipo_beneficio: string
          tipo_beneficio_no_transaccional?: string
          tipo_monedero?: string
          tipo_saldo?: string
          tope_maximo?: number | null
          umbral_alerta_presupuesto_pct?: number | null
          umbral_puntos?: number | null
          umbral_tipo?: string | null
          validacion_requerida?: string | null
          valor_beneficio?: number | null
          vigencia_saldo_dias?: number | null
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          actualizado_en?: string
          acumulable?: boolean
          alcance_piezas?: string | null
          aplica_a_rx?: string
          aplica_sobre_precio?: string
          aplicar_sobre?: string
          aprobacion_regulatoria?: boolean
          autorizacion_venta_bajo_costo?: boolean
          beneficio_sobre_regalo_pct?: number | null
          bono_puntos?: number | null
          canal_aplicacion?: string
          canjes?: number
          cantidad_minima_comprada?: number | null
          cantidad_regalo?: number | null
          codigo?: string
          compra_cantidad?: number | null
          condiciones?: Json
          contrato_id?: string | null
          coupon_batch_id?: string | null
          creado_en?: string
          cupo_disponible?: number | null
          descuento_acumula_puntos?: boolean
          descuento_unidad_extra_pct?: number | null
          devolucion_si_vence?: boolean
          dias_semana?: string[] | null
          disponibilidad_dias?: number | null
          duracion_cupon_dias?: number | null
          elegible_en_inactividad?: boolean
          escalones?: Json | null
          estado_inicial?: string
          estado_publicacion?: string
          evento_gatillo?: string | null
          financiador?: string
          frecuencia_disparo?: string | null
          grupo_exclusion?: string | null
          hasta_agotar_existencias?: boolean
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          limites?: Json
          mezcla_en_universo?: boolean
          modo_calculo?: string | null
          modo_multiple?: string
          modo_resolucion_multiplicador?: string | null
          momento_acreditacion?: string
          momento_debito_puntos?: string | null
          momento_resolucion?: string | null
          monto_minimo_canje?: number | null
          monto_minimo_disparo?: number | null
          motivo_emision?: string | null
          multiplicador_puntos?: number | null
          naturaleza_costo?: string
          nivel_aplicacion?: string
          niveles_requeridos?: string[] | null
          nombre?: string
          org_id?: string
          paga_cantidad?: number | null
          periodo_liquidacion?: string | null
          porcentaje_costo_proveedor?: number | null
          precio_promocional?: number | null
          precio_referencia?: number | null
          presupuesto_asignado?: number
          presupuesto_consumido?: number
          prioridad?: number
          producto_comprado_id?: string | null
          producto_regalo_id?: string | null
          productos_bundle_ids?: string[] | null
          proveedor?: string | null
          registra_uso?: boolean
          requisito_alta?: string | null
          respeta_precio_minimo_legal?: boolean
          roi?: number | null
          simulacion_ejecutada?: boolean
          tipo?: string
          tipo_beneficio?: string
          tipo_beneficio_no_transaccional?: string
          tipo_monedero?: string
          tipo_saldo?: string
          tope_maximo?: number | null
          umbral_alerta_presupuesto_pct?: number | null
          umbral_puntos?: number | null
          umbral_tipo?: string | null
          validacion_requerida?: string | null
          valor_beneficio?: number | null
          vigencia_saldo_dias?: number | null
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promociones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_producto_comprado_id_fkey"
            columns: ["producto_comprado_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_producto_regalo_id_fkey"
            columns: ["producto_regalo_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_coupon_batch_id_fkey"
            columns: ["coupon_batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_batch"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          accion: string
          permitido: boolean
          recurso: string
          role_id: string
        }
        Insert: {
          accion: string
          permitido?: boolean
          recurso: string
          role_id: string
        }
        Update: {
          accion?: string
          permitido?: boolean
          recurso?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          actualizado_en: string
          alcance_canal: string
          alcance_tiendas: string
          creado_en: string
          descripcion: string | null
          descuento_maximo_pct: number | null
          id: string
          nombre: string
          org_id: string
          rol_base: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string
          alcance_canal?: string
          alcance_tiendas?: string
          creado_en?: string
          descripcion?: string | null
          descuento_maximo_pct?: number | null
          id?: string
          nombre: string
          org_id: string
          rol_base: string
          tipo?: string
        }
        Update: {
          actualizado_en?: string
          alcance_canal?: string
          alcance_tiendas?: string
          creado_en?: string
          descripcion?: string | null
          descuento_maximo_pct?: number | null
          id?: string
          nombre?: string
          org_id?: string
          rol_base?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          actualizado_en: string
          codigo: string
          condiciones: Json
          conteo_estimado: number | null
          creado_en: string
          descripcion: string | null
          estado: string
          id: string
          nivel_dominante: string | null
          nombre: string
          org_id: string
          sincronizado_con_ajo: boolean
          ultima_sincronizacion_en: string | null
        }
        Insert: {
          actualizado_en?: string
          codigo: string
          condiciones?: Json
          conteo_estimado?: number | null
          creado_en?: string
          descripcion?: string | null
          estado?: string
          id?: string
          nivel_dominante?: string | null
          nombre: string
          org_id: string
          sincronizado_con_ajo?: boolean
          ultima_sincronizacion_en?: string | null
        }
        Update: {
          actualizado_en?: string
          codigo?: string
          condiciones?: Json
          conteo_estimado?: number | null
          creado_en?: string
          descripcion?: string | null
          estado?: string
          id?: string
          nivel_dominante?: string | null
          nombre?: string
          org_id?: string
          sincronizado_con_ajo?: boolean
          ultima_sincronizacion_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_members: {
        Row: {
          agregado_en: string
          id: string
          member_id: string
          org_id: string
          segment_id: string
        }
        Insert: {
          agregado_en?: string
          id?: string
          member_id: string
          org_id: string
          segment_id: string
        }
        Update: {
          agregado_en?: string
          id?: string
          member_id?: string
          org_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_size_history: {
        Row: {
          fecha: string
          id: string
          org_id: string
          segment_id: string
          tamano: number
        }
        Insert: {
          fecha: string
          id?: string
          org_id: string
          segment_id: string
          tamano: number
        }
        Update: {
          fecha?: string
          id?: string
          org_id?: string
          segment_id?: string
          tamano?: number
        }
        Relationships: [
          {
            foreignKeyName: "segment_size_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_size_history_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      tiendas: {
        Row: {
          actualizado_en: string
          ciudad: string
          codigo_postal: string
          codigo_tienda: string
          colonia: string
          creado_en: string
          direccion: string
          email: string
          estado: string
          formato: string
          id: string
          nombre: string
          org_id: string
          pais: string
          referencia: string | null
          region: string
          responsable: string | null
          telefono: string
          zona_horaria: string | null
        }
        Insert: {
          actualizado_en?: string
          ciudad: string
          codigo_postal: string
          codigo_tienda: string
          colonia: string
          creado_en?: string
          direccion: string
          email: string
          estado?: string
          formato: string
          id?: string
          nombre: string
          org_id: string
          pais: string
          referencia?: string | null
          region: string
          responsable?: string | null
          telefono: string
          zona_horaria?: string | null
        }
        Update: {
          actualizado_en?: string
          ciudad?: string
          codigo_postal?: string
          codigo_tienda?: string
          colonia?: string
          creado_en?: string
          direccion?: string
          email?: string
          estado?: string
          formato?: string
          id?: string
          nombre?: string
          org_id?: string
          pais?: string
          referencia?: string | null
          region?: string
          responsable?: string | null
          telefono?: string
          zona_horaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiendas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          id: string
          multiplicador: number
          nombre: string
          orden: number
          org_id: string
          umbral_puntos: number
        }
        Insert: {
          id?: string
          multiplicador?: number
          nombre: string
          orden: number
          org_id: string
          umbral_puntos?: number
        }
        Update: {
          id?: string
          multiplicador?: number
          nombre?: string
          orden?: number
          org_id?: string
          umbral_puntos?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          creado_en: string
          expira_en: string
          id: string
          profile_id: string
          token_hash: string
        }
        Insert: {
          creado_en?: string
          expira_en: string
          id?: string
          profile_id: string
          token_hash: string
        }
        Update: {
          creado_en?: string
          expira_en?: string
          id?: string
          profile_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          creado_en: string
          id: string
          source_node_id: string
          source_port: string
          target_node_id: string
          workflow_id: string
        }
        Insert: {
          creado_en?: string
          id?: string
          source_node_id: string
          source_port?: string
          target_node_id: string
          workflow_id: string
        }
        Update: {
          creado_en?: string
          id?: string
          source_node_id?: string
          source_port?: string
          target_node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          actualizado_en: string
          config: Json
          creado_en: string
          etiqueta: string
          id: string
          posicion_x: number
          posicion_y: number
          tipo: string
          workflow_id: string
        }
        Insert: {
          actualizado_en?: string
          config?: Json
          creado_en?: string
          etiqueta: string
          id?: string
          posicion_x?: number
          posicion_y?: number
          tipo: string
          workflow_id: string
        }
        Update: {
          actualizado_en?: string
          config?: Json
          creado_en?: string
          etiqueta?: string
          id?: string
          posicion_x?: number
          posicion_y?: number
          tipo?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_steps: {
        Row: {
          conteo_entrada: number | null
          conteo_salida: number | null
          creado_en: string
          id: string
          node_id: string
          port: string | null
          workflow_run_id: string
        }
        Insert: {
          conteo_entrada?: number | null
          conteo_salida?: number | null
          creado_en?: string
          id?: string
          node_id: string
          port?: string | null
          workflow_run_id: string
        }
        Update: {
          conteo_entrada?: number | null
          conteo_salida?: number | null
          creado_en?: string
          id?: string
          node_id?: string
          port?: string | null
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_steps_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_steps_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          estado: string
          finalizado_en: string | null
          id: string
          iniciado_en: string
          resumen: Json
          tipo: string
          workflow_id: string
          workflow_version: number
        }
        Insert: {
          estado?: string
          finalizado_en?: string | null
          id?: string
          iniciado_en?: string
          resumen?: Json
          tipo: string
          workflow_id: string
          workflow_version: number
        }
        Update: {
          estado?: string
          finalizado_en?: string | null
          id?: string
          iniciado_en?: string
          resumen?: Json
          tipo?: string
          workflow_id?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          autor_id: string | null
          creado_en: string
          grafo: Json
          id: string
          nota: string | null
          version: number
          workflow_id: string
        }
        Insert: {
          autor_id?: string | null
          creado_en?: string
          grafo: Json
          id?: string
          nota?: string | null
          version: number
          workflow_id: string
        }
        Update: {
          autor_id?: string | null
          creado_en?: string
          grafo?: Json
          id?: string
          nota?: string | null
          version?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          descripcion: string | null
          estado: string
          id: string
          nombre: string
          org_id: string
          version_actual: number
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          estado?: string
          id?: string
          nombre: string
          org_id: string
          version_actual?: number
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          estado?: string
          id?: string
          nombre?: string
          org_id?: string
          version_actual?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflows_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      coupon_search: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          batch_reference: string | null
          code: string | null
          created_at: string | null
          discount_cap: number | null
          discount_type: string | null
          discount_value: number | null
          id: string | null
          member_email: string | null
          member_id: string | null
          member_nombre: string | null
          org_id: string | null
          points_cost: number | null
          status: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      coupon_event_actor: { Args: never; Returns: Record<string, unknown> }
      create_system_roles_for_org: {
        Args: { target_org_id: string }
        Returns: undefined
      }
      current_org_id: { Args: never; Returns: string }
      decide_coupon_approval: {
        Args: { p_approval_id: string; p_decision: string; p_note?: string }
        Returns: string
      }
      generate_coupon_batch_chunk: {
        Args: { p_batch_id: string; p_chunk_size?: number }
        Returns: {
          generated: number
          total: number
          done: boolean
        }[]
      }
      lookup_org_idp_by_domain: {
        Args: { p_dominio: string }
        Returns: {
          nombre: string
          tenant_idp: string
        }[]
      }
      org_scoped: { Args: { target_org_id: string }; Returns: boolean }
      producto_owned_by_current_org: {
        Args: { target_producto_id: string }
        Returns: boolean
      }
      render_coupon_code: {
        Args: { p_pattern: string; p_prefix: string; p_sequence: number }
        Returns: string
      }
      role_owned_by_current_org: {
        Args: { target_role_id: string }
        Returns: boolean
      }
      workflow_owned_by_current_org: {
        Args: { target_workflow_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
