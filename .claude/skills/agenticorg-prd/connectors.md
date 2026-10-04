# Connector catalog

The live platform has 90 connectors with tools (579 tools) and 101 registry entries. Most are enterprise finance, HR and marketing systems that a consumer or SMB agent will never touch. This file starts with the ones that matter for this round, then lists everything.

## Connectors worth building on

| Need | Connector and tools | Real or mock | Notes |
| --- | --- | --- | --- |
| Voice in and out (Gnani rule) | `elevenlabs` pointed at your adapter: `text_to_speech`, `speech_to_text` | Real Gnani behind a native pipe | The only way Gnani tools pass the validator today. TTS returns base64 mp3. STT wants `file_base64` + `filename`. [live] |
| WhatsApp send | `whatsapp`: `send_text_message`, `send_media_message`, `send_template_message`, `get_message_templates`, `get_business_profile` | Real (Meta Cloud API) | Free text only inside 24 hours of the user's last message. Outside that, approved templates only. Audio goes out as `send_media_message` type `audio` with a URL. No receive tool. [live catalog] |
| WhatsApp via Twilio | `twilio`: `send_whatsapp`, `send_sms`, `make_call`, `get_message_status`, `get_recordings` | Real | Twilio sandbox needs each user to join with a code first. [docs] |
| Pine Labs notification | `whatsapp_notification`: `whatsapp_send_notification` | Real, Pine Labs internal | Base URL `pa-notification.pineservers.com`, basic auth. Built for merchant reports. Credentials unknown. [live catalog] |
| Email in and out | `gmail`: `read_inbox`, `search_emails`, `get_thread`, `send_email` | Real | OAuth2 refresh token. `search_emails` takes Gmail query syntax, so "from:bank newer_than:1d" works. The brief's bank-SMS path. [live catalog] |
| Calendar | `google_calendar`: `list_events`, `create_event`, `delete_event`, `check_availability`, `find_free_slot` | Real | OAuth2. Good for "who is home tomorrow". [live catalog] |
| Self-scheduling | `agent_scheduler`: `schedule_agent_task`, `list_my_schedules`, `cancel_agent_task`, `cancel_merchant_schedules` | Platform | No auth. The agent re-runs itself later with a stored question. [live catalog] |
| Household data | `knowledge_base_search` | Platform | Org-wide shared index. See [platform.md](platform.md). [live] |
| Files | `s3`: `upload_document`, `download_document`, `list_objects`, `generate_signed_url` | Real (Google Cloud Storage default) | Service account. Could host voice-note audio for STT URLs. [live catalog] |
| Pine Labs online payments | `pinelabs_plural`: `create_order`, `create_payment_link`, `get_order_status`, `initiate_refund`, `get_settlement_report`, `get_payout_analytics` | Real, needs UAT client id and secret | Amounts in paise. No subscriptions, mandates or Reserve Pay tools. [live catalog] |
| Pine Labs QR billing | `pinelabs_payment`: `create_qr_transaction`, `get_qr_transaction_status`, `cancel_qr_transaction` (plus aliases) | Real, OAuth2 | `status_category` is pending, succeeded, failed, cancelled or expired. Built for Pine Labs POS billing. [live catalog] |
| Food ordering | `food_service`: cart, checkout, `track_order` and 8 more | Real, Pine Labs billing | Merchant food ordering on Pine Labs billing. Needs a configured merchant. [live catalog] |
| Commerce trust | `grantex_commerce`: catalog, cart, consent, `payment_create_intent`, `payment_get_status` | Real, Grantex | Agentic commerce with consent passports. Heavy for a household agent. [live catalog] |
| Slack or Teams | `slack`: `post_alert`, `set_reminder`, `upload_file`, `create_channel` | Real | Not a channel Indian households use. [live catalog] |
| Bank data | `banking_aa`: `request_consent`, `fetch_fi_data`, `check_account_balance` | Real, Finvu AA sandbox | Account Aggregator consent flow. Could read a real balance with consent. [live catalog] |

