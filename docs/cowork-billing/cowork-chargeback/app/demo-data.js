// demo-data.js - synthetic demo datasets embedded as string constants.
// Customer Example shape at 70% scale. Not for real decisions.
// Roster below is a representative 1/105 sample; window.DEMO_TENANT carries
// the authoritative 70pct tenant headline, tier ladder and task categories.
window.DEMO_ENTRA_CSV = `
userPrincipalName,displayName,department,jobTitle,jobFamily,costCenter,businessUnit,usageLocation,country,manager
user000001@example.com,Cameron Reyes,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-7268,Corporate,IN,IN,member.mgr04@example.com
user000002@example.com,Blake Jones,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000003@example.com,Drew Hall,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-3176,Product & Analytics,IE,IE,data.mgr02@example.com
user000004@example.com,Marlowe Hill,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000005@example.com,Sage Wright,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5905,Product & Analytics,IN,IN,data.mgr02@example.com
user000006@example.com,Morgan Young,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000007@example.com,Sawyer Smith,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000008@example.com,Devon Johnson,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000009@example.com,Riley Kim,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr01@example.com
user000010@example.com,Jamie Moore,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000011@example.com,Reese Garcia,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000012@example.com,Morgan Novak,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr03@example.com
user000013@example.com,Kendall Novak,Engineering,Eng Manager,Eng Manager,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000014@example.com,Marlowe Brown,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5301,Corporate,US,US,it.mgr01@example.com
user000015@example.com,Marlowe Hill,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000016@example.com,Kendall Jones,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000017@example.com,Skyler Williams,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000018@example.com,Tatum Lee,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000019@example.com,Phoenix Young,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000020@example.com,Ellis Moore,IT Service Desk,Tier 1 Tech,Tier 1 Tech,CC-ITSD-5822,Corporate,PH,PH,it.mgr03@example.com
user000021@example.com,Jamie Moore,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000022@example.com,Avery Smith,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000023@example.com,Blake Johnson,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5429,Corporate,IN,IN,it.mgr02@example.com
user000024@example.com,Quinn Moore,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000025@example.com,Avery Singh,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000026@example.com,Riley Nguyen,Pharmacy Benefits,Formulary Specialist,Formulary Specialist,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000027@example.com,Riley Rossi,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000028@example.com,Jamie Johnson,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000029@example.com,Sawyer Novak,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-6737,Claims & Benefits,IN,IN,claims.mgr04@example.com
user000030@example.com,Sawyer Allen,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000031@example.com,Drew Reyes,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000032@example.com,Phoenix Chen,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr02@example.com
user000033@example.com,Jordan Okafor,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000034@example.com,Rowan Anderson,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000035@example.com,Avery Moore,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000036@example.com,Sawyer Anderson,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-8878,Clinical & Care,IE,IE,clinical.mgr02@example.com
user000037@example.com,Harper Brown,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr02@example.com
user000038@example.com,Cameron King,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000039@example.com,Skyler Brown,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000040@example.com,Sutton Reyes,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000041@example.com,Hayden Reyes,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000042@example.com,Avery Novak,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000043@example.com,Ellis Hall,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000044@example.com,Jamie Davis,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000045@example.com,Rowan King,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr01@example.com
user000046@example.com,Casey Reyes,Engineering,Eng Manager,Eng Manager,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000047@example.com,Rowan Okafor,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr01@example.com
user000048@example.com,Casey Kim,Sales (Employer Group),Renewal Manager,Renewal Manager,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000049@example.com,Skyler Walker,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000050@example.com,Cameron Chen,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000051@example.com,Jordan Singh,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000052@example.com,Casey Hill,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-6737,Claims & Benefits,IN,IN,claims.mgr02@example.com
user000053@example.com,Sawyer Rossi,Legal & Compliance,Privacy Officer,Privacy Officer,CC-LEGL-3735,Corporate,US,US,legal.mgr04@example.com
user000054@example.com,Finley Chen,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000055@example.com,Blake Brown,Engineering,SRE,SRE,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr01@example.com
user000056@example.com,Jamie Rossi,Engineering,Eng Manager,Eng Manager,CC-ENGR-4968,Corporate,US,US,engineering.mgr03@example.com
user000057@example.com,Phoenix Wright,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5905,Product & Analytics,IN,IN,data.mgr01@example.com
user000058@example.com,Jamie Haddad,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000059@example.com,Sloan Patel,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000060@example.com,Drew Reyes,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr02@example.com
user000061@example.com,Morgan King,Finance,Financial Analyst,Financial Analyst,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000062@example.com,Finley Williams,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr04@example.com
user000063@example.com,Emerson Brown,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000064@example.com,Sawyer King,Product Management,Sr PM,Sr PM,CC-PROD-3340,Product & Analytics,US,US,product.mgr01@example.com
user000065@example.com,Parker Kim,Pharmacy Benefits,Pharmacy Tech,Pharmacy Tech,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000066@example.com,Morgan Hall,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000067@example.com,Cameron Lee,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000068@example.com,Morgan Patel,Government Programs,Medicare Analyst,Medicare Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr03@example.com
user000069@example.com,Cameron Davis,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000070@example.com,Morgan Wright,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000071@example.com,Sloan Haddad,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000072@example.com,Parker Johnson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000073@example.com,Kendall Novak,Finance,Financial Analyst,Financial Analyst,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000074@example.com,Phoenix Thompson,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000075@example.com,Casey Okafor,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000076@example.com,Jordan Reyes,Pharmacy Benefits,Formulary Specialist,Formulary Specialist,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000077@example.com,Sage Davis,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000078@example.com,Sutton Kim,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000079@example.com,Logan Rossi,Engineering,Software Engineer,Software Engineer,CC-ENGR-2367,Corporate,IE,IE,engineering.mgr01@example.com
user000080@example.com,Skyler Harris,Engineering,SRE,SRE,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000081@example.com,Sawyer Kim,Marketing,Marketing Manager,Marketing Manager,CC-MKTG-9234,Corporate,US,US,marketing.mgr04@example.com
user000082@example.com,Sloan Johnson,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000083@example.com,Drew Young,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000084@example.com,Rowan Lee,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr03@example.com
user000085@example.com,Sloan Lee,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr01@example.com
user000086@example.com,Sawyer Singh,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000087@example.com,Jordan Wright,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000088@example.com,Sutton Hill,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000089@example.com,Sage Harris,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000090@example.com,Tatum Kim,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000091@example.com,Sutton King,Marketing,Brand Lead,Brand Lead,CC-MKTG-9234,Corporate,US,US,marketing.mgr01@example.com
user000092@example.com,Sloan Rossi,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-8878,Clinical & Care,IE,IE,clinical.mgr02@example.com
user000093@example.com,Finley Singh,Pharmacy Benefits,Formulary Specialist,Formulary Specialist,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr02@example.com
user000094@example.com,Jamie Moore,Government Programs,Policy Analyst,Policy Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr01@example.com
user000095@example.com,Jamie Garcia,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000096@example.com,Harper Allen,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr02@example.com
user000097@example.com,Morgan Singh,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000098@example.com,Reese Reyes,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5301,Corporate,US,US,it.mgr01@example.com
user000099@example.com,Sutton Anderson,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000100@example.com,Riley Kim,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr03@example.com
user000101@example.com,Parker Allen,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000102@example.com,Marlowe Wright,IT Service Desk,Tier 1 Tech,Tier 1 Tech,CC-ITSD-5822,Corporate,PH,PH,it.mgr01@example.com
user000103@example.com,Morgan Davis,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4842,Corporate,PH,PH,member.mgr03@example.com
user000104@example.com,Rowan Singh,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000105@example.com,Reese Anderson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr02@example.com
user000106@example.com,Skyler Brown,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000107@example.com,Hayden Rossi,Engineering,Software Engineer,Software Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000108@example.com,Marlowe Patel,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-6737,Claims & Benefits,IN,IN,claims.mgr03@example.com
user000109@example.com,Taylor Moore,Engineering,Software Engineer,Software Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000110@example.com,Blake Smith,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr04@example.com
user000111@example.com,Phoenix Miller,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5822,Corporate,PH,PH,it.mgr01@example.com
user000112@example.com,Marlowe Haddad,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5905,Product & Analytics,IN,IN,data.mgr02@example.com
user000113@example.com,Sloan Allen,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000114@example.com,Quinn Harris,Engineering,Software Engineer,Software Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000115@example.com,Ellis Williams,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000116@example.com,Tatum Garcia,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4842,Corporate,PH,PH,member.mgr03@example.com
user000117@example.com,Jordan Wright,Government Programs,Medicare Analyst,Medicare Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr01@example.com
user000118@example.com,Avery Williams,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000119@example.com,Logan Young,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000120@example.com,Sawyer Hall,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000121@example.com,Sutton Hill,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000122@example.com,Phoenix Moore,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-6737,Claims & Benefits,IN,IN,claims.mgr03@example.com
user000123@example.com,Quinn Hill,Member Services,CSR,CSR,CC-MBRS-4842,Corporate,PH,PH,member.mgr01@example.com
user000124@example.com,Cameron Novak,Pharmacy Benefits,Pharmacy Tech,Pharmacy Tech,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr02@example.com
user000125@example.com,Jordan Smith,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000126@example.com,Phoenix Haddad,Sales (Employer Group),Sales Engineer,Sales Engineer,CC-SLES-9557,Corporate,US,US,sales.mgr02@example.com
user000127@example.com,Casey Anderson,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-8878,Clinical & Care,IE,IE,clinical.mgr02@example.com
user000128@example.com,Devon Jones,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000129@example.com,Sutton Young,Human Resources,Comp Analyst,Comp Analyst,CC-HRXX-5725,Corporate,US,US,human.mgr03@example.com
user000130@example.com,Hayden Rossi,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000131@example.com,Reese Anderson,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000132@example.com,Sloan Patel,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000133@example.com,Parker Patel,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000134@example.com,Riley Moore,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000135@example.com,Morgan Patel,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000136@example.com,Jamie Allen,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000137@example.com,Sloan Harris,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr02@example.com
user000138@example.com,Sawyer Thompson,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-7268,Corporate,IN,IN,member.mgr04@example.com
user000139@example.com,Cameron Young,Engineering,Software Engineer,Software Engineer,CC-ENGR-2367,Corporate,IE,IE,engineering.mgr01@example.com
user000140@example.com,Jordan Patel,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000141@example.com,Riley Thompson,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000142@example.com,Tatum Hill,IT Service Desk,Tier 1 Tech,Tier 1 Tech,CC-ITSD-5429,Corporate,IN,IN,it.mgr03@example.com
user000143@example.com,Morgan Hill,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000144@example.com,Kendall Young,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000145@example.com,Casey King,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5905,Product & Analytics,IN,IN,data.mgr01@example.com
user000146@example.com,Harper Anderson,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000147@example.com,Riley Lee,Finance,Financial Analyst,Financial Analyst,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000148@example.com,Sutton Johnson,Marketing,Brand Lead,Brand Lead,CC-MKTG-9234,Corporate,US,US,marketing.mgr01@example.com
user000149@example.com,Skyler Brown,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000150@example.com,Casey Harris,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000151@example.com,Ellis Chen,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000152@example.com,Morgan Harris,Marketing,Brand Lead,Brand Lead,CC-MKTG-9234,Corporate,US,US,marketing.mgr04@example.com
user000153@example.com,Sutton Reyes,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000154@example.com,Blake Reyes,Marketing,Brand Lead,Brand Lead,CC-MKTG-9234,Corporate,US,US,marketing.mgr04@example.com
user000155@example.com,Emerson Garcia,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr03@example.com
user000156@example.com,Logan Anderson,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr04@example.com
user000157@example.com,Sutton Anderson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000158@example.com,Cameron King,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000159@example.com,Phoenix Reyes,Actuarial & Underwriting,Pricing Analyst,Pricing Analyst,CC-ACTR-8779,Corporate,IE,IE,actuarial.mgr01@example.com
user000160@example.com,Kendall Lee,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000161@example.com,Jordan Thompson,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000162@example.com,Harper Haddad,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-3176,Product & Analytics,IE,IE,data.mgr01@example.com
user000163@example.com,Tatum Patel,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000164@example.com,Logan Garcia,Pharmacy Benefits,Pharmacy Tech,Pharmacy Tech,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000165@example.com,Sloan Jones,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr04@example.com
user000166@example.com,Parker Miller,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000167@example.com,Phoenix Okafor,Engineering,Software Engineer,Software Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000168@example.com,Cameron Haddad,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5301,Corporate,US,US,it.mgr01@example.com
user000169@example.com,Reese Chen,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000170@example.com,Devon Davis,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000171@example.com,Quinn Wright,Product Management,PM,PM,CC-PROD-3340,Product & Analytics,US,US,product.mgr03@example.com
user000172@example.com,Sage Reyes,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000173@example.com,Finley Wright,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr02@example.com
user000174@example.com,Ellis Jones,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr04@example.com
user000175@example.com,Taylor Rossi,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr02@example.com
user000176@example.com,Logan King,Human Resources,Recruiter,Recruiter,CC-HRXX-5725,Corporate,US,US,human.mgr04@example.com
user000177@example.com,Blake Davis,Marketing,Content Strategist,Content Strategist,CC-MKTG-9234,Corporate,US,US,marketing.mgr04@example.com
user000178@example.com,Rowan Kim,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000179@example.com,Kendall Walker,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000180@example.com,Drew Patel,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-7268,Corporate,IN,IN,member.mgr04@example.com
user000181@example.com,Sawyer Moore,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000182@example.com,Sawyer Williams,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000183@example.com,Drew Walker,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5905,Product & Analytics,IN,IN,data.mgr02@example.com
user000184@example.com,Morgan Singh,Engineering,Software Engineer,Software Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000185@example.com,Rowan Young,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000186@example.com,Devon Miller,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000187@example.com,Finley Allen,Human Resources,Recruiter,Recruiter,CC-HRXX-5725,Corporate,US,US,human.mgr04@example.com
user000188@example.com,Finley Jones,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000189@example.com,Reese Nguyen,Engineering,Eng Manager,Eng Manager,CC-ENGR-2367,Corporate,IE,IE,engineering.mgr03@example.com
user000190@example.com,Blake Allen,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr04@example.com
user000191@example.com,Hayden Jones,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000192@example.com,Logan Thompson,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000193@example.com,Jordan Reyes,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000194@example.com,Riley Hall,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000195@example.com,Sawyer Okafor,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000196@example.com,Hayden Singh,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr04@example.com
user000197@example.com,Emerson Davis,Marketing,Marketing Manager,Marketing Manager,CC-MKTG-9234,Corporate,US,US,marketing.mgr01@example.com
user000198@example.com,Cameron Williams,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000199@example.com,Sawyer Brown,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4842,Corporate,PH,PH,member.mgr04@example.com
user000200@example.com,Rowan Hill,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr02@example.com
user000201@example.com,Sloan Reyes,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000202@example.com,Ellis Garcia,Human Resources,Recruiter,Recruiter,CC-HRXX-5725,Corporate,US,US,human.mgr04@example.com
user000203@example.com,Jamie Jones,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-6737,Claims & Benefits,IN,IN,claims.mgr02@example.com
user000204@example.com,Finley Anderson,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr03@example.com
user000205@example.com,Drew Harris,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5301,Corporate,US,US,it.mgr01@example.com
user000206@example.com,Sloan Anderson,Actuarial & Underwriting,Pricing Analyst,Pricing Analyst,CC-ACTR-8779,Corporate,IE,IE,actuarial.mgr01@example.com
user000207@example.com,Cameron Harris,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000208@example.com,Devon Rossi,Actuarial & Underwriting,Actuary,Actuary,CC-ACTR-9205,Corporate,US,US,actuarial.mgr02@example.com
user000209@example.com,Cameron Davis,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000210@example.com,Tatum Okafor,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000211@example.com,Blake Kim,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000212@example.com,Kendall Patel,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000213@example.com,Jordan Wright,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000214@example.com,Sawyer Haddad,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000215@example.com,Avery Jones,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000216@example.com,Rowan Singh,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000217@example.com,Tatum Moore,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4842,Corporate,PH,PH,member.mgr04@example.com
user000218@example.com,Marlowe Lee,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000219@example.com,Ellis Kim,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000220@example.com,Riley Patel,Finance,Financial Analyst,Financial Analyst,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000221@example.com,Finley King,Engineering,Eng Manager,Eng Manager,CC-ENGR-4968,Corporate,US,US,engineering.mgr02@example.com
user000222@example.com,Sloan Okafor,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000223@example.com,Hayden Patel,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr04@example.com
user000224@example.com,Cameron Harris,Marketing,Brand Lead,Brand Lead,CC-MKTG-9234,Corporate,US,US,marketing.mgr04@example.com
user000225@example.com,Tatum Nguyen,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr03@example.com
user000226@example.com,Taylor Rossi,Engineering,Software Engineer,Software Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000227@example.com,Morgan Singh,Engineering,Eng Manager,Eng Manager,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000228@example.com,Phoenix Reyes,Human Resources,HRBP,HRBP,CC-HRXX-5725,Corporate,US,US,human.mgr02@example.com
user000229@example.com,Avery Kim,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr02@example.com
user000230@example.com,Morgan Moore,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000231@example.com,Taylor Haddad,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000232@example.com,Jamie Anderson,Government Programs,Medicare Analyst,Medicare Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr03@example.com
user000233@example.com,Sage Garcia,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000234@example.com,Devon Thompson,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000235@example.com,Drew Wright,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000236@example.com,Cameron Haddad,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000237@example.com,Sawyer Nguyen,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5822,Corporate,PH,PH,it.mgr02@example.com
user000238@example.com,Parker Hill,Member Services,CSR,CSR,CC-MBRS-4842,Corporate,PH,PH,member.mgr04@example.com
user000239@example.com,Quinn Chen,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000240@example.com,Marlowe Wright,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr02@example.com
user000241@example.com,Drew Miller,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000242@example.com,Cameron Thompson,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000243@example.com,Phoenix Rossi,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr02@example.com
user000244@example.com,Harper Smith,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-7268,Corporate,IN,IN,member.mgr04@example.com
user000245@example.com,Casey Haddad,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr03@example.com
user000246@example.com,Devon Wright,Legal & Compliance,Privacy Officer,Privacy Officer,CC-LEGL-3735,Corporate,US,US,legal.mgr02@example.com
user000247@example.com,Casey Nguyen,Member Services,CSR,CSR,CC-MBRS-4842,Corporate,PH,PH,member.mgr01@example.com
user000248@example.com,Taylor Reyes,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000249@example.com,Sage Allen,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000250@example.com,Marlowe Davis,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000251@example.com,Blake Jones,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000252@example.com,Emerson Smith,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4842,Corporate,PH,PH,member.mgr03@example.com
user000253@example.com,Marlowe Hill,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000254@example.com,Morgan Nguyen,Marketing,Marketing Manager,Marketing Manager,CC-MKTG-9234,Corporate,US,US,marketing.mgr01@example.com
user000255@example.com,Tatum Kim,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5301,Corporate,US,US,it.mgr04@example.com
user000256@example.com,Kendall Young,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000257@example.com,Quinn Haddad,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000258@example.com,Jordan Smith,Actuarial & Underwriting,Pricing Analyst,Pricing Analyst,CC-ACTR-8779,Corporate,IE,IE,actuarial.mgr01@example.com
user000259@example.com,Blake Moore,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-8878,Clinical & Care,IE,IE,clinical.mgr02@example.com
user000260@example.com,Skyler Anderson,Human Resources,Recruiter,Recruiter,CC-HRXX-5725,Corporate,US,US,human.mgr02@example.com
user000261@example.com,Riley Lee,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr03@example.com
user000262@example.com,Jordan Reyes,Human Resources,HRBP,HRBP,CC-HRXX-5725,Corporate,US,US,human.mgr02@example.com
user000263@example.com,Sutton Williams,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000264@example.com,Avery Davis,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000265@example.com,Sloan Patel,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000266@example.com,Parker Chen,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000267@example.com,Sage Miller,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000268@example.com,Avery Williams,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr02@example.com
user000269@example.com,Cameron Hall,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000270@example.com,Drew Chen,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr01@example.com
user000271@example.com,Phoenix Singh,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000272@example.com,Jamie Anderson,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000273@example.com,Skyler Haddad,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000274@example.com,Hayden Thompson,Pharmacy Benefits,Pharmacy Tech,Pharmacy Tech,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr04@example.com
user000275@example.com,Taylor Kim,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5301,Corporate,US,US,it.mgr02@example.com
user000276@example.com,Avery Brown,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000277@example.com,Hayden Kim,Engineering,Eng Manager,Eng Manager,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000278@example.com,Phoenix Anderson,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr01@example.com
user000279@example.com,Reese Reyes,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000280@example.com,Harper Jones,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000281@example.com,Sutton Smith,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000282@example.com,Morgan Moore,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000283@example.com,Devon Moore,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000284@example.com,Parker Williams,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000285@example.com,Sloan Walker,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000286@example.com,Jamie Okafor,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000287@example.com,Parker Hill,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000288@example.com,Ellis Davis,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000289@example.com,Cameron Brown,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000290@example.com,Morgan Rossi,Engineering,Software Engineer,Software Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr02@example.com
user000291@example.com,Sage Thompson,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000292@example.com,Phoenix Moore,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr03@example.com
user000293@example.com,Parker Hall,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000294@example.com,Marlowe Williams,Government Programs,Medicare Analyst,Medicare Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr03@example.com
user000295@example.com,Skyler Brown,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5429,Corporate,IN,IN,it.mgr02@example.com
user000296@example.com,Reese Brown,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr03@example.com
user000297@example.com,Phoenix Garcia,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000298@example.com,Tatum Chen,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr01@example.com
user000299@example.com,Harper Garcia,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5905,Product & Analytics,IN,IN,data.mgr04@example.com
user000300@example.com,Jordan Davis,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000301@example.com,Phoenix Johnson,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000302@example.com,Phoenix Hall,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000303@example.com,Logan Kim,Government Programs,Policy Analyst,Policy Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr02@example.com
user000304@example.com,Devon Walker,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000305@example.com,Riley Williams,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000306@example.com,Harper Singh,Engineering,Software Engineer,Software Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000307@example.com,Avery Moore,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr01@example.com
user000308@example.com,Harper Patel,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000309@example.com,Jordan Hill,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000310@example.com,Finley Johnson,Actuarial & Underwriting,Actuary,Actuary,CC-ACTR-9205,Corporate,US,US,actuarial.mgr02@example.com
user000311@example.com,Finley Reyes,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000312@example.com,Tatum Anderson,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000313@example.com,Emerson Reyes,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr04@example.com
user000314@example.com,Taylor Young,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr02@example.com
user000315@example.com,Emerson Williams,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000316@example.com,Hayden Anderson,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000317@example.com,Finley Lee,Engineering,Eng Manager,Eng Manager,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000318@example.com,Cameron Allen,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000319@example.com,Quinn Walker,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000320@example.com,Casey Harris,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000321@example.com,Logan Johnson,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-7268,Corporate,IN,IN,member.mgr04@example.com
user000322@example.com,Quinn Miller,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5301,Corporate,US,US,it.mgr01@example.com
user000323@example.com,Sutton Hall,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000324@example.com,Tatum Nguyen,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000325@example.com,Hayden Walker,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000326@example.com,Sutton Walker,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000327@example.com,Jamie Jones,Marketing,Marketing Manager,Marketing Manager,CC-MKTG-9234,Corporate,US,US,marketing.mgr01@example.com
user000328@example.com,Reese Wright,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr04@example.com
user000329@example.com,Reese Reyes,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000330@example.com,Hayden Brown,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000331@example.com,Reese Nguyen,Actuarial & Underwriting,Pricing Analyst,Pricing Analyst,CC-ACTR-8779,Corporate,IE,IE,actuarial.mgr01@example.com
user000332@example.com,Drew Novak,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr01@example.com
user000333@example.com,Tatum Allen,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000334@example.com,Finley Hall,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000335@example.com,Ellis Chen,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000336@example.com,Finley Johnson,Actuarial & Underwriting,Actuary,Actuary,CC-ACTR-9205,Corporate,US,US,actuarial.mgr02@example.com
user000337@example.com,Jamie Thompson,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000338@example.com,Skyler Okafor,Government Programs,Medicaid Liaison,Medicaid Liaison,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000339@example.com,Logan Novak,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000340@example.com,Logan Wright,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000341@example.com,Jamie Lee,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-7268,Corporate,IN,IN,member.mgr04@example.com
user000342@example.com,Taylor Johnson,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr01@example.com
user000343@example.com,Emerson Allen,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000344@example.com,Hayden Moore,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000345@example.com,Kendall Patel,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr02@example.com
user000346@example.com,Cameron Rossi,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000347@example.com,Blake Rossi,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000348@example.com,Sutton Novak,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr04@example.com
user000349@example.com,Marlowe Reyes,Engineering,SRE,SRE,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr01@example.com
user000350@example.com,Kendall Kim,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000351@example.com,Riley Allen,Network Management,Contract Negotiator,Contract Negotiator,CC-NTWK-4645,Corporate,US,US,network.mgr01@example.com
user000352@example.com,Emerson Wright,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000353@example.com,Parker Moore,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000354@example.com,Logan Garcia,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000355@example.com,Kendall Smith,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000356@example.com,Casey Hall,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000357@example.com,Sawyer Moore,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000358@example.com,Kendall Thompson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000359@example.com,Phoenix Jones,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5429,Corporate,IN,IN,it.mgr02@example.com
user000360@example.com,Kendall Patel,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr02@example.com
user000361@example.com,Skyler Johnson,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr01@example.com
user000362@example.com,Sutton Haddad,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000363@example.com,Tatum Anderson,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000364@example.com,Rowan Brown,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000365@example.com,Kendall Young,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr01@example.com
user000366@example.com,Sage Williams,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000367@example.com,Taylor Hill,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000368@example.com,Harper Novak,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-8878,Clinical & Care,IE,IE,clinical.mgr02@example.com
user000369@example.com,Phoenix Lee,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000370@example.com,Hayden Hall,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr01@example.com
user000371@example.com,Sutton Allen,IT Service Desk,Tier 1 Tech,Tier 1 Tech,CC-ITSD-5822,Corporate,PH,PH,it.mgr03@example.com
user000372@example.com,Sloan Nguyen,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000373@example.com,Hayden Davis,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000374@example.com,Riley Moore,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000375@example.com,Jordan Young,Pharmacy Benefits,Pharmacy Tech,Pharmacy Tech,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr04@example.com
user000376@example.com,Hayden Jones,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr02@example.com
user000377@example.com,Jordan Brown,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000378@example.com,Sutton Garcia,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000379@example.com,Logan Lee,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000380@example.com,Casey Novak,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr02@example.com
user000381@example.com,Devon Allen,Member Services,CSR,CSR,CC-MBRS-4842,Corporate,PH,PH,member.mgr01@example.com
user000382@example.com,Morgan Walker,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000383@example.com,Reese Brown,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000384@example.com,Cameron Reyes,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-3176,Product & Analytics,IE,IE,data.mgr02@example.com
user000385@example.com,Jamie Davis,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4842,Corporate,PH,PH,member.mgr04@example.com
user000386@example.com,Cameron Kim,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000387@example.com,Blake Anderson,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr03@example.com
user000388@example.com,Taylor Reyes,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000389@example.com,Sawyer Williams,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5301,Corporate,US,US,it.mgr02@example.com
user000390@example.com,Marlowe Patel,Marketing,Brand Lead,Brand Lead,CC-MKTG-9234,Corporate,US,US,marketing.mgr04@example.com
user000391@example.com,Sawyer Hill,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000392@example.com,Reese Nguyen,Engineering,Eng Manager,Eng Manager,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000393@example.com,Riley Anderson,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr03@example.com
user000394@example.com,Marlowe King,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5351,Product & Analytics,US,US,data.mgr04@example.com
user000395@example.com,Tatum Brown,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000396@example.com,Skyler Williams,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000397@example.com,Kendall Singh,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000398@example.com,Harper Smith,Engineering,Eng Manager,Eng Manager,CC-ENGR-4968,Corporate,US,US,engineering.mgr01@example.com
user000399@example.com,Reese Wright,Network Management,Provider Relations,Provider Relations,CC-NTWK-4645,Corporate,US,US,network.mgr04@example.com
user000400@example.com,Phoenix Patel,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000401@example.com,Quinn Okafor,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000402@example.com,Taylor Kim,Human Resources,HRBP,HRBP,CC-HRXX-5725,Corporate,US,US,human.mgr03@example.com
user000403@example.com,Rowan Hall,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000404@example.com,Harper Walker,Network Management,Provider Relations,Provider Relations,CC-NTWK-4645,Corporate,US,US,network.mgr02@example.com
user000405@example.com,Cameron Reyes,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr03@example.com
user000406@example.com,Morgan Jones,Government Programs,Policy Analyst,Policy Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr01@example.com
user000407@example.com,Kendall Chen,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000408@example.com,Morgan Johnson,Engineering,Platform Engineer,Platform Engineer,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000409@example.com,Quinn Singh,Sales (Employer Group),Renewal Manager,Renewal Manager,CC-SLES-9557,Corporate,US,US,sales.mgr03@example.com
user000410@example.com,Sutton Hill,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000411@example.com,Sawyer Anderson,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000412@example.com,Cameron Williams,Legal & Compliance,Privacy Officer,Privacy Officer,CC-LEGL-3735,Corporate,US,US,legal.mgr01@example.com
user000413@example.com,Devon Patel,Government Programs,Medicare Analyst,Medicare Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr04@example.com
user000414@example.com,Morgan Johnson,Government Programs,Policy Analyst,Policy Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr02@example.com
user000415@example.com,Sloan Kim,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000416@example.com,Avery Jones,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000417@example.com,Tatum Rossi,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000418@example.com,Avery Novak,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000419@example.com,Reese Patel,Data & Analytics,BI Engineer,BI Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr02@example.com
user000420@example.com,Drew Novak,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000421@example.com,Sutton Young,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000422@example.com,Kendall Anderson,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000423@example.com,Sawyer Johnson,Engineering,Software Engineer,Software Engineer,CC-ENGR-2367,Corporate,IE,IE,engineering.mgr01@example.com
user000424@example.com,Avery Smith,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr02@example.com
user000425@example.com,Ellis Smith,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr03@example.com
user000426@example.com,Taylor Miller,IT Service Desk,Desktop Admin,Desktop Admin,CC-ITSD-5301,Corporate,US,US,it.mgr01@example.com
user000427@example.com,Parker Chen,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr04@example.com
user000428@example.com,Cameron King,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000429@example.com,Quinn Williams,Finance,Accountant,Accountant,CC-FINX-3628,Corporate,US,US,finance.mgr02@example.com
user000430@example.com,Ellis Nguyen,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000431@example.com,Reese Kim,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr03@example.com
user000432@example.com,Blake Nguyen,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000433@example.com,Kendall Reyes,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000434@example.com,Riley Jones,Government Programs,Policy Analyst,Policy Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr02@example.com
user000435@example.com,Tatum Anderson,Clinical Operations,Care Coordinator,Care Coordinator,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000436@example.com,Finley Miller,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000437@example.com,Rowan Rossi,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000438@example.com,Quinn Novak,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000439@example.com,Sawyer Chen,Engineering,SRE,SRE,CC-ENGR-4968,Corporate,US,US,engineering.mgr04@example.com
user000440@example.com,Hayden Nguyen,Human Resources,HRBP,HRBP,CC-HRXX-5725,Corporate,US,US,human.mgr02@example.com
user000441@example.com,Quinn Chen,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000442@example.com,Logan Harris,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr03@example.com
user000443@example.com,Parker Thompson,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000444@example.com,Quinn Thompson,Pharmacy Benefits,PBM Analyst,PBM Analyst,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000445@example.com,Morgan Allen,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr01@example.com
user000446@example.com,Skyler Patel,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr03@example.com
user000447@example.com,Sloan Hill,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000448@example.com,Ellis Young,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000449@example.com,Morgan Jones,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr03@example.com
user000450@example.com,Blake Brown,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000451@example.com,Cameron Hill,Engineering,Eng Manager,Eng Manager,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000452@example.com,Skyler Johnson,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5301,Corporate,US,US,it.mgr02@example.com
user000453@example.com,Skyler Kim,Clinical Operations,Clinical Analyst,Clinical Analyst,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000454@example.com,Sloan Patel,Finance,FP&A Manager,FP&A Manager,CC-FINX-3628,Corporate,US,US,finance.mgr03@example.com
user000455@example.com,Sawyer Young,Engineering,Software Engineer,Software Engineer,CC-ENGR-2367,Corporate,IE,IE,engineering.mgr04@example.com
user000456@example.com,Kendall Johnson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000457@example.com,Logan Garcia,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000458@example.com,Hayden Miller,Member Services,Escalations Lead,Escalations Lead,CC-MBRS-4965,Corporate,US,US,member.mgr03@example.com
user000459@example.com,Morgan Rossi,Data & Analytics,Data Analyst,Data Analyst,CC-DATA-5351,Product & Analytics,US,US,data.mgr03@example.com
user000460@example.com,Finley Thompson,Sales (Employer Group),Sales Engineer,Sales Engineer,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000461@example.com,Taylor Hill,Sales (Employer Group),Account Executive,Account Executive,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000462@example.com,Cameron Kim,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr04@example.com
user000463@example.com,Reese Kim,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000464@example.com,Tatum Singh,Engineering,Eng Manager,Eng Manager,CC-ENGR-2367,Corporate,IE,IE,engineering.mgr03@example.com
user000465@example.com,Blake Wright,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000466@example.com,Emerson Thompson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000467@example.com,Casey Hall,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr02@example.com
user000468@example.com,Cameron Jones,Actuarial & Underwriting,Underwriter,Underwriter,CC-ACTR-9205,Corporate,US,US,actuarial.mgr03@example.com
user000469@example.com,Casey Walker,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000470@example.com,Drew Allen,Data & Analytics,Data Scientist,Data Scientist,CC-DATA-3176,Product & Analytics,IE,IE,data.mgr03@example.com
user000471@example.com,Reese Young,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr04@example.com
user000472@example.com,Harper Hall,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000473@example.com,Devon Wright,Legal & Compliance,Compliance Analyst,Compliance Analyst,CC-LEGL-3735,Corporate,US,US,legal.mgr03@example.com
user000474@example.com,Drew Williams,Marketing,Content Strategist,Content Strategist,CC-MKTG-9234,Corporate,US,US,marketing.mgr02@example.com
user000475@example.com,Parker Hill,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000476@example.com,Riley Moore,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000477@example.com,Riley Okafor,Data & Analytics,ML Engineer,ML Engineer,CC-DATA-5351,Product & Analytics,US,US,data.mgr01@example.com
user000478@example.com,Cameron Patel,Member Services,CSR,CSR,CC-MBRS-4965,Corporate,US,US,member.mgr04@example.com
user000479@example.com,Jamie Haddad,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000480@example.com,Quinn Anderson,Engineering,Software Engineer,Software Engineer,CC-ENGR-5096,Corporate,IN,IN,engineering.mgr03@example.com
user000481@example.com,Drew Hill,Claims Processing,Claims Examiner,Claims Examiner,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr01@example.com
user000482@example.com,Avery Anderson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr03@example.com
user000483@example.com,Ellis Brown,Sales (Employer Group),Renewal Manager,Renewal Manager,CC-SLES-9557,Corporate,US,US,sales.mgr04@example.com
user000484@example.com,Casey Hall,Government Programs,Medicare Analyst,Medicare Analyst,CC-GOVT-6236,Corporate,US,US,government.mgr03@example.com
user000485@example.com,Skyler Kim,Member Services,CSR,CSR,CC-MBRS-7268,Corporate,IN,IN,member.mgr02@example.com
user000486@example.com,Cameron Walker,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr01@example.com
user000487@example.com,Finley Reyes,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr01@example.com
user000488@example.com,Sloan Hill,Member Services,Quality Analyst,Quality Analyst,CC-MBRS-4965,Corporate,US,US,member.mgr02@example.com
user000489@example.com,Drew Davis,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000490@example.com,Jordan Nguyen,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr01@example.com
user000491@example.com,Emerson Johnson,Claims Processing,Claims Auditor,Claims Auditor,CC-CLMS-4183,Claims & Benefits,PH,PH,claims.mgr02@example.com
user000492@example.com,Blake Allen,Clinical Operations,RN Care Manager,RN Care Manager,CC-CLIN-5440,Clinical & Care,US,US,clinical.mgr04@example.com
user000493@example.com,Skyler Anderson,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000494@example.com,Logan Patel,Pharmacy Benefits,Pharmacy Tech,Pharmacy Tech,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr02@example.com
user000495@example.com,Sloan Moore,Claims Processing,Recovery Specialist,Recovery Specialist,CC-CLMS-4306,Claims & Benefits,US,US,claims.mgr02@example.com
user000496@example.com,Skyler Kim,Sales (Employer Group),Renewal Manager,Renewal Manager,CC-SLES-9557,Corporate,US,US,sales.mgr03@example.com
user000497@example.com,Logan Singh,Network Management,Network Analyst,Network Analyst,CC-NTWK-4645,Corporate,US,US,network.mgr03@example.com
user000498@example.com,Harper Anderson,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5301,Corporate,US,US,it.mgr02@example.com
user000499@example.com,Emerson Singh,Pharmacy Benefits,Formulary Specialist,Formulary Specialist,CC-RXBM-6855,Corporate,US,US,pharmacy.mgr01@example.com
user000500@example.com,Avery Hall,IT Service Desk,Tier 2 Tech,Tier 2 Tech,CC-ITSD-5822,Corporate,PH,PH,it.mgr01@example.com
`;
window.DEMO_CREDITS_CSV = `
Display Name,User Principal Name,Monthly credit limit,Monthly credits used,User ID,Microsoft 365 Copilot license,Last activity date,Session Count
Cameron Reyes,user000001@example.com,1000,516,u-aa8da3c1b7c9,Yes,2026-01-03,5
Blake Jones,user000002@example.com,1000,522,u-beddd5ec2620,Yes,2026-01-03,5
Drew Hall,user000003@example.com,1000,497,u-2c01174f3d78,Yes,2026-01-04,5
Marlowe Hill,user000004@example.com,1000,0,u-f50145120356,No,2025-12-29,1
Sage Wright,user000005@example.com,1000,797,u-5f83aaecbb36,Yes,2026-01-15,8
Morgan Young,user000006@example.com,1000,725,u-6bf90e5235a7,Yes,2026-01-04,7
Sawyer Smith,user000007@example.com,1000,480,u-672b24236bc5,Yes,2026-01-13,5
Devon Johnson,user000008@example.com,1000,977,u-0131403460c1,Yes,2025-12-26,10
Riley Kim,user000009@example.com,1000,2036,u-935b34162289,Yes,2026-01-22,21
Jamie Moore,user000010@example.com,1000,763,u-1045ceb23768,Yes,2026-01-08,8
Reese Garcia,user000011@example.com,1000,552,u-0e9c639c104e,Yes,2026-01-01,6
Morgan Novak,user000012@example.com,1000,0,u-d14d2f54c47e,No,2026-01-18,1
Kendall Novak,user000013@example.com,1000,617,u-b6970a636945,Yes,2026-01-21,6
Marlowe Brown,user000014@example.com,1000,1248,u-a9277de90e67,Yes,2026-01-16,13
Marlowe Hill,user000015@example.com,1000,353,u-a0625ea76537,Yes,2026-01-14,4
Kendall Jones,user000016@example.com,1000,1591,u-7e356c7bea34,Yes,2026-01-14,16
Skyler Williams,user000017@example.com,1000,796,u-b8614e8f00dc,Yes,2026-01-13,8
Tatum Lee,user000018@example.com,1000,911,u-3b89953e7af6,Yes,2025-12-23,9
Phoenix Young,user000019@example.com,1000,704,u-e5bb6a70f15b,Yes,2025-12-24,7
Ellis Moore,user000020@example.com,1000,1179,u-563b355d0204,Yes,2025-12-30,12
Jamie Moore,user000021@example.com,1000,1142,u-f0ef3bd36631,Yes,2025-12-30,12
Avery Smith,user000022@example.com,1000,662,u-abbaf318b852,Yes,2026-01-15,7
Blake Johnson,user000023@example.com,1000,619,u-13b319f4b0cf,Yes,2025-12-21,6
Quinn Moore,user000024@example.com,1000,785,u-f168657bd98f,Yes,2025-12-29,8
Avery Singh,user000025@example.com,1000,582,u-75f82b92a6b7,Yes,2025-12-23,6
Riley Nguyen,user000026@example.com,1000,965,u-9e7d1c89a5e8,Yes,2025-12-24,10
Riley Rossi,user000027@example.com,1000,662,u-52960d7820b6,Yes,2026-01-13,7
Jamie Johnson,user000028@example.com,1000,766,u-f0218ef2591f,Yes,2026-01-22,8
Sawyer Novak,user000029@example.com,1000,842,u-bb13d9eabafa,Yes,2026-01-11,9
Sawyer Allen,user000030@example.com,1000,900,u-310bff0e81da,Yes,2025-12-26,9
Drew Reyes,user000031@example.com,1000,1856,u-bc4937b7448c,Yes,2026-01-01,19
Phoenix Chen,user000032@example.com,1000,0,u-314eccb807e2,No,2025-12-23,1
Jordan Okafor,user000033@example.com,1000,597,u-235be9462501,Yes,2025-12-28,6
Rowan Anderson,user000034@example.com,1000,558,u-48c7e62bddf9,Yes,2025-12-27,6
Avery Moore,user000035@example.com,1000,1109,u-1402ee0e9a75,Yes,2026-01-18,11
Sawyer Anderson,user000036@example.com,1000,564,u-89ccc850c250,Yes,2026-01-03,6
Harper Brown,user000037@example.com,1000,797,u-d34c520a3cd1,Yes,2025-12-22,8
Cameron King,user000038@example.com,1000,738,u-e6487de9ed39,Yes,2025-12-22,8
Skyler Brown,user000039@example.com,1000,482,u-731ca2039e53,Yes,2025-12-23,5
Sutton Reyes,user000040@example.com,1000,714,u-16ed9189f6f5,Yes,2025-12-30,7
Hayden Reyes,user000041@example.com,1000,1010,u-60ff5aceaf14,Yes,2025-12-29,10
Avery Novak,user000042@example.com,1000,781,u-3704985dd8b6,Yes,2026-01-07,8
Ellis Hall,user000043@example.com,1000,1365,u-2c9fe4309f73,Yes,2025-12-19,14
Jamie Davis,user000044@example.com,1000,1365,u-5357394611f7,Yes,2026-01-09,14
Rowan King,user000045@example.com,1000,531,u-6efd4d468e11,Yes,2025-12-25,5
Casey Reyes,user000046@example.com,1000,1109,u-62979448c049,Yes,2025-12-19,11
Rowan Okafor,user000047@example.com,1000,0,u-3d52b34ac1d4,No,2025-12-26,1
Casey Kim,user000048@example.com,1000,917,u-9ef17e4552c9,Yes,2026-01-18,9
Skyler Walker,user000049@example.com,1000,690,u-4cd6b5c04671,Yes,2026-01-13,7
Cameron Chen,user000050@example.com,1000,366,u-d12abfc9b0b6,Yes,2025-12-19,4
Jordan Singh,user000051@example.com,1000,1313,u-4b7e1c56bc12,Yes,2026-01-14,13
Casey Hill,user000052@example.com,1000,607,u-fb7f45aab16d,Yes,2026-01-21,6
Sawyer Rossi,user000053@example.com,1000,485,u-22684f98bf0f,Yes,2026-01-08,5
Finley Chen,user000054@example.com,1000,2400,u-ef310714b026,Yes,2025-12-20,24
Blake Brown,user000055@example.com,1000,0,u-a98c0d6da092,No,2025-12-24,1
Jamie Rossi,user000056@example.com,1000,547,u-4cf034912c79,Yes,2026-01-09,6
Phoenix Wright,user000057@example.com,1000,1034,u-ac76677063b6,Yes,2026-01-18,11
Jamie Haddad,user000058@example.com,1000,1034,u-40658d625237,Yes,2026-01-21,11
Sloan Patel,user000059@example.com,1000,0,u-dc642dcae753,No,2026-01-06,1
Drew Reyes,user000060@example.com,1000,454,u-aa2b21b8aa09,Yes,2025-12-28,5
Morgan King,user000061@example.com,1000,600,u-5c85c61846dd,Yes,2025-12-28,6
Finley Williams,user000062@example.com,1000,1322,u-086a32b8bab6,Yes,2025-12-25,13
Emerson Brown,user000063@example.com,1000,0,u-593f8bcc119b,No,2025-12-19,1
Sawyer King,user000064@example.com,1000,559,u-e9de234145b3,Yes,2025-12-28,6
Parker Kim,user000065@example.com,1000,973,u-7c7108b864c3,Yes,2026-01-14,10
Morgan Hall,user000066@example.com,1000,751,u-a34c8d6b9a6f,Yes,2025-12-19,8
Cameron Lee,user000067@example.com,1000,554,u-d24c7cec039b,Yes,2026-01-20,6
Morgan Patel,user000068@example.com,1000,731,u-cf3c205cbb5b,Yes,2026-01-10,7
Cameron Davis,user000069@example.com,1000,451,u-c8746684d36b,Yes,2025-12-20,5
Morgan Wright,user000070@example.com,1000,445,u-3efa38ea9bdc,Yes,2026-01-16,5
Sloan Haddad,user000071@example.com,1000,1190,u-fb19de5b6afa,Yes,2026-01-22,12
Parker Johnson,user000072@example.com,1000,787,u-672ff98153cc,Yes,2026-01-21,8
Kendall Novak,user000073@example.com,1000,527,u-4c8c964a72ff,Yes,2026-01-17,5
Phoenix Thompson,user000074@example.com,1000,954,u-9dd9bc2a6588,Yes,2026-01-09,10
Casey Okafor,user000075@example.com,1000,777,u-0d74290f430e,Yes,2026-01-07,8
Jordan Reyes,user000076@example.com,1000,0,u-3639836c016c,No,2026-01-18,1
Sage Davis,user000077@example.com,1000,0,u-67b4264ae2d4,No,2025-12-27,1
Sutton Kim,user000078@example.com,1000,664,u-44a12b2582e8,Yes,2025-12-20,7
Logan Rossi,user000079@example.com,1000,547,u-6f01078f6ff9,Yes,2026-01-04,6
Skyler Harris,user000080@example.com,1000,1016,u-17a9d4379a44,Yes,2025-12-26,10
Sawyer Kim,user000081@example.com,1000,801,u-9bffbe4f57ba,Yes,2026-01-10,8
Sloan Johnson,user000082@example.com,1000,680,u-644d633e92aa,Yes,2026-01-07,7
Drew Young,user000083@example.com,1000,735,u-1d5ab98caab8,Yes,2025-12-21,7
Rowan Lee,user000084@example.com,1000,1034,u-992469c8bc43,Yes,2025-12-22,11
Sloan Lee,user000085@example.com,1000,1088,u-4615e4018fe9,Yes,2026-01-03,11
Sawyer Singh,user000086@example.com,1000,921,u-04b57d26ffe7,Yes,2025-12-20,9
Jordan Wright,user000087@example.com,1000,1017,u-2a6dd9aacb45,Yes,2026-01-05,10
Sutton Hill,user000088@example.com,1000,875,u-f3d5eb0edeb4,Yes,2025-12-19,9
Sage Harris,user000089@example.com,1000,591,u-3f55fd15bfa8,Yes,2025-12-22,6
Tatum Kim,user000090@example.com,1000,1345,u-4d2c64477fdd,Yes,2025-12-29,14
Sutton King,user000091@example.com,1000,744,u-dc07d31b2fe4,Yes,2026-01-12,8
Sloan Rossi,user000092@example.com,1000,834,u-3460330537b4,Yes,2026-01-01,8
Finley Singh,user000093@example.com,1000,744,u-1170a01c2cac,Yes,2025-12-26,8
Jamie Moore,user000094@example.com,1000,424,u-eb92cdb13595,Yes,2025-12-24,4
Jamie Garcia,user000095@example.com,1000,901,u-350498041cf9,Yes,2025-12-31,9
Harper Allen,user000096@example.com,1000,709,u-013436b76d43,Yes,2025-12-22,7
Morgan Singh,user000097@example.com,1000,0,u-e0355578aabf,No,2026-01-07,1
Reese Reyes,user000098@example.com,1000,439,u-9d289e30ecb7,Yes,2026-01-04,4
Sutton Anderson,user000099@example.com,1000,504,u-345c5fe831b4,Yes,2026-01-14,5
Riley Kim,user000100@example.com,1000,0,u-5f856286c0ee,No,2026-01-20,1
Parker Allen,user000101@example.com,1000,760,u-c824b74017a0,Yes,2026-01-15,8
Marlowe Wright,user000102@example.com,1000,681,u-1efe1765f606,Yes,2026-01-11,7
Morgan Davis,user000103@example.com,1000,495,u-d1865ada8e5b,Yes,2026-01-22,5
Rowan Singh,user000104@example.com,1000,619,u-4fcb0274db30,Yes,2025-12-20,6
Reese Anderson,user000105@example.com,1000,797,u-5e3f3a258c48,Yes,2025-12-19,8
Skyler Brown,user000106@example.com,1000,423,u-08955f38bf62,Yes,2026-01-18,4
Hayden Rossi,user000107@example.com,1000,0,u-a79a12cbd1bb,No,2026-01-05,1
Marlowe Patel,user000108@example.com,1000,1511,u-a0dfcb28deb5,Yes,2025-12-24,15
Taylor Moore,user000109@example.com,1000,1126,u-cb3904fa220e,Yes,2025-12-22,11
Blake Smith,user000110@example.com,1000,605,u-18d2a904c1d2,Yes,2025-12-20,6
Phoenix Miller,user000111@example.com,1000,779,u-4f3b46b9ee27,Yes,2026-01-12,8
Marlowe Haddad,user000112@example.com,1000,832,u-ed6c9d4a07b1,Yes,2025-12-28,8
Sloan Allen,user000113@example.com,1000,334,u-ca71279a6732,Yes,2025-12-24,3
Quinn Harris,user000114@example.com,1000,943,u-24231ae71a6b,Yes,2026-01-13,10
Ellis Williams,user000115@example.com,1000,598,u-1565b4ed1928,Yes,2026-01-21,6
Tatum Garcia,user000116@example.com,1000,1103,u-c060bbe0494e,Yes,2026-01-22,11
Jordan Wright,user000117@example.com,1000,379,u-b2db8508fe06,Yes,2025-12-25,4
Avery Williams,user000118@example.com,1000,520,u-132039117814,Yes,2026-01-02,5
Logan Young,user000119@example.com,1000,0,u-8b3b224596fd,No,2025-12-29,1
Sawyer Hall,user000120@example.com,1000,455,u-f1d1c31c780c,Yes,2026-01-03,5
Sutton Hill,user000121@example.com,1000,485,u-3a6e1c4ea2c7,Yes,2025-12-19,5
Phoenix Moore,user000122@example.com,1000,516,u-f0c99ace29d2,Yes,2025-12-22,5
Quinn Hill,user000123@example.com,1000,0,u-f491a2bfda75,No,2026-01-10,1
Cameron Novak,user000124@example.com,1000,695,u-dd1928846dfb,Yes,2026-01-09,7
Jordan Smith,user000125@example.com,1000,0,u-67b5d2ce20d0,No,2026-01-14,1
Phoenix Haddad,user000126@example.com,1000,939,u-31edea6045bb,Yes,2026-01-15,10
Casey Anderson,user000127@example.com,1000,373,u-babfc072aaab,Yes,2026-01-02,4
Devon Jones,user000128@example.com,1000,570,u-455cbe966741,Yes,2025-12-26,6
Sutton Young,user000129@example.com,1000,0,u-17e55dfaacb2,No,2025-12-24,1
Hayden Rossi,user000130@example.com,1000,452,u-41bd447a8ee6,Yes,2025-12-30,5
Reese Anderson,user000131@example.com,1000,462,u-234d82aec30b,Yes,2025-12-26,5
Sloan Patel,user000132@example.com,1000,617,u-a0b70b15ca98,Yes,2025-12-19,6
Parker Patel,user000133@example.com,1000,837,u-c32a7dac16b5,Yes,2026-01-01,9
Riley Moore,user000134@example.com,1000,511,u-1b66350669fc,Yes,2026-01-17,5
Morgan Patel,user000135@example.com,1000,1155,u-a5695075feed,Yes,2026-01-22,12
Jamie Allen,user000136@example.com,1000,0,u-e77603466383,No,2026-01-05,1
Sloan Harris,user000137@example.com,1000,671,u-9396856b90a0,Yes,2026-01-21,7
Sawyer Thompson,user000138@example.com,1000,498,u-4991bdcf8ecb,Yes,2026-01-06,5
Cameron Young,user000139@example.com,1000,471,u-c32a267939b3,Yes,2026-01-20,5
Jordan Patel,user000140@example.com,1000,1340,u-0e836ae008bd,Yes,2026-01-20,14
Riley Thompson,user000141@example.com,1000,632,u-0bb08d0ca62b,Yes,2026-01-16,6
Tatum Hill,user000142@example.com,1000,885,u-40a1f20c789f,Yes,2025-12-26,9
Morgan Hill,user000143@example.com,1000,609,u-e18b48db2006,Yes,2026-01-04,6
Kendall Young,user000144@example.com,1000,1039,u-a90e4ee63fe8,Yes,2025-12-27,11
Casey King,user000145@example.com,1000,392,u-dd1d61eed2f5,Yes,2026-01-17,4
Harper Anderson,user000146@example.com,1000,1186,u-e80c6f5ab73d,Yes,2025-12-21,12
Riley Lee,user000147@example.com,1000,1600,u-b0202ca677f4,Yes,2026-01-08,16
Sutton Johnson,user000148@example.com,1000,875,u-80becc77aeac,Yes,2026-01-13,9
Skyler Brown,user000149@example.com,1000,1342,u-458fc8852c55,Yes,2026-01-11,14
Casey Harris,user000150@example.com,1000,1075,u-062f72cdeb41,Yes,2025-12-27,11
Ellis Chen,user000151@example.com,1000,691,u-1866046f7c28,Yes,2026-01-01,7
Morgan Harris,user000152@example.com,1000,691,u-916a93bf1976,Yes,2026-01-19,7
Sutton Reyes,user000153@example.com,1000,1143,u-c116f99fda23,Yes,2025-12-22,12
Blake Reyes,user000154@example.com,1000,0,u-3420d65c5f13,No,2026-01-18,1
Emerson Garcia,user000155@example.com,1000,507,u-860faa952cf4,Yes,2026-01-10,5
Logan Anderson,user000156@example.com,1000,0,u-30d7f21654b1,No,2026-01-14,1
Sutton Anderson,user000157@example.com,1000,0,u-34ca9a317a30,No,2026-01-03,1
Cameron King,user000158@example.com,1000,643,u-6290f2375736,Yes,2025-12-27,7
Phoenix Reyes,user000159@example.com,1000,410,u-b146fadc8131,Yes,2025-12-21,4
Kendall Lee,user000160@example.com,1000,874,u-628b288dfcd4,Yes,2026-01-01,9
Jordan Thompson,user000161@example.com,1000,310,u-29ebe8c49167,Yes,2025-12-31,3
Harper Haddad,user000162@example.com,1000,576,u-24fe5b81c46c,Yes,2026-01-03,6
Tatum Patel,user000163@example.com,1000,359,u-bb0e1b0dd588,Yes,2025-12-21,4
Logan Garcia,user000164@example.com,1000,673,u-23017e1c4f85,Yes,2025-12-20,7
Sloan Jones,user000165@example.com,1000,0,u-6608bf65735a,No,2025-12-25,1
Parker Miller,user000166@example.com,1000,608,u-fd0486e96d09,Yes,2025-12-23,6
Phoenix Okafor,user000167@example.com,1000,880,u-9bea2f93c2f1,Yes,2026-01-16,9
Cameron Haddad,user000168@example.com,1000,1265,u-84ed3870d974,Yes,2025-12-23,13
Reese Chen,user000169@example.com,1000,670,u-1c8dc98582f4,Yes,2025-12-29,7
Devon Davis,user000170@example.com,1000,521,u-cb62c1a5efee,Yes,2025-12-24,5
Quinn Wright,user000171@example.com,1000,0,u-cf0ac468f2d7,No,2025-12-19,1
Sage Reyes,user000172@example.com,1000,1280,u-8b0fbc2b764e,Yes,2026-01-03,13
Finley Wright,user000173@example.com,1000,772,u-90bf19f85244,Yes,2026-01-03,8
Ellis Jones,user000174@example.com,1000,946,u-b34cb6a8273c,Yes,2025-12-24,10
Taylor Rossi,user000175@example.com,1000,248,u-1cf22852e202,Yes,2025-12-20,3
Logan King,user000176@example.com,1000,613,u-298fc1f7a926,Yes,2026-01-17,6
Blake Davis,user000177@example.com,1000,0,u-19f4e7b3e590,No,2025-12-26,1
Rowan Kim,user000178@example.com,1000,420,u-df7c03f1f419,Yes,2026-01-18,4
Kendall Walker,user000179@example.com,1000,455,u-177e739f323e,Yes,2026-01-11,5
Drew Patel,user000180@example.com,1000,448,u-179adbdf8f79,Yes,2026-01-04,5
Sawyer Moore,user000181@example.com,1000,704,u-0b7f50be2d35,Yes,2026-01-12,7
Sawyer Williams,user000182@example.com,1000,0,u-6de9fba7d727,No,2026-01-15,1
Drew Walker,user000183@example.com,1000,1002,u-afbe45fd231e,Yes,2026-01-20,10
Morgan Singh,user000184@example.com,1000,1814,u-240d4e75295a,Yes,2026-01-07,18
Rowan Young,user000185@example.com,1000,557,u-78bc5b11e5fa,Yes,2025-12-24,6
Devon Miller,user000186@example.com,1000,208,u-2fdb2cc92b82,Yes,2026-01-16,2
Finley Allen,user000187@example.com,1000,489,u-e898ff65f0e7,Yes,2025-12-26,5
Finley Jones,user000188@example.com,1000,0,u-47e088515f4e,No,2025-12-28,1
Reese Nguyen,user000189@example.com,1000,1098,u-03dff644ee3b,Yes,2026-01-15,11
Blake Allen,user000190@example.com,1000,907,u-10736ab00dd0,Yes,2026-01-18,9
Hayden Jones,user000191@example.com,1000,742,u-a2d4422240e8,Yes,2025-12-20,8
Logan Thompson,user000192@example.com,1000,384,u-4750aeb6ca58,Yes,2025-12-26,4
Jordan Reyes,user000193@example.com,1000,1166,u-296e0e9fb985,Yes,2026-01-09,12
Riley Hall,user000194@example.com,1000,381,u-9135665954f1,Yes,2026-01-08,4
Sawyer Okafor,user000195@example.com,1000,757,u-48d15afb748f,Yes,2025-12-22,8
Hayden Singh,user000196@example.com,1000,728,u-2f81a4eb1b4a,Yes,2026-01-03,7
Emerson Davis,user000197@example.com,1000,1197,u-a33f1852d3d0,Yes,2025-12-29,12
Cameron Williams,user000198@example.com,1000,792,u-e53f626f4587,Yes,2026-01-09,8
Sawyer Brown,user000199@example.com,1000,1283,u-08fa65c813f2,Yes,2026-01-10,13
Rowan Hill,user000200@example.com,1000,1122,u-2759f28afe39,Yes,2025-12-30,11
Sloan Reyes,user000201@example.com,1000,630,u-363cf24b5d3b,Yes,2025-12-24,6
Ellis Garcia,user000202@example.com,1000,1264,u-fbf3d408ed89,Yes,2026-01-15,13
Jamie Jones,user000203@example.com,1000,510,u-2a42245b282b,Yes,2026-01-01,5
Finley Anderson,user000204@example.com,1000,0,u-c64c806e8cae,No,2026-01-15,1
Drew Harris,user000205@example.com,1000,0,u-0376eec5db71,No,2025-12-31,1
Sloan Anderson,user000206@example.com,1000,774,u-46a688132a0a,Yes,2026-01-22,8
Cameron Harris,user000207@example.com,1000,1924,u-e15891625e0c,Yes,2026-01-07,20
Devon Rossi,user000208@example.com,1000,894,u-90691423da09,Yes,2026-01-13,9
Cameron Davis,user000209@example.com,1000,251,u-b2437914968e,Yes,2026-01-22,3
Tatum Okafor,user000210@example.com,1000,416,u-6ad940a0c601,Yes,2025-12-28,4
Blake Kim,user000211@example.com,1000,780,u-33299769b3c2,Yes,2026-01-04,8
Kendall Patel,user000212@example.com,1000,337,u-cf5708dad61a,Yes,2026-01-08,3
Jordan Wright,user000213@example.com,1000,512,u-a82862cabb58,Yes,2025-12-31,5
Sawyer Haddad,user000214@example.com,1000,416,u-3a686b4914f0,Yes,2025-12-30,4
Avery Jones,user000215@example.com,1000,780,u-5e72c373aab7,Yes,2026-01-22,8
Rowan Singh,user000216@example.com,1000,650,u-3d86bb91c97e,Yes,2026-01-19,7
Tatum Moore,user000217@example.com,1000,469,u-ab3fdd6ed383,Yes,2026-01-03,5
Marlowe Lee,user000218@example.com,1000,918,u-f3fcbd7bbaae,Yes,2025-12-29,9
Ellis Kim,user000219@example.com,1000,487,u-bb9e56c7b987,Yes,2025-12-30,5
Riley Patel,user000220@example.com,1000,670,u-d4048283844c,Yes,2026-01-04,7
Finley King,user000221@example.com,1000,789,u-09dacee8b123,Yes,2026-01-05,8
Sloan Okafor,user000222@example.com,1000,999,u-7c7e0250c294,Yes,2025-12-30,10
Hayden Patel,user000223@example.com,1000,355,u-15cf177a9f3a,Yes,2025-12-24,4
Cameron Harris,user000224@example.com,1000,958,u-7065a3e70351,Yes,2025-12-31,10
Tatum Nguyen,user000225@example.com,1000,815,u-f62f4f29b08c,Yes,2026-01-21,8
Taylor Rossi,user000226@example.com,1000,687,u-195fb36d079e,Yes,2026-01-20,7
Morgan Singh,user000227@example.com,1000,376,u-b3d715508d63,Yes,2026-01-05,4
Phoenix Reyes,user000228@example.com,1000,652,u-d209f16823b5,Yes,2026-01-17,7
Avery Kim,user000229@example.com,1000,636,u-a03613c7ba5f,Yes,2025-12-30,6
Morgan Moore,user000230@example.com,1000,1064,u-2c8369095da2,Yes,2026-01-07,11
Taylor Haddad,user000231@example.com,1000,441,u-ba33be800664,Yes,2025-12-21,4
Jamie Anderson,user000232@example.com,1000,0,u-3ff201cff83c,No,2026-01-17,1
Sage Garcia,user000233@example.com,1000,1000,u-43e1a8ad2fd6,Yes,2025-12-23,10
Devon Thompson,user000234@example.com,1000,455,u-8044aa27c7bd,Yes,2026-01-06,5
Drew Wright,user000235@example.com,1000,568,u-c67e693371cd,Yes,2025-12-20,6
Cameron Haddad,user000236@example.com,1000,1103,u-08cf636c1bff,Yes,2026-01-10,11
Sawyer Nguyen,user000237@example.com,1000,1008,u-530d5988b13a,Yes,2025-12-21,10
Parker Hill,user000238@example.com,1000,477,u-43952091df75,Yes,2025-12-28,5
Quinn Chen,user000239@example.com,1000,668,u-1d3892bb3287,Yes,2026-01-14,7
Marlowe Wright,user000240@example.com,1000,893,u-f137d43dfcce,Yes,2026-01-14,9
Drew Miller,user000241@example.com,1000,711,u-c832df10ff5e,Yes,2026-01-18,7
Cameron Thompson,user000242@example.com,1000,736,u-35bb50d85c06,Yes,2026-01-16,8
Phoenix Rossi,user000243@example.com,1000,469,u-d167c2d6732c,Yes,2025-12-21,5
Harper Smith,user000244@example.com,1000,1128,u-1100f94ad8c2,Yes,2026-01-08,11
Casey Haddad,user000245@example.com,1000,761,u-488ac64e84b2,Yes,2026-01-18,8
Devon Wright,user000246@example.com,6000,3326,u-894e9d6f1a21,Yes,2026-01-17,11
Casey Nguyen,user000247@example.com,6000,3185,u-5f9ce6414490,Yes,2025-12-31,11
Taylor Reyes,user000248@example.com,6000,7505,u-2b04a92b90f3,Yes,2025-12-24,25
Sage Allen,user000249@example.com,6000,6802,u-3db4acfc35ab,Yes,2025-12-20,23
Marlowe Davis,user000250@example.com,6000,2021,u-1d068809fc52,Yes,2026-01-15,7
Blake Jones,user000251@example.com,6000,4337,u-2b26a34b00f6,Yes,2026-01-02,15
Emerson Smith,user000252@example.com,6000,6183,u-47d804a8b06a,Yes,2025-12-22,21
Marlowe Hill,user000253@example.com,6000,10421,u-ff244d84e2ff,Yes,2025-12-26,35
Morgan Nguyen,user000254@example.com,6000,6295,u-f99c6e11e1e2,Yes,2025-12-26,21
Tatum Kim,user000255@example.com,6000,3834,u-926eea6afa73,Yes,2026-01-07,13
Kendall Young,user000256@example.com,6000,1808,u-4c470ca3cd14,Yes,2025-12-24,6
Quinn Haddad,user000257@example.com,6000,6136,u-9a5c624b008c,Yes,2025-12-25,21
Jordan Smith,user000258@example.com,6000,2972,u-5925b3b6c6eb,Yes,2026-01-21,10
Blake Moore,user000259@example.com,6000,4571,u-70ee77ab05c0,Yes,2026-01-22,15
Skyler Anderson,user000260@example.com,6000,4304,u-f275376772e3,Yes,2025-12-31,14
Riley Lee,user000261@example.com,6000,10834,u-09a8cbe2fc74,Yes,2026-01-16,36
Jordan Reyes,user000262@example.com,6000,3697,u-297df544c0f6,Yes,2026-01-21,12
Sutton Williams,user000263@example.com,6000,2724,u-88a34cb22a2a,Yes,2025-12-27,9
Avery Davis,user000264@example.com,6000,3316,u-d2392ac4b565,Yes,2025-12-23,11
Sloan Patel,user000265@example.com,6000,4317,u-b2ab274380b9,Yes,2026-01-06,14
Parker Chen,user000266@example.com,6000,7350,u-5c62ba8487a1,Yes,2025-12-20,25
Sage Miller,user000267@example.com,6000,3179,u-8dd10f5e3b7c,Yes,2025-12-30,11
Avery Williams,user000268@example.com,6000,4288,u-f3e7aa5cbcc5,Yes,2026-01-16,14
Cameron Hall,user000269@example.com,6000,5152,u-0e841212cee4,Yes,2026-01-15,17
Drew Chen,user000270@example.com,6000,7397,u-4df72514bb96,Yes,2026-01-08,25
Phoenix Singh,user000271@example.com,6000,16701,u-42c64a2d3a60,Yes,2025-12-24,56
Jamie Anderson,user000272@example.com,6000,9729,u-44f89c83e109,Yes,2026-01-12,33
Skyler Haddad,user000273@example.com,6000,4032,u-de35e409d9b4,Yes,2026-01-11,14
Hayden Thompson,user000274@example.com,6000,5607,u-8f0570966133,Yes,2026-01-16,19
Taylor Kim,user000275@example.com,6000,4418,u-96a61d97e60e,Yes,2026-01-06,15
Avery Brown,user000276@example.com,6000,4389,u-724ca7662833,Yes,2026-01-08,15
Hayden Kim,user000277@example.com,6000,4076,u-13e3dd5db05f,Yes,2026-01-13,14
Phoenix Anderson,user000278@example.com,6000,10317,u-00d062108b2c,Yes,2026-01-02,35
Reese Reyes,user000279@example.com,6000,3858,u-400347f13a86,Yes,2025-12-28,13
Harper Jones,user000280@example.com,6000,6053,u-39b008ac2e9e,Yes,2026-01-01,20
Sutton Smith,user000281@example.com,6000,2206,u-c0b79dcf2dea,Yes,2026-01-02,7
Morgan Moore,user000282@example.com,6000,3928,u-a203799ac493,Yes,2026-01-13,13
Devon Moore,user000283@example.com,6000,6598,u-51b3e145d0c8,Yes,2026-01-08,22
Parker Williams,user000284@example.com,6000,9339,u-349305136dba,Yes,2026-01-09,31
Sloan Walker,user000285@example.com,6000,5100,u-bde02fe14c0f,Yes,2025-12-22,17
Jamie Okafor,user000286@example.com,6000,6056,u-10eb7b37ae50,Yes,2026-01-22,20
Parker Hill,user000287@example.com,6000,10985,u-b96135a7653e,Yes,2026-01-20,37
Ellis Davis,user000288@example.com,6000,5891,u-2a8355ebd7ca,Yes,2026-01-05,20
Cameron Brown,user000289@example.com,6000,5747,u-f463d831efda,Yes,2026-01-02,19
Morgan Rossi,user000290@example.com,6000,4533,u-bd48c1f32c58,Yes,2026-01-10,15
Sage Thompson,user000291@example.com,6000,5675,u-b37945ee0665,Yes,2026-01-03,19
Phoenix Moore,user000292@example.com,6000,3747,u-de0cf9329d3f,Yes,2026-01-20,13
Parker Hall,user000293@example.com,6000,5613,u-6d56a7c71a1e,Yes,2026-01-21,19
Marlowe Williams,user000294@example.com,6000,4130,u-9e595258452f,Yes,2025-12-28,14
Skyler Brown,user000295@example.com,6000,3620,u-7467b343aa9d,Yes,2026-01-12,12
Reese Brown,user000296@example.com,6000,2294,u-9fd23f972cb6,Yes,2025-12-24,8
Phoenix Garcia,user000297@example.com,6000,6388,u-f6d2173d75cd,Yes,2025-12-23,21
Tatum Chen,user000298@example.com,6000,3346,u-994e68a8799a,Yes,2026-01-10,11
Harper Garcia,user000299@example.com,6000,4893,u-808de97d5456,Yes,2025-12-25,16
Jordan Davis,user000300@example.com,6000,2526,u-6557abccf825,Yes,2025-12-22,8
Phoenix Johnson,user000301@example.com,6000,3925,u-1a951cf52964,Yes,2026-01-01,13
Phoenix Hall,user000302@example.com,6000,6754,u-295f910653e8,Yes,2025-12-30,23
Logan Kim,user000303@example.com,6000,3584,u-9c03b30b5eee,Yes,2026-01-10,12
Devon Walker,user000304@example.com,6000,11394,u-650db7c50af8,Yes,2026-01-19,38
Riley Williams,user000305@example.com,6000,1874,u-7ed4810804b9,Yes,2026-01-12,6
Harper Singh,user000306@example.com,6000,4272,u-50254ee2015c,Yes,2026-01-02,14
Avery Moore,user000307@example.com,6000,5603,u-5dbe6db286d0,Yes,2026-01-11,19
Harper Patel,user000308@example.com,6000,3680,u-a39c52be9eea,Yes,2025-12-27,12
Jordan Hill,user000309@example.com,6000,6363,u-d8b87c4be8b2,Yes,2026-01-16,21
Finley Johnson,user000310@example.com,6000,3887,u-36f09da15067,Yes,2026-01-21,13
Finley Reyes,user000311@example.com,6000,5452,u-fc38850db856,Yes,2025-12-23,18
Tatum Anderson,user000312@example.com,6000,2609,u-5fe6affbece5,Yes,2026-01-01,9
Emerson Reyes,user000313@example.com,6000,7472,u-8850a8d86874,Yes,2026-01-06,25
Taylor Young,user000314@example.com,6000,5375,u-73d9b291c18c,Yes,2025-12-27,18
Emerson Williams,user000315@example.com,6000,8672,u-9d8d0e696b68,Yes,2026-01-06,29
Hayden Anderson,user000316@example.com,6000,3161,u-58bc2c112922,Yes,2026-01-13,11
Finley Lee,user000317@example.com,6000,3259,u-f219bec4b92c,Yes,2025-12-25,11
Cameron Allen,user000318@example.com,6000,2967,u-4d5278f02be3,Yes,2026-01-22,10
Quinn Walker,user000319@example.com,6000,5255,u-093ac1d6b553,Yes,2025-12-23,18
Casey Harris,user000320@example.com,6000,3418,u-b6d2f951c28f,Yes,2025-12-23,11
Logan Johnson,user000321@example.com,6000,2001,u-533006c4112f,Yes,2025-12-21,7
Quinn Miller,user000322@example.com,6000,4009,u-081eadfe90fc,Yes,2026-01-04,13
Sutton Hall,user000323@example.com,6000,4409,u-9fab8c4c1e3b,Yes,2026-01-20,15
Tatum Nguyen,user000324@example.com,6000,5309,u-1f9b79732fd4,Yes,2025-12-25,18
Hayden Walker,user000325@example.com,6000,4470,u-fcba0824f99d,Yes,2026-01-08,15
Sutton Walker,user000326@example.com,6000,5206,u-96b940898d06,Yes,2026-01-04,17
Jamie Jones,user000327@example.com,6000,4257,u-9cde8fc58ba6,Yes,2025-12-22,14
Reese Wright,user000328@example.com,6000,3615,u-10aa6e08e613,Yes,2026-01-07,12
Reese Reyes,user000329@example.com,6000,2643,u-c046ca09a6c4,Yes,2026-01-10,9
Hayden Brown,user000330@example.com,6000,7613,u-d3ad246b3757,Yes,2026-01-20,26
Reese Nguyen,user000331@example.com,6000,4040,u-94ee24187e69,Yes,2026-01-20,14
Drew Novak,user000332@example.com,6000,3159,u-a906cd81b07d,Yes,2026-01-18,11
Tatum Allen,user000333@example.com,6000,4203,u-1cddd907a293,Yes,2025-12-31,14
Finley Hall,user000334@example.com,6000,6416,u-248c8e6e9987,Yes,2026-01-22,22
Ellis Chen,user000335@example.com,6000,4434,u-509f84563add,Yes,2025-12-31,15
Finley Johnson,user000336@example.com,6000,6206,u-aa773f29ff3d,Yes,2026-01-09,21
Jamie Thompson,user000337@example.com,6000,4557,u-8435161ab991,Yes,2026-01-06,15
Skyler Okafor,user000338@example.com,6000,8757,u-96b2c38b33e2,Yes,2026-01-18,29
Logan Novak,user000339@example.com,6000,3659,u-fc4d03c7345c,Yes,2025-12-28,12
Logan Wright,user000340@example.com,6000,3039,u-fc2eb6edfabc,Yes,2026-01-04,10
Jamie Lee,user000341@example.com,6000,4367,u-e56174cc6df5,Yes,2025-12-28,15
Taylor Johnson,user000342@example.com,6000,2604,u-b7903117b262,Yes,2025-12-19,9
Emerson Allen,user000343@example.com,6000,8305,u-756d906bc0ef,Yes,2026-01-15,28
Hayden Moore,user000344@example.com,6000,5905,u-87f58fdc68f8,Yes,2025-12-26,20
Kendall Patel,user000345@example.com,6000,3368,u-1f9e34914dcd,Yes,2025-12-26,11
Cameron Rossi,user000346@example.com,6000,3254,u-919bb5b98d84,Yes,2026-01-16,11
Blake Rossi,user000347@example.com,6000,3428,u-7d237ed01646,Yes,2026-01-20,11
Sutton Novak,user000348@example.com,6000,3878,u-fe400a480870,Yes,2026-01-01,13
Marlowe Reyes,user000349@example.com,6000,6448,u-d14482597543,Yes,2025-12-20,22
Kendall Kim,user000350@example.com,6000,4240,u-09eea6e241b5,Yes,2026-01-12,14
Riley Allen,user000351@example.com,6000,3588,u-6836e44891f3,Yes,2025-12-28,12
Emerson Wright,user000352@example.com,6000,3306,u-b3847e139c3b,Yes,2026-01-09,11
Parker Moore,user000353@example.com,6000,2647,u-d579b51ab567,Yes,2026-01-20,9
Logan Garcia,user000354@example.com,6000,5395,u-b7d7f43afbe1,Yes,2026-01-08,18
Kendall Smith,user000355@example.com,6000,7067,u-cc13510dc667,Yes,2025-12-20,24
Casey Hall,user000356@example.com,6000,3035,u-d05ebd91b34c,Yes,2025-12-23,10
Sawyer Moore,user000357@example.com,6000,6511,u-21ae9c8b933c,Yes,2025-12-23,22
Kendall Thompson,user000358@example.com,6000,3887,u-3c9cc10ed68a,Yes,2026-01-21,13
Phoenix Jones,user000359@example.com,6000,4568,u-272aa3223606,Yes,2025-12-26,15
Kendall Patel,user000360@example.com,6000,5046,u-2765e85366ea,Yes,2026-01-22,17
Skyler Johnson,user000361@example.com,6000,3162,u-a75d1b92ef25,Yes,2026-01-20,11
Sutton Haddad,user000362@example.com,6000,6613,u-7eacec55652f,Yes,2025-12-19,22
Tatum Anderson,user000363@example.com,6000,4672,u-3342b330f0b7,Yes,2025-12-23,16
Rowan Brown,user000364@example.com,6000,2993,u-9c779e595ceb,Yes,2026-01-08,10
Kendall Young,user000365@example.com,6000,6288,u-39d9d342e0a5,Yes,2026-01-04,21
Sage Williams,user000366@example.com,6000,4767,u-2dd989a2d814,Yes,2025-12-21,16
Taylor Hill,user000367@example.com,6000,4921,u-9dcb31177f63,Yes,2026-01-01,17
Harper Novak,user000368@example.com,6000,6941,u-42eb3b2611d0,Yes,2025-12-27,23
Phoenix Lee,user000369@example.com,6000,9581,u-838711df950a,Yes,2026-01-03,32
Hayden Hall,user000370@example.com,6000,4113,u-93bceb5b0a5e,Yes,2026-01-21,14
Sutton Allen,user000371@example.com,15000,8816,u-f5176e0676e3,Yes,2025-12-23,16
Sloan Nguyen,user000372@example.com,15000,19787,u-bb4da7b79af6,Yes,2025-12-19,37
Hayden Davis,user000373@example.com,15000,6894,u-d2914996d5fc,Yes,2026-01-19,13
Riley Moore,user000374@example.com,15000,15132,u-b568bad87d80,Yes,2026-01-10,28
Jordan Young,user000375@example.com,15000,32782,u-21fdff2d544b,Yes,2025-12-29,61
Hayden Jones,user000376@example.com,15000,8504,u-e6027afcdb33,Yes,2026-01-16,16
Jordan Brown,user000377@example.com,15000,16684,u-9532b542201b,Yes,2025-12-24,31
Sutton Garcia,user000378@example.com,15000,13969,u-db4bcacb4df0,Yes,2026-01-14,26
Logan Lee,user000379@example.com,15000,14564,u-569d9a1d6f38,Yes,2025-12-20,27
Casey Novak,user000380@example.com,15000,16479,u-e6df558163d6,Yes,2025-12-19,31
Devon Allen,user000381@example.com,15000,12377,u-db42101190d8,Yes,2026-01-07,23
Morgan Walker,user000382@example.com,15000,8648,u-a9693e86bf63,Yes,2025-12-24,16
Reese Brown,user000383@example.com,15000,12239,u-d7343c9cf71f,Yes,2026-01-08,23
Cameron Reyes,user000384@example.com,15000,33608,u-433392bf3573,Yes,2025-12-20,62
Jamie Davis,user000385@example.com,15000,21136,u-045a4dd4341a,Yes,2026-01-13,39
Cameron Kim,user000386@example.com,15000,8749,u-ceb2126a8b46,Yes,2025-12-27,16
Blake Anderson,user000387@example.com,15000,8264,u-287a26dd3b79,Yes,2026-01-15,15
Taylor Reyes,user000388@example.com,15000,7171,u-46d840214e5d,Yes,2026-01-13,13
Sawyer Williams,user000389@example.com,15000,17304,u-41872611bdf2,Yes,2025-12-20,32
Marlowe Patel,user000390@example.com,15000,14763,u-dffb722b94ed,Yes,2026-01-01,27
Sawyer Hill,user000391@example.com,15000,26491,u-bf2c4a4a03d3,Yes,2025-12-23,49
Reese Nguyen,user000392@example.com,15000,16284,u-da74538adda9,Yes,2026-01-17,30
Riley Anderson,user000393@example.com,15000,11133,u-835df2ac000b,Yes,2025-12-27,21
Marlowe King,user000394@example.com,15000,13038,u-983c3309a450,Yes,2026-01-03,24
Tatum Brown,user000395@example.com,15000,8347,u-3b333f9d42eb,Yes,2026-01-20,15
Skyler Williams,user000396@example.com,15000,10950,u-75a9bae1ad52,Yes,2025-12-22,20
Kendall Singh,user000397@example.com,15000,15526,u-6985244a87eb,Yes,2026-01-09,29
Harper Smith,user000398@example.com,15000,10791,u-5f0390c6d959,Yes,2026-01-02,20
Reese Wright,user000399@example.com,15000,12798,u-8bfbf27cf325,Yes,2025-12-30,24
Phoenix Patel,user000400@example.com,15000,22721,u-ea127bc1eddd,Yes,2026-01-16,42
Quinn Okafor,user000401@example.com,15000,9900,u-745987a79d4f,Yes,2026-01-05,18
Taylor Kim,user000402@example.com,15000,8866,u-13b837706801,Yes,2026-01-20,16
Rowan Hall,user000403@example.com,15000,16249,u-ded62a280b67,Yes,2026-01-20,30
Harper Walker,user000404@example.com,15000,6887,u-808f383fb07d,Yes,2025-12-27,13
Cameron Reyes,user000405@example.com,15000,10017,u-2966c74d26b8,Yes,2026-01-20,19
Morgan Jones,user000406@example.com,15000,6835,u-fc95d880a573,Yes,2026-01-20,13
Kendall Chen,user000407@example.com,15000,15485,u-c2935de73a06,Yes,2025-12-21,29
Morgan Johnson,user000408@example.com,15000,13430,u-9850bd0ab0b4,Yes,2026-01-21,25
Quinn Singh,user000409@example.com,15000,8548,u-52b93aa2b53c,Yes,2026-01-10,16
Sutton Hill,user000410@example.com,15000,33006,u-7bfbe6b07e5d,Yes,2026-01-01,61
Sawyer Anderson,user000411@example.com,15000,21663,u-26547e0ad172,Yes,2026-01-06,40
Cameron Williams,user000412@example.com,15000,15669,u-1e74fe61a1fc,Yes,2025-12-30,29
Devon Patel,user000413@example.com,15000,9772,u-3e970678034e,Yes,2026-01-04,18
Morgan Johnson,user000414@example.com,15000,6784,u-d805884e2332,Yes,2025-12-24,13
Sloan Kim,user000415@example.com,15000,11198,u-684a8be3c512,Yes,2026-01-20,21
Avery Jones,user000416@example.com,15000,6341,u-0ff3c5db7a78,Yes,2026-01-07,12
Tatum Rossi,user000417@example.com,15000,12678,u-08976c009572,Yes,2025-12-20,24
Avery Novak,user000418@example.com,15000,18835,u-5a998c289130,Yes,2025-12-27,35
Reese Patel,user000419@example.com,15000,14424,u-2aaadc84cfe0,Yes,2026-01-19,27
Drew Novak,user000420@example.com,15000,19143,u-933d19c5f22c,Yes,2025-12-21,36
Sutton Young,user000421@example.com,15000,12977,u-0bd0b46f278b,Yes,2026-01-21,24
Kendall Anderson,user000422@example.com,15000,9965,u-68e813258a6c,Yes,2026-01-19,19
Sawyer Johnson,user000423@example.com,15000,25180,u-03263778cf04,Yes,2026-01-07,47
Avery Smith,user000424@example.com,15000,16537,u-2b8f3cb51b1d,Yes,2026-01-07,31
Ellis Smith,user000425@example.com,15000,8263,u-770ca3c45044,Yes,2025-12-26,15
Taylor Miller,user000426@example.com,15000,12184,u-b0a2439c9864,Yes,2025-12-23,23
Parker Chen,user000427@example.com,15000,15697,u-6dbcd8b5f70b,Yes,2026-01-02,29
Cameron King,user000428@example.com,15000,21730,u-eb17737c6871,Yes,2025-12-27,40
Quinn Williams,user000429@example.com,15000,12468,u-1d25f93831cb,Yes,2026-01-05,23
Ellis Nguyen,user000430@example.com,15000,9267,u-57c157f77998,Yes,2026-01-10,17
Reese Kim,user000431@example.com,15000,7862,u-b16a76e90dcf,Yes,2025-12-29,15
Blake Nguyen,user000432@example.com,15000,10527,u-4ca19a05ffe8,Yes,2026-01-18,20
Kendall Reyes,user000433@example.com,15000,23611,u-b63f48ae508a,Yes,2026-01-10,44
Riley Jones,user000434@example.com,15000,13201,u-620a4dc90f77,Yes,2025-12-24,25
Tatum Anderson,user000435@example.com,15000,10419,u-84f4bb85d0d3,Yes,2026-01-07,19
Finley Miller,user000436@example.com,15000,6589,u-ec5cff5fef40,Yes,2026-01-05,12
Rowan Rossi,user000437@example.com,15000,16554,u-ea595999b21e,Yes,2026-01-02,31
Quinn Novak,user000438@example.com,15000,13388,u-79752c9b998f,Yes,2025-12-22,25
Sawyer Chen,user000439@example.com,15000,13788,u-3b705c7e9a80,Yes,2026-01-20,26
Hayden Nguyen,user000440@example.com,15000,11805,u-b2ec42837fb3,Yes,2025-12-20,22
Quinn Chen,user000441@example.com,15000,16480,u-99ee71e4029a,Yes,2025-12-26,31
Logan Harris,user000442@example.com,15000,12842,u-8374e6bb2249,Yes,2026-01-04,24
Parker Thompson,user000443@example.com,15000,13696,u-2829ea5f934a,Yes,2025-12-25,25
Quinn Thompson,user000444@example.com,15000,8360,u-b3e9494c8656,Yes,2026-01-12,16
Morgan Allen,user000445@example.com,15000,15081,u-9459ac4f6ee5,Yes,2025-12-24,28
Skyler Patel,user000446@example.com,30000,29521,u-648db3dcb988,Yes,2026-01-20,37
Sloan Hill,user000447@example.com,30000,17258,u-69707cae5a0d,Yes,2025-12-21,22
Ellis Young,user000448@example.com,30000,68329,u-b62dae031b51,Yes,2026-01-07,86
Morgan Jones,user000449@example.com,30000,22146,u-717ae80a41fc,Yes,2025-12-19,28
Blake Brown,user000450@example.com,30000,29497,u-53797977474b,Yes,2026-01-16,37
Cameron Hill,user000451@example.com,30000,19690,u-18fd26012693,Yes,2026-01-10,25
Skyler Johnson,user000452@example.com,30000,31508,u-89d6b9bac6b0,Yes,2026-01-06,40
Skyler Kim,user000453@example.com,30000,24942,u-fafdab680f1d,Yes,2026-01-08,31
Sloan Patel,user000454@example.com,30000,31984,u-3611d87cd1dd,Yes,2025-12-19,40
Sawyer Young,user000455@example.com,30000,20038,u-e0d2c8a391f9,Yes,2025-12-31,25
Kendall Johnson,user000456@example.com,30000,17891,u-b803e5acb8f5,Yes,2026-01-02,22
Logan Garcia,user000457@example.com,30000,30627,u-041454574e62,Yes,2026-01-10,38
Hayden Miller,user000458@example.com,30000,34489,u-e3b772c890f6,Yes,2025-12-29,43
Morgan Rossi,user000459@example.com,30000,16939,u-be6e92179da0,Yes,2026-01-16,21
Finley Thompson,user000460@example.com,30000,34673,u-78c69371a1dc,Yes,2026-01-17,44
Taylor Hill,user000461@example.com,30000,38786,u-a31915cff30f,Yes,2025-12-21,49
Cameron Kim,user000462@example.com,30000,15062,u-b392adedf6a4,Yes,2025-12-27,19
Reese Kim,user000463@example.com,30000,32366,u-87abcd66dbad,Yes,2026-01-05,41
Tatum Singh,user000464@example.com,30000,21389,u-0055d398cfff,Yes,2025-12-19,27
Blake Wright,user000465@example.com,30000,27552,u-0f88c14edf98,Yes,2026-01-21,35
Emerson Thompson,user000466@example.com,30000,20215,u-6e41cd89d84a,Yes,2026-01-06,25
Casey Hall,user000467@example.com,30000,38600,u-514f7d899cd9,Yes,2026-01-05,48
Cameron Jones,user000468@example.com,30000,26129,u-d51f3c3fbbce,Yes,2025-12-22,33
Casey Walker,user000469@example.com,30000,26004,u-20e681d30f95,Yes,2026-01-19,33
Drew Allen,user000470@example.com,30000,21190,u-fff8fc0f22e8,Yes,2026-01-02,27
Reese Young,user000471@example.com,55000,55492,u-adb6c8a2c1d5,Yes,2025-12-20,49
Harper Hall,user000472@example.com,55000,40054,u-0ff14c74d541,Yes,2026-01-10,35
Devon Wright,user000473@example.com,55000,100072,u-fb976648af01,Yes,2026-01-20,88
Drew Williams,user000474@example.com,55000,38818,u-6ff5e5ecaba7,Yes,2026-01-03,34
Parker Hill,user000475@example.com,55000,47721,u-83027a191494,Yes,2026-01-22,42
Riley Moore,user000476@example.com,55000,43121,u-1ee0ea806884,Yes,2025-12-20,38
Riley Okafor,user000477@example.com,55000,23755,u-55b70d860e53,Yes,2025-12-24,21
Cameron Patel,user000478@example.com,55000,81543,u-d6c04dbfeec4,Yes,2025-12-31,72
Jamie Haddad,user000479@example.com,55000,95762,u-3783eb240b28,Yes,2026-01-04,84
Quinn Anderson,user000480@example.com,55000,25126,u-476824e564e2,Yes,2025-12-26,22
Drew Hill,user000481@example.com,55000,54567,u-85a80203a335,Yes,2026-01-08,48
Avery Anderson,user000482@example.com,55000,42951,u-b372d03f6148,Yes,2025-12-22,38
Ellis Brown,user000483@example.com,55000,72946,u-b44fe68ab295,Yes,2026-01-17,64
Casey Hall,user000484@example.com,55000,30785,u-27a2cb53359a,Yes,2025-12-23,27
Skyler Kim,user000485@example.com,55000,22164,u-7b96fb877cdd,Yes,2026-01-09,19
Cameron Walker,user000486@example.com,55000,46650,u-053778c5c2cf,Yes,2025-12-31,41
Finley Reyes,user000487@example.com,55000,34733,u-d97083a106be,Yes,2025-12-23,31
Sloan Hill,user000488@example.com,55000,34672,u-ada2fa7fe17a,Yes,2025-12-21,30
Drew Davis,user000489@example.com,55000,85790,u-9dae1b4dee05,Yes,2026-01-12,75
Jordan Nguyen,user000490@example.com,55000,25398,u-cb192232f321,Yes,2026-01-21,22
Emerson Johnson,user000491@example.com,175000,271587,u-8f51854677b3,Yes,2025-12-30,88
Blake Allen,user000492@example.com,175000,101587,u-d7b72bacd0cc,Yes,2026-01-02,33
Skyler Anderson,user000493@example.com,175000,168663,u-483888c1ac3b,Yes,2026-01-21,54
Logan Patel,user000494@example.com,175000,130628,u-553677956085,Yes,2026-01-21,42
Sloan Moore,user000495@example.com,175000,220962,u-fd0fae907ede,Yes,2025-12-26,71
Skyler Kim,user000496@example.com,175000,235865,u-1bf702565f35,Yes,2025-12-20,76
Logan Singh,user000497@example.com,175000,191428,u-c844edc499af,Yes,2026-01-04,62
Harper Anderson,user000498@example.com,175000,81539,u-46ff987ffcba,Yes,2025-12-27,26
Emerson Singh,user000499@example.com,175000,146339,u-8d980867e399,Yes,2025-12-22,47
Avery Hall,user000500@example.com,175000,95252,u-b2d686e53370,Yes,2025-12-26,31
`;
window.DEMO_TENANT = {
  "note": "Customer Example shape at 70% scale. Synthetic. Not for real decisions.",
  "scaleOfCustomerExample": 0.7,
  "mau": 52460,
  "tasksMo": 797735,
  "creditsMo": 547886201,
  "rate": 0.01,
  "costMo": 5478862.01,
  "loadedRate": 72,
  "valueMo": 38159686,
  "sampleUsers": 500,
  "sampleToTenant": 105,
  "tiers": [
    {
      "tier": "<P50",
      "profile": "Light / occasional",
      "users": 25691,
      "avgPerUserMo": 785,
      "allowance": 1000,
      "pctCredits": 0.04
    },
    {
      "tier": "P50-P75",
      "profile": "Regular collaborator",
      "users": 13122,
      "avgPerUserMo": 5069,
      "allowance": 6000,
      "pctCredits": 0.12
    },
    {
      "tier": "P75-P90",
      "profile": "Highly engaged user",
      "users": 7873,
      "avgPerUserMo": 14002,
      "allowance": 15000,
      "pctCredits": 0.2
    },
    {
      "tier": "P90-P95",
      "profile": "Cowork-native",
      "users": 2624,
      "avgPerUserMo": 27873,
      "allowance": 30000,
      "pctCredits": 0.13
    },
    {
      "tier": "P95-P99",
      "profile": "Power delegator",
      "users": 2100,
      "avgPerUserMo": 50106,
      "allowance": 55000,
      "pctCredits": 0.19
    },
    {
      "tier": "P99+",
      "profile": "Frontier / always-on",
      "users": 1050,
      "avgPerUserMo": 164385,
      "allowance": 175000,
      "pctCredits": 0.32
    }
  ],
  "categories": [
    {
      "name": "Analysis & Research",
      "tasks": 366483,
      "value": 29465225
    },
    {
      "name": "Email workflows",
      "tasks": 150870,
      "value": 905222
    },
    {
      "name": "Communication workflows",
      "tasks": 69671,
      "value": 334421
    },
    {
      "name": "Specialized workflows",
      "tasks": 63963,
      "value": 1918896
    },
    {
      "name": "Document & content creation",
      "tasks": 61158,
      "value": 1761359
    },
    {
      "name": "Meeting workflows",
      "tasks": 40835,
      "value": 1176054
    },
    {
      "name": "Write or debug code",
      "tasks": 38072,
      "value": 2558412
    },
    {
      "name": "General assistance / Other",
      "tasks": 6683,
      "value": 40097
    }
  ]
};