## Not in the catalog

| Wanted | Status | Workaround |
| --- | --- | --- |
| Gnani | No native connector | ElevenLabs connector pointed at a Gnani adapter |
| Delhivery | No native connector | MCP mock (tool names accepted by the validator) |
| Telegram | No native connector, custom MCP rejected | Use WhatsApp, or relay Telegram outside the platform |
| Google Sheets | No native connector, custom MCP rejected | Gmail, Calendar, Knowledge Base, or Excel via OneDrive (`excel`, read only, Microsoft Graph) |
| Pine Labs Reserve Pay / subscriptions | Not in `pinelabs_plural` | Mock the documented endpoints |
| Inbound message trigger | None | Schedule, workflow trigger, or outside relay |

`shiprocket` appears in the registry (category logistics) with no tools exposed. [live]

## Full catalog by category

Generated from `GET /tools?detail=true` and `GET /connectors/registry` on 2026-10-04. Auth type is what the Register Connector form asks for.

### commerce

| Connector | Auth | Tools |
| --- | --- | --- |
| `grantex_commerce` | grantex_bearer | buyer_discovery_preview, cart_create, catalog_get_item, catalog_search, checkout_create, consent_exchange, consent_request, inventory_check, merchant_get_profile, payment_create_intent, payment_get_status |

### comms

| Connector | Auth | Tools |
| --- | --- | --- |
| `elevenlabs` | api_key | create_dubbing, create_voice_clone, delete_voice, get_dubbing_status, get_voice, list_voices, speech_to_text, text_to_speech |
| `github` | pat_oauth2 | clone_repo, commit_changes, create_branch, create_file, create_issue, create_pull_request, create_pull_request_comment, create_release, delete_file, find_pull_request, get_directory_tree, get_pull_request, get_repo, get_repository_statistics, list_files, list_pull_request_files, list_pull_requests, list_repos, list_repository_issues, open_pull_request, push_changes, read_file, repository_search, search_code, trigger_github_action_workflow, update_file, write_file |
| `gmail` | oauth2 | get_thread, read_inbox, search_emails, send_email |
| `google_calendar` | oauth2 | check_availability, create_event, delete_event, find_free_slot, list_events |
| `graph_mail` | oauth2_client_credentials | get_message, get_message_attachments, read_mailbox, reply_to_message, search_messages |
| `graph_teams` | oauth2_client_credentials | read_channel_messages |
| `langsmith` | api_key | create_feedback, get_run, get_run_stats, list_datasets, list_runs |
| `microsoft_teams` | bot_framework | list_channels, respond_to_mention, send_message |
| `s3` | service_account | copy_object, delete_object, download_document, generate_signed_url, list_objects, upload_document |
| `sendgrid` | api_key | create_template, get_bounces, get_email_activity, get_stats, send_email_with_tracking, validate_email |
| `slack` | bolt_bot_token | create_channel, post_alert, set_reminder, upload_file |
| `twilio` | api_key_secret | get_message_status, get_recordings, make_call, send_sms, send_whatsapp |
| `twitter` | oauth2 | create_tweet, get_tweet, get_tweet_metrics, get_user_by_username, get_user_tweets, search_recent |
| `whatsapp` | meta_business | get_business_profile, get_message_templates, send_media_message, send_template_message, send_text_message |
| `whatsapp_notification` | basic | whatsapp_send_notification |
| `youtube` | oauth2 | get_channel_stats, get_video_analytics, get_video_stats, list_channel_videos, list_playlists, list_videos |

### compliance

| Connector | Auth | Tools |
| --- | --- | --- |
| `assurance` | none | check_and_locate_circular, check_circular_delta, fetch_circular_text, get_circular_delta_text, list_cycle_scope, list_existing_obligations, list_obligations, store_obligation, store_obligations_batch |
| `obligations` | none | list_pending_circulars |
| `rbi` | none | check_and_store_circular, fetch_circular_summary, get_compliance_notice, notify_compliance_circular, scan_recent_circulars |

### custom

| Connector | Auth | Tools |
| --- | --- | --- |
| `onboarding_mdp` | api_key | SN_Get_Cases, get_approval_history, get_audit_history, get_billing_entity, get_deployment_cases, get_deployment_details, get_opportunity_by_reference, get_opportunity_cases, get_opportunity_documents, get_opportunity_payments, get_required_documents, get_salesforce_messages, get_service_appointments, get_store, get_users_by_ids, list_olis, list_plural_olis, list_pos, list_tids, list_vas |

### ecommerce

| Connector | Auth | Tools |
| --- | --- | --- |
| `food_service` | custom | complete_checkout, confirm_order, create_checkout, create_or_resume_cart, get_order_details, get_product_details, report_provider_error, search_products, track_order, update_cart, update_checkout |

### finance

| Connector | Auth | Tools |
| --- | --- | --- |
| `banking_aa` | aa_oauth2 | check_account_balance, fetch_bank_statement, fetch_fi_data, get_transaction_list, request_consent |
| `document_parser` | none | parse_attachment |
| `finance_agent` | none | classify_email, process_balance, process_invoice, process_outstanding, process_payment, process_payment_confirmation, read_email, sync_oracle_report |
| `finance_router` | none | balance_confirmation, classify_request, generate_soa, invoice_copy, process_balance_email, process_invoice_email, verify_utr |
| `gstn` | gsp_dsc | bulk_generate_eway_bills, check_filing_status, fetch_gstr2a, file_gstr3b, file_gstr9, generate_einvoice_irn, generate_eway_bill, push_gstr1_data |
| `h2h_generator` | none | load_oracle_report, match_and_generate, parse_ticket, process_payment_email |
| `income_tax_india` | dsc | calculate_tds, check_tds_credit_in_26as, detect_tds_applicability, download_form_16a, file_24q_return, file_26q_return, file_form_26q, file_itr, generate_tds_summary, map_tds_section, pay_tax_challan, validate_pan |
| `merchant_ai` | oauth2_client_credentials | merchant_ai_analyze, merchant_ai_batch_insights, merchant_ai_compute_insights, merchant_ai_get_metric, merchant_ai_list_metrics |
| `merchant_support` | custom | merchant_create_support_case, merchant_email_transaction_report, merchant_get_support_case, merchant_get_transaction, merchant_request_transaction_report, merchant_search_transactions, merchant_transaction_settlement_status, merchant_transaction_status, merchant_transactions_by_date, merchant_update_support_case, merchant_verify_hardware, merchant_verify_pos |
| `netsuite` | token | create_invoice, create_journal_entry, create_purchase_order, create_vendor_bill, get_account_balance, get_invoice, get_trial_balance, search_records |
| `oracle_fusion` | basic | apply_receipt, approve_payment, create_ap_invoice, create_ar_receipt, create_po, download_report, get_budget, get_cash_position, get_gl_balance, get_receipt_status, get_report_params, list_ar_invoices, post_journal_entry, run_period_close, run_reconciliation |
| `oracle_receipt_file` | none | generate_bulk_oracle_file, generate_oracle_file |
| `pinelabs_payment` | oauth2 | cancel_payment, cancel_qr_transaction, check_payment_status, create_payment, create_qr_transaction, get_qr_transaction_status |
| `pinelabs_plural` | oauth2 | create_order, create_payment_link, get_order_status, get_payout_analytics, get_settlement_report, initiate_refund |
| `professional_tax` | state_portal | get_professional_tax_challan_draft, list_professional_tax_states, prepare_professional_tax_return, submit_professional_tax_return, validate_professional_tax_registration |
| `quickbooks` | oauth2 | get_balance_sheet, get_company_info, get_profit_loss, query, record_payment |
| `sap` | odata_oauth2 | get_cost_center, get_vendor_master, post_goods_receipt, run_payment_run |
| `sftp_h2h` | api_key | check_h2h_acknowledgment, download_h2h_file, list_h2h_files, upload_to_h2h |
| `stripe` | api_key | create_customer, create_payment_intent, create_payout, create_refund, get_balance, list_charges, list_disputes, list_invoices |
| `tally` | tdl_xml | export_tally_xml_data, generate_gst_report, get_ledger_balance, get_stock_summary, post_voucher |
| `traces` | deductor_portal | download_traces_statement, get_mismatch_report, reconcile_tds_with_traces, validate_traces_rows |
| `zoho_books` | oauth2 | create_bill, create_item, create_tds_entry, create_vendor, get_bill_by_id, get_expense_transactions, get_invoice_by_id, get_organization, get_purchase_invoices, get_vendor_details, get_vendor_payables, list_bills, list_chartofaccounts, list_expense_transactions, list_overdue_invoices, list_vendor_bills, list_vendors, reconcile_bank, reconcile_transaction, record_expense, search_bills, search_invoices, update_bill |

### hr

| Connector | Auth | Tools |
| --- | --- | --- |
| `darwinbox` | api_key_oauth2 | apply_leave, create_employee, get_attendance, get_employee, get_org_chart, get_payslip, run_payroll, terminate_employee, transfer_employee, update_performance |
| `docusign` | jwt | create_envelope_from_template, get_envelope_status, list_templates, send_envelope, void_envelope |
| `epfo` | dsc | check_claim_status, download_passbook, file_ecr, generate_trrn, get_uan, verify_member |
| `greenhouse` | api_key | advance_application, create_candidate, get_candidate, get_scorecards, list_applications, list_jobs, reject_application, schedule_interview |
| `keka` | api_key | get_attendance_summary, get_leave_balance, list_employees, post_reimbursement |
| `linkedin_talent` | oauth2 | get_analytics, get_applicants, get_job_insights, post_job, search_candidates, send_inmail |
| `okta` | scim_oauth2 | assign_group, deactivate_user, get_access_log, list_active_sessions, provision_user, remove_group, reset_mfa, suspend_user |
| `zoom` | oauth2 | add_panelist, cancel_meeting, create_meeting, get_attendance_report, get_recording, get_transcript |

### marketing

| Connector | Auth | Tools |
| --- | --- | --- |
| `ahrefs` | api_token | get_backlinks, get_content_gap, get_domain_rating, get_organic_keywords, get_site_audit |
| `bombora` | api_key | get_surge_scores, get_topic_clusters, get_weekly_report, search_companies |
| `brandwatch` | oauth2 | create_alert, export_report, get_mention_summary, get_mentions, get_share_of_voice |
| `buffer` | oauth2 | create_update, get_pending_updates, get_update_analytics, list_profiles, move_to_top |
| `g2` | api_key | get_category_leaders, get_comparison_data, get_intent_signals, get_product_reviews |
| `ga4` | oauth2 | get_conversions, get_metadata, get_page_analytics, get_user_acquisition, run_realtime_report, run_report |
| `google_ads` | oauth2 | create_user_list, get_campaign_performance, get_search_terms, mutate_campaign_budget, search_campaigns |
| `hubspot` | oauth2 | assign_contact_owner, associate_contact_to_company, create_association, create_company, create_contact, create_deal, create_note, create_task, delete_association, delete_company, delete_contact, delete_deal, get_campaign_analytics, get_company, get_contact, get_deal, list_associations, list_companies, list_contacts, list_deals, list_notes, list_owners, list_pipeline_stages, list_pipelines, list_tasks, search_contacts, search_deals, update_company, update_contact, update_deal, validate_crm_access |
| `linkedin_ads` | oauth2 | create_campaign, create_lead_gen_form, get_targeting_criteria |
| `mailchimp` | basic | add_list_member, create_ab_campaign, get_ab_results, get_campaign_report, list_campaigns, search_members, send_campaign, send_winner |
| `meta_ads` | oauth2 | create_custom_audience, get_ad_account_info, get_campaign_insights, update_adset_status, update_campaign_budget |
| `mixpanel` | basic | export_events, get_funnel, get_retention, get_segmentation, query_jql |
| `moengage` | basic | create_segment, get_campaign_stats, get_user_profile, track_event |
| `salesforce` | oauth2 | get_account, get_asset, get_case, get_opportunity, get_product_item, list_accounts, list_assets, list_cases, list_opportunities, list_product_items, search_accounts, search_assets, search_cases, search_opportunities |
| `trustradius` | api_key | get_buyer_intent, get_comparison_traffic, search_vendors |
| `wordpress` | basic | create_page, create_post, get_post, list_categories, list_posts, update_post, upload_media |

### ops

| Connector | Auth | Tools |
| --- | --- | --- |
| `agent_scheduler` | none | cancel_agent_task, cancel_merchant_schedules, list_my_schedules, schedule_agent_task |
| `confluence` | oauth2 | get_page, get_page_tree, list_spaces, read_page, search_content, update_page |
| `cora_transaction_intelligence` | basic | alternate_search, rrn_lookup, settlement_lookup, superset_query |
| `device_health` | oauth2_client_credentials | get_device_health |
| `excel` | oauth2_client_credentials | describe_workbook, list_workbooks, read_range |
| `figma` | api_key | export_image, extract_design_context, get_comments, get_file, get_file_nodes, list_project_files, list_team_projects, post_comment |
| `grafana` | api_key | grafana_health, list_alert_rules, list_dashboards, list_datasources, loki_correlated_logs, loki_error_context, loki_list_services, loki_query_logs, loki_service_error_summary, prometheus_query, prometheus_query_range |
| `jira` | oauth2 | add_comment, generate_issue_report, get_attachment, get_issue, get_project, get_project_metrics, get_sprint_data, get_transitions, list_attachments, list_projects, search_issues, transition_issue, update_issue |
| `mca_portal` | dsc | complete_director_kyc, fetch_company_master_data, file_annual_return, file_charge_satisfaction |
| `merchant_ai_faq` | oauth2_client_credentials | merchant_ai_faq |
| `merchant_ai_nlp` | oauth2_client_credentials | merchant_ai_nlp_data |
| `onedrive` | oauth2_client_credentials | get_file_metadata, read_text_file, search_files |
| `pagerduty` | api_key | acknowledge_incident, create_incident, create_postmortem, get_on_call, list_incidents, resolve_incident |
| `pinot` | custom | get_query_policy, run_queries, run_sql, validate_sql |
| `push_notification` | oauth2_client_credentials | send_push_notification |
| `sanctions_api` | api_key | batch_screen, generate_report, get_alert, screen_entity, screen_transaction |
| `servicenow` | rest_oauth2 | check_sla_status, get_cmdb_ci, get_kb_article, submit_change_request, update_incident |
| `text_sql_mcp` | aws_sigv4 | ask_ai_model, validate_prompt |
| `zendesk` | api_token | apply_macro, create_ticket, escalate_ticket, get_csat_score, get_sla_status, get_ticket, merge_tickets, update_ticket |

### platform

| Connector | Auth | Tools |
| --- | --- | --- |
| `agenticorg` | built-in | knowledge_base_search |

### restaurant

| Connector | Auth | Tools |
| --- | --- | --- |
| `restaurant_reservation` | api_key | book_table, cancel_booking, cancel_reservation, create_reservation, get_booking, get_reservation |

### travel

| Connector | Auth | Tools |
| --- | --- | --- |
| `easemytrip_flights` | api_key | book_flight, get_ssr, reprice_flight, search_flights |

### In the registry but with no tools exposed

`magento` (ecommerce), `amazon_business` (b2b_supplier), `bigcommerce` (ecommerce), `composio` (marketplace), `onboarding_document_utility` (custom), `mcp` (custom), `ondc_b2b` (b2b_supplier), `onboarding_salesforce` (marketing), `shiprocket` (logistics), `shopify` (ecommerce), `vijay_sales` (ecommerce), `woocommerce` (ecommerce)
